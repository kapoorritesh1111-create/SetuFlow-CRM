/*
 * Provider abstraction
 *
 * This module decouples high level AI tasks from any concrete model
 * provider (e.g. OpenAI, Anthropic, internal rules engines).  A
 * single exported function `runAiTask` executes a given task
 * against the selected provider and returns a normalised result
 * wrapper.  When AI is disabled or misconfigured the function
 * immediately returns a safe fallback.  Additional providers should
 * implement the interface defined below and register themselves via
 * `getAiProvider`.
 */

import { AiTaskType, AiProviderResult } from './contracts';
import { getAiProviderName, isAiEnabled } from './config';

/**
 * Interface implemented by AI providers.  Each provider must
 * implement `invoke` which accepts a task type and payload and
 * returns a result promise.  The payload shape is intentionally
 * untyped here; callers should enforce their own input types.
 */
interface AiProvider {
  name: string;
  invoke<T>(task: AiTaskType, payload: unknown): Promise<AiProviderResult<T>>;
}

/**
 * Mock provider used when AI is disabled or no provider is
 * configured.  It returns empty results immediately.  This allows
 * callers to avoid conditionals and rely on fallback behaviour.
 */
class NoopProvider implements AiProvider {
  name = 'noop';
  async invoke<T>(_task: AiTaskType, _payload: unknown): Promise<AiProviderResult<T>> {
    return { ok: false, error: 'AI disabled', data: undefined };
  }
}

/**
 * Provider implementation for Anthropic Claude.
 *
 * Uses the Anthropic Messages API directly via fetch so no additional
 * SDK dependency is required. Requires ANTHROPIC_API_KEY to be set in
 * the server environment. When the key is absent the provider returns a
 * safe fallback so the application degrades gracefully rather than
 * throwing. The payload is expected to contain at least a `prompt`
 * string that will be sent as the user message.
 *
 * Model: claude-sonnet-4-20250514 — capable enough for all current
 * draft types (follow-up, intro, cover note, compliance, summary)
 * while remaining cost-efficient for high-frequency generation.
 */
class AnthropicProvider implements AiProvider {
  name = 'anthropic';

  async invoke<T>(task: AiTaskType, payload: unknown): Promise<AiProviderResult<T>> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { ok: false, error: 'ANTHROPIC_API_KEY is not set' };
    }

    const input = payload as Record<string, unknown>;
    // The payload shape sent by buildDraftPayload includes a `content`
    // field that already has the full operator-ready draft text. For
    // generation tasks we forward that as the user prompt so the model
    // can refine or expand it. For other task types we serialize the
    // payload as context.
    const userMessage =
      typeof input?.prompt === 'string' && input.prompt.trim()
        ? input.prompt.trim()
        : typeof input?.content === 'string' && input.content.trim()
          ? `Refine and improve this commercial draft while keeping the key facts intact. Return only the improved draft text with no preamble:\n\n${input.content.trim()}`
          : `Complete this task: ${task}. Context: ${JSON.stringify(payload)}`;

    const systemPrompt =
      'You are a precise commercial writing assistant for an import-export trade team. ' +
      'Produce concise, professional operator-ready drafts. ' +
      'Never add new commercial terms, pricing figures, or compliance claims that were not in the original context. ' +
      'Return only the requested draft text — no explanations, no preamble, no markdown fencing.';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        return { ok: false, error: `Anthropic API error ${response.status}: ${errorText}` };
      }

      const json = await response.json() as {
        content?: Array<{ type: string; text?: string }>;
        error?: { message?: string };
      };

      if (json.error?.message) {
        return { ok: false, error: json.error.message };
      }

      const text = (json.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('\n')
        .trim();

      if (!text) {
        return { ok: false, error: 'Anthropic returned an empty response' };
      }

      return { ok: true, data: text as unknown as T };
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Anthropic provider fetch failed',
      };
    }
  }
}

/**
 * @deprecated Use AnthropicProvider. Kept for backward compatibility with
 * any callers that reference the 'openai' provider name via environment
 * variable. Will be removed in Sprint 9 architecture cleanup.
 */
class OpenAiProvider implements AiProvider {
  name = 'openai';
  async invoke<T>(_task: AiTaskType, _payload: unknown): Promise<AiProviderResult<T>> {
    return {
      ok: false,
      error: 'OpenAI provider not implemented — set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY to activate AI.',
    };
  }
}

/**
 * Map of available providers keyed by name.  Register new providers
 * here when implementing them.  Provider names should match
 * environment variable values used in `getAiProviderName()`.
 */
const providers: Record<string, AiProvider> = {
  noop: new NoopProvider(),
  none: new NoopProvider(),
  openai: new OpenAiProvider(),
  anthropic: new AnthropicProvider(),
};

/**
 * Returns the active provider instance based on configuration.  If
 * AI is disabled or the provider cannot be found, the noop provider
 * is returned.
 */
export function getAiProvider(): AiProvider {
  if (!isAiEnabled()) return new NoopProvider();
  const name = getAiProviderName().toLowerCase();
  return providers[name] ?? new NoopProvider();
}

/**
 * Execute an AI task using the active provider.  This helper
 * centralises error handling and ensures the returned result is
 * normalised.  Callers should not throw from this function; instead
 * inspect the returned `ok` flag and `error` message.
 *
 * @param task The type of AI task to run (e.g. enrichment, followUp).
 * @param payload The serialisable payload to send to the provider.
 */
export async function runAiTask<T>(task: AiTaskType, payload: unknown): Promise<AiProviderResult<T>> {
  const provider = getAiProvider();
  try {
    const result = await provider.invoke<T>(task, payload);
    return result;
  } catch (error: unknown) {
    // Catch unexpected errors so the caller always receives a result
    // object rather than a rejected promise.  Log to the console in
    // development to aid debugging; in production we may integrate
    // with a more sophisticated logging system.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('AI provider invoke error:', error);
    }
    return { ok: false, error: (error as Error).message };
  }
}