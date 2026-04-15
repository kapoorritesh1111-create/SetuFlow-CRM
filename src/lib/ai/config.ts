/*
 * AI configuration helpers
 *
 * This module centralises environment reads and configuration for
 * AI functionality.  Checking whether AI is enabled and which
 * provider to use is restricted to this file to avoid scattering
 * environment variable logic throughout the codebase.  If no
 * environment variables are set then AI will default to being
 * disabled, allowing the application to run gracefully without any
 * provider keys.
 */

/**
 * Determine whether AI functionality is enabled.  The presence of
 * either `NEXT_PUBLIC_AI_ENABLED` (for client side usage) or
 * `AI_ENABLED` (for server side usage) must be truthy.  Any other
 * value disables AI entirely.  When disabled the system should
 * return safe fallbacks rather than attempting network calls.
 *
 * As a convenience, AI is also considered enabled when
 * ANTHROPIC_API_KEY or OPENAI_API_KEY is present in the environment,
 * even if AI_ENABLED is not explicitly set. This allows activation
 * by simply adding the API key to Vercel environment variables.
 */
export function isAiEnabled(): boolean {
  // Explicit key-based activation — adding ANTHROPIC_API_KEY is enough.
  if (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) return true;
  // Legacy flag-based activation.
  const clientFlag = process.env.NEXT_PUBLIC_AI_ENABLED;
  const serverFlag = process.env.AI_ENABLED;
  const raw = clientFlag ?? serverFlag;
  if (!raw) return false;
  return !['0', 'false', 'off', 'no'].includes(String(raw).toLowerCase());
}

/**
 * Returns the configured provider name.  This allows the provider
 * abstraction layer to decide which backend to invoke.  If no
 * provider is explicitly configured, the name is inferred from
 * available API keys: ANTHROPIC_API_KEY → 'anthropic',
 * OPENAI_API_KEY → 'openai', otherwise 'none'.  The application
 * should not directly use this value; instead call
 * `getAiProvider()` from provider.ts.
 */
export function getAiProviderName(): string {
  const explicit = process.env.AI_PROVIDER || process.env.NEXT_PUBLIC_AI_PROVIDER;
  if (explicit) return explicit;
  // Auto-infer from available keys so teams don't need to set AI_PROVIDER
  // explicitly — just setting ANTHROPIC_API_KEY is enough to activate AI.
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'none';
}

/**
 * Return a provider specific API key if present.  Providers must
 * explicitly document which env var they expect.  The default
 * implementation supports both `ANTHROPIC_API_KEY` (preferred) and
 * `OPENAI_API_KEY` for backward compatibility.  Additional providers
 * can be added here in the future.  Never commit secrets to the
 * repository.
 */
export function getAiProviderKey(): string | undefined {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return anthropicKey;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) return openAiKey;
  return undefined;
}

/**
 * Infer the active provider name from available environment keys when
 * AI_PROVIDER is not explicitly set. Returns 'anthropic' if
 * ANTHROPIC_API_KEY is present, 'openai' if OPENAI_API_KEY is present,
 * and 'none' otherwise.
 */
export function inferAiProviderName(): string {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'none';
}