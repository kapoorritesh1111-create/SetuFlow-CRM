/**
 * src/lib/rag/dedup.ts
 * Module A, Step 4 — SHA-256 Deduplication
 */

import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';

export function computeFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export interface DedupCheckResult {
  isDuplicate: boolean;
  fileHash: string;
}

/**
 * Checks whether this exact file (by content hash) has already been
 * ingested for this (organization, sourceType, sourceId). Looks at
 * `guru_embeddings.metadata->>file_hash` since there is no separate
 * ingested-files table — the embeddings rows themselves are the record
 * of what's already been processed.
 *
 * NOTE: uses the untyped Supabase client, matching the pattern already
 * used in retrieve.ts, because `guru_embeddings` isn't in the generated
 * types yet.
 */
export async function checkFileDuplicate(params: {
  organizationId: string;
  sourceType: string;
  sourceId: string;
  fileBuffer: Buffer;
  /** Optional injected client — used by standalone scripts/tests that run
   *  outside a Next.js request scope, where `@/lib/supabase/server`'s
   *  `createClient()` can't call `cookies()`. Production call sites (the
   *  API route) omit this and get the normal request-scoped client. */
  dbClient?: any;
}): Promise<DedupCheckResult> {
  const fileHash = computeFileHash(params.fileBuffer);
  const supabaseUntyped = params.dbClient ?? (await createClient());

  const { data, error } = await supabaseUntyped
    .from('guru_embeddings')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('source_type', params.sourceType)
    .eq('source_id', params.sourceId)
    .contains('metadata', { file_hash: fileHash })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`File dedup lookup failed: ${error.message}`);
  }

  return { isDuplicate: Boolean(data?.id), fileHash };
}