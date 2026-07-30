// PR65 reviewable OpenAI discovery provider.
// Valid structured companies are retained for human review even when a returned URL
// cannot be reconciled to the Responses API web-search source list.

import { z } from 'zod';

import {
  buildDiscoveryPrompt,
  buildDiscoveryQuery,
  canonicalizeSourceUrl,
  registerDiscoveryProvider,
  resolveVerticalPlaybook,
  sourceComparisonKey,
  type DiscoverySearchInput,
  type DiscoveryVerticalPlaybook,
  type ExternalDiscoveryProvider,
  type ProviderCandidate,
  type ProviderDiagnostics,
  type ProviderSearchResult,
} from '@/lib/setu-guru/discovery-providers';

const text = (value: unknown) => String(value ?? '').trim();
const list = (value: unknown) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
const stringArraySchema = { type: 'array', items: { type: 'string' } } as const;
const stringSchema = { type: 'string' } as const;

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
  candidates: z.array(CandidateRowSchema).max(20),
}).strict();

type CandidateRow = z.infer<typeof CandidateRowSchema>;

type AttemptResult = {
  ok: boolean;
  retryable: boolean;
  issue: string;
  model: string;
  responseId: string | null;
  sources: Map<string, string>;
  parsed?: z.infer<typeof StructuredResponseSchema>;
};

function verticalEvidenceProperties(playbook: DiscoveryVerticalPlaybook) {
  if (playbook === 'food_beverage') {
    return {
      product_categories: stringArraySchema,
      import_distribution_retail_evidence: stringArraySchema,
      brands_or_categories_carried: stringArraySchema,
    };
  }
  if (playbook === 'packaging') {
    return {
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
    };
  }
  if (playbook === 'apparel') {
    return {
      product_categories: stringArraySchema,
      fabric_or_garment_capabilities: stringArraySchema,
      certifications: stringArraySchema,
      sustainability_evidence: stringArraySchema,
      retail_or_production_signals: stringArraySchema,
    };
  }
  if (playbook === 'manufacturing') {
    return {
      technical_capabilities: stringArraySchema,
      production_processes: stringArraySchema,
      certifications: stringArraySchema,
      procurement_or_expansion_signals: stringArraySchema,
    };
  }
  if (playbook === 'distribution') {
    return {
      territories: stringArraySchema,
      sales_channels: stringArraySchema,
      brands_or_categories: stringArraySchema,
      logistics_or_retail_coverage: stringArraySchema,
      category_gap_signals: stringArraySchema,
    };
  }
  return {
    market_activity: stringArraySchema,
    business_model_signals: stringArraySchema,
    international_trade_evidence: stringArraySchema,
  };
}

function responseSchema(input: DiscoverySearchInput, limit: number) {
  const verticalProperties = verticalEvidenceProperties(resolveVerticalPlaybook(input));
  return {
    type: 'object',
    additionalProperties: false,
    required: ['research_summary', 'candidates'],
    properties: {
      research_summary: { type: 'string' },
      candidates: {
        type: 'array',
        maxItems: limit,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'company_name', 'country', 'company_type', 'website_url', 'source_url', 'source_label',
            'evidence_summary', 'match_explanation', 'matched_products', 'matched_industries',
            'suggested_contact_roles', 'research_direction', 'vertical_evidence',
          ],
          properties: {
            company_name: stringSchema,
            country: stringSchema,
            company_type: stringSchema,
            website_url: stringSchema,
            source_url: stringSchema,
            source_label: stringSchema,
            evidence_summary: stringSchema,
            match_explanation: stringSchema,
            matched_products: stringArraySchema,
            matched_industries: stringArraySchema,
            suggested_contact_roles: stringArraySchema,
            research_direction: { type: 'string', enum: [input.researchDirection] },
            vertical_evidence: {
              type: 'object',
              additionalProperties: false,
              required: Object.keys(verticalProperties),
              properties: verticalProperties,
            },
          },
        },
      },
    },
  };
}

function outputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];
    return content.map((part) => {
      if (!part || typeof part !== 'object') return '';
      const row = part as Record<string, unknown>;
      if (typeof row.text === 'string') return row.text;
      if (row.text && typeof row.text === 'object' && typeof (row.text as Record<string, unknown>).value === 'string') {
        return String((row.text as Record<string, unknown>).value);
      }
      return '';
    });
  }).filter(Boolean).join('\n');
}

function addSource(target: Map<string, string>, value: unknown) {
  const url = canonicalizeSourceUrl(value);
  const key = sourceComparisonKey(url);
  if (url && key && !target.has(key)) target.set(key, url);
}

function sourcesFromPayload(payload: Record<string, unknown>) {
  const urls = new Map<string, string>();
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (row.type === 'web_search_call' && row.action && typeof row.action === 'object') {
      const sources = Array.isArray((row.action as Record<string, unknown>).sources)
        ? (row.action as Record<string, unknown>).sources as unknown[]
        : [];
      for (const source of sources) {
        if (source && typeof source === 'object') addSource(urls, (source as Record<string, unknown>).url);
      }
    }
    const content = Array.isArray(row.content) ? row.content as unknown[] : [];
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const annotations = Array.isArray((part as Record<string, unknown>).annotations)
        ? (part as Record<string, unknown>).annotations as unknown[]
        : [];
      for (const annotation of annotations) {
        if (!annotation || typeof annotation !== 'object') continue;
        const annotationRow = annotation as Record<string, unknown>;
        addSource(urls, annotationRow.url);
        if (annotationRow.url_citation && typeof annotationRow.url_citation === 'object') {
          addSource(urls, (annotationRow.url_citation as Record<string, unknown>).url);
        }
      }
    }
  }
  return urls;
}

function parseStructured(raw: string) {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  if (!clean) return { success: false as const, issue: 'OpenAI returned no structured result text.' };
  try {
    const parsed = StructuredResponseSchema.safeParse(JSON.parse(clean));
    if (!parsed.success) return { success: false as const, issue: 'OpenAI returned a result that did not match the required company evidence structure.' };
    return { success: true as const, data: parsed.data };
  } catch {
    return { success: false as const, issue: 'OpenAI returned an incomplete structured result.' };
  }
}

function concisePrompt(input: DiscoverySearchInput, limit: number, retry: boolean) {
  return [
    buildDiscoveryPrompt(input),
    '',
    `Return no more than ${limit} highly relevant organizations. Fewer strong results are better than padded results.`,
    'The source_url should be the exact opened source that supports the evidence whenever possible.',
    'Keep research_summary under 500 characters.',
    'Keep each evidence_summary under 450 characters and each match_explanation under 350 characters.',
    retry ? 'This is an automatic retry because the first structured response was incomplete. Return a smaller, complete JSON object.' : '',
  ].filter(Boolean).join('\n');
}

async function attemptOpenAi(input: DiscoverySearchInput, limit: number, retry: boolean): Promise<AttemptResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const requestedModel = process.env.OPENAI_SEARCH_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
  if (!apiKey) return { ok: false, retryable: false, issue: 'OpenAI is not configured.', model: requestedModel, responseId: null, sources: new Map() };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: requestedModel,
      store: false,
      tools: [{ type: 'web_search' }],
      include: ['web_search_call.action.sources'],
      input: concisePrompt(input, limit, retry),
      reasoning: { effort: 'low' },
      text: {
        verbosity: 'low',
        format: { type: 'json_schema', name: 'external_discovery_candidates', strict: true, schema: responseSchema(input, limit) },
      },
      max_output_tokens: 16000,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const issue = response.status === 429
      ? 'OpenAI temporarily rate-limited the research request.'
      : response.status >= 500
        ? 'OpenAI was temporarily unavailable while researching this campaign.'
        : `OpenAI could not run this research request (HTTP ${response.status}).`;
    return { ok: false, retryable: response.status === 429 || response.status >= 500, issue, model: requestedModel, responseId: null, sources: new Map() };
  }

  const payload = await response.json() as Record<string, unknown>;
  const model = text(payload.model) || requestedModel;
  const responseId = text(payload.id) || null;
  const sources = sourcesFromPayload(payload);
  if (text(payload.status) === 'incomplete') {
    const details = payload.incomplete_details && typeof payload.incomplete_details === 'object'
      ? payload.incomplete_details as Record<string, unknown>
      : {};
    return { ok: false, retryable: true, issue: `OpenAI ended the structured response before completion (${text(details.reason) || 'output limit'}).`, model, responseId, sources };
  }
  if (text(payload.status) === 'failed' || payload.error) {
    return { ok: false, retryable: true, issue: 'OpenAI could not complete the structured research response.', model, responseId, sources };
  }
  const parsed = parseStructured(outputText(payload));
  return parsed.success
    ? { ok: true, retryable: false, issue: '', model, responseId, sources, parsed: parsed.data }
    : { ok: false, retryable: true, issue: parsed.issue, model, responseId, sources };
}

function host(value: string) {
  try { return new URL(value).hostname.replace(/^www\./i, '').toLowerCase(); }
  catch { return ''; }
}

function relatedHost(left: string, right: string) {
  const a = host(left);
  const b = host(right);
  return Boolean(a && b && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)));
}

function reconciledSource(row: CandidateRow, sources: Map<string, string>) {
  for (const returnedUrl of [row.source_url, row.website_url]) {
    const exact = sources.get(sourceComparisonKey(returnedUrl));
    if (exact) return exact;
    const canonical = canonicalizeSourceUrl(returnedUrl);
    if (!canonical) continue;
    const related = Array.from(sources.values()).find((source) => relatedHost(source, canonical));
    if (related) return related;
  }
  return '';
}

function excluded(companyType: string, excludedTypes: string[]) {
  const normalized = companyType.toLowerCase();
  return excludedTypes.some((value) => {
    const candidate = value.toLowerCase();
    return candidate && (normalized.includes(candidate) || candidate.includes(normalized));
  });
}

function baseDiagnostics(input: DiscoverySearchInput, attempt: AttemptResult, outcome: ProviderDiagnostics['outcome'], summary: string, partialFailures: string[]): ProviderDiagnostics {
  return {
    provider: 'openai_web_search',
    model: attempt.model,
    responseId: attempt.responseId,
    verticalPlaybook: resolveVerticalPlaybook(input),
    researchPlan: buildDiscoveryQuery(input).split(' | '),
    sourcesFound: attempt.sources.size,
    rowsReturned: attempt.parsed?.candidates.length ?? 0,
    rowsAccepted: 0,
    rowsRejected: 0,
    rejectionReasons: {},
    partialFailures,
    researchSummary: summary,
    outcome,
  };
}

function resultFromAttempt(input: DiscoverySearchInput, attempt: AttemptResult, partialFailures: string[]): ProviderSearchResult {
  const parsed = attempt.parsed;
  if (!attempt.ok || !parsed) {
    const message = 'OpenAI research could not complete a valid result set after an automatic retry. No companies were added. Review the scope and retry.';
    const diagnostics = baseDiagnostics(input, attempt, 'failed', message, partialFailures);
    diagnostics.rejectionReasons.structured_output_incomplete = 1;
    return { candidates: [], providerCostAmount: 0, providerCostCurrency: 'USD', disabled: false, message, diagnostics };
  }

  const rejectionReasons: Record<string, number> = {};
  const increment = (reason: string) => { rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + 1; };
  const seen = new Set<string>();
  const candidates: ProviderCandidate[] = [];
  let sourceReviewRequired = 0;

  for (const row of parsed.candidates.slice(0, input.resultLimit)) {
    const companyName = text(row.company_name);
    const country = text(row.country);
    const companyType = text(row.company_type);
    const evidenceSummary = text(row.evidence_summary);
    const matchExplanation = text(row.match_explanation);
    if (!companyName || !country || !companyType || !evidenceSummary || !matchExplanation) {
      increment('missing_required_fields');
      continue;
    }
    if (row.research_direction !== input.researchDirection) {
      increment('research_direction_mismatch');
      continue;
    }
    if (excluded(companyType, input.excludedCompanyTypes)) {
      increment('excluded_company_type');
      continue;
    }

    const websiteUrl = canonicalizeSourceUrl(row.website_url);
    const claimedSourceUrl = canonicalizeSourceUrl(row.source_url) || websiteUrl;
    const verifiedSourceUrl = reconciledSource(row, attempt.sources);
    const sourceVerified = Boolean(verifiedSourceUrl);
    if (!sourceVerified) sourceReviewRequired += 1;
    if (!claimedSourceUrl && !verifiedSourceUrl) {
      increment('missing_source_url');
      continue;
    }

    const dedupeKey = host(websiteUrl || claimedSourceUrl || verifiedSourceUrl) || companyName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(dedupeKey)) {
      increment('duplicate_in_provider_output');
      continue;
    }
    seen.add(dedupeKey);

    const verticalEvidence = row.vertical_evidence as Record<string, unknown>;
    candidates.push({
      companyName,
      country,
      companyType,
      websiteUrl: websiteUrl || claimedSourceUrl || null,
      sourceLabel: sourceVerified ? (text(row.source_label) || 'OpenAI source-backed web research') : 'OpenAI returned lead — source review required',
      sourceUrl: verifiedSourceUrl,
      evidence: [{
        type: 'provider_search_result',
        url: verifiedSourceUrl,
        claimed_source_url: claimedSourceUrl,
        source_validation_state: sourceVerified ? 'provider_tool_cited' : 'provider_stated_not_tool_cited',
        source_validation_reason: sourceVerified
          ? 'The returned URL matched an opened web-search source.'
          : 'The company was returned by OpenAI, but its claimed URL did not match a URL recorded by the web-search tool. Human source verification is required before approval or CRM conversion.',
        provider_sources_considered: attempt.sources.size,
        text: evidenceSummary.slice(0, 2400),
        match_explanation: matchExplanation.slice(0, 1600),
        matched_products: list(row.matched_products),
        matched_industries: list(row.matched_industries),
        suggested_contact_roles: input.suggestContactRoles ? list(row.suggested_contact_roles) : [],
        research_direction: input.researchDirection,
        vertical_playbook: resolveVerticalPlaybook(input),
        vertical_evidence: verticalEvidence,
        ...verticalEvidence,
        query: buildDiscoveryQuery(input),
        provider: 'openai_web_search',
        model: attempt.model,
        fetched_at: new Date().toISOString(),
      }],
      contacts: [],
      matchExplanation,
      matchedProducts: list(row.matched_products),
      matchedIndustries: list(row.matched_industries),
      researchDirection: input.researchDirection,
      provider: 'openai_web_search',
      model: attempt.model,
    });
  }

  const outcome: ProviderDiagnostics['outcome'] = candidates.length ? 'completed_with_results' : 'completed_no_matches';
  const reviewNote = sourceReviewRequired
    ? `${sourceReviewRequired} returned compan${sourceReviewRequired === 1 ? 'y requires' : 'ies require'} manual source verification before approval or CRM conversion.`
    : '';
  const message = candidates.length
    ? `OpenAI found ${candidates.length} reviewable external prospect${candidates.length === 1 ? '' : 's'}. ${reviewNote} Results remain outside CRM until human review and approval.`
    : 'OpenAI completed the research, but no returned company had enough structured information to enter the review queue.';
  const diagnostics = baseDiagnostics(input, attempt, outcome, parsed.research_summary, [...partialFailures, ...(reviewNote ? [reviewNote] : [])]);
  diagnostics.rowsAccepted = candidates.length;
  diagnostics.rowsRejected = parsed.candidates.length - candidates.length;
  diagnostics.rejectionReasons = rejectionReasons;
  return { candidates, providerCostAmount: 0, providerCostCurrency: 'USD', disabled: false, message, diagnostics };
}

export const openAiReviewableProvider: ExternalDiscoveryProvider = {
  key: 'openai_reviewable',
  label: 'OpenAI reviewable web research',
  capabilities: ['web_search', 'structured_output', 'automatic_retry', 'reviewable_unverified_results', 'source_evidence', 'vertical_playbooks'],
  configured: Boolean(process.env.OPENAI_API_KEY),
  async search(input) {
    const firstLimit = Math.max(5, Math.min(10, input.resultLimit));
    const first = await attemptOpenAi(input, firstLimit, false);
    if (first.ok) return resultFromAttempt(input, first, []);
    if (!first.retryable) return resultFromAttempt(input, first, [first.issue]);

    const retry = await attemptOpenAi(input, Math.max(3, Math.min(5, firstLimit)), true);
    if (retry.ok) {
      const result = resultFromAttempt(input, retry, [first.issue, 'OpenAI automatically retried with a smaller structured result set.']);
      result.message = `${result.message} The first response was incomplete, so Setu Flow automatically retried.`;
      return result;
    }
    return resultFromAttempt(input, retry, [first.issue, retry.issue]);
  },
};

registerDiscoveryProvider(openAiReviewableProvider);
