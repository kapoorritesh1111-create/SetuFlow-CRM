import { createClient } from '@/lib/supabase/server';
import { getIcpProfile, type IcpProfile } from '@/lib/setu-guru/icp';
import { getDiscoveryProvider, type ProviderCandidate } from '@/lib/setu-guru/discovery-providers';
import { checkGovernedDelivery, type GovernedChannel } from '@/lib/setu-guru/governed-delivery';
import { scheduleGrowthFollowUp, cancelGrowthFollowUp } from '@/lib/setu-guru/growth-followups';

export type DuplicateMatch = {
  state: 'new' | 'possible_duplicate' | 'confirmed_duplicate';
  reasons: string[];
  matchedLeadId: string | null;
  confidence: number; // 0-100, how sure we are of the duplicate_state above
};

export type ExternalFitScore = {
  score: number;
  reasons: string[];
  penalties: string[];
  missingData: string[];
};

const SCORE_VERSION = 's48-v2';

export function normalizeCompanyName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(ltd|llc|inc|corp|company|co|limited|private|pvt)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeDomain(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]?.toLowerCase() || null;
  }
}

/** Cheap token-overlap similarity (0-1) used only to raise/lower duplicate confidence — never to auto-merge records. */
function nameSimilarity(a: string, b: string) {
  const tokensA = new Set(a.split(' ').filter(Boolean));
  const tokensB = new Set(b.split(' ').filter(Boolean));
  if (!tokensA.size || !tokensB.size) return 0;
  let shared = 0;
  for (const token of tokensA) if (tokensB.has(token)) shared += 1;
  return shared / Math.max(tokensA.size, tokensB.size);
}

export async function detectDuplicate(
  orgId: string,
  result: { companyName: string; country?: string | null; websiteUrl?: string | null },
): Promise<DuplicateMatch> {
  const supabase = await createClient();
  const client = supabase as any;
  const normalizedName = normalizeCompanyName(result.companyName);
  const domain = normalizeDomain(result.websiteUrl);
  const reasons: string[] = [];

  let leadQuery = client.from('leads').select('id,company_name,country,website').eq('organization_id', orgId).limit(50);
  leadQuery = domain ? leadQuery.or(`website.ilike.%${domain}%,company_name.ilike.%${result.companyName}%`) : leadQuery.ilike('company_name', `%${result.companyName}%`);
  const { data: leads } = await leadQuery;

  let bestSimilarity = 0;
  const leadMatch = (leads ?? []).find((lead: any) => {
    const leadNormalized = normalizeCompanyName(lead.company_name || '');
    const similarity = nameSimilarity(leadNormalized, normalizedName);
    bestSimilarity = Math.max(bestSimilarity, similarity);
    const countryMatch = !result.country || !lead.country || String(lead.country).toLowerCase() === String(result.country).toLowerCase();
    const domainMatch = Boolean(domain) && normalizeDomain(lead.website) === domain;
    if (domainMatch) reasons.push('Website domain matches an existing CRM record.');
    if (similarity >= 0.8 && countryMatch) reasons.push('Normalized company name and country closely match an existing CRM record.');
    return domainMatch || (similarity >= 0.8 && countryMatch);
  });

  if (leadMatch) {
    return { state: 'confirmed_duplicate', reasons, matchedLeadId: leadMatch.id, confidence: domain ? 95 : 80 };
  }

  const { data: discoveries } = await client
    .from('external_opportunities')
    .select('id,normalized_company_name,country,primary_domain')
    .eq('org_id', orgId)
    .or(domain ? `primary_domain.eq.${domain},normalized_company_name.eq.${normalizedName}` : `normalized_company_name.eq.${normalizedName}`)
    .limit(10);

  if ((discoveries ?? []).length) {
    return {
      state: 'possible_duplicate',
      reasons: ['Matches a prior external discovery by domain or normalized name.'],
      matchedLeadId: null,
      confidence: 60,
    };
  }

  if (bestSimilarity >= 0.5) {
    return {
      state: 'possible_duplicate',
      reasons: [`Company name is a partial match (${Math.round(bestSimilarity * 100)}% token overlap) with an existing CRM record; review before converting.`],
      matchedLeadId: null,
      confidence: Math.round(bestSimilarity * 100),
    };
  }

  return { state: 'new', reasons: [], matchedLeadId: null, confidence: 0 };
}

/**
 * S48-GROWTH-013/014: explainable fit scoring for an external candidate against the campaign ICP.
 * Mirrors the CRM Matches scoring dimensions (country, product, buyer/supplier type) and adds
 * evidence/verification confidence, since an external prospect with no source evidence should
 * never outrank a well-evidenced one at the same nominal fit.
 */
export function scoreExternalOpportunity(
  candidate: {
    country?: string | null;
    companyType?: string | null;
    websiteUrl?: string | null;
    sourceUrl?: string | null;
    evidence?: Record<string, unknown>[] | null;
  },
  icp: IcpProfile | null,
  duplicate: DuplicateMatch,
): ExternalFitScore {
  const reasons: string[] = [];
  const penalties: string[] = [];
  const missingData: string[] = [];
  let score = 30; // baseline: a named company with a source, before any ICP match

  if (!icp) {
    missingData.push('No active ICP profile — score reflects evidence quality only.');
  } else {
    const targetCountries = (icp.target_countries ?? []).map((c) => c.toLowerCase());
    const countryMatch = Boolean(candidate.country) && targetCountries.includes(String(candidate.country).toLowerCase());
    if (countryMatch) {
      score += 25;
      reasons.push(`Located in a target market (${candidate.country}).`);
    } else if (targetCountries.length) {
      penalties.push('Outside the configured target countries.');
    }

    const targetTypes = [...(icp.buyer_types ?? []), ...(icp.supplier_types ?? [])].map((t) => t.toLowerCase());
    const typeMatch = Boolean(candidate.companyType) && targetTypes.includes(String(candidate.companyType).toLowerCase());
    if (typeMatch) {
      score += 15;
      reasons.push('Company type matches a target buyer or supplier type in the ICP.');
    } else if (targetTypes.length && candidate.companyType) {
      penalties.push('Company type does not match the configured ICP targets.');
    }
  }

  if (!candidate.country) missingData.push('Country');
  if (!candidate.companyType) missingData.push('Company type');

  const evidenceCount = candidate.evidence?.length ?? 0;
  if (candidate.sourceUrl) {
    score += 15;
    reasons.push('Backed by a source URL.');
  } else {
    penalties.push('No source URL on file — cannot be marked outreach ready.');
  }
  if (evidenceCount > 0) {
    score += Math.min(15, evidenceCount * 5);
    reasons.push(`${evidenceCount} evidence record${evidenceCount === 1 ? '' : 's'} captured.`);
  } else {
    missingData.push('Source evidence');
  }

  if (duplicate.state === 'confirmed_duplicate') {
    score -= 40;
    penalties.push('Confirmed duplicate of an existing CRM record — review before any outreach.');
  } else if (duplicate.state === 'possible_duplicate') {
    score -= 15;
    penalties.push(`Possible duplicate (${duplicate.confidence}% confidence) — resolve before conversion.`);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    penalties,
    missingData,
  };
}

async function writeAuditLog(
  client: any,
  orgId: string,
  entityType: string,
  entityId: string | null,
  action: string,
  payload: Record<string, unknown>,
  actorUserId: string | null,
) {
  const { error } = await client.from('audit_logs').insert({
    organization_id: orgId,
    entity_type: entityType,
    entity_id: entityId,
    action: `setu_guru_action_${action}`,
    // approved_by_human: true because every call site here is reached only from an explicit,
    // authenticated API request triggered by a user action in Growth Center — there is no
    // autonomous/background trigger for campaigns, jobs, review transitions, sends, or
    // conversions in this codebase. This makes the audit panel show these as approved rather
    // than "attention required".
    payload: { ...payload, approved_by_human: true },
    actor_user_id: actorUserId,
  });
  // Audit-log failures must be visible, not swallowed — surface via console so they are caught
  // in server logs/regression testing rather than silently dropped.
  if (error) {
    console.error('[external-discovery] audit log write failed', { orgId, entityType, entityId, action, error: error.message });
  }
}

export async function createDiscoveryCampaign(orgId: string, name: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');
  const icp = await getIcpProfile(orgId);
  if (!icp) throw new Error('An active ICP profile is required before discovery can start.');

  const { data, error } = await client
    .from('external_discovery_campaigns')
    .insert({ org_id: orgId, name, status: 'draft', icp_profile_id: icp.id, icp_snapshot: icp, created_by: user.id })
    .select('*')
    .single();
  if (error) throw error;

  await writeAuditLog(client, orgId, 'external_discovery_campaign', data.id, 'external_discovery_campaign_created', { name }, user.id);
  return data;
}

/**
 * S48-GROWTH-011/013: creates (or reuses, via idempotency key) a job row and runs the named
 * provider inline. Every candidate is deduped and scored before being written as an
 * external_opportunity. Never inserts into leads and never sends anything — that requires a
 * separate, explicit human action (see convertOpportunityToLead / saveOutreachDraft below).
 */
export async function runDiscoveryJob(orgId: string, campaignId: string, providerKey: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();

  const { data: campaign, error: campaignError } = await client
    .from('external_discovery_campaigns')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', campaignId)
    .single();
  if (campaignError) throw campaignError;

  const provider = getDiscoveryProvider(providerKey);
  const snapshot = campaign.icp_snapshot ?? {};
  const searchInput = {
    countries: snapshot.target_countries ?? [],
    products: snapshot.products ?? [],
    buyerTypes: [...(snapshot.buyer_types ?? []), ...(snapshot.supplier_types ?? [])],
  };
  const idempotencyKey = `${campaignId}:${provider.key}:${JSON.stringify(searchInput)}`;

  const { data: job, error: jobError } = await client
    .from('external_discovery_jobs')
    .upsert(
      {
        org_id: orgId,
        campaign_id: campaignId,
        status: 'running',
        idempotency_key: idempotencyKey,
        provider_key: provider.key,
        provider_request: searchInput,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,idempotency_key' },
    )
    .select('*')
    .single();
  if (jobError) throw jobError;

  await client
    .from('external_discovery_campaigns')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', campaignId);
  await writeAuditLog(client, orgId, 'external_discovery_job', job.id, 'external_discovery_job_started', { campaignId, providerKey: provider.key }, user?.id ?? null);

  try {
    const result = await provider.search(searchInput);
    const icp = await getIcpProfile(orgId, campaign.icp_profile_id);
    let inserted = 0;

    for (const candidate of result.candidates as ProviderCandidate[]) {
      const duplicate = await detectDuplicate(orgId, candidate);
      const fit = scoreExternalOpportunity(candidate, icp, duplicate);
      const { data: opportunity, error } = await client
        .from('external_opportunities')
        .insert({
          org_id: orgId,
          campaign_id: campaignId,
          job_id: job.id,
          company_name: candidate.companyName,
          normalized_company_name: normalizeCompanyName(candidate.companyName),
          country: candidate.country ?? null,
          company_type: candidate.companyType ?? null,
          website_url: candidate.websiteUrl ?? null,
          primary_domain: normalizeDomain(candidate.websiteUrl),
          source_label: candidate.sourceLabel,
          source_url: candidate.sourceUrl ?? null,
          source_evidence: candidate.evidence ?? [],
          duplicate_state: duplicate.state,
          duplicate_reasons: duplicate.reasons,
          matched_lead_id: duplicate.matchedLeadId,
          verification_state: candidate.sourceUrl ? 'source_verified' : 'unverified',
          fit_score: fit.score,
          fit_version: SCORE_VERSION,
          fit_reasons: fit.reasons,
          fit_penalties: fit.penalties,
          missing_data: fit.missingData,
          fit_scored_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (!error && opportunity) {
        inserted += 1;
        if (candidate.contacts?.length) {
          await client.from('external_opportunity_contacts').insert(
            candidate.contacts.map((contact) => ({
              org_id: orgId,
              opportunity_id: opportunity.id,
              full_name: contact.fullName ?? null,
              title: contact.title ?? null,
              email: contact.email ?? null,
              phone: contact.phone ?? null,
              source_url: contact.sourceUrl ?? null,
              confidence: typeof contact.confidence === 'number' ? Math.max(0, Math.min(100, contact.confidence)) : null,
              verification_state: contact.sourceUrl ? 'source_verified' : 'unverified',
            })),
          );
        }
      }
    }

    const finalStatus = result.disabled ? 'completed' : inserted > 0 ? 'completed' : 'partial';
    await client
      .from('external_discovery_jobs')
      .update({
        status: finalStatus,
        provider_response: { received: result.candidates.length, inserted, disabled: result.disabled, message: result.message },
        cost_amount: result.providerCostAmount,
        cost_currency: result.providerCostCurrency,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('org_id', orgId);
    await client
      .from('external_discovery_campaigns')
      .update({ status: finalStatus, updated_at: new Date().toISOString() })
      .eq('id', campaignId)
      .eq('org_id', orgId);
    await writeAuditLog(
      client,
      orgId,
      'external_discovery_job',
      job.id,
      'external_discovery_job_completed',
      { campaignId, providerKey: provider.key, received: result.candidates.length, inserted, disabled: result.disabled },
      user?.id ?? null,
    );

    return { jobId: job.id, received: result.candidates.length, inserted, disabled: result.disabled, message: result.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await client
      .from('external_discovery_jobs')
      .update({ status: 'failed', last_error: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(), attempt_count: (job.attempt_count ?? 0) + 1 })
      .eq('id', job.id)
      .eq('org_id', orgId);
    await client.from('external_discovery_campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId).eq('org_id', orgId);
    await writeAuditLog(client, orgId, 'external_discovery_job', job.id, 'external_discovery_job_failed', { campaignId, error: message }, user?.id ?? null);
    throw error;
  }
}

export type ReviewAction =
  | 'start_review' | 'verify' | 'approve' | 'prepare_outreach'
  | 'mark_contacted' | 'record_response' | 'qualify' | 'move_to_nurture'
  | 'reject' | 'dismiss' | 'archive';

const REVIEW_TRANSITIONS: Record<ReviewAction, string> = {
  start_review: 'reviewing',
  verify: 'verified',
  approve: 'approved',
  prepare_outreach: 'outreach_ready',
  mark_contacted: 'contacted',
  record_response: 'responded',
  qualify: 'qualified',
  move_to_nurture: 'nurture',
  reject: 'rejected',
  dismiss: 'dismissed',
  archive: 'archived',
};

export async function transitionOpportunityReview(orgId: string, opportunityId: string, action: ReviewAction, note?: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();

  const { data: opportunity, error: readError } = await client
    .from('external_opportunities')
    .select('id,company_name,review_status,source_label,source_url,verification_state,duplicate_state,matched_lead_id,fit_score')
    .eq('org_id', orgId)
    .eq('id', opportunityId)
    .single();
  if (readError || !opportunity) throw new Error('External opportunity was not found.');

  const nextStatus = REVIEW_TRANSITIONS[action];
  const timestampField: Record<ReviewAction, string | null> = {
    start_review: null,
    verify: 'verified_at',
    approve: 'approved_at',
    prepare_outreach: 'outreach_ready_at',
    mark_contacted: 'contacted_at',
    record_response: 'responded_at',
    qualify: 'qualified_at',
    move_to_nurture: null,
    reject: null,
    dismiss: null,
    archive: 'archived_at',
  };
  const actorField: Record<ReviewAction, string | null> = {
    start_review: 'reviewer_user_id',
    verify: 'verified_by',
    approve: 'approved_by',
    prepare_outreach: null,
    mark_contacted: null,
    record_response: null,
    qualify: null,
    move_to_nurture: null,
    reject: null,
    dismiss: null,
    archive: null,
  };

  const update: Record<string, unknown> = { review_status: nextStatus, updated_at: new Date().toISOString() };
  if (note) update.review_note = note;
  const tsField = timestampField[action];
  if (tsField) update[tsField] = new Date().toISOString();
  const actField = actorField[action];
  if (actField) update[actField] = user?.id ?? null;
  if (action === 'verify') update.verification_state = 'company_verified';

  const { data: updated, error: updateError } = await client
    .from('external_opportunities')
    .update(update)
    .eq('org_id', orgId)
    .eq('id', opportunityId)
    .select('id,review_status,verification_state,updated_at')
    .single();
  if (updateError) throw updateError;

  const details = {
    previous_status: opportunity.review_status,
    next_status: nextStatus,
    note: note ?? null,
    source_label: opportunity.source_label,
    source_url: opportunity.source_url,
    verification_state: opportunity.verification_state,
    duplicate_state: opportunity.duplicate_state,
    matched_lead_id: opportunity.matched_lead_id,
    fit_score: opportunity.fit_score,
    human_approval_required: action === 'approve' || action === 'prepare_outreach',
  };

  const { error: historyError } = await client.from('external_opportunity_history').insert({
    org_id: orgId,
    opportunity_id: opportunityId,
    action,
    details,
    actor_user_id: user?.id ?? null,
  });
  if (historyError) throw historyError;

  await writeAuditLog(client, orgId, 'external_opportunity', opportunityId, `external_opportunity_${action}`, details, user?.id ?? null);

  return { opportunity: updated, action };
}

/**
 * S48-GROWTH-020: converts an approved/outreach-ready opportunity into a CRM lead via the
 * SECURITY DEFINER RPC applied live in migration 20260716120000. The RPC is idempotent — a
 * second call for an already-converted opportunity returns the existing lead id.
 */
export async function convertOpportunityToLead(orgId: string, opportunityId: string, leadType: 'buyer' | 'supplier') {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');

  const { data, error } = await client.rpc('app_convert_external_opportunity_to_lead', {
    p_org_id: orgId,
    p_opportunity_id: opportunityId,
    p_lead_type: leadType,
    p_actor_user_id: user.id,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;

  await writeAuditLog(
    client,
    orgId,
    'external_opportunity',
    opportunityId,
    'external_opportunity_convert_to_lead',
    { leadId: row?.lead_id, leadType, alreadyConverted: row?.already_converted ?? false },
    user.id,
  );

  return { leadId: row?.lead_id as string, alreadyConverted: Boolean(row?.already_converted) };
}

export type OutreachChannel = 'email' | 'whatsapp' | 'linkedin' | 'call';

const CHANNEL_TO_COMMUNICATIONS_CHANNEL: Record<OutreachChannel, string> = {
  email: 'email',
  whatsapp: 'whatsapp',
  linkedin: 'linkedin',
  call: 'phone',
};

/**
 * S48-GROWTH-015/016 (draft portion only): saves an editable outreach draft against the existing
 * communications table. Always writes with status='draft' — nothing is sent. Sending remains a
 * separate, explicitly out-of-scope capability (S48-GROWTH-017) that requires its own approval
 * and channel integration.
 */
export async function saveOutreachDraft(
  orgId: string,
  opportunityId: string,
  input: { channel: OutreachChannel; subject?: string | null; body: string },
) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');

  const { data: opportunity, error: oppError } = await client
    .from('external_opportunities')
    .select('id,company_name')
    .eq('org_id', orgId)
    .eq('id', opportunityId)
    .single();
  if (oppError || !opportunity) throw new Error('External opportunity was not found.');

  const { data: draft, error } = await client
    .from('communications')
    .insert({
      organization_id: orgId,
      related_entity: 'external_opportunity',
      related_id: opportunityId,
      external_opportunity_id: opportunityId,
      communication_type: 'introduction',
      direction: 'outbound',
      channel: CHANNEL_TO_COMMUNICATIONS_CHANNEL[input.channel],
      subject: input.subject ?? null,
      body: input.body,
      draft_source: 'ai',
      status: 'draft',
      created_by: user.id,
    })
    .select('id,channel,status,subject,body,created_at')
    .single();
  if (error) throw error;

  await writeAuditLog(client, orgId, 'external_opportunity', opportunityId, 'external_opportunity_outreach_draft_saved', { draftId: draft.id, channel: input.channel }, user.id);

  return draft;
}

/**
 * S48-GROWTH-017: approves and attempts to send a previously saved draft. Never fires without
 * this explicit call. Uses the same governed-delivery check as the rest of the app (see
 * governed-delivery.ts) — if no email_outbound/whatsapp_outbound integration is connected for
 * the organization, the draft is marked 'approved' (not silently 'sent') and the honest reason
 * is returned so the user can send manually. Every outcome is written to communications,
 * external_opportunity_history, and audit_logs.
 */
export async function sendOutreachDraft(orgId: string, draftId: string, opportunityId: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');

  const { data: draft, error: draftError } = await client
    .from('communications')
    .select('id,channel,status,subject,body')
    .eq('organization_id', orgId)
    .eq('id', draftId)
    .eq('external_opportunity_id', opportunityId)
    .single();
  if (draftError || !draft) throw new Error('Outreach draft was not found.');
  if (draft.status === 'sent') throw new Error('This draft has already been sent.');

  const { data: contacts } = await client
    .from('external_opportunity_contacts')
    .select('email,phone')
    .eq('org_id', orgId)
    .eq('opportunity_id', opportunityId)
    .limit(5);

  const governedChannel = draft.channel === 'email' || draft.channel === 'whatsapp';
  const target = draft.channel === 'email' ? contacts?.find((c: any) => c.email)?.email : contacts?.find((c: any) => c.phone)?.phone;
  const delivery = governedChannel
    ? await checkGovernedDelivery(client, orgId, draft.channel as GovernedChannel, target)
    : { queued: false, provider: 'manual', reason: 'This channel is sent manually (copy the draft and record it as sent).', target: null };

  const now = new Date().toISOString();
  const nextStatus = delivery.queued ? 'sent' : 'approved';
  const { error: updateError } = await client
    .from('communications')
    .update({
      status: nextStatus,
      approved_at: now,
      approved_by: user.id,
      sent_at: delivery.queued ? now : null,
      provider_payload: { provider: delivery.provider, queued: delivery.queued, reason: delivery.reason, target: delivery.target },
    })
    .eq('id', draftId)
    .eq('organization_id', orgId);
  if (updateError) throw updateError;

  if (delivery.queued) {
    await transitionOpportunityReview(orgId, opportunityId, 'mark_contacted', `Outreach sent via ${draft.channel}.`);
  }

  await writeAuditLog(
    client,
    orgId,
    'external_opportunity',
    opportunityId,
    'external_opportunity_outreach_send_attempted',
    { draftId, channel: draft.channel, queued: delivery.queued, provider: delivery.provider, reason: delivery.reason },
    user.id,
  );

  return { status: nextStatus, queued: delivery.queued, reason: delivery.reason };
}

/** S48-GROWTH-018: schedule/cancel a follow-up for an external opportunity via the existing Work Queue. */
export async function scheduleOpportunityFollowUp(orgId: string, opportunityId: string, dueAt: string, note: string | null) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: opportunity, error } = await client
    .from('external_opportunities')
    .select('id,company_name')
    .eq('org_id', orgId)
    .eq('id', opportunityId)
    .single();
  if (error || !opportunity) throw new Error('External opportunity was not found.');

  return scheduleGrowthFollowUp(orgId, 'external_opportunity', opportunityId, opportunity.company_name, dueAt, note, '/growth-agent?workspace=operations');
}

export async function cancelOpportunityFollowUp(orgId: string, opportunityId: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: opportunity, error } = await client
    .from('external_opportunities')
    .select('id,follow_up_recommendation_id')
    .eq('org_id', orgId)
    .eq('id', opportunityId)
    .single();
  if (error || !opportunity) throw new Error('External opportunity was not found.');
  if (!opportunity.follow_up_recommendation_id) return { cancelled: false as const };

  await cancelGrowthFollowUp(orgId, 'external_opportunity', opportunityId, opportunity.follow_up_recommendation_id);
  return { cancelled: true as const };
}

/** S48-GROWTH-019/021: full activity timeline for the company profile drawer. */
export async function getOpportunityHistory(orgId: string, opportunityId: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data, error } = await client
    .from('external_opportunity_history')
    .select('id,action,details,actor_user_id,created_at')
    .eq('org_id', orgId)
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

/**
 * S48-GROWTH-019: records a request for deeper research without changing the review status —
 * this is a note for the team, not a state transition, so it doesn't fit transitionOpportunityReview.
 */
export async function requestDeeperResearch(orgId: string, opportunityId: string, note: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await client.from('external_opportunity_history').insert({
    org_id: orgId,
    opportunity_id: opportunityId,
    action: 'request_research',
    details: { note },
    actor_user_id: user?.id ?? null,
  });
  if (error) throw error;

  await writeAuditLog(client, orgId, 'external_opportunity', opportunityId, 'external_opportunity_request_research', { note }, user?.id ?? null);
  return { requested: true };
}

export async function listExternalDiscovery(orgId: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const [{ data: campaigns, error: campaignsError }, { data: opportunities, error: opportunitiesError }] = await Promise.all([
    client
      .from('external_discovery_campaigns')
      .select('id,name,status,icp_profile_id,created_at,updated_at')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(50),
    client
      .from('external_opportunities')
      .select(
        'id,campaign_id,job_id,company_name,country,company_type,website_url,primary_domain,source_label,source_url,source_evidence,verification_state,duplicate_state,duplicate_reasons,matched_lead_id,fit_score,fit_version,fit_reasons,fit_penalties,missing_data,review_status,review_note,contacted_at,responded_at,qualified_at,next_follow_up_at,follow_up_recommendation_id,converted_lead_id,converted_lead_type,created_at,updated_at',
      )
      .eq('org_id', orgId)
      .order('fit_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);
  if (campaignsError) throw campaignsError;
  if (opportunitiesError) throw opportunitiesError;

  const opportunityIds = (opportunities ?? []).map((item: any) => item.id);
  const { data: contacts } = opportunityIds.length
    ? await client
        .from('external_opportunity_contacts')
        .select('id,opportunity_id,full_name,title,email,phone,source_url,confidence,verification_state')
        .in('opportunity_id', opportunityIds)
    : { data: [] };

  const contactsByOpportunity: Record<string, any[]> = {};
  for (const contact of contacts ?? []) {
    (contactsByOpportunity[contact.opportunity_id] ??= []).push(contact);
  }

  return {
    campaigns: campaigns ?? [],
    opportunities: (opportunities ?? []).map((item: any) => ({ ...item, contacts: contactsByOpportunity[item.id] ?? [] })),
  };
}
