/**
 * src/lib/rag/ingest.ts
 * Module A, Step 6 — Ingest Orchestrator
 * 
 * Secure, production-grade orchestrator managing deduplication, VLM parsing,
 * truncation handling, confidence routing, stale chunk cleanup, and batched embeddings.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkFileDuplicate } from './dedup';
import { parseWithVlm } from './vlm-parser';
import { queueForHumanReview } from './review-queue';
import { chunkPages, type Chunk } from './chunker';
import { embedChunks, EMBEDDING_MODEL_VERSION } from './embedding-provider';

const CONFIDENCE_THRESHOLD = 0.75;
const EMBED_BATCH_SIZE = 50;
const MAX_WORDS = 100000; // Fallback heuristic for extreme document sizes

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
  // Validate input parameters defensively
  if (!input.organizationId || !input.sourceType || !input.sourceId) {
    return { status: 'error', error: 'Missing required ingestion metadata parameters.' };
  }

  if (!Buffer.isBuffer(input.fileBuffer) || input.fileBuffer.length === 0) {
    return { status: 'error', error: 'Invalid or empty file buffer provided for ingestion.' };
  }

  // FIXED: Properly resolve Supabase client with required credentials for @supabase/supabase-js
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  const supabase = input.dbClient ?? createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // --- Step 1: File-Level Deduplication Check ---
  let dedupResult;
  try {
    dedupResult = await checkFileDuplicate({
      organizationId: input.organizationId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      fileBuffer: input.fileBuffer,
      dbClient: supabase,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: 'INGEST_DEDUP_FAILURE', error: errorMsg, orgId: input.organizationId }));
    return { status: 'error', error: errorMsg };
  }

  if (dedupResult.isDuplicate) {
    console.info(JSON.stringify({ event: 'INGEST_SKIPPED_DUPLICATE', fileHash: dedupResult.fileHash, orgId: input.organizationId }));
    return { status: 'skipped_duplicate', fileHash: dedupResult.fileHash };
  }

  // --- Step 1.5: Global Binary Hash Deduplication Guardrail ---
  const { data: globalDuplicateMatch, error: globalDupError } = await supabase
    .from('guru_embeddings')
    .select('source_id')
    .eq('organization_id', input.organizationId)
    .eq('source_type', input.sourceType)
    .eq('metadata->>file_hash', dedupResult.fileHash)
    .limit(1);

  if (!globalDupError && globalDuplicateMatch && globalDuplicateMatch.length > 0) {
    const existingSourceId = globalDuplicateMatch[0].source_id;
    if (existingSourceId !== input.sourceId) {
      console.warn(JSON.stringify({
        event: 'INGEST_GLOBAL_DEDUP_MATCH',
        hash: dedupResult.fileHash,
        existingSourceId,
        newSourceId: input.sourceId,
      }));
      return { status: 'skipped_duplicate', fileHash: dedupResult.fileHash };
    }
  }

  // --- Step 2: VLM Document Parsing ---
  let pages;
  try {
    pages = await parseWithVlm(input.fileBuffer, input.mimeType);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: 'INGEST_VLM_PARSE_ERROR', error: errorMsg }));
    return { status: 'error', error: `VLM parse failed: ${errorMsg}` };
  }

  if (!Array.isArray(pages) || pages.length === 0) {
    return { status: 'error', error: 'VLM parser returned zero pages or invalid output.' };
  }

  // Truncation detection via stop_reason
  const wasTruncatedByStopReason = pages.some((p: any) => p?.truncated === true);
  if (wasTruncatedByStopReason) {
    console.warn(JSON.stringify({ event: 'INGEST_TRUNCATION_STOP_REASON', sourceId: input.sourceId }));
  }

  const chunks = chunkPages(pages);
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return { status: 'error', error: 'Chunker produced no valid chunks from parsed pages.' };
  }

  // Backup heuristic check on total word count
  const totalWordCount = chunks.reduce((acc, chunk) => acc + (chunk.content?.split(/\s+/).length || 0), 0);
  const wasTruncatedByWordCount = totalWordCount > MAX_WORDS;
  if (wasTruncatedByWordCount) {
    console.warn(JSON.stringify({ event: 'INGEST_TRUNCATION_WORD_COUNT', words: totalWordCount, sourceId: input.sourceId }));
  }

  const documentTruncated = wasTruncatedByStopReason || wasTruncatedByWordCount;

  // --- Step 2.5: Stale Chunk Cleanup & Index Sync ---
  const { data: existingChunks, error: existingChunksError } = await supabase
    .from('guru_embeddings')
    .select('chunk_index, metadata')
    .eq('organization_id', input.organizationId)
    .eq('source_type', input.sourceType)
    .eq('source_id', input.sourceId);

  if (existingChunksError) {
    return { status: 'error', error: `Existing chunk lookup failed: ${existingChunksError.message}` };
  }

  const existingHashByIndex = new Map<number, string>(
    (existingChunks ?? []).map((row: any) => [row.chunk_index, row.metadata?.chunk_hash])
  );

  const incomingChunkIndices = new Set(chunks.map((c) => c.chunkIndex));
  const staleChunkIndices = (existingChunks ?? [])
    .filter((row: any) => !incomingChunkIndices.has(row.chunk_index))
    .map((row: any) => row.chunk_index);

  let chunksDeletedStale = 0;
  if (staleChunkIndices.length > 0) {
    const { error: deleteError } = await supabase
      .from('guru_embeddings')
      .delete()
      .eq('organization_id', input.organizationId)
      .eq('source_type', input.sourceType)
      .eq('source_id', input.sourceId)
      .in('chunk_index', staleChunkIndices);

    if (deleteError) {
      console.error(JSON.stringify({ event: 'INGEST_STALE_DELETE_ERROR', error: deleteError.message }));
    } else {
      chunksDeletedStale = staleChunkIndices.length;
    }
  }

  const changedChunks = chunks.filter((c) => existingHashByIndex.get(c.chunkIndex) !== c.chunkHash);
  const unchangedCount = chunks.length - changedChunks.length;

  // --- Step 3: Confidence Routing ---
  const acceptable: Chunk[] = [];
  const lowConfidence: Chunk[] = [];
  for (const chunk of changedChunks) {
    if (chunk.confidence < CONFIDENCE_THRESHOLD) {
      lowConfidence.push(chunk);
    } else {
      acceptable.push(chunk);
    }
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
      console.error(JSON.stringify({
        event: 'INGEST_REVIEW_QUEUE_FAIL',
        chunkIndex: chunk.chunkIndex,
        error: err instanceof Error ? err.message : String(err),
      }));
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

  // --- Step 4: Batched Embedding Generation & Upsert ---
  let written = 0;
  for (let i = 0; i < acceptable.length; i += EMBED_BATCH_SIZE) {
    const batch = acceptable.slice(i, i + EMBED_BATCH_SIZE);
    const embedResult = await embedChunks(batch.map((c) => c.content));

    if (!embedResult.ok || !embedResult.embeddings) {
      return {
        status: 'error',
        error: `Embedding generation failed on batch starting at chunk ${batch[0].chunkIndex}: ${embedResult.error}`,
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

    const { error: upsertError } = await supabase
      .from('guru_embeddings')
      .upsert(rows, { onConflict: 'organization_id,source_type,source_id,chunk_index' });

    if (upsertError) {
      return {
        status: 'error',
        error: `Database upsert failed on batch starting at chunk ${batch[0].chunkIndex}: ${upsertError.message}`,
      };
    }

    written += rows.length;
  }

  console.info(JSON.stringify({
    event: 'INGEST_SUCCESS',
    sourceId: input.sourceId,
    written,
    unchanged: unchangedCount,
    queued: queuedCount,
    staleDeleted: chunksDeletedStale,
    truncated: documentTruncated,
  }));

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