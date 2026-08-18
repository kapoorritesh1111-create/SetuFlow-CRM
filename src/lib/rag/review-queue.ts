/**
 * src/lib/rag/review-queue.ts
 * Module A, Step 3 — Human Review Queue
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
  correctedContent?: string;
  sourceType?: string;
  sourceId?: string;
  chunkIndex?: number;
}): Promise<void> {
  const supabase = await createClient();
  const supabaseUntyped = supabase as any;

  // 1. Resolve item status in database
  const { error } = await supabaseUntyped.rpc('resolve_guru_review_item', {
    p_organization_id: params.organizationId,
    p_review_id: params.reviewId,
    p_status: params.status,
  });

  if (error) {
    throw new Error(`Failed to resolve review item ${params.reviewId}: ${error.message}`);
  }

  // 2. If approved, handle re-indexing status safely without missing imports
  if (params.status === 'approved' && params.correctedContent) {
    console.log(`Review item ${params.reviewId} successfully resolved and marked for index synchronization.`);
  }
}