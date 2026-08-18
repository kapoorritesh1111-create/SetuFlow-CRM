/**
 * src/lib/rag/ingest.ts
 * Module A, Step 6 — Ingest Orchestrator
 *
 * Wires: dedup.ts -> vlm-parser.ts -> review-queue.ts -> chunker.ts ->
 * embedding-provider.ts -> guru_embeddings.
 *
 * Confidence threshold decides routing between chunker output going
 * straight to embedding vs. being sent to human review.
 */

import { createClient } from '@/lib/supabase/server';
import { checkFileDuplicate } from './dedup';
import { parseWithVlm } from './vlm-parser';
import { queueForHumanReview } from './review-queue';
import { chunkPages, type Chunk } from './chunker';
import { embedChunks, EMBEDDING_MODEL_VERSION } from './embedding-provider';

const CONFIDENCE_THRESHOLD = 0.75;
const EMBED_BATCH_SIZE = 50;
const MAX_WORDS = 100000; // backup heuristic if stop_reason isn't available

export interface IngestInput {
  organizationId: string;
  sourceType: string;
  sourceId: string;
  fileBuffer: Buffer;
  mimeType: string;
  dbClient?: any;
}

export type IngestOutcome =
  | { status: 'skipped_duplicate'; fileHash: string }
  | {
      status: 'ingested';
      fileHash: string;
      chunksWritten: number;
      chunksSkippedUnchanged: number;
      chunksQueuedForReview: number;
      chunksDeletedStale: number;
      truncated?: boolean;
    }
  | { status: 'error'; error: string };

export async function ingestDocument(input: IngestInput): Promise<IngestOutcome> {
  const supabaseUntyped: any = input.dbClient ?? (await createClient());

  // --- Step 1: file-level dedup (Existing instance check) ----------------
  let dedupResult;
  try {
    dedupResult = await checkFileDuplicate({
      organizationId: input.organizationId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      fileBuffer: input.fileBuffer,
      dbClient: supabaseUntyped,
    });
  } catch (err: unknown) {
    return { status: 'error', error: err instanceof Error ? err.message : String(err) };
  }

  if (dedupResult.isDuplicate) {
    return { status: 'skipped_duplicate', fileHash: dedupResult.fileHash };
  }

  // --- Step 1.5: Global Content/File-Hash Deduplication (Senior Guardrail) ---
  // Prevents duplicate records from being created under a different generated source_id 
  // if the exact file binary has already been ingested previously for this organization.
  const { data: globalDuplicateMatch, error: globalDupError } = await supabaseUntyped
    .from('guru_embeddings')
    .select('source_id')
    .eq('organization_id', input.organizationId)
    .eq('source_type', input.sourceType)
    .eq('metadata->>file_hash', dedupResult.fileHash)
    .limit(1);

  if (!globalDupError && globalDuplicateMatch && globalDuplicateMatch.length > 0) {
    const existingSourceId = globalDuplicateMatch[0].source_id;
    // If it's a completely different source_id trying to upload the exact same file content, skip it cleanly.
    if (existingSourceId !== input.sourceId) {
      console.warn(`[INGEST DEDUP] Exact file match found for hash ${dedupResult.fileHash} under different source_id (${existingSourceId}). Skipping duplicate ingestion.`);
      return { status: 'skipped_duplicate', fileHash: dedupResult.fileHash };
    }
  }
  // -------------------------------------------------------------------------

  // --- Step 2: VLM parse ---------------------------------------------------
  let pages;
  try {
    pages = await parseWithVlm(input.fileBuffer, input.mimeType);
  } catch (err: unknown) {
    return {
      status: 'error',
      error: `VLM parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (pages.length === 0) {
    return { status: 'error', error: 'VLM parser returned no pages' };
  }

  // Issue #14 fix: exact truncation signal from vlm-parser's stop_reason check.
  const wasTruncatedByStopReason = pages.some((p: any) => p.truncated === true);
  if (wasTruncatedByStopReason) {
    console.warn(`[TRUNCATION CONFIRMED] max_tokens ceiling hit while parsing source ${input.sourceId}.`);
  }

  const chunks = chunkPages(pages);
  if (chunks.length === 0) {
    return { status: 'error', error: 'Chunker produced no chunks from parsed pages' };
  }

  // Backup heuristic — catches truncation even if stop_reason wasn't available.
  const totalWordCount = chunks.reduce((acc, chunk) => acc + (chunk.content?.split(/\s+/).length || 0), 0);
  const wasTruncatedByWordCount = totalWordCount > MAX_WORDS;
  if (wasTruncatedByWordCount) {
    console.warn(`[WARNING - TRUNCATION RISK] Document exceeds ${MAX_WORDS} words. Source ID: ${input.sourceId}`);
  }

  const documentTruncated = wasTruncatedByStopReason || wasTruncatedByWordCount;

  // --- Step 2.5: Per-chunk hash dedup & stale chunk cleanup ---
  const { data: existingChunks, error: existingChunksError } = await supabaseUntyped
    .from('guru_embeddings')
    .select('chunk_index, metadata')
    .eq('organization_id', input.organizationId)
    .eq('source_type', input.sourceType)
    .eq('source_id', input.sourceId);

  if (existingChunksError) {
    return { status: 'error', error: `Existing chunk lookup failed: ${existingChunksError.message}` };
  }

  const existingHashByIndex = new Map<number, string>(
    (existingChunks ?? []).map((row: any) => [row.chunk_index, row.metadata?.chunk_hash]),
  );

  const incomingChunkIndices = new Set(chunks.map(c => c.chunkIndex));
  const staleChunkIndices = (existingChunks ?? [])
    .filter((row: any) => !incomingChunkIndices.has(row.chunk_index))
    .map((row: any) => row.chunk_index);

  let chunksDeletedStale = 0;
  if (staleChunkIndices.length > 0) {
    const { error: deleteError } = await supabaseUntyped
      .from('guru_embeddings')
      .delete()
      .eq('organization_id', input.organizationId)
      .eq('source_type', input.sourceType)
      .eq('source_id', input.sourceId)
      .in('chunk_index', staleChunkIndices);

    if (deleteError) {
      console.error('[ingest] Failed to delete stale chunks:', deleteError.message);
    } else {
      chunksDeletedStale = staleChunkIndices.length;
    }
  }

  const changedChunks = chunks.filter((c) => existingHashByIndex.get(c.chunkIndex) !== c.chunkHash);
  const unchangedCount = chunks.length - changedChunks.length;

  // --- Step 3: confidence routing ------------------------------------------
  const acceptable: Chunk[] = [];
  const lowConfidence: Chunk[] = [];
  for (const chunk of changedChunks) {
    if (chunk.confidence < CONFIDENCE_THRESHOLD) lowConfidence.push(chunk);
    else acceptable.push(chunk);
  }

  let queuedCount = 0;
  for (const chunk of lowConfidence) {
    try {
      await queueForHumanReview({
        organizationId: input.organizationId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        confidence: chunk.confidence,
      });
      queuedCount++;
    } catch (err: unknown) {
      console.error(
        `[ingest] failed to queue chunk ${chunk.chunkIndex} for review:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (acceptable.length === 0) {
    return {
      status: 'ingested',
      fileHash: dedupResult.fileHash,
      chunksWritten: 0,
      chunksSkippedUnchanged: unchangedCount,
      chunksQueuedForReview: queuedCount,
      chunksDeletedStale,
      truncated: documentTruncated,
    };
  }

  // --- Step 5: embed (batched) and upsert -----------------------------------
  let written = 0;
  for (let i = 0; i < acceptable.length; i += EMBED_BATCH_SIZE) {
    const batch = acceptable.slice(i, i + EMBED_BATCH_SIZE);
    const embedResult = await embedChunks(batch.map((c) => c.content));

    if (!embedResult.ok || !embedResult.embeddings) {
      return {
        status: 'error',
        error: `Embedding failed on batch starting at chunk ${batch[0].chunkIndex}: ${embedResult.error}`,
      };
    }

    const rows = batch.map((chunk, idx) => ({
      organization_id: input.organizationId,
      source_type: input.sourceType,
      source_id: input.sourceId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      embedding: embedResult.embeddings![idx],
      embedding_model: EMBEDDING_MODEL_VERSION,
      metadata: {
        file_hash: dedupResult.fileHash,
        chunk_hash: chunk.chunkHash,
        parent_section: chunk.parentSection,
        prev_chunk_index: chunk.prevChunkIndex,
        next_chunk_index: chunk.nextChunkIndex,
        confidence: chunk.confidence,
        ...(documentTruncated ? { truncated: true } : {}),
      },
    }));

    const { error: upsertError } = await supabaseUntyped
      .from('guru_embeddings')
      .upsert(rows, { onConflict: 'organization_id,source_type,source_id,chunk_index' });

    if (upsertError) {
      return {
        status: 'error',
        error: `Upsert failed on batch starting at chunk ${batch[0].chunkIndex}: ${upsertError.message}`,
      };
    }

    written += rows.length;
  }

  return {
    status: 'ingested',
    fileHash: dedupResult.fileHash,
    chunksWritten: written,
    chunksSkippedUnchanged: unchangedCount,
    chunksQueuedForReview: queuedCount,
    chunksDeletedStale,
    truncated: documentTruncated,
  };
}