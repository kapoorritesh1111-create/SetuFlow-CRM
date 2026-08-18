// S48/S50/PR65 provider-agnostic external research orchestration.
// Provider output is evidence-only: every accepted company must retain a cited source URL.
// CRM conversion and outreach remain separate explicit human actions.

import { z } from 'zod';

export type DiscoveryResearchDirection = 'buyers' | 'suppliers' | 'partners' | 'manufacturers';
export type DiscoverySourceStrategy = 'crm_and_external' | 'crm_only' | 'external_only';
export type DiscoveryCampaignMode = 'saved_icp' | 'new_market' | 'lookalike' | 'fresh_research' | 'supplier_partner';
export type DiscoveryVerticalPlaybook = 'food_beverage' | 'packaging' | 'apparel' | 'manufacturing' | 'distribution' | 'general_trade';
export type DiscoveryOutcome = 'completed_with_results' | 'completed_no_matches' | 'partial' | 'failed' | 'scope_confirmation_required' | 'provider_not_configured';

export type DiscoverySearchInput = {
  objective: string;
  countries: string[];
  products: string[];
  companyTypes: string[];
  targetIndustries: string[];
  excludedCompanyTypes: string[];
  researchDirection: DiscoveryResearchDirection;
  sourceStrategy: DiscoverySourceStrategy;
  campaignMode: DiscoveryCampaignMode;
  resultLimit: number;
  minimumFitScore: number;
  searchLanguages: string[];
  sourceRequirements: string[];
  duplicateDetection: boolean;
  suggestContactRoles: boolean;
  lookalikeLeadId?: string | null;
  verticalProfile?: Record<string, unknown>;
};

export type ProviderCandidate = {
  companyName: string;
  country: string;
  companyType: string;
  websiteUrl?: string | null;
  sourceLabel: string;
  sourceUrl: string;
  evidence: Record<string, unknown>[];
  contacts: Array<{ fullName?: string; title?: string; email?: string; phone?: string; sourceUrl?: string; confidence?: number }>;
  matchExplanation: string;
  matchedProducts: string[];
  matchedIndustries: string[];
  researchDirection: DiscoveryResearchDirection;
  provider: string;
  model: string | null;
};

export type ProviderDiagnostics = {
  provider: string;
  model: string | null;
  responseId: string | null;
  verticalPlaybook: DiscoveryVerticalPlaybook;
  researchPlan: string[];
  sourcesFound: number;
  rowsReturned: number;
  rowsAccepted: number;
  rowsRejected: number;
  rejectionReasons: Record<string, number>;
  partialFailures: string[];
  researchSummary: string;
  outcome: DiscoveryOutcome;
};

export type ProviderSearchResult = {
  candidates: ProviderCandidate[];
  providerCostAmount: number;
  providerCostCurrency: string;
  disabled: boolean;
  message: string;
  diagnostics: ProviderDiagnostics;
};

export type ExternalDiscoveryProvider = {
  key: string;
  label: string;
  capabilities: string[];
  configured: boolean;
  search(input: DiscoverySearchInput): Promise<ProviderSearchResult>;
};

const text = (value: unknown) => String(value ?? '').trim();
const list = (value: unknown) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
const lower = (values: string[]) => values.map((value) => value.toLowerCase());
const stringArraySchema = { type: 'array', items: { type: 'string' } } as const;
const stringSchema = { type: 'string' } as const;

function diagnostics(input: DiscoverySearchInput, provider: string, model: string | null, outcome: DiscoveryOutcome, message = ''): ProviderDiagnostics {
  return {
    provider,
    model,
    responseId: null,
    verticalPlaybook: resolveVerticalPlaybook(input),
    researchPlan: buildDiscoveryResearchPlan(input),
    sourcesFound: 0,
    rowsReturned: 0,
    rowsAccepted: 0,
    rowsRejected: 0,
    rejectionReasons: {},
    partialFailures: [],
    researchSummary: message,
    outcome,
  };
}

const manualProvider: ExternalDiscoveryProvider = {
  key: 'manual',
  label: 'Manual research',
  capabilities: ['manual_intake'],
  configured: true,
  async search(input) {
    const message = 'No production external discovery provider is configured. No companies were generated. Configure OPENAI_API_KEY, ANTHROPIC_API_KEY, or EXA_API_KEY, or continue with human-reviewed manual research.';
    return {
      candidates: [],
      providerCostAmount: 0,
      providerCostCurrency: 'USD',
      disabled: true,
      message,
      diagnostics: diagnostics(input, 'manual', null, 'provider_not_configured', message),
    };
  },
};

export function resolveVerticalPlaybook(input: DiscoverySearchInput): DiscoveryVerticalPlaybook {
  const profileVertical = text(input.verticalProfile?.vertical).toLowerCase();
  const corpus = [profileVertical, ...input.targetIndustries, ...input.products, ...input.companyTypes].join(' ').toLowerCase();
  if (/packag|pouch|label|laminat|carton|film|roll stock|prepress|flexo|rotogravure/.test(corpus)) return 'packaging';
  if (/apparel|garment|textile|fabric|fashion|clothing/.test(corpus)) return 'apparel';
  if (/food|beverage|snack|chips|crisps|grocery|fruit|vegetable|fmcg|organic/.test(corpus)) return 'food_beverage';
  if (/manufactur|industrial|oem|component|engineering|factory/.test(corpus)) return 'manufacturing';
  if (/distribution|distributor|wholesale|dealer|reseller|retail network/.test(corpus)) return 'distribution';
  return 'general_trade';
}

function directionNoun(direction: DiscoveryResearchDirection) {
  if (direction === 'buyers') return 'buyers and customers';
  if (direction === 'suppliers') return 'suppliers';
  if (direction === 'partners') return 'channel partners';
  return 'manufacturers';
}

export function buildDiscoveryResearchPlan(input: DiscoverySearchInput) {
  const market = input.countries.join(', ');
  const products = input.products.join(', ');
  const targets = input.companyTypes.join(', ');
  const direction = directionNoun(input.researchDirection);
  const playbook = resolveVerticalPlaybook(input);
  const plan = [
    `${market}: official companies operating as ${targets} for ${products}`,
    `${market}: official product, portfolio, import, sourcing, distribution, retail, or manufacturing evidence for ${products}`,
    `${market}: trade associations, exhibitor directories, procurement notices, and verified industry directories relevant to ${direction}`,
  ];

  if (playbook === 'food_beverage') {
    plan.push(
      `${market}: food importers, snack distributors, grocery retailers, and health-food retailers carrying products comparable to ${products}`,
      `${market}: official healthy-snack, fruit-crisp, vegetable-chip, premium-grocery, and private-label category pages`,
    );
  } else if (playbook === 'packaging') {
    plan.push(
      `${market}: brand owners and manufacturers with printed packaging, pouch, label, laminate, carton, or roll-stock demand signals`,
      `${market}: product launches, packaging redesigns, procurement signals, sustainability requirements, and relevant packaging formats`,
    );
  } else if (playbook === 'apparel') {
    plan.push(`${market}: apparel brands, retailers, buying houses, garment factories, textile mills, fabric capabilities, and compliance evidence`);
  } else if (playbook === 'manufacturing') {
    plan.push(`${market}: OEM, contract-manufacturing, technical-capability, procurement, certification, and expansion signals`);
  } else if (playbook === 'distribution') {
    plan.push(`${market}: distributors, wholesalers, dealers, resellers, retail accounts, territory coverage, and category gaps`);
  } else {
    plan.push(`${market}: verified importers, exporters, distributors, retailers, suppliers, partners, or manufacturers matching the confirmed brief`);
  }

  return plan.slice(0, 8);
}

function playbookEvidence(playbook: DiscoveryVerticalPlaybook) {
  if (playbook === 'food_beverage') {
    return {
      instructions: 'Capture product categories, brands or categories carried, and evidence of import, distribution, grocery retail, health-food retail, food service, or private-label activity. Do not infer unsupported sales volume.',
      properties: {
        product_categories: stringArraySchema,
        import_distribution_retail_evidence: stringArraySchema,
        brands_or_categories_carried: stringArraySchema,
      },
    };
  }
  if (playbook === 'packaging') {
    return {
      instructions: 'Capture packaging-specific evidence only for this Packaging playbook: matched packaging categories, packaging use cases, buyer need signals, relevant decision-maker roles, current packaging format, incumbent supplier pain when explicitly sourced, material, print process, estimated annual volume only when explicitly sourced, and sustainability requirements.',
      properties: {
        matched_packaging_categories: stringArraySchema,
        packaging_use_cases: stringArraySchema,
        buyer_need_signals: stringArraySchema,
        decision_maker_roles: stringArraySchema,
        current_packaging_format: stringSchema,
        incumbent_supplier_pain: stringSchema,
        estimated_annual_volume: stringSchema,
        material: stringSchema,
        print_process: stringSchema,
        sustainability_requirements: stringArraySchema,
      },
    };
  }
  if (playbook === 'apparel') {
    return {
      instructions: 'Capture apparel product categories, fabric or garment capabilities, certifications, sustainability evidence, retail or production signals, sampling capability, and export-market evidence when sourced.',
      properties: {
        product_categories: stringArraySchema,
        fabric_or_garment_capabilities: stringArraySchema,
        certifications: stringArraySchema,
        sustainability_evidence: stringArraySchema,
        retail_or_production_signals: stringArraySchema,
      },
    };
  }
  if (playbook === 'manufacturing') {
    return {
      instructions: 'Capture technical capabilities, production processes, certifications, procurement signals, factory expansion, OEM or contract-manufacturing evidence, and export experience when sourced.',
      properties: {
        technical_capabilities: stringArraySchema,
        production_processes: stringArraySchema,
        certifications: stringArraySchema,
        procurement_or_expansion_signals: stringArraySchema,
      },
    };
  }
  if (playbook === 'distribution') {
    return {
      instructions: 'Capture territories served, sales channels, brands or categories carried, logistics capability, retail coverage, and evidence of category gaps or expansion when sourced.',
      properties: {
        territories: stringArraySchema,
        sales_channels: stringArraySchema,
        brands_or_categories: stringArraySchema,
        logistics_or_retail_coverage: stringArraySchema,
        category_gap_signals: stringArraySchema,
      },
    };
  }
  return {
    instructions: 'Capture verified business model, market activity, relevant products or services, international trade evidence, and the exact evidence supporting the match.',
    properties: {
      market_activity: stringArraySchema,
      business_model_signals: stringArraySchema,
      international_trade_evidence: stringArraySchema,
    },
  };
}

function responseJsonSchema(input: DiscoverySearchInput) {
  const playbook = resolveVerticalPlaybook(input);
  const vertical = playbookEvidence(playbook);
  const verticalKeys = Object.keys(vertical.properties);
  return {
    type: 'object',
    additionalProperties: false,
    required: ['research_summary', 'candidates'],
    properties: {
      research_summary: { type: 'string' },
      candidates: {
        type: 'array',
        maxItems: Math.max(5, Math.min(100, input.resultLimit)),
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'company_name', 'country', 'company_type', 'website_url', 'source_url', 'source_label',
            'evidence_summary', 'match_explanation', 'matched_products', 'matched_industries',
            'suggested_contact_roles', 'research_direction', 'vertical_evidence',
          ],
          properties: {
            company_name: { type: 'string' },
            country: { type: 'string' },
            company_type: { type: 'string' },
            website_url: { type: 'string' },
            source_url: { type: 'string' },
            source_label: { type: 'string' },
            evidence_summary: { type: 'string' },
            match_explanation: { type: 'string' },
            matched_products: stringArraySchema,
            matched_industries: stringArraySchema,
            suggested_contact_roles: stringArraySchema,
            research_direction: { type: 'string', enum: [input.researchDirection] },
            vertical_evidence: {
              type: 'object',
              additionalProperties: false,
              required: verticalKeys,
              properties: vertical.properties,
            },
          },
        },
      },
    },
  };
}

export function buildDiscoveryPrompt(input: DiscoverySearchInput) {
  const playbook = resolveVerticalPlaybook(input);
  const vertical = playbookEvidence(playbook);
  const researchPlan = buildDiscoveryResearchPlan(input);
  const exclusions = input.excludedCompanyTypes.length ? input.excludedCompanyTypes.join(', ') : 'none specified';
  return [
    'Perform source-backed B2B opportunity discovery using web search.',
    'The confirmed campaign scope below is the source of truth. Do not replace it with a saved profile, a different country, or a different company type.',
    `Objective: ${input.objective}`,
    `Research direction: ${input.researchDirection} (${directionNoun(input.researchDirection)})`,
    `Target countries: ${input.countries.join(', ')}`,
    `Products or services: ${input.products.join(', ')}`,
    `Target company types: ${input.companyTypes.join(', ')}`,
    `Target industries: ${input.targetIndustries.join(', ') || 'not additionally specified'}`,
    `Excluded company types: ${exclusions}`,
    `Search languages: ${input.searchLanguages.join(', ')}`,
    `Required source evidence: ${input.sourceRequirements.join('; ')}`,
    `Vertical playbook: ${playbook}`,
    `Vertical evidence instructions: ${vertical.instructions}`,
    'Research plan:',
    ...researchPlan.map((query, index) => `${index + 1}. ${query}`),
    'Return only real organizations supported by an opened source. Every candidate must have a company name, country, company type, source URL, evidence summary, and match explanation.',
    'Use the confirmed research direction exactly. Do not mix buyers with suppliers, suppliers with buyers, or internal CRM records with external web results.',
    'Exclude any company that matches the excluded company types. Do not fabricate companies, contacts, facts, product portfolios, volumes, certifications, or sources.',
    input.suggestContactRoles ? 'You may suggest role titles such as category buyer or procurement manager, but do not invent named contacts.' : 'Return an empty suggested_contact_roles array.',
  ].join('\n');
}

export function buildDiscoveryQuery(input: DiscoverySearchInput) {
  const plan = buildDiscoveryResearchPlan(input);
  return `${plan[0]}. ${plan.slice(1).join(' | ')}`;
}

const TRACKING_PARAMS = [/^utm_/i, /^ga_/i, /^mc_/i, /^pk_/i, /^vero_/i, /^oly_/i, /^hsa_/i, /^icid$/i, /^gclid$/i, /^dclid$/i, /^fbclid$/i, /^msclkid$/i, /^ref$/i, /^referrer$/i, /^source$/i];

export function canonicalizeSourceUrl(value: unknown) {
  const raw = text(value);
  if (!raw) return '';
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(parsed.protocol)) return '';
    parsed.hash = '';
    parsed.hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.some((pattern) => pattern.test(key))) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    const pathname = parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    const query = parsed.searchParams.toString();
    return `https://${parsed.hostname}${pathname === '/' ? '' : pathname}${query ? `?${query}` : ''}`;
  } catch {
    return '';
  }
}

export function sourceComparisonKey(value: unknown) {
  const canonical = canonicalizeSourceUrl(value);
  if (!canonical) return '';
  try {
    const parsed = new URL(canonical);
    const pathname = parsed.pathname.replace(/\/$/, '') || '/';
    return `${parsed.hostname.toLowerCase()}${pathname.toLowerCase()}`;
  } catch {
    return '';
  }
}

function addCanonicalSource(target: Map<string, string>, value: unknown) {
  const url = canonicalizeSourceUrl(value);
  const key = sourceComparisonKey(url);
  if (url && key && !target.has(key)) target.set(key, url);
}

const CandidateRowSchema = z.object({
  company_name: z.string(),
  country: z.string(),
  company_type: z.string(),
  website_url: z.string(),
  source_url: z.string(),
  source_label: z.string(),
  evidence_summary: z.string(),
  match_explanation: z.string(),
  matched_products: z.array(z.string()),
  matched_industries: z.array(z.string()),
  suggested_contact_roles: z.array(z.string()),
  research_direction: z.enum(['buyers', 'suppliers', 'partners', 'manufacturers']),
  vertical_evidence: z.record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())])),
}).strict();

const StructuredResponseSchema = z.object({
  research_summary: z.string(),
  candidates: z.array(CandidateRowSchema).max(100),
}).strict();

type CandidateRow = z.infer<typeof CandidateRowSchema>;

function parseStructuredResponse(raw: string) {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(clean);
    return StructuredResponseSchema.safeParse(parsed);
  } catch (error) {
    return {
      success: false as const,
      error: { message: error instanceof Error ? error.message : 'Structured response was not valid JSON.' },
    };
  }
}

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function excludedByScope(companyType: string, excluded: string[]) {
  const normalized = companyType.toLowerCase();
  return excluded.some((value) => {
    const candidate = value.toLowerCase();
    return candidate && (normalized.includes(candidate) || candidate.includes(normalized));
  });
}

function candidateDomain(websiteUrl: string, sourceUrl: string, companyName: string) {
  try {
    return new URL(websiteUrl || sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return companyName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
}

function candidatesFromStructuredResponse(
  raw: string,
  allowedSources: Map<string, string>,
  provider: string,
  model: string | null,
  query: string,
  input: DiscoverySearchInput,
  responseId: string | null,
): ProviderSearchResult {
  const parsed = parseStructuredResponse(raw);
  const base = diagnostics(input, provider, model, 'failed');
  base.responseId = responseId;
  base.sourcesFound = allowedSources.size;

  if (!parsed.success) {
    base.rejectionReasons.structured_output_invalid = 1;
    base.rowsRejected = 1;
    base.researchSummary = `Structured provider output failed validation: ${parsed.error.message}`;
    return {
      candidates: [],
      providerCostAmount: 0,
      providerCostCurrency: 'USD',
      disabled: false,
      message: base.researchSummary,
      diagnostics: base,
    };
  }

  const rejectionReasons: Record<string, number> = {};
  const seen = new Set<string>();
  const candidates: ProviderCandidate[] = [];
  const rows = parsed.data.candidates.slice(0, input.resultLimit);
  for (const row of rows) {
    const companyName = text(row.company_name);
    const country = text(row.country);
    const companyType = text(row.company_type);
    const evidenceSummary = text(row.evidence_summary);
    const matchExplanation = text(row.match_explanation);
    const sourceKey = sourceComparisonKey(row.source_url);
    const citedSourceUrl = sourceKey ? allowedSources.get(sourceKey) : undefined;

    if (!companyName || !country || !companyType || !evidenceSummary || !matchExplanation) {
      increment(rejectionReasons, 'missing_required_fields');
      continue;
    }
    if (!citedSourceUrl) {
      increment(rejectionReasons, 'source_not_cited_by_provider_tool');
      continue;
    }
    if (row.research_direction !== input.researchDirection) {
      increment(rejectionReasons, 'research_direction_mismatch');
      continue;
    }
    if (excludedByScope(companyType, input.excludedCompanyTypes)) {
      increment(rejectionReasons, 'excluded_company_type');
      continue;
    }

    const websiteUrl = canonicalizeSourceUrl(row.website_url);
    const dedupeKey = candidateDomain(websiteUrl, citedSourceUrl, companyName);
    if (seen.has(dedupeKey)) {
      increment(rejectionReasons, 'duplicate_in_provider_output');
      continue;
    }
    seen.add(dedupeKey);

    const verticalEvidence = row.vertical_evidence as Record<string, unknown>;
    candidates.push({
      companyName,
      country,
      companyType,
      websiteUrl: websiteUrl || null,
      sourceLabel: text(row.source_label) || `${provider} source-backed research`,
      sourceUrl: citedSourceUrl,
      evidence: [{
        type: 'provider_search_result',
        url: citedSourceUrl,
        text: evidenceSummary.slice(0, 2400),
        match_explanation: matchExplanation.slice(0, 1600),
        matched_products: list(row.matched_products),
        matched_industries: list(row.matched_industries),
        suggested_contact_roles: input.suggestContactRoles ? list(row.suggested_contact_roles) : [],
        research_direction: input.researchDirection,
        vertical_playbook: resolveVerticalPlaybook(input),
        vertical_evidence: verticalEvidence,
        ...verticalEvidence,
        query,
        research_plan: buildDiscoveryResearchPlan(input),
        provider,
        model,
        fetched_at: new Date().toISOString(),
      }],
      contacts: [],
      matchExplanation,
      matchedProducts: list(row.matched_products),
      matchedIndustries: list(row.matched_industries),
      researchDirection: input.researchDirection,
      provider,
      model,
    });
  }

  const rejectedCount = rows.length - candidates.length;
  const outcome: DiscoveryOutcome = candidates.length ? 'completed_with_results' : 'completed_no_matches';
  const resultDiagnostics: ProviderDiagnostics = {
    ...base,
    rowsReturned: rows.length,
    rowsAccepted: candidates.length,
    rowsRejected: rejectedCount,
    rejectionReasons,
    researchSummary: parsed.data.research_summary,
    outcome,
  };
  const message = `${provider} returned ${candidates.length} source-backed candidate${candidates.length === 1 ? '' : 's'} from ${rows.length} structured row${rows.length === 1 ? '' : 's'}. Results remain separate from CRM until human review and approval.`;
  return { candidates, providerCostAmount: 0, providerCostCurrency: 'USD', disabled: false, message, diagnostics: resultDiagnostics };
}

function openAiOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const content = Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : [];
    return content.map((part) => {
      if (!part || typeof part !== 'object') return '';
      const row = part as Record<string, unknown>;
      if (typeof row.text === 'string') return row.text;
      if (row.text && typeof row.text === 'object' && typeof (row.text as Record<string, unknown>).value === 'string') return String((row.text as Record<string, unknown>).value);
      return '';
    });
  }).filter(Boolean).join('\n');
}

function openAiSources(payload: Record<string, unknown>) {
  const urls = new Map<string, string>();
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const itemRow = item as Record<string, unknown>;
    if (itemRow.type === 'web_search_call' && itemRow.action && typeof itemRow.action === 'object') {
      const sources = Array.isArray((itemRow.action as Record<string, unknown>).sources) ? (itemRow.action as Record<string, unknown>).sources as unknown[] : [];
      for (const source of sources) if (source && typeof source === 'object') addCanonicalSource(urls, (source as Record<string, unknown>).url);
    }
    const content = Array.isArray(itemRow.content) ? itemRow.content as unknown[] : [];
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const annotations = Array.isArray((part as Record<string, unknown>).annotations) ? (part as Record<string, unknown>).annotations as unknown[] : [];
      for (const annotation of annotations) {
        if (!annotation || typeof annotation !== 'object') continue;
        const row = annotation as Record<string, unknown>;
        addCanonicalSource(urls, row.url);
        if (row.url_citation && typeof row.url_citation === 'object') addCanonicalSource(urls, (row.url_citation as Record<string, unknown>).url);
      }
    }
  }
  return urls;
}

async function searchOpenAi(input: DiscoverySearchInput): Promise<ProviderSearchResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const requestedModel = process.env.OPENAI_SEARCH_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
  const query = buildDiscoveryQuery(input);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: requestedModel,
      store: false,
      tools: [{ type: 'web_search' }],
      include: ['web_search_call.action.sources'],
      input: buildDiscoveryPrompt(input),
      text: {
        format: {
          type: 'json_schema',
          name: 'external_discovery_candidates',
          strict: true,
          schema: responseJsonSchema(input),
        },
      },
      max_output_tokens: Math.max(3500, Math.min(12000, input.resultLimit * 280)),
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`OpenAI web research returned HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 500)}`);
  const payload = await response.json() as Record<string, unknown>;
  const model = text(payload.model) || requestedModel;
  return candidatesFromStructuredResponse(openAiOutputText(payload), openAiSources(payload), 'openai_web_search', model, query, input, text(payload.id) || null);
}

function anthropicContentText(content: unknown[]) {
  return content.map((block) => block && typeof block === 'object' && (block as Record<string, unknown>).type === 'text' ? text((block as Record<string, unknown>).text) : '').filter(Boolean).join('\n');
}

function anthropicSources(content: unknown[]) {
  const urls = new Map<string, string>();
  const visit = (value: unknown, insideResult = false) => {
    if (Array.isArray(value)) { value.forEach((item) => visit(item, insideResult)); return; }
    if (!value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    const nextInside = insideResult || row.type === 'web_search_tool_result' || row.type === 'web_search_result';
    if (nextInside) addCanonicalSource(urls, row.url);
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
  const requestedModel = process.env.ANTHROPIC_SEARCH_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }];
  const schema = responseJsonSchema(input);
  const userMessage = `${buildDiscoveryPrompt(input)}\n\nReturn one JSON object matching this schema exactly: ${JSON.stringify(schema)}`;
  let payload = await anthropicRequest(apiKey, { model: requestedModel, max_tokens: Math.max(4500, Math.min(12000, input.resultLimit * 280)), temperature: 0.1, tools, messages: [{ role: 'user', content: userMessage }] });
  if (payload.stop_reason === 'pause_turn' && Array.isArray(payload.content)) {
    payload = await anthropicRequest(apiKey, { model: requestedModel, max_tokens: Math.max(4500, Math.min(12000, input.resultLimit * 280)), temperature: 0.1, tools, messages: [{ role: 'user', content: userMessage }, { role: 'assistant', content: payload.content }] });
  }
  const content = Array.isArray(payload.content) ? payload.content : [];
  const model = text(payload.model) || requestedModel;
  return candidatesFromStructuredResponse(anthropicContentText(content), anthropicSources(content), 'anthropic_web_search', model, buildDiscoveryQuery(input), input, text(payload.id) || null);
}

function emptyVerticalEvidence(playbook: DiscoveryVerticalPlaybook) {
  const properties = playbookEvidence(playbook).properties;
  return Object.fromEntries(Object.entries(properties).map(([key, schema]) => [key, schema.type === 'array' ? [] : '']));
}

const aiConfigured = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
const aiWebProvider: ExternalDiscoveryProvider = {
  key: 'ai_web',
  label: 'AI web research (OpenAI preferred / Anthropic fallback)',
  capabilities: ['web_search', 'structured_output', 'source_evidence', 'vertical_playbooks', 'packaging_market_signals', 'official_pages', 'provider_fallback'],
  configured: aiConfigured,
  async search(input) {
    const attempts: Array<{ name: string; run: (value: DiscoverySearchInput) => Promise<ProviderSearchResult | null> }> = [
      { name: 'OpenAI', run: searchOpenAi },
      { name: 'Anthropic', run: searchAnthropic },
    ];
    const failures: string[] = [];
    let empty: ProviderSearchResult | null = null;
    for (const attempt of attempts) {
      try {
        const result = await attempt.run(input);
        if (!result) continue;
        if (result.diagnostics.outcome === 'failed') {
          failures.push(`${attempt.name}: ${result.message}`);
          continue;
        }
        result.diagnostics.partialFailures = [...failures];
        if (result.candidates.length) return result;
        if (!empty) empty = result;
      } catch (error) {
        failures.push(`${attempt.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (empty) {
      empty.diagnostics.partialFailures = failures;
      if (failures.length) empty.message = `${empty.message} Fallback notes: ${failures.join(' | ')}`;
      return empty;
    }
    if (failures.length) {
      const message = `Configured AI web research failed: ${failures.join(' | ')}`;
      const resultDiagnostics = diagnostics(input, 'ai_web', null, 'failed', message);
      resultDiagnostics.partialFailures = failures;
      return { candidates: [], providerCostAmount: 0, providerCostCurrency: 'USD', disabled: false, message, diagnostics: resultDiagnostics };
    }
    return manualProvider.search(input);
  },
};

const exaProvider: ExternalDiscoveryProvider = {
  key: 'exa',
  label: 'Exa licensed web discovery',
  capabilities: ['web_search', 'source_evidence', 'vertical_playbooks', 'packaging_market_signals', 'official_pages'],
  configured: Boolean(process.env.EXA_API_KEY),
  async search(input) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      const message = 'Exa is available but EXA_API_KEY is not configured. No research was run.';
      return { candidates: [], providerCostAmount: 0, providerCostCurrency: 'USD', disabled: true, message, diagnostics: diagnostics(input, 'exa', null, 'provider_not_configured', message) };
    }
    const query = buildDiscoveryQuery(input);
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ query, type: 'auto', numResults: input.resultLimit, contents: { text: { maxCharacters: 2200 }, highlights: { numSentences: 5 } } }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Licensed discovery provider returned HTTP ${response.status}.`);
    const payload = await response.json() as { results?: Array<Record<string, unknown>>; costDollars?: { total?: number } };
    const allowed = new Map<string, string>();
    const playbook = resolveVerticalPlaybook(input);
    const rows: CandidateRow[] = [];
    for (const row of payload.results ?? []) {
      addCanonicalSource(allowed, row.url);
      const corpus = `${text(row.title)} ${text(row.text)} ${list(row.highlights).join(' ')}`.toLowerCase();
      const country = input.countries.find((value) => corpus.includes(value.toLowerCase())) ?? '';
      const companyType = input.companyTypes.find((value) => corpus.includes(value.toLowerCase())) ?? '';
      const matchedProducts = input.products.filter((value) => corpus.includes(value.toLowerCase()));
      const matchedIndustries = input.targetIndustries.filter((value) => corpus.includes(value.toLowerCase()));
      rows.push({
        company_name: text(row.title).split(/[|–—-]/)[0]?.trim() ?? '',
        country,
        company_type: companyType,
        website_url: text(row.url),
        source_url: text(row.url),
        source_label: 'Exa licensed web discovery',
        evidence_summary: text(row.text).slice(0, 2200),
        match_explanation: [country && `Target market evidence: ${country}`, companyType && `Target company type evidence: ${companyType}`, matchedProducts.length && `Product evidence: ${matchedProducts.join(', ')}`].filter(Boolean).join('. '),
        matched_products: matchedProducts,
        matched_industries: matchedIndustries,
        suggested_contact_roles: [],
        research_direction: input.researchDirection,
        vertical_evidence: emptyVerticalEvidence(playbook),
      });
    }
    const structured = JSON.stringify({ research_summary: `Exa returned ${(payload.results ?? []).length} web results for validation.`, candidates: rows });
    const result = candidatesFromStructuredResponse(structured, allowed, 'exa', null, query, input, null);
    result.providerCostAmount = Number(payload.costDollars?.total ?? 0);
    result.message = `Exa returned ${result.candidates.length} source-backed candidate${result.candidates.length === 1 ? '' : 's'}. Every result still requires human verification before CRM conversion or outreach.`;
    return result;
  },
};

const registry = new Map<string, ExternalDiscoveryProvider>([
  [manualProvider.key, manualProvider],
  [aiWebProvider.key, aiWebProvider],
  [exaProvider.key, exaProvider],
]);

export function registerDiscoveryProvider(provider: ExternalDiscoveryProvider) { registry.set(provider.key, provider); }
export function getDefaultDiscoveryProvider() { return aiWebProvider.configured ? aiWebProvider : exaProvider.configured ? exaProvider : manualProvider; }
export function getDiscoveryProvider(key: string) { if (key === 'manual' || key === 'auto') return getDefaultDiscoveryProvider(); return registry.get(key) ?? getDefaultDiscoveryProvider(); }
export function listDiscoveryProviders() { return Array.from(registry.values()); }
