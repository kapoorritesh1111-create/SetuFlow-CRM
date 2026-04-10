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
 * Provider implementation for a hypothetical OpenAI service.  This
 * class is intentionally minimal; it does not make any network
 * requests and simply returns an error stating that no provider
 * integration exists.  In future iterations you can extend this
 * class to call OpenAI APIs using `fetch` or the official
 * sdk.  Note: avoid adding heavy dependencies in this file; if you
 * integrate with external APIs ensure that your build remains
 * deployable on Vercel.
 */
class OpenAiProvider implements AiProvider {
  name = 'openai';
  async invoke<T>(_task: AiTaskType, _payload: unknown): Promise<AiProviderResult<T>> {
    return {
      ok: false,
      error: 'OpenAI provider not implemented',
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