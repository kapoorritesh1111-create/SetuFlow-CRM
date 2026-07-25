/*
 * Provider abstraction
 *
 * This module decouples high-level AI tasks from concrete providers. Both
 * Anthropic and OpenAI are supported through server-only environment keys.
 * Every output remains advisory and is returned to an operator-review surface;
 * providers never approve, send, price, advance production, or mutate CRM state.
 */

import { AiTaskType, AiProviderResult } from './contracts';
import { getAiProviderName, isAiEnabled } from './config';

interface AiProvider {
  name: string;
  configured(): boolean;
  invoke<T>(task: AiTaskType, payload: unknown): Promise<AiProviderResult<T>>;
}

export type AiProviderTaskState = 'supported' | 'fallback' | 'not_implemented';
export type AiGuardrailBoundary = { id: string; title: string; summary: string };

export const AI_PROVIDER_CAPABILITIES: Record<string, Record<AiTaskType, AiProviderTaskState>> = {
  noop: { [AiTaskType.Enrichment]: 'fallback', [AiTaskType.FollowUp]: 'fallback', [AiTaskType.Summarisation]: 'fallback', [AiTaskType.DraftGeneration]: 'fallback' },
  none: { [AiTaskType.Enrichment]: 'fallback', [AiTaskType.FollowUp]: 'fallback', [AiTaskType.Summarisation]: 'fallback', [AiTaskType.DraftGeneration]: 'fallback' },
  anthropic: { [AiTaskType.Enrichment]: 'supported', [AiTaskType.FollowUp]: 'supported', [AiTaskType.Summarisation]: 'supported', [AiTaskType.DraftGeneration]: 'supported' },
  openai: { [AiTaskType.Enrichment]: 'supported', [AiTaskType.FollowUp]: 'supported', [AiTaskType.Summarisation]: 'supported', [AiTaskType.DraftGeneration]: 'supported' },
};

export const AI_GUARDRAIL_BOUNDARIES: AiGuardrailBoundary[] = [
  { id: 'no-autonomous-state-change', title: 'No autonomous state changes', summary: 'AI can recommend or draft, but it cannot advance pipeline stages, approve work, mutate quote state, or complete execution on its own.' },
  { id: 'no-pricing-authority', title: 'No pricing authority', summary: 'AI cannot invent pricing, approve overrides, or bypass catalog/base-price truth and approval thresholds.' },
  { id: 'no-compliance-clearance', title: 'No compliance clearance', summary: 'AI cannot clear compliance blockers, document blockers, dispatch holds, or release orders without operator action.' },
  { id: 'operator-reviewed-output', title: 'Operator-reviewed output', summary: 'AI output is bounded to operator-review workflows such as follow-ups, introductions, summaries, research synthesis, and cover-note drafts.' },
];

const ADVISORY_SYSTEM_PROMPT = [
  'You are Setu Guru, an assistive commercial intelligence layer for import-export and packaging teams.',
  'Use only facts present in the supplied context. Clearly identify missing information and uncertainty.',
  'Never invent companies, contacts, prices, certifications, approvals, customer commitments, dispatch readiness, or production status.',
  'Never claim that a message was sent, a quote was accepted, artwork was approved, or a workflow state changed.',
  'All recommendations and drafts require operator review before any CRM write, send, approval, pricing, production, or dispatch action.',
].join(' ');

function taskInstructions(task: AiTaskType) {
  if (task === AiTaskType.Enrichment || task === AiTaskType.FollowUp) return 'Return valid JSON only: an array of no more than 6 objects. Each object must contain id, title, detail, source, and may contain a serializable meta object. Keep recommendations concise, explainable, and grounded in supplied data.';
  if (task === AiTaskType.Summarisation) return 'Return valid JSON only: {"summary":"...","highlights":["..."],"source":"provider"}. Keep the summary concise and factual.';
  return 'Return only the requested operator-review draft text with no preamble or markdown fence. Preserve all commercial facts exactly.';
}

function taskPrompt(task: AiTaskType, payload: unknown) {
  const input = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const explicitPrompt = typeof input.prompt === 'string' && input.prompt.trim() ? input.prompt.trim() : null;
  const content = typeof input.content === 'string' && input.content.trim() ? input.content.trim() : null;
  const context = explicitPrompt ?? (content ? `Refine this operator-review draft without adding facts:\n\n${content}` : JSON.stringify(payload));
  return `${taskInstructions(task)}\n\nTask: ${task}\nContext:\n${context}`;
}

function stripCodeFence(value: string) { return value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(); }

function parseProviderOutput<T>(task: AiTaskType, rawText: string, provider: string): AiProviderResult<T> {
  const text = rawText.trim();
  if (!text) return { ok: false, error: `${provider} returned an empty response` };
  if (task === AiTaskType.DraftGeneration) return { ok: true, data: text as unknown as T };
  try {
    const parsed = JSON.parse(stripCodeFence(text));
    if ((task === AiTaskType.Enrichment || task === AiTaskType.FollowUp) && !Array.isArray(parsed)) return { ok: false, error: `${provider} returned an invalid suggestion payload` };
    if (task === AiTaskType.Summarisation && (!parsed || typeof parsed !== 'object' || typeof parsed.summary !== 'string')) return { ok: false, error: `${provider} returned an invalid summary payload` };
    return { ok: true, data: parsed as T };
  } catch {
    return { ok: false, error: `${provider} returned non-JSON output for a structured task` };
  }
}

class NoopProvider implements AiProvider {
  name = 'noop';
  configured() { return false; }
  async invoke<T>(_task: AiTaskType, _payload: unknown): Promise<AiProviderResult<T>> { return { ok: false, error: 'AI disabled', data: undefined }; }
}

class AnthropicProvider implements AiProvider {
  name = 'anthropic';
  configured() { return Boolean(process.env.ANTHROPIC_API_KEY); }
  async invoke<T>(task: AiTaskType, payload: unknown): Promise<AiProviderResult<T>> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY is not set' };
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514', max_tokens: task === AiTaskType.DraftGeneration ? 1400 : 1800, temperature: 0.2, system: ADVISORY_SYSTEM_PROMPT, messages: [{ role: 'user', content: taskPrompt(task, payload) }] }),
      });
      if (!response.ok) return { ok: false, error: `Anthropic API error ${response.status}: ${(await response.text().catch(() => response.statusText)).slice(0, 500)}` };
      const json = await response.json() as { content?: Array<{ type: string; text?: string }>; error?: { message?: string } };
      if (json.error?.message) return { ok: false, error: json.error.message };
      const text = (json.content ?? []).filter((block) => block.type === 'text').map((block) => block.text ?? '').join('\n').trim();
      return parseProviderOutput<T>(task, text, 'Anthropic');
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Anthropic provider fetch failed' };
    }
  }
}

function extractOpenAiText(json: Record<string, unknown>) {
  if (typeof json.output_text === 'string') return json.output_text;
  const output = Array.isArray(json.output) ? json.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const content = Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : [];
    return content.map((part) => part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string' ? String((part as Record<string, unknown>).text) : '');
  }).filter(Boolean).join('\n').trim();
}

class OpenAiProvider implements AiProvider {
  name = 'openai';
  configured() { return Boolean(process.env.OPENAI_API_KEY); }
  async invoke<T>(task: AiTaskType, payload: unknown): Promise<AiProviderResult<T>> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { ok: false, error: 'OPENAI_API_KEY is not set' };
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5-mini', store: false, instructions: ADVISORY_SYSTEM_PROMPT, input: taskPrompt(task, payload), max_output_tokens: task === AiTaskType.DraftGeneration ? 1400 : 1800 }),
      });
      if (!response.ok) return { ok: false, error: `OpenAI API error ${response.status}: ${(await response.text().catch(() => response.statusText)).slice(0, 500)}` };
      const json = await response.json() as Record<string, unknown>;
      return parseProviderOutput<T>(task, extractOpenAiText(json), 'OpenAI');
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'OpenAI provider fetch failed' };
    }
  }
}

const providers: Record<string, AiProvider> = { noop: new NoopProvider(), none: new NoopProvider(), openai: new OpenAiProvider(), anthropic: new AnthropicProvider() };
function providerOrder() { const requested = getAiProviderName().toLowerCase(); return Array.from(new Set([requested, 'anthropic', 'openai'])).map((name) => providers[name]).filter((provider): provider is AiProvider => Boolean(provider) && provider.configured()); }
export function getAiProvider(): AiProvider { if (!isAiEnabled()) return providers.noop; return providerOrder()[0] ?? providers.noop; }
export function getAiOperationalState() {
  const enabled = isAiEnabled();
  const requestedProvider = getAiProviderName().toLowerCase();
  const configuredProviders = providerOrder().map((provider) => provider.name);
  const activeProvider = enabled ? configuredProviders[0] ?? 'noop' : 'none';
  const capabilities = AI_PROVIDER_CAPABILITIES[activeProvider] ?? AI_PROVIDER_CAPABILITIES.none;
  return { enabled, requestedProvider, activeProvider, configuredProviders, fallbackAvailable: configuredProviders.length > 1, supportedTasks: Object.entries(capabilities).filter(([, state]) => state === 'supported').map(([task]) => task as AiTaskType), limitedTasks: Object.entries(capabilities).filter(([, state]) => state !== 'supported').map(([task]) => task as AiTaskType), guardrails: AI_GUARDRAIL_BOUNDARIES, modeLabel: enabled && configuredProviders.length ? `Assistive AI with ${configuredProviders.join(' → ')} provider support and mandatory operator review.` : 'Guarded fallback mode with no live provider-backed generation.' };
}
export async function runAiTask<T>(task: AiTaskType, payload: unknown): Promise<AiProviderResult<T>> {
  if (!isAiEnabled()) return providers.noop.invoke<T>(task, payload);
  const failures: string[] = [];
  for (const provider of providerOrder()) {
    try { const result = await provider.invoke<T>(task, payload); if (result.ok) return result; failures.push(`${provider.name}: ${result.error || 'unknown error'}`); }
    catch (error) { failures.push(`${provider.name}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return { ok: false, error: failures.length ? `AI providers unavailable — ${failures.join(' | ')}` : 'No configured AI provider is available.' };
}
