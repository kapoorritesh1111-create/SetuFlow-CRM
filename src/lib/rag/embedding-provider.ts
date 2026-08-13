/**
 * src/lib/rag/embedding-provider.ts
 * Module B — Deep Embedding Generation Server (wrapper)
 *
 * Standardizes calls to the standalone BGE-M3 inference server, now
 * deployed as a HuggingFace Inference Endpoint running the
 * text-embeddings-inference (TEI) engine (private auth, scale-to-zero
 * after 1h idle — see endpoint dashboard).
 *
 * TEI's actual API contract (confirmed from the live deployed endpoint,
 * not assumed):
 *   - POST /embed with body { "inputs": string[] } — NOT wrapped with a
 *     "model" field; the model is baked into the deployment itself.
 *   - Response is a bare array of embedding vectors: number[][] — NOT
 *     wrapped in { embeddings: [...] }.
 *   - Endpoint is "Private", so every request needs
 *     Authorization: Bearer <token> with a HuggingFace access token that
 *     has Inference Endpoint call permission.
 *   - GET /health returns 200 when the replica is warm and ready.
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
 * would be triggered. Every row written to guru_embeddings stores this
 * value in `embedding_model`. A migration script can then find all rows
 * where `embedding_model <> EMBEDDING_MODEL_VERSION` and re-embed them.
 */
export const EMBEDDING_MODEL_VERSION = 'bge-m3';

export interface EmbeddingResult {
  ok: boolean;
  embeddings?: number[][];
  error?: string;
}

function getInferenceUrl(): string | null {
  const url = process.env.BGE_M3_INFERENCE_URL;
  return url && url.trim() ? url.trim().replace(/\/+$/, '') : null;
}

function getApiKey(): string | null {
  const key = process.env.BGE_M3_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

/**
 * Embeds a batch of text chunks via the BGE-M3 (TEI) inference endpoint.
 *
 * Batches everything in one request rather than looping per-chunk — the
 * caller (ingest.ts) is responsible for keeping batch size reasonable
 * (e.g. chunking a large document into multiple calls of ~50-100 chunks)
 * so a single request doesn't time out.
 *
 * NOTE: this endpoint scales to zero after 1h idle. The first request
 * after a cold period may take significantly longer (cold start) than
 * subsequent ones — callers with tight timeouts should account for this.
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

  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: 'BGE_M3_API_KEY is not set (endpoint is Private, auth is required)' };
  }

  try {
    const response = await fetch(`${inferenceUrl}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ inputs: texts }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      // --- ADDED: Fix for silent embedding server failure (Make failures loud) ---
      console.error(`[EMBEDDING FATAL] Server returned ${response.status}:`, errorText);
      throw new Error(`Embedding server unreachable or failed. Status: ${response.status}. Details: ${errorText}`);
      // ------------------------------------------------------------------------
    }

    // TEI's /embed returns a bare array of vectors, not { embeddings: [...] }.
    const embeddings = (await response.json()) as number[][];

    if (!Array.isArray(embeddings)) {
      return { ok: false, error: 'BGE-M3 (TEI) response was not an array as expected' };
    }

    if (embeddings.length !== texts.length) {
      return {
        ok: false,
        error: `BGE-M3 returned ${embeddings.length} embeddings for ${texts.length} inputs`,
      };
    }

    const badIndex = embeddings.findIndex((vec) => !Array.isArray(vec) || vec.length !== EMBEDDING_DIMENSIONS);
    if (badIndex !== -1) {
      return {
        ok: false,
        error: `Embedding at index ${badIndex} has ${embeddings[badIndex]?.length ?? 'unknown'} dims, expected ${EMBEDDING_DIMENSIONS}`,
      };
    }

    return { ok: true, embeddings };
  } catch (err: unknown) {
    // --- ADDED: Ensure caught network errors also throw loudly ---
    console.error('[EMBEDDING FATAL] Network or fetch error:', err);
    throw new Error(`Embedding server unreachable: ${err instanceof Error ? err.message : 'Unknown network error'}`);
    // -------------------------------------------------------------
  }
}

/**
 * Lightweight health check for the inference endpoint. TEI exposes a
 * plain GET /health that returns 200 when the replica is warm and ready.
 */
export async function checkEmbeddingServerHealth(): Promise<{ healthy: boolean; detail: string }> {
  const inferenceUrl = getInferenceUrl();
  if (!inferenceUrl) {
    return { healthy: false, detail: 'BGE_M3_INFERENCE_URL is not set' };
  }

  const apiKey = getApiKey();

  try {
    const response = await fetch(`${inferenceUrl}/health`, {
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });
    if (!response.ok) {
      // --- ADDED: Log health check failures clearly ---
      console.error(`[EMBEDDING HEALTH] Health check failed with status ${response.status}`);
      return { healthy: false, detail: `Health check returned ${response.status} (endpoint may be scaled to zero / cold-starting)` };
    }
    return { healthy: true, detail: 'ok' };
  } catch (err: unknown) {
    console.error('[EMBEDDING HEALTH] Fetch failed:', err);
    return {
      healthy: false,
      detail: err instanceof Error ? err.message : 'Health check fetch failed',
    };
  }
}