// Shared server-side Setu Guru helper for catalog AI features.
// Reuses the working integration pattern from src/app/api/setu-guru/research/route.ts:
// OpenAI /v1/responses with OPENAI_API_KEY + SETU_GURU_MODEL (default gpt-4.1-mini).
// Always degrades gracefully: when the key is absent or the call fails, callers fall
// back to deterministic templates so the wizard / buyer room never break.

export type GuruResult = { ok: true; text: string } | { ok: false; reason: 'not_configured' | 'error' };

export async function callGuruJson(systemPrompt: string, userPayload: unknown): Promise<GuruResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, reason: 'not_configured' };
  const model = process.env.SETU_GURU_MODEL || 'gpt-4.1-mini';
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: typeof userPayload === 'string' ? userPayload : JSON.stringify(userPayload) },
        ],
        tools: [],
      }),
    });
    const result = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, reason: 'error' };
    const text = typeof result.output_text === 'string' ? result.output_text : '';
    if (!text) return { ok: false, reason: 'error' };
    return { ok: true, text };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Parse a JSON object/array out of a model response, tolerating ```json fences and prose. */
export function parseGuruJson<T>(text: string): T | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned) as T; } catch {}
  // fallback: grab the first {...} or [...] block
  const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (match) { try { return JSON.parse(match[0]) as T; } catch {} }
  return null;
}
