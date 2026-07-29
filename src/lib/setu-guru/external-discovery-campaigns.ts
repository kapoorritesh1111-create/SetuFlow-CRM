import { createClient } from '@/lib/supabase/server';
import { getIcpProfile, type IcpProfile } from '@/lib/setu-guru/icp';
import { listExternalDiscovery } from '@/lib/setu-guru/external-discovery';

export type GuidedCampaignMode = 'saved_icp' | 'new_market' | 'lookalike' | 'fresh_research' | 'supplier_partner';
export type GuidedResearchDirection = 'buyers' | 'suppliers' | 'partners' | 'manufacturers';
export type GuidedSourceStrategy = 'crm_and_external' | 'crm_only' | 'external_only';

export type GuidedSearchConfig = {
  objective: string;
  products: string[];
  target_countries: string[];
  target_company_types: string[];
  target_industries: string[];
  excluded_company_types: string[];
  result_limit: number;
  minimum_fit_score: number;
  search_languages: string[];
  source_requirements: string[];
  duplicate_detection: boolean;
  suggest_contact_roles: boolean;
  source_strategy: GuidedSourceStrategy;
  lookalike_lead_id: string | null;
};

export type CreateGuidedCampaignInput = {
  name: string;
  campaignMode: GuidedCampaignMode;
  researchDirection: GuidedResearchDirection;
  sourceStrategy: GuidedSourceStrategy;
  goal: string;
  icpProfileId: string | null;
  lookalikeLeadId: string | null;
  searchConfig: GuidedSearchConfig;
};

function singleSideTargetSnapshot(
  profile: IcpProfile | null,
  direction: GuidedResearchDirection,
  config: GuidedSearchConfig,
  lookalike: Record<string, unknown> | null,
) {
  const targetTypes = [...config.target_company_types];
  const buyerSide = direction === 'buyers' || direction === 'partners';
  const supplierSide = direction === 'suppliers' || direction === 'manufacturers';

  return {
    ...(profile ?? {}),
    id: profile?.id ?? null,
    name: profile?.name ?? 'Campaign-specific research scope',
    target_countries: [...config.target_countries],
    products: [...config.products],
    buyer_types: buyerSide ? targetTypes : [],
    supplier_types: supplierSide ? targetTypes : [],
    vertical_profile: {
      ...(profile?.vertical_profile ?? {}),
      campaign_industries: [...config.target_industries],
      excluded_company_types: [...config.excluded_company_types],
      research_direction: direction,
      source_strategy: config.source_strategy,
      lookalike,
    },
    campaign_scope: {
      objective: config.objective,
      target_company_types: targetTypes,
      result_limit: config.result_limit,
      minimum_fit_score: config.minimum_fit_score,
      search_languages: [...config.search_languages],
      source_requirements: [...config.source_requirements],
      duplicate_detection: config.duplicate_detection,
      suggest_contact_roles: config.suggest_contact_roles,
    },
  };
}

async function readLookalike(client: any, orgId: string, leadId: string | null) {
  if (!leadId) return null;
  const { data, error } = await client
    .from('leads')
    .select('id,company_name,country,lead_type,main_product_category,products_or_needs,industry_metadata')
    .eq('organization_id', orgId)
    .eq('id', leadId)
    .single();
  if (error || !data) throw new Error('The selected lookalike company was not found in this organization.');
  return data as Record<string, unknown>;
}

export async function createGuidedDiscoveryCampaign(orgId: string, input: CreateGuidedCampaignInput) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');

  const profile = input.icpProfileId ? await getIcpProfile(orgId, input.icpProfileId) : null;
  if ((input.campaignMode === 'saved_icp' || input.campaignMode === 'new_market') && !profile) {
    throw new Error('The selected ICP is not available in this organization.');
  }
  const lookalike = await readLookalike(client, orgId, input.lookalikeLeadId);
  if (input.campaignMode === 'lookalike' && !lookalike) {
    throw new Error('Select an existing CRM company for lookalike research.');
  }

  // This is a detached campaign snapshot. The source ICP is read only and remains unchanged.
  // Buyer and supplier targets are never combined: exactly one side is populated for a campaign.
  const icpSnapshot = singleSideTargetSnapshot(profile, input.researchDirection, input.searchConfig, lookalike);
  const resolvedConfig = {
    ...input.searchConfig,
    campaign_mode: input.campaignMode,
    research_direction: input.researchDirection,
    source_strategy: input.sourceStrategy,
    goal: input.goal,
    inherited_icp_id: profile?.id ?? null,
    inherited_icp_version: profile?.version ?? null,
    saved_icp_target_countries: profile?.target_countries ?? [],
    resolved_target_countries: input.searchConfig.target_countries,
  };

  const { data, error } = await client
    .from('external_discovery_campaigns')
    .insert({
      org_id: orgId,
      name: input.name,
      status: 'draft',
      campaign_mode: input.campaignMode,
      research_direction: input.researchDirection,
      scope_status: 'ready',
      search_config: resolvedConfig,
      icp_profile_id: profile?.id ?? null,
      icp_snapshot: icpSnapshot,
      created_by: user.id,
    })
    .select('*')
    .single();
  if (error) throw error;

  const { error: auditError } = await client.from('audit_logs').insert({
    organization_id: orgId,
    entity_type: 'external_discovery_campaign',
    entity_id: data.id,
    action: 'setu_guru_action_external_discovery_campaign_created',
    payload: {
      name: input.name,
      campaign_mode: input.campaignMode,
      research_direction: input.researchDirection,
      scope_status: 'ready',
      resolved_target_countries: input.searchConfig.target_countries,
      approved_by_human: true,
      research_started: false,
    },
    actor_user_id: user.id,
  });
  if (auditError) console.error('[guided-discovery-campaign] audit write failed', { orgId, campaignId: data.id, error: auditError.message });

  return data;
}

export async function listGuidedExternalDiscovery(orgId: string) {
  const base = await listExternalDiscovery(orgId);
  const supabase = await createClient();
  const client = supabase as any;
  const [{ data: details, error: detailsError }, { data: jobs, error: jobsError }] = await Promise.all([
    client
      .from('external_discovery_campaigns')
      .select('id,campaign_mode,research_direction,scope_status,search_config,icp_snapshot')
      .eq('org_id', orgId)
      .limit(50),
    client
      .from('external_discovery_jobs')
      .select('id,campaign_id,status,provider_key,provider_request,provider_response,last_error,started_at,completed_at,created_at,updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(250),
  ]);

  // Backward-compatible during deployment: the existing workspace still loads before the additive
  // campaign columns are available, and automatically enriches once the columns are available.
  if (detailsError) return base;

  const detailsByCampaign = new Map((details ?? []).map((item: any) => [item.id, item]));
  const latestJobByCampaign = new Map<string, any>();
  if (!jobsError) {
    for (const job of jobs ?? []) {
      if (!latestJobByCampaign.has(job.campaign_id)) latestJobByCampaign.set(job.campaign_id, job);
    }
  }

  const resultCountByCampaign = new Map<string, number>();
  for (const opportunity of base.opportunities as any[]) {
    if (!opportunity.campaign_id) continue;
    resultCountByCampaign.set(opportunity.campaign_id, (resultCountByCampaign.get(opportunity.campaign_id) ?? 0) + 1);
  }

  const campaigns = base.campaigns.map((campaign: any) => ({
    ...campaign,
    ...(detailsByCampaign.get(campaign.id) ?? {}),
    latest_job: latestJobByCampaign.get(campaign.id) ?? null,
    result_count: resultCountByCampaign.get(campaign.id) ?? 0,
  }));
  const campaignNames = new Map(campaigns.map((campaign: any) => [campaign.id, campaign.name]));

  return {
    ...base,
    campaigns,
    opportunities: base.opportunities.map((opportunity: any) => ({
      ...opportunity,
      campaign_name: opportunity.campaign_id ? campaignNames.get(opportunity.campaign_id) ?? null : null,
    })),
  };
}
