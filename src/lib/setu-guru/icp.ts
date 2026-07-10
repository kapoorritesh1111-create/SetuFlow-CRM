import { createClient } from '@/lib/supabase/server';

export type IcpProfile = {
  id: string;
  name: string;
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
  created_at: string;
  updated_at: string;
};

export type IcpProfileInput = {
  name?: string;
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
  'id',
  'name',
  'products',
  'target_countries',
  'buyer_types',
  'supplier_types',
  'moq_rules',
  'certifications',
  'preferred_currency',
  'outreach_style',
  'available_documents',
  'required_documents',
  'outreach_channel',
  'outreach_tone',
  'created_at',
  'updated_at',
].join(',');

export async function getIcpProfile(orgId: string): Promise<IcpProfile | null> {
  const supabase = await createClient();
  const client = supabase as any;

  const { data, error } = await client
    .from('org_icp_profiles')
    .select(ICP_COLUMNS)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return (data as IcpProfile | null) ?? null;
}

export async function saveIcpProfile(orgId: string, input: IcpProfileInput): Promise<IcpProfile> {
  const supabase = await createClient();
  const client = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    org_id: orgId,
    name: input.name?.trim() || 'Default ICP',
    products: input.products ?? [],
    target_countries: input.target_countries ?? [],
    buyer_types: input.buyer_types ?? [],
    supplier_types: input.supplier_types ?? [],
    moq_rules: input.moq_rules ?? {},
    certifications: input.certifications ?? {},
    preferred_currency: input.preferred_currency ?? null,
    outreach_style: input.outreach_style ?? null,
    available_documents: input.available_documents ?? [],
    required_documents: input.required_documents ?? [],
    outreach_channel: input.outreach_channel ?? null,
    outreach_tone: input.outreach_tone ?? null,
    updated_by: user?.id ?? null,
  };

  const { data, error } = await client
    .from('org_icp_profiles')
    .upsert(payload, { onConflict: 'org_id' })
    .select(ICP_COLUMNS)
    .single();

  if (error) throw error;
  return data as IcpProfile;
}
