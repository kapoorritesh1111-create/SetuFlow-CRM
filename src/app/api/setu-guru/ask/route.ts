import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { retrieveGuru } from '@/lib/rag/retrieve';
import { embedChunks } from '@/lib/rag/embedding-provider';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const OPENAI_MODEL = process.env.SETU_GURU_MODEL || 'gpt-4o-mini';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ 
      timeout: 15000,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are Setu Guru, a professional and clean CRM assistant for SetuFlow. 
Strict formatting rules: 
- Do NOT use emojis, decorative icons, or markdown formatting characters like asterisks or hashes. 
- Write clean, plain text paragraphs like ChatGPT streaming output. 
- Maintain a helpful, conversational, and direct tone without rigid errors.`;

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

    // --- Step 2: Parse Payload & JWT Session Alignment ---
    const body = await req.json().catch(() => ({}));
    const { query } = body;

    if (typeof body.organizationId === 'string' && body.organizationId.trim() !== '' && body.organizationId !== sessionOrganizationId) {
      console.info('[Setu Guru] Auto-aligned client organization payload to active verified session org', {
        sessionOrgId: sessionOrganizationId,
        receivedPayloadOrgId: body.organizationId,
      });
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

    const openai = getOpenAI();

    // --- Step 4: Secure OpenAI Readable Stream Response ---
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const responseStream = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
              { role: 'system', content: enrichedSystemPrompt },
              { role: 'user', content: trimmedQuery }
            ],
            stream: true,
            max_tokens: 1024,
          });

          for await (const chunk of responseStream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
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