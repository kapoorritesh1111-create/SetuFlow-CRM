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
 */
export function isAiEnabled(): boolean {
  // Read both client and server side env vars because Next.js
  // forwards NEXT_PUBLIC_* to the browser.  Strings such as 'false'
  // or '0' are treated as false; any other defined value enables AI.
  const clientFlag = process.env.NEXT_PUBLIC_AI_ENABLED;
  const serverFlag = process.env.AI_ENABLED;
  const raw = clientFlag ?? serverFlag;
  if (!raw) return false;
  return !['0', 'false', 'off', 'no'].includes(String(raw).toLowerCase());
}

/**
 * Returns the configured provider name.  This allows the provider
 * abstraction layer to decide which backend to invoke.  If no
 * provider is configured a default of `none` is returned.  The
 * application should not directly use this value; instead call
 * `getAiProvider()` from provider.ts.
 */
export function getAiProviderName(): string {
  return process.env.AI_PROVIDER || process.env.NEXT_PUBLIC_AI_PROVIDER || 'none';
}

/**
 * Return a provider specific API key if present.  Providers must
 * explicitly document which env var they expect.  The default
 * implementation supports `OPENAI_API_KEY` for potential OpenAI
 * integration.  Additional providers can be added here in the
 * future.  Never commit secrets to the repository.
 */
export function getAiProviderKey(): string | undefined {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) return openAiKey;
  return undefined;
}