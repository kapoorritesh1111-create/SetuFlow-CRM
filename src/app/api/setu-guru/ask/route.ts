import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { retrieveGuru } from '@/lib/rag/retrieve';
import { embedChunks } from '@/lib/rag/embedding-provider';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const AGENTIC_MODEL = process.env.SETU_GURU_RAG_MODEL || 'claude-haiku-4-5-20251001';

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ 
      timeout: 15000,
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

const SYSTEM_PROMPT = `You are Setu Guru, a professional and clean CRM assistant for SetuFlow. 
Strict formatting rules: 
- Do NOT use emojis, decorative icons, or markdown formatting characters like asterisks or hashes. 
- Write clean, plain text paragraphs like ChatGPT streaming output. 
- Maintain a helpful, conversational, and direct tone without rigid errors.`;

// Standardized JSON error response helper
const createErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ success: false, error: message }, { status });
};

export async function POST(req: Request) {
  try {
    // --- Step 1: Strict Session & Workspace Authorization ---
    const workspace = await getWorkspaceAccess();
    if (!workspace.user) {
      return createErrorResponse('Please sign in before using Setu Guru.', 401);
    }
    if (!workspace.organization) {
      return createErrorResponse('No active organization found for this account.', 403);
    }
    
    const sessionOrganizationId = workspace.organization.id;

    // --- Step 2: Parse Payload & Validate Anti-Tampering ---
    const body = await req.json().catch(() => ({}));
    const { query } = body;

    // Strict multi-tenant security boundary check
    if (typeof body.organizationId === 'string' && body.organizationId.trim() !== '') {
      if (body.organizationId !== sessionOrganizationId) {
        console.warn('[Security Alert] Cross-tenant probing attempt detected in /ask route', {
          userId: workspace.user.id,
          sessionOrgId: sessionOrganizationId,
          requestedOrgId: body.organizationId,
          timestamp: new Date().toISOString(),
        });
        return createErrorResponse('Organization mismatch for this session. Access denied.', 403);
      }
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return createErrorResponse('Missing or invalid required field: query', 400);
    }

    const trimmedQuery = query.trim();
    let enrichedSystemPrompt = SYSTEM_PROMPT;

    // --- Step 3: Secure Retrieval-Augmented Generation (RAG) Context Fetch ---
    try {
      const embedResult = await embedChunks([trimmedQuery]);
      if (embedResult.ok && embedResult.embeddings && embedResult.embeddings.length > 0) {
        const ragResult = await retrieveGuru({
          organizationId: sessionOrganizationId,
          question: trimmedQuery,
          queryEmbedding: embedResult.embeddings[0],
          matchCount: 3,
        });
        
        if (ragResult.found && ragResult.groundingPrompt) {
          enrichedSystemPrompt = `${SYSTEM_PROMPT}\n\nRetrieved context:\n${ragResult.groundingPrompt}`;
        }
      }
    } catch (ragError) {
      console.warn('[Setu Guru Ask] RAG pipeline soft-skipped during stream generation:', ragError);
    }

    const anthropic = getAnthropic();

    // --- Step 4: Secure Readable Stream Response ---
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const responseStream = await anthropic.messages.create({
            model: AGENTIC_MODEL,
            max_tokens: 1024,
            system: enrichedSystemPrompt,
            messages: [{ role: 'user', content: trimmedQuery }],
            stream: true,
          });

          for await (const chunk of responseStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (streamErr: any) {
          console.error('[Setu Guru Ask] Streaming chunk execution error:', streamErr);
          controller.enqueue(encoder.encode(`\n[Streaming interrupted due to a temporary service error]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error: any) {
    console.error('[Setu Guru Ask Fatal Error]:', error);
    return createErrorResponse('Failed to stream response from AI engine', 500);
  }
}