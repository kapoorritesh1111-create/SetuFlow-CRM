import { createClient } from '@/lib/supabase/server';
import { getIcpProfile } from '@/lib/setu-guru/icp';

export type DiscoveryProviderResult = {
  companyName: string;
  country?: string | null;
  companyType?: string | null;
  websiteUrl?: string | null;
  sourceLabel: string;
  sourceUrl?: string | null;
  evidence?: Record<string, unknown>[];
};

export type DiscoveryProvider = {
  key: string;
  discover(input: { countries: string[]; products: string[]; buyerTypes: string[] }): Promise<DiscoveryProviderResult[]>;
};

export type DuplicateMatch = {
  state: 'new' | 'possible_duplicate' | 'confirmed_duplicate';
  reasons: string[];
  matchedLeadId: string | null;
};

export function normalizeCompanyName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(ltd|llc|inc|corp|company|co|limited|private|pvt)\b/g, '').replace(/\s+/g, ' ').trim();
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

export async function detectDuplicate(orgId: string, result: DiscoveryProviderResult): Promise<DuplicateMatch> {
  const supabase = await createClient();
  const client = supabase as any;
  const normalizedName = normalizeCompanyName(result.companyName);
  const domain = normalizeDomain(result.websiteUrl);
  const reasons: string[] = [];

  let leadQuery = client.from('leads').select('id,company_name,country,website').eq('organization_id', orgId).limit(50);
  if (domain) leadQuery = leadQuery.or(`website.ilike.%${domain}%`);
  else leadQuery = leadQuery.ilike('company_name', `%${result.companyName}%`);
  const { data: leads } = await leadQuery;

  const leadMatch = (leads ?? []).find((lead: any) => {
    const nameMatch = normalizeCompanyName(lead.company_name || '') === normalizedName;
    const countryMatch = !result.country || !lead.country || String(lead.country).toLowerCase() === String(result.country).toLowerCase();
    const domainMatch = domain && normalizeDomain(lead.website) === domain;
    if (domainMatch) reasons.push('Website domain matches an existing CRM record.');
    if (nameMatch && countryMatch) reasons.push('Normalized company name and country match an existing CRM record.');
    return domainMatch || (nameMatch && countryMatch);
  });

  if (leadMatch) return { state: 'confirmed_duplicate', reasons, matchedLeadId: leadMatch.id };

  const { data: discoveries } = await client
    .from('external_opportunities')
    .select('id,normalized_company_name,country,primary_domain')
    .eq('org_id', orgId)
    .or(domain ? `primary_domain.eq.${domain},normalized_company_name.eq.${normalizedName}` : `normalized_company_name.eq.${normalizedName}`)
    .limit(10);

  if ((discoveries ?? []).length) return { state: 'possible_duplicate', reasons: ['Matches a prior external discovery by domain or normalized name.'], matchedLeadId: null };
  return { state: 'new', reasons: [], matchedLeadId: null };
}

export async function createDiscoveryCampaign(orgId: string, name: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');
  const icp = await getIcpProfile(orgId);
  if (!icp) throw new Error('An active ICP profile is required before discovery can start.');

  const { data, error } = await client.from('external_discovery_campaigns').insert({
    org_id: orgId,
    name,
    status: 'draft',
    icp_profile_id: icp.id,
    icp_snapshot: icp,
    created_by: user.id,
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function runDiscoveryProvider(orgId: string, campaignId: string, provider: DiscoveryProvider) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: campaign, error: campaignError } = await client.from('external_discovery_campaigns').select('*').eq('org_id', orgId).eq('id', campaignId).single();
  if (campaignError) throw campaignError;

  const snapshot = campaign.icp_snapshot ?? {};
  const idempotencyKey = `${campaignId}:${provider.key}:${JSON.stringify(snapshot)}`;
  const { data: job, error: jobError } = await client.from('external_discovery_jobs').upsert({
    org_id: orgId,
    campaign_id: campaignId,
    status: 'running',
    idempotency_key: idempotencyKey,
    provider_key: provider.key,
    provider_request: { countries: snapshot.target_countries ?? [], products: snapshot.products ?? [], buyerTypes: snapshot.buyer_types ?? [] },
    started_at: new Date().toISOString(),
  }, { onConflict: 'org_id,idempotency_key' }).select('*').single();
  if (jobError) throw jobError;

  try {
    const raw = await provider.discover({ countries: snapshot.target_countries ?? [], products: snapshot.products ?? [], buyerTypes: snapshot.buyer_types ?? [] });
    let inserted = 0;
    for (const result of raw) {
      const duplicate = await detectDuplicate(orgId, result);
      const { error } = await client.from('external_opportunities').insert({
        org_id: orgId,
        campaign_id: campaignId,
        job_id: job.id,
        company_name: result.companyName,
        normalized_company_name: normalizeCompanyName(result.companyName),
        country: result.country ?? null,
        company_type: result.companyType ?? null,
        website_url: result.websiteUrl ?? null,
        primary_domain: normalizeDomain(result.websiteUrl),
        source_label: result.sourceLabel,
        source_url: result.sourceUrl ?? null,
        source_evidence: result.evidence ?? [],
        duplicate_state: duplicate.state,
        duplicate_reasons: duplicate.reasons,
        matched_lead_id: duplicate.matchedLeadId,
        verification_state: result.sourceUrl ? 'source_verified' : 'unverified',
      });
      if (!error) inserted += 1;
    }
    await client.from('external_discovery_jobs').update({ status: 'completed', provider_response: { received: raw.length, inserted }, completed_at: new Date().toISOString() }).eq('id', job.id).eq('org_id', orgId);
    await client.from('external_discovery_campaigns').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', campaignId).eq('org_id', orgId);
    return { jobId: job.id, received: raw.length, inserted };
  } catch (error) {
    await client.from('external_discovery_jobs').update({ status: 'failed', last_error: error instanceof Error ? error.message : String(error), completed_at: new Date().toISOString() }).eq('id', job.id).eq('org_id', orgId);
    throw error;
  }
}

export async function listExternalDiscovery(orgId: string) {
  const supabase = await createClient();
  const client = supabase as any;
  const [{ data: campaigns }, { data: opportunities }] = await Promise.all([
    client.from('external_discovery_campaigns').select('id,name,status,icp_profile_id,created_at,updated_at').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(25),
    client.from('external_opportunities').select('id,campaign_id,company_name,country,company_type,source_label,source_url,verification_state,duplicate_state,fit_score,fit_reasons,review_status,created_at').eq('org_id', orgId).order('fit_score', { ascending: false }).order('created_at', { ascending: false }).limit(500),
  ]);
  return { campaigns: campaigns ?? [], opportunities: opportunities ?? [] };
}
