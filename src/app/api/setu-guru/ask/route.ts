import { NextResponse } from 'next/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { runGuruAgenticQuery } from '@/lib/rag/guru-agentic-orchestrator';

export const dynamic = 'force-dynamic';

const createErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ success: false, error: message }, { status });
};

export async function POST(req: Request) {
  try {
    // 1. Authenticate & Ensure Cross-Tenant Isolation
    const workspace = await getWorkspaceAccess();
    if (!workspace?.user) {
      return createErrorResponse('Please sign in before using Setu Guru.', 401);
    }
    if (!workspace?.organization?.id) {
      return createErrorResponse('No active organization found for this account.', 403);
    }

    const sessionOrganizationId = workspace.organization.id;

    // Validate request JSON payload safely
    const body = await req.json().catch(() => ({}));
    const { query } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return createErrorResponse('Missing or invalid required field: query', 400);
    }

    const trimmedQuery = query.trim();
    console.log(`[Setu Guru API] Routing query: "${trimmedQuery}" for Org: ${sessionOrganizationId}`);

    // 2. Setup Real-Time Web Stream Pipeline
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // NOTE: For true streaming, pass 'controller' into your agent to enqueue tokens live.
          const agentResult = await runGuruAgenticQuery(trimmedQuery, sessionOrganizationId);
          
          if (agentResult?.answer) {
            controller.enqueue(encoder.encode(agentResult.answer));
          } else {
            controller.enqueue(encoder.encode("Data Not Found"));
          }
        } catch (streamErr: any) {
          console.error('[Setu Guru API] Streaming error:', streamErr);
          controller.enqueue(encoder.encode(`\n[Streaming service error]`));
        } finally {
          controller.close();
        }
      },
    });

    // 3. Return native response stream without manual chunking headers
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-transform',
      },
    });

  } catch (error: any) {
    console.error('[Setu Guru API Fatal Error]:', error);
    return createErrorResponse('Failed to process response from AI engine', 500);
  }
} 