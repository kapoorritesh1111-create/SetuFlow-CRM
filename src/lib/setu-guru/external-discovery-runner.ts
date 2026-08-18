import { createClient } from '@/lib/supabase/server';
import {
  getDiscoveryProvider,
  type DiscoveryCampaignMode,
  type DiscoveryOutcome,
  type DiscoveryResearchDirection,
  type DiscoverySearchInput,
  type DiscoverySourceStrategy,
  type ProviderCandidate,
  type ProviderDiagnostics,
} from '@/lib/setu-guru/discovery-providers';
import { detectDuplicate, normalizeCompanyName, normalizeDomain, type DuplicateMatch } from '@/lib/setu-guru/external-discovery';

const SCORE_VERSION = 'pr65-confirmed-scope-v1';

export class DiscoveryExecutionError extends Error {
  status: number;
  outcome: DiscoveryOutcome;
  details: Record<string, unknown>;

  constructor(message: string, status = 422, outcome: DiscoveryOutcome = 'scope_confirmation_required', details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DiscoveryExecutionError';
    this.status = status;
    this.outcome = outcome;
    this.details = details;
  }
}

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  campaign_mode?: DiscoveryCampaignMode | null;
  research_direction?: DiscoveryResearchDirection | null;
  scope_status?: string | null;
  search_config?: Record<string, unknown> | null;
  icp_snapshot?: Record<string, unknown> | null;
  icp_profile_id?: string | null;
};

type ConfirmedFitScore = {
  score: number;
  reasons: string[];
  penalties: string[];
  missingData: string[];
};

function text(value: unknown) {
  return String(value ?? '').trim();
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function number(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function fuzzyIncludes(value: string, targets: string[]) {
  const normalized = normalize(value);
  return targets.some((target) => {
    const candidate = normalize(target);
    return candidate.length > 1 && (normalized.includes(candidate) || candidate.includes(normalized));
  });
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, stable(nested)]));
}

function stableStringify(value: unknown) {
  return JSON.stringify(stable(value));
}

function hasConfirmedConfig(config: Record<string, unknown>) {
  return list(config.target_countries).length > 0
    && list(config.products).length > 0
    && list(config.target_company_types).length > 0
    && text(config.objective).length >= 10;
}

function directionFromLegacySnapshot(snapshot: Record<string, unknown>, configured?: DiscoveryResearchDirection | null) {
  const buyerTypes = list(snapshot.buyer_types);
  const supplierTypes = list(snapshot.supplier_types);
  if (buyerTypes.length && supplierTypes.length) {
    throw new DiscoveryExecutionError(
      'This legacy campaign contains both buyer and supplier targets. Confirm one research direction before running it.',
      422,
      'scope_confirmation_required',
      { buyer_types: buyerTypes, supplier_types: supplierTypes },
    );
  }
  if (supplierTypes.length) return { direction: configured === 'manufacturers' ? 'manufacturers' as const : 'suppliers' as const, companyTypes: supplierTypes };
  if (buyerTypes.length) return { direction: configured === 'partners' ? 'partners' as const : 'buyers' as const, companyTypes: buyerTypes };
  throw new DiscoveryExecutionError('This legacy campaign has no confirmed buyer, supplier, partner, or manufacturer target.', 422, 'scope_confirmation_required');
}

export function resolveConfirmedDiscoveryInput(campaign: CampaignRow): DiscoverySearchInput {
  const config = object(campaign.search_config);
  const snapshot = object(campaign.icp_snapshot);
  const guided = hasConfirmedConfig(config);

  if (campaign.scope_status !== 'ready') {
    throw new DiscoveryExecutionError(
      campaign.scope_status === 'researching'
        ? 'Research is already running for this campaign.'
        : 'Confirm the campaign scope before running external research.',
      422,
      'scope_confirmation_required',
      { scope_status: campaign.scope_status ?? null },
    );
  }

  if (guided) {
    const researchDirection = text(campaign.research_direction || config.research_direction) as DiscoveryResearchDirection;
    if (!['buyers', 'suppliers', 'partners', 'manufacturers'].includes(researchDirection)) {
      throw new DiscoveryExecutionError('Choose one buyer, supplier, partner, or manufacturer research direction.', 422, 'scope_confirmation_required');
    }
    const sourceStrategy = text(config.source_strategy || 'crm_and_external') as DiscoverySourceStrategy;
    if (sourceStrategy === 'crm_only') {
      throw new DiscoveryExecutionError(
        'This campaign is configured for CRM-only matching. Open CRM Matches instead of running an external provider.',
        422,
        'scope_confirmation_required',
        { destination: '/growth-agent?view=crm-matches', source_strategy: sourceStrategy },
      );
    }

    return {
      objective: text(config.objective || config.goal),
      countries: list(config.target_countries),
      products: list(config.products),
      companyTypes: list(config.target_company_types),
      targetIndustries: list(config.target_industries),
      excludedCompanyTypes: list(config.excluded_company_types),
      researchDirection,
      sourceStrategy: sourceStrategy === 'external_only' ? 'external_only' : 'crm_and_external',
      campaignMode: (text(campaign.campaign_mode || config.campaign_mode) || 'fresh_research') as DiscoveryCampaignMode,
      resultLimit: clamp(Math.round(number(config.result_limit, 25)), 5, 100),
      minimumFitScore: clamp(Math.round(number(config.minimum_fit_score, 60)), 0, 100),
      searchLanguages: list(config.search_languages).length ? list(config.search_languages) : ['English'],
      sourceRequirements: list(config.source_requirements).length ? list(config.source_requirements) : ['Official company website', 'Relevant market evidence'],
      duplicateDetection: boolean(config.duplicate_detection, true),
      suggestContactRoles: boolean(config.suggest_contact_roles, true),
      lookalikeLeadId: text(config.lookalike_lead_id) || null,
      verticalProfile: {
        ...object(snapshot.vertical_profile),
        campaign_industries: list(config.target_industries),
        excluded_company_types: list(config.excluded_company_types),
        research_direction: researchDirection,
      },
    };
  }

  const legacy = directionFromLegacySnapshot(snapshot, campaign.research_direction ?? null);
  const countries = list(snapshot.target_countries);
  const products = list(snapshot.products);
  if (!countries.length || !products.length || !legacy.companyTypes.length) {
    throw new DiscoveryExecutionError('This legacy campaign is missing a market, product, or company type. Confirm the scope before research.', 422, 'scope_confirmation_required');
  }

  return {
    objective: `Find source-backed ${legacy.direction} for ${products.join(', ')} in ${countries.join(', ')}.`,
    countries,
    products,
    companyTypes: legacy.companyTypes,
    targetIndustries: list(object(snapshot.vertical_profile).campaign_industries),
    excludedCompanyTypes: list(object(snapshot.vertical_profile).excluded_company_types),
    researchDirection: legacy.direction,
    sourceStrategy: 'external_only',
    campaignMode: (campaign.campaign_mode || 'saved_icp') as DiscoveryCampaignMode,
    resultLimit: 25,
    minimumFitScore: 60,
    searchLanguages: ['English'],
    sourceRequirements: ['Official company website', 'Relevant market evidence'],
    duplicateDetection: true,
    suggestContactRoles: true,
    lookalikeLeadId: null,
    verticalProfile: object(snapshot.vertical_profile),
  };
}

function candidateCorpus(candidate: ProviderCandidate) {
  return [
    candidate.companyName,
    candidate.country,
    candidate.companyType,
    candidate.matchExplanation,
    ...candidate.matchedProducts,
    ...candidate.matchedIndustries,
    ...candidate.evidence.map((entry) => `${text(entry.text)} ${text(entry.match_explanation)} ${list(entry.matched_products).join(' ')} ${list(entry.matched_industries).join(' ')}`),
  ].join(' ').toLowerCase();
}

export function scoreCandidateAgainstConfirmedScope(candidate: ProviderCandidate, input: DiscoverySearchInput, duplicate: DuplicateMatch): ConfirmedFitScore {
  const reasons: string[] = [];
  const penalties: string[] = [];
  const missingData: string[] = [];
  let score = 20;

  if (input.countries.some((country) => normalize(country) === normalize(candidate.country))) {
    score += 25;
    reasons.push(`Located in the confirmed campaign market (${candidate.country}).`);
  } else {
    penalties.push(`Company country does not match the confirmed markets: ${input.countries.join(', ')}.`);
  }

  if (fuzzyIncludes(candidate.companyType, input.companyTypes)) {
    score += 20;
    reasons.push(`Company type matches the confirmed ${input.researchDirection} target.`);
  } else {
    penalties.push('Company type does not match the confirmed campaign company types.');
  }

  const corpus = candidateCorpus(candidate);
  const productMatches = input.products.filter((product) => corpus.includes(product.toLowerCase()) || candidate.matchedProducts.some((matched) => fuzzyIncludes(matched, [product])));
  if (productMatches.length) {
    score += 20;
    reasons.push(`Product relevance: ${productMatches.join(', ')}.`);
  } else {
    penalties.push('No confirmed product/category evidence was found in the candidate result.');
  }

  const industryMatches = input.targetIndustries.filter((industry) => corpus.includes(industry.toLowerCase()) || candidate.matchedIndustries.some((matched) => fuzzyIncludes(matched, [industry])));
  if (industryMatches.length) {
    score += 10;
    reasons.push(`Industry relevance: ${industryMatches.join(', ')}.`);
  } else if (input.targetIndustries.length) {
    penalties.push('No confirmed target-industry evidence was found.');
  }

  if (candidate.sourceUrl) {
    score += 15;
    reasons.push('Backed by a provider-cited source URL.');
  } else {
    missingData.push('Source URL');
  }

  if (candidate.evidence.length) {
    score += 10;
    reasons.push(`${candidate.evidence.length} evidence record${candidate.evidence.length === 1 ? '' : 's'} captured.`);
  } else {
    missingData.push('Source evidence');
  }

  if (candidate.researchDirection !== input.researchDirection) {
    score -= 50;
    penalties.push('Provider result used a different research direction than the confirmed campaign.');
  }

  if (duplicate.state === 'confirmed_duplicate') {
    score -= 40;
    penalties.push('Confirmed duplicate of an existing CRM record.');
  } else if (duplicate.state === 'possible_duplicate') {
    score -= 15;
    penalties.push(`Possible duplicate (${duplicate.confidence}% confidence).`);
  }

  return { score: clamp(Math.round(score), 0, 100), reasons, penalties, missingData };
}

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

async function writeAuditLog(client: any, orgId: string, entityType: string, entityId: string | null, action: string, payload: Record<string, unknown>, actorUserId: string | null) {
  const { error } = await client.from('audit_logs').insert({
    organization_id: orgId,
    entity_type: entityType,
    entity_id: entityId,
    action: `setu_guru_action_${action}`,
    payload: { ...payload, approved_by_human: true },
    actor_user_id: actorUserId,
  });
  if (error) console.error('[confirmed-discovery-runner] audit log write failed', { orgId, entityType, entityId, action, error: error.message });
}

function providerResponse(
  providerKey: string,
  input: DiscoverySearchInput,
  diagnostics: ProviderDiagnostics,
  inserted: number,
  duplicatesDetected: number,
  rejectionReasons: Record<string, number>,
  providerMessage: string,
) {
  const outcome: DiscoveryOutcome = diagnostics.outcome === 'failed'
    ? 'failed'
    : diagnostics.outcome === 'provider_not_configured'
      ? 'provider_not_configured'
      : diagnostics.outcome === 'partial'
        ? 'partial'
        : inserted > 0
          ? 'completed_with_results'
          : 'completed_no_matches';

  return {
    provider: diagnostics.provider || providerKey,
    model: diagnostics.model,
    response_id: diagnostics.responseId,
    campaign_mode: input.campaignMode,
    research_direction: input.researchDirection,
    resolved_scope: {
      objective: input.objective,
      target_countries: input.countries,
      products: input.products,
      target_company_types: input.companyTypes,
      target_industries: input.targetIndustries,
      excluded_company_types: input.excludedCompanyTypes,
      result_limit: input.resultLimit,
      minimum_fit_score: input.minimumFitScore,
      search_languages: input.searchLanguages,
      source_requirements: input.sourceRequirements,
      source_strategy: input.sourceStrategy,
      lookalike_lead_id: input.lookalikeLeadId ?? null,
    },
    research_plan: diagnostics.researchPlan,
    sources_found: diagnostics.sourcesFound,
    rows_returned: diagnostics.rowsReturned,
    rows_accepted_by_provider: diagnostics.rowsAccepted,
    rows_inserted: inserted,
    rows_rejected: diagnostics.rowsRejected + Object.values(rejectionReasons).reduce((sum, value) => sum + value, 0),
    rejection_reasons: { ...diagnostics.rejectionReasons, ...rejectionReasons },
    duplicates_detected: duplicatesDetected,
    partial_failures: diagnostics.partialFailures,
    provider_message: providerMessage,
    research_summary: diagnostics.researchSummary,
    outcome,
  };
}

export async function runConfirmedDiscoveryJob(orgId: string, campaignId: string, providerKey: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new DiscoveryExecutionError('Authentication is required.', 401, 'failed');

  const { data: campaign, error: campaignError } = await client
    .from('external_discovery_campaigns')
    .select('id,name,status,campaign_mode,research_direction,scope_status,search_config,icp_snapshot,icp_profile_id')
    .eq('org_id', orgId)
    .eq('id', campaignId)
    .single();
  if (campaignError || !campaign) throw new DiscoveryExecutionError('External Discovery campaign was not found in this organization.', 404, 'failed');

  const input = resolveConfirmedDiscoveryInput(campaign as CampaignRow);
  if (input.sourceStrategy === 'crm_only') {
    throw new DiscoveryExecutionError('CRM-only campaigns belong in CRM Matches and do not call an external provider.', 422, 'scope_confirmation_required');
  }

  const provider = getDiscoveryProvider(providerKey);
  const idempotencyPayload = {
    campaignId,
    providerKey: provider.key,
    campaignMode: input.campaignMode,
    researchDirection: input.researchDirection,
    searchConfig: object(campaign.search_config),
  };
  const idempotencyKey = stableStringify(idempotencyPayload);
  const providerRequest = {
    ...input,
    crmResultsSeparate: input.sourceStrategy === 'crm_and_external',
    confirmedScopeSource: hasConfirmedConfig(object(campaign.search_config)) ? 'campaign.search_config' : 'legacy_icp_snapshot',
  };

  const { data: job, error: jobError } = await client
    .from('external_discovery_jobs')
    .upsert({
      org_id: orgId,
      campaign_id: campaignId,
      status: 'running',
      idempotency_key: idempotencyKey,
      provider_key: provider.key,
      provider_request: providerRequest,
      provider_response: {},
      last_error: null,
      started_at: new Date().toISOString(),
      completed_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id,idempotency_key' })
    .select('*')
    .single();
  if (jobError || !job) throw jobError ?? new Error('The discovery job could not be created.');

  await client
    .from('external_discovery_campaigns')
    .update({ status: 'running', scope_status: 'researching', updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', campaignId);
  await writeAuditLog(client, orgId, 'external_discovery_job', job.id, 'external_discovery_job_started', {
    campaignId,
    providerKey: provider.key,
    campaign_mode: input.campaignMode,
    research_direction: input.researchDirection,
    target_countries: input.countries,
    approved_scope: true,
  }, user.id);

  try {
    const result = await provider.search(input);
    const runRejections: Record<string, number> = {};
    let inserted = 0;
    let duplicatesDetected = 0;

    for (const candidate of result.candidates as ProviderCandidate[]) {
      if (candidate.researchDirection !== input.researchDirection) {
        increment(runRejections, 'research_direction_mismatch');
        continue;
      }
      const duplicate = input.duplicateDetection
        ? await detectDuplicate(orgId, candidate)
        : { state: 'new', reasons: [], matchedLeadId: null, confidence: 0 } as DuplicateMatch;
      if (duplicate.state !== 'new') duplicatesDetected += 1;
      const fit = scoreCandidateAgainstConfirmedScope(candidate, input, duplicate);
      if (fit.score < input.minimumFitScore) {
        increment(runRejections, 'below_minimum_fit_score');
        continue;
      }

      const { data: opportunity, error } = await client
        .from('external_opportunities')
        .insert({
          org_id: orgId,
          campaign_id: campaignId,
          job_id: job.id,
          company_name: candidate.companyName,
          normalized_company_name: normalizeCompanyName(candidate.companyName),
          country: candidate.country,
          company_type: candidate.companyType,
          website_url: candidate.websiteUrl ?? null,
          primary_domain: normalizeDomain(candidate.websiteUrl || candidate.sourceUrl),
          source_label: candidate.sourceLabel,
          source_url: candidate.sourceUrl,
          source_evidence: candidate.evidence,
          duplicate_state: duplicate.state,
          duplicate_reasons: duplicate.reasons,
          matched_lead_id: duplicate.matchedLeadId,
          verification_state: 'source_verified',
          fit_score: fit.score,
          fit_version: SCORE_VERSION,
          fit_reasons: fit.reasons,
          fit_penalties: fit.penalties,
          missing_data: fit.missingData,
          fit_scored_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error || !opportunity) {
        increment(runRejections, 'database_insert_failed');
        continue;
      }
      inserted += 1;
    }

    const response = providerResponse(provider.key, input, result.diagnostics, inserted, duplicatesDetected, runRejections, result.message);
    const outcome = response.outcome as DiscoveryOutcome;
    const finalJobStatus = outcome === 'failed' ? 'failed' : outcome === 'partial' ? 'partial' : 'completed';
    const finalScopeStatus = outcome === 'failed' || outcome === 'provider_not_configured' ? 'ready' : 'completed';
    const finalCampaignStatus = outcome === 'failed' ? 'failed' : outcome === 'partial' ? 'partial' : 'completed';

    await client
      .from('external_discovery_jobs')
      .update({
        status: finalJobStatus,
        provider_response: response,
        cost_amount: result.providerCostAmount,
        cost_currency: result.providerCostCurrency,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('org_id', orgId);
    await client
      .from('external_discovery_campaigns')
      .update({ status: finalCampaignStatus, scope_status: finalScopeStatus, updated_at: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('org_id', orgId);
    await writeAuditLog(client, orgId, 'external_discovery_job', job.id, 'external_discovery_job_completed', {
      campaignId,
      providerKey: provider.key,
      outcome,
      rows_returned: result.diagnostics.rowsReturned,
      inserted,
      duplicates_detected: duplicatesDetected,
      rejection_reasons: response.rejection_reasons,
    }, user.id);

    return {
      jobId: job.id,
      received: result.candidates.length,
      inserted,
      disabled: result.disabled,
      message: result.message,
      outcome,
      diagnostics: response,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedResponse = {
      provider: provider.key,
      campaign_mode: input.campaignMode,
      research_direction: input.researchDirection,
      resolved_scope: providerRequest,
      outcome: 'failed',
      provider_message: message,
    };
    await client
      .from('external_discovery_jobs')
      .update({ status: 'failed', provider_response: failedResponse, last_error: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(), attempt_count: (job.attempt_count ?? 0) + 1 })
      .eq('id', job.id)
      .eq('org_id', orgId);
    await client
      .from('external_discovery_campaigns')
      .update({ status: 'failed', scope_status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('org_id', orgId);
    await writeAuditLog(client, orgId, 'external_discovery_job', job.id, 'external_discovery_job_failed', { campaignId, providerKey: provider.key, error: message }, user.id);
    throw error;
  }
}
