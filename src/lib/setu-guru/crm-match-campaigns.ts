import { createClient } from '@/lib/supabase/server';
import { getIcpProfile } from '@/lib/setu-guru/icp';

export type CrmMatchCampaignFilters = {
  type?: 'all' | 'buyer' | 'supplier';
  country?: string;
  source?: string;
  owner?: 'all' | 'mine';
  contact?: 'all' | 'contacted' | 'not_contacted';
  minFit?: number;
  query?: string;
};

export type CrmMatchCampaign = {
  id: string;
  org_id: string;
  name: string;
  status: 'active' | 'archived';
  icp_profile_id: string | null;
  icp_profile_name: string;
  icp_profile_version: number;
  filters: CrmMatchCampaignFilters;
  last_run_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

const CAMPAIGN_COLUMNS = [
  'id', 'org_id', 'name', 'status', 'icp_profile_id', 'icp_profile_name',
  'icp_profile_version', 'filters', 'last_run_at', 'created_by', 'updated_by',
  'created_at', 'updated_at',
].join(',');

export async function listCrmMatchCampaigns(orgId: string): Promise<CrmMatchCampaign[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('crm_match_campaigns')
    .select(CAMPAIGN_COLUMNS)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CrmMatchCampaign[];
}

export async function createCrmMatchCampaign(
  orgId: string,
  input: { name: string; profileId?: string | null; filters?: CrmMatchCampaignFilters },
): Promise<CrmMatchCampaign> {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');

  const profile = await getIcpProfile(orgId, input.profileId ?? null);
  if (!profile) throw new Error('An accessible ICP profile is required.');

  const { data, error } = await client
    .from('crm_match_campaigns')
    .insert({
      org_id: orgId,
      name: input.name.trim(),
      status: 'active',
      icp_profile_id: profile.id,
      icp_profile_name: profile.name,
      icp_profile_version: profile.version,
      filters: input.filters ?? {},
      last_run_at: new Date().toISOString(),
      created_by: user.id,
      updated_by: user.id,
    })
    .select(CAMPAIGN_COLUMNS)
    .single();
  if (error) throw error;
  return data as CrmMatchCampaign;
}

export async function markCrmMatchCampaignRun(orgId: string, campaignId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');
  const { error } = await (supabase as any)
    .from('crm_match_campaigns')
    .update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', campaignId)
    .eq('org_id', orgId)
    .eq('status', 'active');
  if (error) throw error;
}
