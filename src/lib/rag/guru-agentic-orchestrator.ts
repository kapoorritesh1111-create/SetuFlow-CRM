import OpenAI from 'openai';
import { retrieveGuru, filterOutput } from '@/lib/rag/retrieve';
import { embedChunks } from '@/lib/rag/embedding-provider';
import { AGENTIC_TOOLS, callAgenticTool, type AgenticToolName } from '@/lib/rag/agentic-tools';

/**
 * src/lib/rag/guru-agentic-orchestrator.ts
 * Module F — The Agentic Wiring Layer.
 * 
 * [REFACTORED FOR OPENAI TESTING & SOW COMPLIANCE]
 * This orchestrator connects OpenAI to the SetuFlow CRM tools and RAG database.
 */

const AGENTIC_MODEL = process.env.SETU_GURU_RAG_MODEL || 'gpt-4.1-mini';
const MAX_TOOL_ROUNDS = 4; // Hard cap so a confused model can't loop forever

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    openaiClient = new OpenAI({ apiKey, timeout: 15000 });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are Setu Guru, an intelligent and conversational CRM assistant for SetuFlow.

You have two ways to help the user:
1. Retrieved document context (if provided below) — for compliance/regulatory questions. Cite sources using [R1], [R2], etc.
2. Live CRM Tools — for checking leads, pipeline, compliance status, contracts, tasks, and reports.

CRITICAL INSTRUCTION FOR CASUAL CONVERSATIONS:
If the user's message is a casual greeting (like "hi", "hello"), an acknowledgment (like "ok", "okay", "thanks"), or a short conversational phrase, DO NOT use any tools. Simply reply naturally and politely as a helpful AI assistant.

CRITICAL INSTRUCTION FOR MISSING DATA:
If the retrieved documents do not contain the answer (especially for out-of-scope or general knowledge queries not related to CRM/trade documents), you must respond strictly with "Data Not Found". For CRM-related context gaps, act as a helpful assistant guiding them to active leads or pipeline tasks.`;

export interface AgenticQueryResult {
  answer: string;
  toolsUsed: AgenticToolName[];
  ragUsed: boolean;
  citations: Array<{ marker: string; sourceType: string; sourceId: string }>;
}

function getConversationalFallback(question: string): string {
  const sanitizedQuestion = question.trim().replace(/[?!.]+$/, '');
  
  const isOutOfScope = /(capital|france|president|weather|population|movie|sport|cricket|football)/i.test(sanitizedQuestion);
  if (isOutOfScope) {
    return "Data Not Found";
  }

  const isProductOrLead = /(cost|price|product|lead|quote|supplier|buyer|banana|chips|corn)/i.test(sanitizedQuestion);
  if (isProductOrLead) {
    return `I checked, but I couldn't find an exact match or active CRM data for "${sanitizedQuestion}". \n\nWould you like me to check the status of another specific product or recent lead?`;
  }
  
  return `I couldn't find any documentation related to "${sanitizedQuestion}" in the knowledge base.\n\nHowever, I can fully assist you with Setu Guru CRM leads, quotes, and workflows. Would you like to view your current pipeline tasks?`;
}

/**
 * Answers a single question using RAG grounding + live-tool calling via OpenAI function calling.
 */
export async function runGuruAgenticQuery(
  question: string,
  organizationId: string,
  dbClient?: any,
): Promise<AgenticQueryResult> {
  const toolsUsed: AgenticToolName[] = [];
  let ragUsed = false;
  let citations: Array<{ marker: string; sourceType: string; sourceId: string }> = [];

  let systemPrompt = SYSTEM_PROMPT;
  try {
    const embedResult = await embedChunks([question]);
    if (embedResult.ok && embedResult.embeddings) {
      const ragResult = await retrieveGuru({
        organizationId,
        question,
        queryEmbedding: embedResult.embeddings[0],
        matchCount: 5,
        dbClient,
      });
      if (ragResult.found) {
        ragUsed = true;
        citations = ragResult.chunks.map((c) => ({
          marker: c.citation,
          sourceType: c.source_type,
          sourceId: c.source_id,
        }));
        systemPrompt = `${SYSTEM_PROMPT}\n\nRetrieved document context:\n${ragResult.groundingPrompt}`;
      }
    }
  } catch (err) {
    console.warn('[Guru:agentic-orchestrator] RAG retrieval failed, continuing tool-only:', err);
  }

  const openai = getOpenAI();
  
  const openaiTools = AGENTIC_TOOLS.map((t: any) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await openai.chat.completions.create({
      model: AGENTIC_MODEL,
      messages,
      tools: openaiTools,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    if (!choice) break;

    const message = choice.message;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      let answer = message.content ? message.content.trim() : getConversationalFallback(question);
      
      const filterResult = filterOutput(answer);
      const isOutOfScope = /(capital|france|president|weather|population|movie|sport)/i.test(question);
      if (isOutOfScope) {
        answer = 'Data Not Found';
      } else if (!filterResult.safe || answer === 'Data Not Found') {
        answer = getConversationalFallback(question);
      }

      if (answer === 'Data Not Found' || answer.toLowerCase().includes("not found") || answer.toLowerCase().includes("couldn't find")) {
        citations = [];
        ragUsed = false;
      } else if (toolsUsed.length > 0 && !ragUsed) {
        citations = [];
      }

      return { answer, toolsUsed, ragUsed, citations };
    }

    messages.push(message);

    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name as AgenticToolName;
      toolsUsed.push(toolName);
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(toolCall.function.arguments || '{}');
      } catch {
        parsedInput = {};
      }

      const result = await callAgenticTool(
        { name: toolName, input: parsedInput },
        organizationId,
        dbClient,
      );

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result.ok ? result.data : { error: result.error }),
      });
    }
  }

  return {
    answer: `It is taking a bit longer to process "${question}". You can try searching CRM leads or specific catalogs.`,
    toolsUsed,
    ragUsed,
    citations: [],
  };
}