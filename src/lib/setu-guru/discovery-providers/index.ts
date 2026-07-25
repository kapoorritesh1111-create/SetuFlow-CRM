// S48/S50 provider-agnostic external research orchestration.
// Provider output is evidence-only: every candidate must retain a source URL and supporting text.
// CRM conversion and outreach remain separate explicit human actions.

export type DiscoverySearchInput = {
  countries: string[];
  products: string[];
  buyerTypes: string[];
  verticalProfile?: Record<string, unknown>;
};

export type ProviderCandidate = {
  companyName: string;
  country?: string | null;
  companyType?: string | null;
  websiteUrl?: string | null;
  sourceLabel: string;
  sourceUrl?: string | null;
  evidence?: Record<string, unknown>[];
  contacts?: Array<{ fullName?: string; title?: string; email?: string; phone?: string; sourceUrl?: string; confidence?: number }>;
};

export type ProviderSearchResult = {
  candidates: ProviderCandidate[];
  providerCostAmount: number;
  providerCostCurrency: string;
  disabled: boolean;
  message: string;
};

export type ExternalDiscoveryProvider = {
  key: string;
  label: string;
  capabilities: string[];
  configured: boolean;
  search(input: DiscoverySearchInput): Promise<ProviderSearchResult>;
};

const manualProvider: ExternalDiscoveryProvider = {
  key: 'manual',
  label: 'Manual research',
  capabilities: ['manual_intake'],
  configured: true,
  async search() {
    return {
      candidates: [],
      providerCostAmount: 0,
      providerCostCurrency: 'USD',
      disabled: true,
      message: 'No production external discovery provider is configured. No companies were generated. Configure OPENAI_API_KEY, ANTHROPIC_API_KEY, or EXA_API_KEY, or continue with human-reviewed manual research.',
    };
  },
};

const text = (value: unknown) => String(value ?? '').trim();
const list = (value: unknown) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];

function buildPackagingQuery(input: DiscoverySearchInput) {
  const profile = input.verticalProfile ?? {};
  const families = list(profile.packaging_families);
  const sectors = list(profile.end_use_sectors);
  const services = list(profile.services);
  const markets = input.countries.length ? ` in ${input.countries.slice(0, 6).join(', ')}` : '';
  const targets = input.buyerTypes.length ? input.buyerTypes.slice(0, 8).join(', ') : 'brand owners and manufacturers';
  const needs = [...input.products, ...families, ...services].filter(Boolean).slice(0, 15).join(', ');
  const sectorText = sectors.length ? ` serving ${sectors.slice(0, 8).join(', ')}` : '';
  return `Find real companies${markets} that are ${targets}${sectorText} and have evidence of buying, launching, sourcing, or using ${needs || 'printed packaging, labels, pouches, roll stock, or packaging design services'}. Prefer official company pages, product launch pages, exhibitor directories, procurement notices, and trade associations. Return only source-backed organizations.`;
}

function researchPrompt(input: DiscoverySearchInput) {
  return `${buildPackagingQuery(input)}\n\nReturn JSON only: an array of at most 20 objects with keys company_name, country, company_type, website_url, source_url, source_label, evidence_summary, matched_packaging_categories, packaging_use_cases, buyer_need_signals, decision_maker_roles, current_packaging_format, incumbent_supplier_pain, estimated_annual_volume. source_url must be a page opened by the search tool. Do not include contacts or unsupported facts. Use null or [] for missing evidence.`;
}

function canonicalUrl(value: unknown) {
  try {
    const url = new URL(text(value));
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function parseRows(raw: string) {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start < 0 || end <= start) return [] as Record<string, unknown>[];
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object' && !Array.isArray(row))) : [];
  } catch {
    return [] as Record<string, unknown>[];
  }
}

function candidatesFromRows(rows: Record<string, unknown>[], allowedUrls: Set<string>, provider: string, query: string) {
  const seen = new Set<string>();
  const candidates: ProviderCandidate[] = [];
  for (const row of rows) {
    const sourceUrl = canonicalUrl(row.source_url);
    if (!sourceUrl || !allowedUrls.has(sourceUrl)) continue;
    const companyName = text(row.company_name);
    if (companyName.length < 2) continue;
    const websiteUrl = canonicalUrl(row.website_url);
    const domain = (() => { try { return new URL(websiteUrl || sourceUrl).hostname.replace(/^www\./, '').toLowerCase(); } catch { return companyName.toLowerCase(); } })();
    if (seen.has(domain)) continue;
    seen.add(domain);
    candidates.push({
      companyName,
      country: text(row.country) || null,
      companyType: text(row.company_type) || null,
      websiteUrl: websiteUrl || null,
      sourceLabel: text(row.source_label) || `${provider} source-backed research`,
      sourceUrl,
      evidence: [{
        type: 'provider_search_result',
        url: sourceUrl,
        text: text(row.evidence_summary).slice(0, 1800),
        matched_packaging_categories: list(row.matched_packaging_categories),
        packaging_use_cases: list(row.packaging_use_cases),
        buyer_need_signals: list(row.buyer_need_signals),
        decision_maker_roles: list(row.decision_maker_roles),
        current_packaging_format: text(row.current_packaging_format) || null,
        incumbent_supplier_pain: text(row.incumbent_supplier_pain) || null,
        estimated_annual_volume: Number(row.estimated_annual_volume) || null,
        query,
        provider,
        fetched_at: new Date().toISOString(),
      }],
      contacts: [],
    });
  }
  return candidates;
}

function openAiOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const content = Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : [];
    return content.map((part) => part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string' ? String((part as Record<string, unknown>).text) : '');
  }).filter(Boolean).join('\n');
}

function openAiUrls(payload: Record<string, unknown>) {
  const urls = new Set<string>();
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : [];
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const annotations = Array.isArray((part as Record<string, unknown>).annotations) ? (part as Record<string, unknown>).annotations as unknown[] : [];
      for (const annotation of annotations) {
        if (!annotation || typeof annotation !== 'object') continue;
        const row = annotation as Record<string, unknown>;
        const direct = canonicalUrl(row.url);
        const nested = row.url_citation && typeof row.url_citation === 'object' ? canonicalUrl((row.url_citation as Record<string, unknown>).url) : '';
        if (direct) urls.add(direct);
        if (nested) urls.add(nested);
      }
    }
  }
  return urls;
}

async function searchOpenAi(input: DiscoverySearchInput): Promise<ProviderSearchResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const query = buildPackagingQuery(input);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.OPENAI_SEARCH_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini', store: false, tools: [{ type: 'web_search' }], input: researchPrompt(input), max_output_tokens: 4500 }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`OpenAI web research returned HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 500)}`);
  const payload = await response.json() as Record<string, unknown>;
  const candidates = candidatesFromRows(parseRows(openAiOutputText(payload)), openAiUrls(payload), 'openai_web_search', query);
  return { candidates, providerCostAmount: 0, providerCostCurrency: 'USD', disabled: false, message: `OpenAI web research returned ${candidates.length} source-backed candidate${candidates.length === 1 ? '' : 's'}. Results remain separate from CRM until human review and approval.` };
}

function anthropicContentText(content: unknown[]) {
  return content.map((block) => block && typeof block === 'object' && (block as Record<string, unknown>).type === 'text' ? text((block as Record<string, unknown>).text) : '').filter(Boolean).join('\n');
}

function anthropicUrls(content: unknown[]) {
  const urls = new Set<string>();
  const visit = (value: unknown, insideResult = false) => {
    if (Array.isArray(value)) { value.forEach((item) => visit(item, insideResult)); return; }
    if (!value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    const nextInside = insideResult || row.type === 'web_search_tool_result' || row.type === 'web_search_result';
    if (nextInside) { const url = canonicalUrl(row.url); if (url) urls.add(url); }
    Object.values(row).forEach((nested) => visit(nested, nextInside));
  };
  visit(content);
  return urls;
}

async function anthropicRequest(apiKey: string, body: Record<string, unknown>) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Anthropic web research returned HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 500)}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function searchAnthropic(input: DiscoverySearchInput): Promise<ProviderSearchResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const query = buildPackagingQuery(input);
  const model = process.env.ANTHROPIC_SEARCH_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }];
  const userMessage = researchPrompt(input);
  let payload = await anthropicRequest(apiKey, { model, max_tokens: 4500, temperature: 0.1, tools, messages: [{ role: 'user', content: userMessage }] });
  if (payload.stop_reason === 'pause_turn' && Array.isArray(payload.content)) {
    payload = await anthropicRequest(apiKey, { model, max_tokens: 4500, temperature: 0.1, tools, messages: [{ role: 'user', content: userMessage }, { role: 'assistant', content: payload.content }] });
  }
  const content = Array.isArray(payload.content) ? payload.content : [];
  const candidates = candidatesFromRows(parseRows(anthropicContentText(content)), anthropicUrls(content), 'anthropic_web_search', query);
  return { candidates, providerCostAmount: 0, providerCostCurrency: 'USD', disabled: false, message: `Anthropic web research returned ${candidates.length} source-backed candidate${candidates.length === 1 ? '' : 's'}. Results remain separate from CRM until human review and approval.` };
}

const aiWebProvider: ExternalDiscoveryProvider = {
  key: 'ai_web',
  label: 'AI web research (OpenAI / Anthropic)',
  capabilities: ['web_search', 'source_evidence', 'packaging_market_signals', 'official_pages', 'provider_fallback'],
  configured: Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
  async search(input) {
    const preference = text(process.env.AI_SEARCH_PROVIDER || 'openai').toLowerCase();
    const attempts = preference === 'anthropic' ? [searchAnthropic, searchOpenAi] : [searchOpenAi, searchAnthropic];
    const failures: string[] = [];
    let empty: ProviderSearchResult | null = null;
    for (const attempt of attempts) {
      try {
        const result = await attempt(input);
        if (!result) continue;
        if (result.candidates.length) return result;
        empty = result;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    return empty ?? { candidates: [], providerCostAmount: 0, providerCostCurrency: 'USD', disabled: !this.configured, message: failures.length ? `Configured AI web research failed: ${failures.join(' | ')}` : 'No production external discovery provider is configured. No companies were generated.' };
  },
};

const exaProvider: ExternalDiscoveryProvider = {
  key: 'exa',
  label: 'Exa licensed web discovery',
  capabilities: ['web_search', 'source_evidence', 'packaging_market_signals', 'official_pages'],
  configured: Boolean(process.env.EXA_API_KEY),
  async search(input) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return { candidates: [], providerCostAmount: 0, providerCostCurrency: 'USD', disabled: true, message: 'Exa is available but EXA_API_KEY is not configured. No research was run.' };
    const query = buildPackagingQuery(input);
    const response = await fetch('https://api.exa.ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify({ query, type: 'auto', numResults: 25, contents: { text: { maxCharacters: 1800 }, highlights: { numSentences: 4 } } }), cache: 'no-store' });
    if (!response.ok) throw new Error(`Licensed discovery provider returned HTTP ${response.status}.`);
    const payload = await response.json() as { results?: Array<Record<string, unknown>>; costDollars?: { total?: number } };
    const allowed = new Set((payload.results ?? []).map((row) => canonicalUrl(row.url)).filter(Boolean));
    const rows = (payload.results ?? []).map((row) => ({ company_name: text(row.title).split(/[|–—-]/)[0], website_url: row.url, source_url: row.url, source_label: 'Exa licensed web discovery', evidence_summary: text(row.text), matched_packaging_categories: [], packaging_use_cases: [], buyer_need_signals: [], decision_maker_roles: [] }));
    const candidates = candidatesFromRows(rows, allowed, 'exa', query);
    return { candidates, providerCostAmount: Number(payload.costDollars?.total ?? 0), providerCostCurrency: 'USD', disabled: false, message: `Exa returned ${candidates.length} source-backed candidate${candidates.length === 1 ? '' : 's'}. Every result still requires human verification before CRM conversion or outreach.` };
  },
};

const registry = new Map<string, ExternalDiscoveryProvider>([[manualProvider.key, manualProvider], [aiWebProvider.key, aiWebProvider], [exaProvider.key, exaProvider]]);
export function registerDiscoveryProvider(provider: ExternalDiscoveryProvider) { registry.set(provider.key, provider); }
export function getDefaultDiscoveryProvider() { return Array.from(registry.values()).find((provider) => provider.key !== 'manual' && provider.configured) ?? manualProvider; }
export function getDiscoveryProvider(key: string) { if ((key === 'manual' || key === 'auto') && getDefaultDiscoveryProvider().key !== 'manual') return getDefaultDiscoveryProvider(); return registry.get(key) ?? manualProvider; }
export function listDiscoveryProviders() { return Array.from(registry.values()); }
