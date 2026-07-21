import { createClient } from '@/lib/supabase/server';

/**
 * S24-SPEN-201 — Vertical capability resolver.
 *
 * A vertical changes how Catalog, Quote Builder, and Admin present the
 * commercial workflow for an organization. The first vertical is
 * `packaging` (custom-size packaging quotes without fixed-size SKUs).
 *
 * Activation sources, in priority order:
 *  1. client_entitlement_profiles.vertical_key — explicit, survives trial
 *     conversion, set at provisioning or from admin client management.
 *  2. client_entitlement_profiles.trial_template_key = 'packaging_converter'
 *     — implicit trial activation so guided packaging trials work without
 *     extra setup.
 *
 * Non-packaging organizations resolve to the default trade CRM with zero
 * behavior change.
 */

export const VERTICAL_KEYS = ['packaging'] as const;
export type VerticalKey = (typeof VERTICAL_KEYS)[number];

export type OrganizationVerticals = {
  organizationId: string;
  verticalKey: VerticalKey | null;
  packagingEnabled: boolean;
  source: 'entitlement_vertical_key' | 'packaging_converter_trial' | 'none';
};

type VerticalsClient = Awaited<ReturnType<typeof createClient>>;

export function isVerticalKey(value: string | null | undefined): value is VerticalKey {
  return VERTICAL_KEYS.includes(value as VerticalKey);
}

export async function getOrganizationVerticals(
  organizationId: string,
  client?: VerticalsClient,
): Promise<OrganizationVerticals> {
  const fallback: OrganizationVerticals = {
    organizationId,
    verticalKey: null,
    packagingEnabled: false,
    source: 'none',
  };
  if (!organizationId) return fallback;

  try {
    const supabase = (client ?? (await createClient())) as any;
    const { data, error } = await supabase
      .from('client_entitlement_profiles')
      .select('vertical_key, trial_template_key')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !data) return fallback;

    if (isVerticalKey(data.vertical_key)) {
      return {
        organizationId,
        verticalKey: data.vertical_key,
        packagingEnabled: data.vertical_key === 'packaging',
        source: 'entitlement_vertical_key',
      };
    }

    if (data.trial_template_key === 'packaging_converter') {
      return {
        organizationId,
        verticalKey: 'packaging',
        packagingEnabled: true,
        source: 'packaging_converter_trial',
      };
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export async function isPackagingOrganization(
  organizationId: string,
  client?: VerticalsClient,
): Promise<boolean> {
  const verticals = await getOrganizationVerticals(organizationId, client);
  return verticals.packagingEnabled;
}
