import Anthropic from '@anthropic-ai/sdk';
import { retrieveGuru, filterOutput } from '@/lib/rag/retrieve';
import { embedChunks } from '@/lib/rag/embedding-provider';
import { AGENTIC_TOOLS, callAgenticTool, type AgenticToolName } from '@/lib/rag/agentic-tools';

/**
 * src/lib/rag/guru-agentic-orchestrator.ts
 * Module F — The Agentic Wiring Layer.
 * 
 * [REFACTORED FOR CONVERSATIONAL UX]
 * This orchestrator connects Claude to the SetuFlow CRM tools and RAG database.
 * Strict "Data Not Found" limitations have been replaced with a smart, conversational
 * fallback mechanism. The AI will now act as a true co-pilot, guiding users toward
 * CRM actions even when static documentation is missing.
 */

const AGENTIC_MODEL = process.env.SETU_GURU_RAG_MODEL || 'claude-haiku-4-5-20251001';
const MAX_TOOL_ROUNDS = 4; // Hard cap so a confused model can't loop forever

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ timeout: 15000 });
  return anthropicClient;
}

// 1. Updated System Prompt: Replaced strict failure with Conversational Agentic behavior
const SYSTEM_PROMPT = `You are Setu Guru, an intelligent and conversational CRM assistant for SetuFlow.

You have two ways to help the user:
1. Retrieved document context (if provided below) — for compliance/regulatory questions. Cite sources using [R1], [R2], etc.
2. Live CRM Tools — for checking leads, pipeline, compliance status, contracts, tasks, and reports.

CRITICAL INSTRUCTION FOR MISSING DATA:
Never reply with a rigid "Data Not Found" or generic error. If the retrieved documents do not contain the answer, and your tools do not return matching CRM data, act as a helpful human assistant. 
Acknowledge their question naturally (e.g., "I see you are asking about [Topic]...") and politely explain that while you don't have exact documentation for it, you can help them check active CRM leads, pricing defaults, or open quotes. Be proactive and guide them to the next best action.`;

export interface AgenticQueryResult {
  answer: string;
  toolsUsed: AgenticToolName[];
  ragUsed: boolean;
  citations: Array<{ marker: string; sourceType: string; sourceId: string }>;
}

// 2. Helper: Generate a natural fallback response when things fail
function getConversationalFallback(question: string): string {
  const sanitizedQuestion = question.trim().replace(/[?!.]+$/, '');
  const isProductOrLead = /(cost|price|product|lead|quote|supplier|buyer|banana|chips|corn)/i.test(sanitizedQuestion);

  if (isProductOrLead) {
    return `Mainne check kiya, par mujhe "${sanitizedQuestion}" ke liye exact match ya active CRM data nahi mila. \n\nKya aap chahte hain main kisi aur specific product ya recent lead ka status check karun?`;
  }
  return `Mujhe "${sanitizedQuestion}" se related documentation abhi knowledge base mein nahi mili.\n\nLekin Setu Guru CRM ke leads, quotes, aur workflows mein aapki poori madad kar sakta hai. Kya aap apne current pipeline tasks dekhna chahenge?`;
}

/**
 * Answers a single question using RAG grounding + live-tool calling.
 */
export async function runGuruAgenticQuery(
  organizationId: string,
  question: string,
  dbClient?: any,
): Promise<AgenticQueryResult> {
  const toolsUsed: AgenticToolName[] = [];
  let ragUsed = false;
  let citations: Array<{ marker: string; sourceType: string; sourceId: string }> = [];

  // --- Optional RAG grounding: attempt retrieval, fold into system prompt if found ---
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

  const anthropic = getAnthropic();
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: question }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: AGENTIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: AGENTIC_TOOLS as unknown as Anthropic.Tool[],
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      // No more tool calls — extract final text answer.
      const textBlock = response.content.find((block) => block.type === 'text');
      
      // 3. Apply conversational fallback instead of hardcoded error
      let answer = textBlock && 'text' in textBlock 
        ? textBlock.text.trim() 
        : getConversationalFallback(question);
      
      // Post-generation grounding check.
      const filterResult = filterOutput(answer);
      
      // If the filter rejects it or it was our exact old error, inject smart fallback
      if (!filterResult.safe || answer === 'Data Not Found') {
        answer = getConversationalFallback(question);
      }

      // Clean up metadata if we used a fallback
      if (answer.includes("nahi mila") || answer.includes("knowledge base mein nahi mili")) {
        citations = [];
        ragUsed = false;
      } else if (toolsUsed.length > 0 && !ragUsed) {
        // If only tools were used (no RAG), ensure citations remain empty.
        citations = [];
      }

      return { answer, toolsUsed, ragUsed, citations };
    }

    // Execute every requested tool call, feed results back, loop again.
    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const toolName = toolUse.name as AgenticToolName;
      toolsUsed.push(toolName);
      const result = await callAgenticTool(
        { name: toolName, input: toolUse.input as Record<string, unknown> },
        organizationId,
        dbClient,
      );
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result.ok ? result.data : { error: result.error }),
        is_error: !result.ok,
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  // 4. Fallback if max tool loops are exceeded (System confusion handling)
  return {
    answer: `Mujhe "${question}" process karne mein thoda time lag raha hai. Aap CRM leads ya specific catalog search try kar sakte hain.`,
    toolsUsed,
    ragUsed,
    citations: [],
  };
}