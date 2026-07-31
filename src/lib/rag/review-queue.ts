/**
 * src/lib/rag/review-queue.ts
 * Module A, Step 3 — Human Review Queue
 *
 * Requires the migration in
 * supabase/migrations/20260731000000_guru_ingestion_review_queue.sql
 * to be applied first — `enqueue_guru_review_item` does not exist until
 * then, and this file's calls will fail against a DB that hasn't run it.
 */

import { createClient } from '@/lib/supabase/server';

export interface ReviewQueueItem {
  organizationId: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  confidence: number;
}

/**
 * Sends a low-confidence chunk to human review instead of auto-accepting
 * it into the live index. Returns the review-queue row id.
 */
export async function queueForHumanReview(item: ReviewQueueItem): Promise<string> {
  const supabase = await createClient();
  const supabaseUntyped = supabase as any;

  const { data, error } = await supabaseUntyped.rpc('enqueue_guru_review_item', {
    p_organization_id: item.organizationId,
    p_source_type: item.sourceType,
    p_source_id: item.sourceId,
    p_chunk_index: item.chunkIndex,
    p_content: item.content,
    p_confidence: item.confidence,
  });

  if (error) {
    throw new Error(`Failed to queue chunk ${item.chunkIndex} for review: ${error.message}`);
  }

  return data as string;
}

export async function resolveReviewItem(params: {
  organizationId: string;
  reviewId: string;
  status: 'approved' | 'rejected';
}): Promise<void> {
  const supabase = await createClient();
  const supabaseUntyped = supabase as any;

  const { error } = await supabaseUntyped.rpc('resolve_guru_review_item', {
    p_organization_id: params.organizationId,
    p_review_id: params.reviewId,
    p_status: params.status,
  });

  if (error) {
    throw new Error(`Failed to resolve review item ${params.reviewId}: ${error.message}`);
  }
}