import { createClient } from '@/lib/supabase/server';

export type IcpOwnerType = 'organization' | 'personal' | 'campaign';

export type IcpProfile = {
  id: string;
  org_id: string;
  name: string;
  owner_type: IcpOwnerType;
  owner_user_id: string | null;
  campaign_key: string | null;
  version: number;
  is_active: boolean;
  archived_at: string | null;
  products: string[];
  target_countries: string[];
  buyer_types: string[];
  supplier_types: string[];
  moq_rules: Record<string, unknown>;
  certifications: Record<string, unknown>;
  preferred_currency: string | null;
  outreach_style: string | null;
  available_documents: string[];
  required_documents: string[];
  outreach_channel: string | null;
  outreach_tone: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type IcpProfileInput = {
  id?: string;
  name?: string;
  owner_type?: IcpOwnerType;
  campaign_key?: string | null;
  products?: string[];
  target_countries?: string[];
  buyer_types?: string[];
  supplier_types?: string[];
  moq_rules?: Record<string, unknown>;
  certifications?: Record<string, unknown>;
  preferred_currency?: string | null;
  outreach_style?: string | null;
  available_documents?: string[];
  required_documents?: string[];
  outreach_channel?: string | null;
  outreach_tone?: string | null;
};

const ICP_COLUMNS = [
  'id', 'org_id', 'name', 'owner_type', 'owner_user_id', 'campaign_key', 'version',
  'is_active', 'archived_at', 'products', 'target_countries', 'buyer_types',
  'supplier_types', 'moq_rules', 'certifications', 'preferred_currency',
  'outreach_style', 'available_documents', 'required_documents', 'outreach_channel',
  'outreach_tone', 'created_by', 'updated_by', 'created_at', 'updated_at',
].join(',');

export async function listIcpProfiles(orgId: string): Promise<IcpProfile[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const client = supabase as any;

  const { data, error } = await client
    .from('org_icp_profiles')
    .select(ICP_COLUMNS)
    .eq('org_id', orgId)
    .is('archived_at', null)
    .or(`owner_type.eq.organization,owner_user_id.eq.${user?.id ?? '00000000-0000-0000-0000-000000000000'}`)
    .order('is_active', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as IcpProfile[];
}

export async function getIcpProfile(orgId: string, profileId?: string | null): Promise<IcpProfile | null> {
  const profiles = await listIcpProfiles(orgId);
  if (profileId) return profiles.find((profile) => profile.id === profileId) ?? null;

  return profiles.find((profile) => profile.owner_type === 'personal' && profile.is_active)
    ?? profiles.find((profile) => profile.owner_type === 'organization' && profile.is_active)
    ?? profiles[0]
    ?? null;
}

export async function saveIcpProfile(orgId: string, input: IcpProfileInput): Promise<IcpProfile> {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required to save an ICP profile.');

  const ownerType = input.owner_type ?? 'personal';
  const existing = input.id ? await getIcpProfile(orgId, input.id) : null;
  if (input.id && !existing) throw new Error('ICP profile not found or not accessible.');

  const ownerUserId = ownerType === 'personal' ? user.id : null;
  const campaignKey = ownerType === 'campaign' ? input.campaign_key?.trim() || null : null;
  if (ownerType === 'campaign' && !campaignKey) throw new Error('Campaign profiles require a campaign key.');

  const payload = {
    org_id: orgId,
    name: input.name?.trim() || existing?.name || 'Default ICP',
    owner_type: ownerType,
    owner_user_id: ownerUserId,
    campaign_key: campaignKey,
    version: (existing?.version ?? 0) + 1,
    is_active: true,
    archived_at: null,
    products: input.products ?? existing?.products ?? [],
    target_countries: input.target_countries ?? existing?.target_countries ?? [],
    buyer_types: input.buyer_types ?? existing?.buyer_types ?? [],
    supplier_types: input.supplier_types ?? existing?.supplier_types ?? [],
    moq_rules: input.moq_rules ?? existing?.moq_rules ?? {},
    certifications: input.certifications ?? existing?.certifications ?? {},
    preferred_currency: input.preferred_currency ?? existing?.preferred_currency ?? null,
    outreach_style: input.outreach_style ?? existing?.outreach_style ?? null,
    available_documents: input.available_documents ?? existing?.available_documents ?? [],
    required_documents: input.required_documents ?? existing?.required_documents ?? [],
    outreach_channel: input.outreach_channel ?? existing?.outreach_channel ?? null,
    outreach_tone: input.outreach_tone ?? existing?.outreach_tone ?? null,
    created_by: existing?.created_by ?? user.id,
    updated_by: user.id,
  };

  const identityFilter = ownerType === 'organization'
    ? client.from('org_icp_profiles').update({ is_active: false }).eq('org_id', orgId).eq('owner_type', 'organization').eq('is_active', true)
    : ownerType === 'personal'
      ? client.from('org_icp_profiles').update({ is_active: false }).eq('org_id', orgId).eq('owner_type', 'personal').eq('owner_user_id', user.id).eq('is_active', true)
      : client.from('org_icp_profiles').update({ is_active: false }).eq('org_id', orgId).eq('owner_type', 'campaign').eq('campaign_key', campaignKey).eq('is_active', true);

  if (!existing) {
    const { error: deactivateError } = await identityFilter;
    if (deactivateError) throw deactivateError;
  }

  const query = existing
    ? client.from('org_icp_profiles').update(payload).eq('id', existing.id).eq('org_id', orgId)
    : client.from('org_icp_profiles').insert(payload);

  const { data, error } = await query.select(ICP_COLUMNS).single();
  if (error) throw error;
  return data as IcpProfile;
}

export async function archiveIcpProfile(orgId: string, profileId: string): Promise<void> {
  const supabase = await createClient();
  const client = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication is required.');

  const { error } = await client
    .from('org_icp_profiles')
    .update({ is_active: false, archived_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', profileId)
    .eq('org_id', orgId)
    .or(`owner_type.eq.organization,owner_user_id.eq.${user.id}`);
  if (error) throw error;
}
