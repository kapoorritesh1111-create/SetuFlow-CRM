import { createClient } from '@/lib/supabase/server';

export const TRIAL_TEMPLATE_KEYS = [
  'export_foods_basic',
  'ingredient_trader',
  'distributor_importer',
  'packaging_converter',
] as const;

export type TrialTemplateKey = (typeof TRIAL_TEMPLATE_KEYS)[number];

export type TrialCapability = {
  organization_id: string;
  is_trial: boolean;
  billing_status: string | null;
  trial_ends_at: string | null;
  trial_template_key: TrialTemplateKey | null;
  max_leads: number | null;
  max_quotes: number | null;
  max_orders: number | null;
  max_users: number | null;
  lead_count: number;
  quote_count: number;
  order_count: number;
  active_user_count: number;
  remaining_leads: number | null;
  remaining_quotes: number | null;
  remaining_orders: number | null;
  remaining_users: number | null;
  allow_exports: boolean;
  allow_invites: boolean;
  allow_settings_edit: boolean;
  allow_dispatch: boolean;
  guided_mode_enabled: boolean;
  overage_policy: string | null;
};

type TrialRpcError = {
  message: string;
};

type TrialRpcClient = {
  rpc(
    functionName: 'get_trial_capability',
    args: { p_organization_id: string },
  ): Promise<{ data: TrialCapability[] | null; error: TrialRpcError | null }>;
  rpc(
    functionName: 'is_trial_org',
    args: { p_organization_id: string },
  ): Promise<{ data: boolean | null; error: TrialRpcError | null }>;
};

export type TrialCapabilityResult = {
  capability: TrialCapability | null;
  error: string | null;
};

export type TrialStatusResult = {
  isTrial: boolean;
  error: string | null;
};

export type TrialCapabilityClient = Awaited<ReturnType<typeof createClient>>;

function asTrialRpcClient(client: TrialCapabilityClient): TrialRpcClient {
  return client as unknown as TrialRpcClient;
}

export function isTrialTemplateKey(value: string | null | undefined): value is TrialTemplateKey {
  return TRIAL_TEMPLATE_KEYS.includes(value as TrialTemplateKey);
}

export function normalizeTrialTemplateKey(value: string | null | undefined): TrialTemplateKey | null {
  return isTrialTemplateKey(value) ? value : null;
}

export function isTrialCapability(capability: TrialCapability | null | undefined) {
  return capability?.is_trial === true;
}

export function hasReachedTrialLimit(used: number, limit: number | null | undefined) {
  if (limit === null || typeof limit === 'undefined') return false;
  return used >= limit;
}

export function getRemainingTrialSlots(used: number, limit: number | null | undefined) {
  if (limit === null || typeof limit === 'undefined') return null;
  return Math.max(limit - used, 0);
}

export async function getTrialCapability(
  organizationId: string,
  client?: TrialCapabilityClient,
): Promise<TrialCapabilityResult> {
  const supabase = asTrialRpcClient(client ?? (await createClient()));
  const { data, error } = await supabase.rpc('get_trial_capability', {
    p_organization_id: organizationId,
  });

  if (error) {
    return { capability: null, error: error.message };
  }

  return { capability: data?.[0] ?? null, error: null };
}

export async function isTrialOrg(
  organizationId: string,
  client?: TrialCapabilityClient,
): Promise<TrialStatusResult> {
  const supabase = asTrialRpcClient(client ?? (await createClient()));
  const { data, error } = await supabase.rpc('is_trial_org', {
    p_organization_id: organizationId,
  });

  if (error) {
    return { isTrial: false, error: error.message };
  }

  return { isTrial: data === true, error: null };
}
