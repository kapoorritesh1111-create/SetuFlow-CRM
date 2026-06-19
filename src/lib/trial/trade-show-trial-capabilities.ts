export const TRADE_SHOW_TRIAL_MODE = 'trade_show_trial';

export const TRADE_SHOW_TRIAL_ACTIVE_CAPABILITIES = [
  'capture_type',
  'capture_dictate',
  'capture_scan',
  'vcard_qr',
  'csv_export',
] as const;

export const TRADE_SHOW_TRIAL_PREVIEW_CAPABILITIES = [
  'dashboard',
  'analytics',
  'lead_command_center',
  'quotes',
  'orders',
] as const;

export type TradeShowTrialActiveCapability = (typeof TRADE_SHOW_TRIAL_ACTIVE_CAPABILITIES)[number];
export type TradeShowTrialPreviewCapability = (typeof TRADE_SHOW_TRIAL_PREVIEW_CAPABILITIES)[number];
export type TradeShowTrialCapability = TradeShowTrialActiveCapability | TradeShowTrialPreviewCapability;

export type TradeShowTrialCapabilityState = {
  organizationId: string;
  trialMode: typeof TRADE_SHOW_TRIAL_MODE;
  activeCapabilities: TradeShowTrialActiveCapability[];
  previewCapabilities: TradeShowTrialPreviewCapability[];
  allowExports: boolean;
  allowPremium: boolean;
  isTradeShowTrial: boolean;
};

type TrialCapabilityRow = {
  organization_id: string | null;
  trial_mode: string | null;
  active_capabilities: string[] | null;
  preview_capabilities: string[] | null;
  allow_exports: boolean | null;
  allow_premium: boolean | null;
};

type QueryResult<T> = Promise<{ data: T | null; error: { message?: string } | null }>;

type TrialCapabilityQuery = {
  eq(column: 'organization_id' | 'trial_mode', value: string): TrialCapabilityQuery;
  maybeSingle(): QueryResult<TrialCapabilityRow>;
};

type TrialCapabilityClient = {
  from(table: 'organization_trial_capabilities'): {
    select(columns: string): TrialCapabilityQuery;
  };
};

const ACTIVE_CAPABILITY_SET = new Set<string>(TRADE_SHOW_TRIAL_ACTIVE_CAPABILITIES);
const PREVIEW_CAPABILITY_SET = new Set<string>(TRADE_SHOW_TRIAL_PREVIEW_CAPABILITIES);

export function isTradeShowTrialActiveCapability(value: string): value is TradeShowTrialActiveCapability {
  return ACTIVE_CAPABILITY_SET.has(value);
}

export function isTradeShowTrialPreviewCapability(value: string): value is TradeShowTrialPreviewCapability {
  return PREVIEW_CAPABILITY_SET.has(value);
}

function normalizeActiveCapabilities(values: string[] | null | undefined): TradeShowTrialActiveCapability[] {
  const normalized = (values ?? []).filter(isTradeShowTrialActiveCapability);
  return normalized.length ? normalized : [...TRADE_SHOW_TRIAL_ACTIVE_CAPABILITIES];
}

function normalizePreviewCapabilities(values: string[] | null | undefined): TradeShowTrialPreviewCapability[] {
  const normalized = (values ?? []).filter(isTradeShowTrialPreviewCapability);
  return normalized.length ? normalized : [...TRADE_SHOW_TRIAL_PREVIEW_CAPABILITIES];
}

export function getDefaultTradeShowTrialCapabilityState(organizationId: string): TradeShowTrialCapabilityState {
  return {
    organizationId,
    trialMode: TRADE_SHOW_TRIAL_MODE,
    activeCapabilities: [...TRADE_SHOW_TRIAL_ACTIVE_CAPABILITIES],
    previewCapabilities: [...TRADE_SHOW_TRIAL_PREVIEW_CAPABILITIES],
    allowExports: true,
    allowPremium: false,
    isTradeShowTrial: true,
  };
}

export function normalizeTradeShowTrialCapabilityState(
  organizationId: string,
  row: TrialCapabilityRow | null | undefined,
): TradeShowTrialCapabilityState | null {
  if (!row || row.trial_mode !== TRADE_SHOW_TRIAL_MODE) return null;

  return {
    organizationId,
    trialMode: TRADE_SHOW_TRIAL_MODE,
    activeCapabilities: normalizeActiveCapabilities(row.active_capabilities),
    previewCapabilities: normalizePreviewCapabilities(row.preview_capabilities),
    allowExports: row.allow_exports !== false,
    allowPremium: row.allow_premium === true,
    isTradeShowTrial: true,
  };
}

export async function getTradeShowTrialCapabilityState(
  client: TrialCapabilityClient,
  organizationId: string,
): Promise<TradeShowTrialCapabilityState | null> {
  const { data, error } = await client
    .from('organization_trial_capabilities')
    .select('organization_id, trial_mode, active_capabilities, preview_capabilities, allow_exports, allow_premium')
    .eq('organization_id', organizationId)
    .eq('trial_mode', TRADE_SHOW_TRIAL_MODE)
    .maybeSingle();

  if (error) return null;
  return normalizeTradeShowTrialCapabilityState(organizationId, data);
}

export function hasTrialCapability(state: TradeShowTrialCapabilityState | null, capability: TradeShowTrialCapability): boolean {
  if (!state?.isTradeShowTrial) return false;
  if (state.allowPremium) return true;
  if (isTradeShowTrialActiveCapability(capability)) return state.activeCapabilities.includes(capability);
  return false;
}

export function isPreviewOnlyTrialCapability(
  state: TradeShowTrialCapabilityState | null,
  capability: TradeShowTrialPreviewCapability,
): boolean {
  if (!state?.isTradeShowTrial || state.allowPremium) return false;
  return state.previewCapabilities.includes(capability);
}

export function getPremiumCapabilityForPathname(pathname: string): TradeShowTrialPreviewCapability | null {
  if (pathname.startsWith('/api/quotes/')) return 'quotes';
  if (pathname.startsWith('/api/orders/')) return 'orders';
  if (pathname.startsWith('/api/products') || pathname.startsWith('/api/catalog')) return 'lead_command_center';
  if (pathname.startsWith('/api/leads/coverage-resolver')) return 'lead_command_center';
  if (pathname === '/quotes' || pathname.startsWith('/quotes/')) return 'quotes';
  if (pathname === '/orders' || pathname.startsWith('/orders/')) return 'orders';
  return null;
}
