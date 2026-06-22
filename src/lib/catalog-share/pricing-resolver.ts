import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Canonical product pricing resolver.
 *
 * Background (S34-CATALOG-039): the Products workspace derives Ex-Factory / FOB
 * from `product_pricing_rules` (+ `product_prices`), but the Catalog Hub, the
 * Price-List picker and the readiness badge historically read the flat
 * `products.fob_price / exw_price / cif_price / ddp_price` columns. Those flat
 * columns are a stale, partially-populated snapshot stored in mixed units, so
 * priced products showed "Missing Price" and the Price-List editor failed to
 * auto-fill. This resolver gives every catalog/price-list surface the SAME
 * per-unit USD pricing the Products page shows, so numbers never diverge across
 * /products, /price-lists, the Share Wizard, the buyer PDF and quote conversion.
 *
 * Basis coverage: EXW and FOB come from the canonical rules (per-unit preferred,
 * falling back to per-case / flat columns). CIF and DDP are not modelled in
 * `product_pricing_rules`, so they pass through from the flat product columns
 * when present; callers fall back to FOB for those bases otherwise.
 */

export type ResolvedPricing = {
  exw_price: number | null;
  fob_price: number | null;
  cif_price: number | null;
  ddp_price: number | null;
  pricing_currency: string | null;
  /** true when EXW/FOB came from the canonical pricing engine rather than flat columns */
  from_rules: boolean;
};

type RuleRow = {
  product_id: string | null;
  product_variant_id: string | null;
  effective_from: string | null;
  ex_factory_usd: number | string | null;
  fob_usd: number | string | null;
  ex_factory_usd_per_unit: number | string | null;
  fob_usd_per_unit: number | string | null;
  ex_factory_usd_per_case: number | string | null;
  fob_usd_per_case: number | string | null;
  ex_factory_inr: number | string | null;
  fob_inr: number | string | null;
  bulk_usd_per_kg: number | string | null;
};

type FlatProductRow = {
  id: string;
  fob_price: number | string | null;
  exw_price: number | string | null;
  cif_price: number | string | null;
  ddp_price?: number | string | null;
  pricing_currency: string | null;
};

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Best per-unit value for a basis from a single rule row. */
function exwFromRule(r: RuleRow): number | null {
  return num(r.ex_factory_usd_per_unit) ?? num(r.ex_factory_usd) ?? num(r.ex_factory_inr);
}
function fobFromRule(r: RuleRow): number | null {
  return num(r.fob_usd_per_unit) ?? num(r.fob_usd) ?? num(r.bulk_usd_per_kg) ?? num(r.fob_inr);
}

/**
 * Resolve canonical pricing for the given products.
 * @returns Map keyed by product_id → ResolvedPricing
 */
export async function resolveProductPricing(
  sb: SupabaseClient | any,
  organizationId: string,
  productIds: string[],
  flatById?: Map<string, FlatProductRow>,
): Promise<Map<string, ResolvedPricing>> {
  const out = new Map<string, ResolvedPricing>();
  const ids = Array.from(new Set(productIds.filter(Boolean)));
  if (!ids.length) return out;

  // Pull active, quoteable pricing rules for these products (newest first so the
  // first row we see per product wins).
  const { data: rules } = await sb
    .from('product_pricing_rules')
    .select(
      'product_id, product_variant_id, effective_from, ex_factory_usd, fob_usd, ex_factory_usd_per_unit, fob_usd_per_unit, ex_factory_usd_per_case, fob_usd_per_case, ex_factory_inr, fob_inr, bulk_usd_per_kg, is_active, is_quoteable',
    )
    .eq('organization_id', organizationId)
    .in('product_id', ids)
    .order('effective_from', { ascending: false, nullsFirst: false });

  const bestByProduct = new Map<string, { exw: number | null; fob: number | null }>();
  for (const raw of (rules ?? []) as Array<RuleRow & { is_active?: boolean; is_quoteable?: boolean }>) {
    if (raw.is_active === false) continue;
    const pid = raw.product_id;
    if (!pid) continue;
    const existing = bestByProduct.get(pid) ?? { exw: null, fob: null };
    if (existing.exw == null) existing.exw = exwFromRule(raw);
    if (existing.fob == null) existing.fob = fobFromRule(raw);
    bestByProduct.set(pid, existing);
  }

  for (const id of ids) {
    const flat = flatById?.get(id);
    const rule = bestByProduct.get(id);
    const flatExw = num(flat?.exw_price ?? null);
    const flatFob = num(flat?.fob_price ?? null);
    const flatCif = num(flat?.cif_price ?? null);
    const flatDdp = num(flat?.ddp_price ?? null);

    const exw = rule?.exw ?? flatExw;
    const fob = rule?.fob ?? flatFob;
    const fromRules = Boolean(rule && (rule.exw != null || rule.fob != null));

    out.set(id, {
      exw_price: exw,
      fob_price: fob,
      cif_price: flatCif,
      ddp_price: flatDdp,
      pricing_currency: flat?.pricing_currency ?? 'USD',
      from_rules: fromRules,
    });
  }

  return out;
}
