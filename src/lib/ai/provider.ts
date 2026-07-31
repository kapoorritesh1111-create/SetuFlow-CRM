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

export type AiProviderTaskState = 'supported' | 'fallback' | 'not_implemented';
export type AiGuardrailBoundary = {
  id: string;
  title: string;
  summary: string;
};

export const AI_PROVIDER_CAPABILITIES: Record<string, Record<AiTaskType, AiProviderTaskState>> = {
  noop: {
    [AiTaskType.Enrichment]: 'fallback',
    [AiTaskType.FollowUp]: 'fallback',
    [AiTaskType.Summarisation]: 'fallback',
    [AiTaskType.DraftGeneration]: 'fallback',
  },
  none: {
    [AiTaskType.Enrichment]: 'fallback',
    [AiTaskType.FollowUp]: 'fallback',
    [AiTaskType.Summarisation]: 'fallback',
    [AiTaskType.DraftGeneration]: 'fallback',
  },
  anthropic: {
    [AiTaskType.Enrichment]: 'supported',
    [AiTaskType.FollowUp]: 'supported',
    [AiTaskType.Summarisation]: 'supported',
    [AiTaskType.DraftGeneration]: 'supported',
  },
  openai: {
    [AiTaskType.Enrichment]: 'not_implemented',
    [AiTaskType.FollowUp]: 'not_implemented',
    [AiTaskType.Summarisation]: 'not_implemented',
    [AiTaskType.DraftGeneration]: 'not_implemented',
  },
};

export const AI_GUARDRAIL_BOUNDARIES: AiGuardrailBoundary[] = [
  {
    id: 'no-autonomous-state-change',
    title: 'No autonomous state changes',
    summary: 'AI can recommend or draft, but it cannot advance pipeline stages, approve work, mutate quote state, or complete execution on its own.',
  },
  {
    id: 'no-pricing-authority',
    title: 'No pricing authority',
    summary: 'AI cannot invent pricing, approve overrides, or bypass catalog/base-price truth and approval thresholds.',
  },
  {
    id: 'no-compliance-clearance',
    title: 'No compliance clearance',
    summary: 'AI cannot clear compliance blockers, document blockers, dispatch holds, or release orders without operator action.',
  },
  {
    id: 'operator-reviewed-output',
    title: 'Operator-reviewed output',
    summary: 'AI output is bounded to operator-review workflows such as follow-ups, introductions, summaries, and cover-note drafts.',
  },
];

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
 * Model: claude-sonnet-5 — capable enough for all current
 * draft types (follow-up, intro, cover note, compliance, summary)
 * while remaining cost-efficient for high-frequency generation.
 *
 * NOTE (30-Jul-2026): previously pinned to 'claude-sonnet-4-20250514',
 * which started returning 404 not_found_error — that model id is no
 * longer valid. Updated to 'claude-sonnet-5'. If this ever 404s again,
 * check the current valid model ids before re-pinning.
 */
class AnthropicProvider implements AiProvider {
  name = 'anthropic';

  async invoke<T>(task: AiTaskType, payload: unknown): Promise<AiProviderResult<T>> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { ok: false, error: 'ANTHROPIC_API_KEY is not set' };
    }

    const input = payload as Record<string, unknown>;
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
      'Do not claim approvals, dispatch readiness, contract acceptance, or buyer commitments unless they are already present in the input. ' +
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
          model: 'claude-sonnet-5',
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
 * variable. Will be removed in PR-35 hygiene cleanup unless an actual
 * implementation is added.
 */
class OpenAiProvider implements AiProvider {
  name = 'openai';
  async invoke<T>(_task: AiTaskType, _payload: unknown): Promise<AiProviderResult<T>> {
    return {
      ok: false,
      error: 'OpenAI provider not implemented — the repo only proves Anthropic-backed assistive workflows today.',
    };
  }
}

const providers: Record<string, AiProvider> = {
  noop: new NoopProvider(),
  none: new NoopProvider(),
  openai: new OpenAiProvider(),
  anthropic: new AnthropicProvider(),
};

export function getAiProvider(): AiProvider {
  if (!isAiEnabled()) return new NoopProvider();
  const name = getAiProviderName().toLowerCase();
  return providers[name] ?? new NoopProvider();
}

export function getAiOperationalState() {
  const enabled = isAiEnabled();
  const requestedProvider = getAiProviderName().toLowerCase();
  const activeProvider = enabled && providers[requestedProvider] ? requestedProvider : enabled ? 'noop' : 'none';
  const capabilities = AI_PROVIDER_CAPABILITIES[activeProvider] ?? AI_PROVIDER_CAPABILITIES.none;
  const supportedTasks = Object.entries(capabilities)
    .filter(([, state]) => state === 'supported')
    .map(([task]) => task as AiTaskType);
  const limitedTasks = Object.entries(capabilities)
    .filter(([, state]) => state !== 'supported')
    .map(([task]) => task as AiTaskType);

  return {
    enabled,
    requestedProvider,
    activeProvider,
    supportedTasks,
    limitedTasks,
    guardrails: AI_GUARDRAIL_BOUNDARIES,
    modeLabel: enabled && activeProvider === 'anthropic'
      ? 'Assistive AI with live provider support and mandatory operator review.'
      : 'Guarded fallback mode with no live provider-backed generation.',
  };
}

export async function runAiTask<T>(task: AiTaskType, payload: unknown): Promise<AiProviderResult<T>> {
  const provider = getAiProvider();
  try {
    const result = await provider.invoke<T>(task, payload);
    return result;
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('AI provider invoke error:', error);
    }
    return { ok: false, error: (error as Error).message };
  }
}