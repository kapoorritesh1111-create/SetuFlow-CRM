import Anthropic from '@anthropic-ai/sdk';
import { retrieveGuru } from '@/lib/rag/retrieve';
import { embedChunks } from '@/lib/rag/embedding-provider';
import { AGENTIC_TOOLS, callAgenticTool, type AgenticToolName } from '@/lib/rag/agentic-tools';

/**
 * src/lib/rag/guru-agentic-orchestrator.ts
 * Module F — the missing wiring layer.
 *
 * `agentic-tools.ts` defines AGENTIC_TOOLS and callAgenticTool(), but until
 * this file, nothing ever passed AGENTIC_TOOLS to an actual Anthropic API
 * call — the tools existed but Claude had no way to invoke them. This is
 * that connection: a real tool-use loop that lets Claude choose between
 * answering from retrieved documents (RAG, via retrieve.ts) and calling a
 * live CRM query tool (agentic-tools.ts), or both, for a single question.
 *
 * This does NOT change the existing dashboard "Setu Guru" chat widget —
 * that widget is backed by a separate rule-based system
 * (workflow-status-answer.ts / guru-response-policy.ts), confirmed
 * templated rather than LLM-grounded during manual testing. Wiring this
 * orchestrator into that widget (or exposing it via a new endpoint) is a
 * product decision outside this file's scope — this file makes the
 * capability real and testable; where it surfaces in the product is a
 * separate call.
 */

const AGENTIC_MODEL = process.env.SETU_GURU_RAG_MODEL || 'claude-haiku-4-5-20251001';
const MAX_TOOL_ROUNDS = 4; // hard cap so a confused model can't loop forever

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ timeout: 15000 });
  return anthropicClient;
}

const SYSTEM_PROMPT = `You are Setu Guru, a trade-compliance and CRM assistant.

You have two ways to answer a question:
1. Retrieved document context, if provided below — for compliance/regulatory questions grounded in ingested documents. Cite sources using [R1], [R2], etc. exactly as they appear.
2. Tools that read this organization's live CRM data (leads, pipeline, compliance status, contracts, tasks, reports) — for questions about current pipeline state, specific leads, or operational status.

Choose whichever source (or both) actually answers the question.

STRICT RULE — NO OTHER SOURCE IS ALLOWED: if retrieved document context is not provided below (or does not contain the answer), and no tool applies to the question either, you MUST respond with EXACTLY: "Data Not Found". Do not answer from your own general/world knowledge under any circumstances, even for questions that seem simple or unrelated to trade/compliance (e.g. general trivia). This system has no source of truth other than the two listed above.`;

export interface AgenticQueryResult {
  answer: string;
  toolsUsed: AgenticToolName[];
  ragUsed: boolean;
  citations: Array<{ marker: string; sourceType: string; sourceId: string }>;
}

/**
 * Answers a single question using RAG grounding + live-tool calling,
 * exactly as SOW Module F describes ("Claude can invoke live query
 * functions directly rather than relying solely on static RAG context").
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
      const answer = textBlock && 'text' in textBlock ? textBlock.text.trim() : 'Data Not Found';
      return { answer, toolsUsed, ragUsed, citations: toolsUsed.length ? [] : citations };
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

  return {
    answer: 'Data Not Found',
    toolsUsed,
    ragUsed,
    citations: [],
  };
}