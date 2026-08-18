import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { retrieveGuru } from '@/lib/rag/retrieve';
import { embedChunks } from '@/lib/rag/embedding-provider';

const AGENTIC_MODEL = process.env.SETU_GURU_RAG_MODEL || 'claude-haiku-4-5-20251001';

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ timeout: 15000 });
  return anthropicClient;
}

const SYSTEM_PROMPT = `You are Setu Guru, a professional and clean CRM assistant for SetuFlow. 
Strict formatting rules: 
- Do NOT use emojis, decorative icons, or markdown formatting characters like asterisks or hashes. 
- Write clean, plain text paragraphs like ChatGPT streaming output. 
- Maintain a helpful, conversational, and direct tone without rigid errors.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, organizationId } = body;

    if (!query || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields: query and organizationId' }, { status: 400 });
    }

    let systemPrompt = SYSTEM_PROMPT;
    try {
      const embedResult = await embedChunks([query]);
      if (embedResult.ok && embedResult.embeddings) {
        const ragResult = await retrieveGuru({
          organizationId,
          question: query,
          queryEmbedding: embedResult.embeddings[0],
          matchCount: 3,
        });
        if (ragResult.found) {
          systemPrompt = `${SYSTEM_PROMPT}\n\nRetrieved context:\n${ragResult.groundingPrompt}`;
        }
      }
    } catch (e) {
      console.warn('RAG skip on stream route:', e);
    }

    const anthropic = getAnthropic();

    // Direct streaming response to client
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const responseStream = await anthropic.messages.create({
            model: AGENTIC_MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: query }],
            stream: true,
          });

          for await (const chunk of responseStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (err: any) {
          controller.enqueue(encoder.encode(`Streaming error: ${err.message}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Failed to stream response', details: error.message }, { status: 500 });
  }
}