/**
 * src/lib/rag/embedding-provider.ts
 * Module B — Deep Embedding Generation Server (wrapper)
 *
 * -------------------------------------------------------------------------
 * NOTE FOR CLIENT / REVIEWER (TESTING EMBEDDING PROVIDER SWITCH):
 * Originally configured to use the BGE-M3 HuggingFace inference endpoint.
 * However, due to Hugging Face account credits expiring/running out, the 
 * endpoint paused (returning 400 Bad Request: "The endpoint is paused"). 
 * 
 * To ensure testing and document ingestion remain unblocked, this provider 
 * has been temporarily switched to use OpenAI embeddings (text-embedding-3-small) 
 * with explicit 1024 dimensions matching the Supabase vector table constraints.
 * 
 * To revert back to BGE-M3 later, simply comment out the OpenAI section below 
 * and uncomment the original BGE-M3 implementation at the bottom.
 * -------------------------------------------------------------------------
 */

import OpenAI from 'openai';

export const EMBEDDING_DIMENSIONS = 1024;

// ==========================================
// CURRENT ACTIVE TESTING CONFIG (OpenAI)
// ==========================================
export const EMBEDDING_MODEL_VERSION = 'text-embedding-3-small';

export interface EmbeddingResult {
  ok: boolean;
  embeddings?: number[][];
  error?: string;
}

export async function embedChunks(texts: string[]): Promise<EmbeddingResult> {
  if (!texts.length) {
    return { ok: false, error: 'embedChunks called with an empty texts array' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'OPENAI_API_KEY is not set in the environment' };
  }

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embeddings = response.data.map((item) => item.embedding);

    if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
      return { ok: false, error: 'OpenAI embedding response format mismatch' };
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
    console.error('[EMBEDDING FATAL] OpenAI embedding generation failed:', err);
    throw new Error(`Embedding server unreachable: ${err instanceof Error ? err.message : 'Unknown network error'}`);
  }
}

export async function checkEmbeddingServerHealth(): Promise<{ healthy: boolean; detail: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { healthy: false, detail: 'OPENAI_API_KEY is not set' };
  }
  return { healthy: true, detail: 'OpenAI embedding provider is ready' };
}


/* =========================================================================
   ORIGINAL BGE-M3 HUGGINGFACE INFERENCE ENDPOINT CODE (COMMENTED OUT)
   =========================================================================

export const EMBEDDING_MODEL_VERSION = 'bge-m3';

function getInferenceUrl(): string | null {
  const url = process.env.BGE_M3_INFERENCE_URL;
  return url && url.trim() ? url.trim().replace(/\/+$/, '') : null;
}

function getApiKey(): string | null {
  const key = process.env.BGE_M3_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

export async function embedChunksBGE(texts: string[]): Promise<EmbeddingResult> {
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
      console.error(`[EMBEDDING FATAL] Server returned ${response.status}:`, errorText);
      throw new Error(`Embedding server unreachable or failed. Status: ${response.status}. Details: ${errorText}`);
    }

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
    console.error('[EMBEDDING FATAL] Network or fetch error:', err);
    throw new Error(`Embedding server unreachable: ${err instanceof Error ? err.message : 'Unknown network error'}`);
  }
}

export async function checkEmbeddingServerHealthBGE(): Promise<{ healthy: boolean; detail: string }> {
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
      console.error(`[EMBEDDING HEALTH] Health check failed with status ${response.status}`);
      return { healthy: false, detail: `Health check returned ${response.status}` };
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
========================================================================= */