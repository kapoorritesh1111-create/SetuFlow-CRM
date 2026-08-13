import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { embedChunks, EMBEDDING_MODEL_VERSION } from '@/lib/rag/embedding-provider';

interface ReviewItemPayload {
  id: string;
  organization_id: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  content: string;
  confidence: number;
}

interface RequestBody {
  action: 'approve' | 'reject';
  item: ReviewItemPayload;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { action, item } = body;

    // 1. Strict Payload Validation
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid or missing action type' }, { status: 400 });
    }

    if (!item || !item.id || !item.organization_id || !item.content || typeof item.chunk_index !== 'number') {
      return NextResponse.json({ error: 'Malformed review item payload' }, { status: 400 });
    }

    const supabase = await createClient();

    // 2. Execute Action Processing
    if (action === 'approve') {
      // Generate vector embedding via standalone TEI provider
      const embedResult = await embedChunks([item.content]);
      
      if (!embedResult.ok || !embedResult.embeddings || embedResult.embeddings.length === 0) {
        console.error(`[ReviewAction API] Embedding generation failed for item ${item.id}:`, embedResult.error);
        return NextResponse.json(
          { error: `Embedding generation failed: ${embedResult.error ?? 'Unknown error'}` },
          { status: 502 }
        );
      }

      // Upsert into production vector index table
      const { error: upsertError } = await (supabase.from('guru_embeddings') as any)
        .upsert(
          {
            organization_id: item.organization_id,
            source_type: item.source_type,
            source_id: item.source_id,
            chunk_index: item.chunk_index,
            content: item.content,
            embedding: embedResult.embeddings[0],
            embedding_model: EMBEDDING_MODEL_VERSION,
            metadata: {
              approved_via_review_queue: true,
              original_confidence: item.confidence,
              reviewed_at: new Date().toISOString(),
            },
          },
          { onConflict: 'organization_id,source_type,source_id,chunk_index' }
        );

      if (upsertError) {
        console.error(`[ReviewAction API] Database upsert failed for item ${item.id}:`, upsertError.message);
        return NextResponse.json({ error: `Database persistence failed: ${upsertError.message}` }, { status: 500 });
      }
    }

    // 3. Clear item from review queue (Idempotent cleanup)
    const { error: deleteError } = await (supabase.from('guru_review_queue') as any)
      .delete()
      .eq('id', item.id)
      .eq('organization_id', item.organization_id);

    if (deleteError) {
      console.error(`[ReviewAction API] Failed to purge review queue item ${item.id}:`, deleteError.message);
      return NextResponse.json({ error: `Queue cleanup failed: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      action, 
      itemId: item.id,
      timestamp: new Date().toISOString() 
    });

  } catch (err: unknown) {
    console.error('[ReviewAction API] Critical unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}