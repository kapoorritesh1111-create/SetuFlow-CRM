// Sprint 34 — Catalog Share Room shared types + helpers.
// Single source of truth for the catalog-share schema contract (S34-CATALOG-001/002).
// Aligns with catalog-pricing-model.ts CatalogProductOption — do NOT create parallel pricing types.

export type PriceListStatus = 'draft' | 'active' | 'expired' | 'archived';
export type CatalogShareStatus = 'draft' | 'active' | 'expired' | 'revoked' | 'archived';
export type MoqUnit = 'kg' | 'cases' | 'units';

export type CatalogShareEventType =
  | 'share_created'
  | 'link_opened'
  | 'product_viewed'
  | 'product_detail_opened'
  | 'pdf_downloaded'
  | 'product_selected'
  | 'product_removed'
  | 'quote_requested'
  | 'question_submitted'
  | 'quote_draft_created';

export type PriceList = {
  id: string;
  organization_id: string;
  name: string;
  currency: string;
  incoterm: string | null;
  incoterm_location: string | null;
  market: string | null;
  buyer_segment: string | null;
  valid_from: string | null;
  valid_until: string | null;
  status: PriceListStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PriceListItem = {
  id: string;
  price_list_id: string;
  product_id: string;
  product_variant_id: string | null;
  moq: number | null;
  moq_unit: MoqUnit | null;
  unit_price: number | null;
  currency: string | null;
  lead_time_days: number | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

export type PriceListTier = {
  id: string;
  price_list_item_id: string;
  tier_qty_min: number | null;
  tier_qty_max: number | null;
  unit_price: number | null;
  discount_pct: number | null;
  sort_order: number | null;
  created_at: string;
};

export type CatalogShare = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  token: string;
  price_list_id: string | null;
  buyer_name: string | null;
  buyer_company: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  incoterm: string | null;
  currency: string | null;
  valid_until: string | null;
  status: CatalogShareStatus;
  pdf_download_allowed: boolean;
  tracking_enabled: boolean;
  pin_code: string | null;
  share_channel: string | null;
  use_count: number;
  last_opened_at: string | null;
  quote_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogShareProduct = {
  id: string;
  catalog_share_id: string;
  product_id: string;
  sort_order: number | null;
  created_at: string;
};

export type CatalogShareEvent = {
  id: string;
  catalog_share_id: string;
  event_type: CatalogShareEventType;
  product_id: string | null;
  meta: Record<string, unknown> | null;
  occurred_at: string;
};

export type BuyerSelection = {
  id: string;
  catalog_share_id: string;
  product_id: string;
  quantity: number | null;
  tier_selected: string | null;
  note: string | null;
  selected_at: string;
};

// --- Product readiness (S34-CATALOG-003) -----------------------------------
// Derived in code, NOT stored. Based on completeness of export-ready fields.
export type ProductReadiness = 'ready' | 'needs_data' | 'missing_price' | 'missing_image';

export type ProductReadinessInput = {
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  pack_size?: string | null;
  hsn_code?: string | null;
  country_of_origin?: string | null;
  certifications?: string[] | null;
  fob_price?: number | null;
  exw_price?: number | null;
  cif_price?: number | null;
  moq_cases?: number | null;
  moq_kg?: number | null;
  hasPriceListCoverage?: boolean;
};

export function computeProductReadiness(p: ProductReadinessInput): {
  status: ProductReadiness;
  score: number;
  missing: string[];
} {
  const checks: Array<{ key: string; ok: boolean }> = [
    { key: 'name', ok: Boolean(p.name && p.name.trim()) },
    { key: 'description', ok: Boolean(p.description && p.description.trim()) },
    { key: 'image', ok: Boolean(p.image_url && p.image_url.trim()) },
    { key: 'pack size', ok: Boolean(p.pack_size && p.pack_size.trim()) },
    { key: 'HSN code', ok: Boolean(p.hsn_code && p.hsn_code.trim()) },
    { key: 'country of origin', ok: Boolean(p.country_of_origin && p.country_of_origin.trim()) },
    { key: 'certifications', ok: Array.isArray(p.certifications) && p.certifications.length > 0 },
    { key: 'MOQ', ok: (typeof p.moq_cases === 'number' && p.moq_cases > 0) || (typeof p.moq_kg === 'number' && p.moq_kg > 0) },
    {
      key: 'price',
      ok:
        Boolean(p.hasPriceListCoverage) ||
        (typeof p.fob_price === 'number' && p.fob_price > 0) ||
        (typeof p.exw_price === 'number' && p.exw_price > 0) ||
        (typeof p.cif_price === 'number' && p.cif_price > 0),
    },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  const missing = checks.filter((c) => !c.ok).map((c) => c.key);

  const hasPrice = checks.find((c) => c.key === 'price')?.ok ?? false;
  const hasImage = checks.find((c) => c.key === 'image')?.ok ?? false;

  let status: ProductReadiness;
  if (!hasPrice) status = 'missing_price';
  else if (!hasImage) status = 'missing_image';
  else if (missing.length > 0) status = 'needs_data';
  else status = 'ready';

  return { status, score, missing };
}

export function readinessLabel(status: ProductReadiness): string {
  switch (status) {
    case 'ready': return 'Ready';
    case 'needs_data': return 'Needs Data';
    case 'missing_price': return 'Missing Price';
    case 'missing_image': return 'Missing Image';
  }
}

// --- Token helper (mirrors qa_share_links / guest_links pattern) ------------
export function generateShareToken(): string {
  // 32 hex chars, URL-safe, unguessable. Matches existing token style.
  // Uses Web Crypto which is available in both the browser and Node 18+ runtimes.
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Validate a share is openable by a buyer (used server-side with service role).
export function isShareOpenable(share: Pick<CatalogShare, 'status' | 'valid_until'>): {
  ok: boolean;
  reason: 'ok' | 'revoked' | 'expired' | 'draft' | 'archived';
} {
  if (share.status === 'revoked') return { ok: false, reason: 'revoked' };
  if (share.status === 'archived') return { ok: false, reason: 'archived' };
  if (share.status === 'draft') return { ok: false, reason: 'draft' };
  if (share.valid_until && new Date(share.valid_until).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, reason: 'ok' };
}

export const CATALOG_SHARE_PUBLIC_PREFIX = '/catalog/share/';
