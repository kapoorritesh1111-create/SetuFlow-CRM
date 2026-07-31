/**
 * src/lib/rag/embedding-provider.ts
 * Module B — Deep Embedding Generation Server (wrapper)
 *
 * Standardizes calls to the standalone BGE-M3 inference server. Mirrors the
 * conventions already established in `src/lib/ai/provider.ts`:
 *   - raw `fetch` against the model server, no SDK dependency
 *   - explicit env-driven configuration with a safe, non-throwing fallback
 *   - a normalised `{ ok, data | error }` result shape
 *
 * The BGE-M3 server itself (hosting, health checks, provisioning) is a
 * separate infra task per the SOW — this file only wraps the HTTP contract
 * the app-layer code depends on, so ingest.ts never talks to the model
 * server directly.
 *
 * Vector dimension: 1024 (matches `guru_embeddings.embedding vector(1024)`
 * in supabase/migrations/20260713000000_guru_rag_embeddings_hardening.sql).
 * If the embedding model or its output dimension ever changes, that is a
 * breaking schema change — see EMBEDDING_MODEL_VERSION note below before
 * touching this file.
 */

export const EMBEDDING_DIMENSIONS = 1024;

/**
 * Bumping this string is how a future re-index / model-migration path
 * would be triggered (Mayank's point re: no re-index path exists yet).
 * Every row written to guru_embeddings stores this value in
 * `embedding_model`. A migration script can then find all rows where
 * `embedding_model <> EMBEDDING_MODEL_VERSION` and re-embed them —
 * without this constant, there would be no reliable way to tell which
 * rows are stale after a model swap.
 */
export const EMBEDDING_MODEL_VERSION = 'bge-m3';

export interface EmbeddingResult {
  ok: boolean;
  embeddings?: number[][];
  error?: string;
}

interface BgeInferenceResponse {
  embeddings?: number[][];
  error?: string;
}

function getInferenceUrl(): string | null {
  const url = process.env.BGE_M3_INFERENCE_URL;
  return url && url.trim() ? url.trim() : null;
}

/**
 * Embeds a batch of text chunks via the BGE-M3 inference server.
 *
 * Batches everything in one request rather than looping per-chunk — the
 * caller (ingest.ts) is responsible for keeping batch size reasonable
 * (e.g. chunking a large document into multiple calls of ~50-100 chunks)
 * so a single request doesn't time out.
 *
 * Returns `ok: false` with an error message on any failure (missing env,
 * network error, malformed response) rather than throwing, so ingest.ts
 * can route the failure into its own retry/error-handling logic instead
 * of needing a try/catch around every call site.
 */
export async function embedChunks(texts: string[]): Promise<EmbeddingResult> {
  if (!texts.length) {
    return { ok: false, error: 'embedChunks called with an empty texts array' };
  }

  const inferenceUrl = getInferenceUrl();
  if (!inferenceUrl) {
    return { ok: false, error: 'BGE_M3_INFERENCE_URL is not set' };
  }

  try {
    const response = await fetch(`${inferenceUrl}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: texts, model: EMBEDDING_MODEL_VERSION }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return { ok: false, error: `BGE-M3 inference error ${response.status}: ${errorText}` };
    }

    const json = (await response.json()) as BgeInferenceResponse;

    if (json.error) {
      return { ok: false, error: json.error };
    }

    const embeddings = json.embeddings ?? [];

    if (embeddings.length !== texts.length) {
      return {
        ok: false,
        error: `BGE-M3 returned ${embeddings.length} embeddings for ${texts.length} inputs`,
      };
    }

    const badIndex = embeddings.findIndex((vec) => vec.length !== EMBEDDING_DIMENSIONS);
    if (badIndex !== -1) {
      return {
        ok: false,
        error: `Embedding at index ${badIndex} has ${embeddings[badIndex].length} dims, expected ${EMBEDDING_DIMENSIONS}`,
      };
    }

    return { ok: true, embeddings };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'BGE-M3 inference fetch failed',
    };
  }
}

/**
 * Lightweight health check for the inference server, intended for use by
 * an observability/readiness probe (Mayank's point #4 — no metrics/health
 * visibility currently exists for this service).
 */
export async function checkEmbeddingServerHealth(): Promise<{ healthy: boolean; detail: string }> {
  const inferenceUrl = getInferenceUrl();
  if (!inferenceUrl) {
    return { healthy: false, detail: 'BGE_M3_INFERENCE_URL is not set' };
  }

  try {
    const response = await fetch(`${inferenceUrl}/health`, { method: 'GET' });
    if (!response.ok) {
      return { healthy: false, detail: `Health check returned ${response.status}` };
    }
    return { healthy: true, detail: 'ok' };
  } catch (err: unknown) {
    return {
      healthy: false,
      detail: err instanceof Error ? err.message : 'Health check fetch failed',
    };
  }
}