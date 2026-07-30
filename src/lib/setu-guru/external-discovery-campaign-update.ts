import { createClient } from '@/lib/supabase/server';
import { getIcpProfile, type IcpProfile } from '@/lib/setu-guru/icp';
import type {
  CreateGuidedCampaignInput,
  GuidedResearchDirection,
  GuidedSearchConfig,
} from '@/lib/setu-guru/external-discovery-campaigns';

function buildSingleDirectionSnapshot(
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

export async function updateGuidedDiscoveryCampaign(
  orgId: string,
  campaignId: string,
  input: CreateGuidedCampaignInput,
) {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');

  const { data: existing, error: existingError } = await client
    .from('external_discovery_campaigns')
    .select('id,scope_status')
    .eq('org_id', orgId)
    .eq('id', campaignId)
    .single();
  if (existingError || !existing) throw new Error('The campaign was not found in this organization.');
  if (existing.scope_status === 'researching') throw new Error('Wait for the current research run to finish before editing this campaign.');

  const profile = input.icpProfileId ? await getIcpProfile(orgId, input.icpProfileId) : null;
  if ((input.campaignMode === 'saved_icp' || input.campaignMode === 'new_market') && !profile) {
    throw new Error('The selected ICP is not available in this organization.');
  }
  const lookalike = await readLookalike(client, orgId, input.lookalikeLeadId);
  if (input.campaignMode === 'lookalike' && !lookalike) {
    throw new Error('Select an existing CRM company for lookalike research.');
  }

  const icpSnapshot = buildSingleDirectionSnapshot(profile, input.researchDirection, input.searchConfig, lookalike);
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
    .update({
      name: input.name,
      status: 'draft',
      campaign_mode: input.campaignMode,
      research_direction: input.researchDirection,
      scope_status: 'ready',
      search_config: resolvedConfig,
      icp_profile_id: profile?.id ?? null,
      icp_snapshot: icpSnapshot,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
    .eq('id', campaignId)
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('The campaign scope could not be updated.');

  const { error: auditError } = await client.from('audit_logs').insert({
    organization_id: orgId,
    entity_type: 'external_discovery_campaign',
    entity_id: campaignId,
    action: 'setu_guru_action_external_discovery_campaign_scope_updated',
    payload: {
      name: input.name,
      campaign_mode: input.campaignMode,
      research_direction: input.researchDirection,
      scope_status: 'ready',
      resolved_target_countries: input.searchConfig.target_countries,
      approved_by_human: true,
      research_started: false,
      saved_icp_changed: false,
    },
    actor_user_id: user.id,
  });
  if (auditError) console.error('[guided-discovery-campaign] scope update audit failed', { orgId, campaignId, error: auditError.message });

  return data;
}
