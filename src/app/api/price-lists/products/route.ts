import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { resolveProductPricing } from '@/lib/catalog-share/pricing-resolver';

export const dynamic = 'force-dynamic';

// GET /api/price-lists/products → org products for the picker + readiness/auto-fill fields.
// Pricing is resolved from the canonical engine (product_pricing_rules) so the
// FOB/EXW shown here matches the Products workspace exactly (S34-CATALOG-039/040/041).
export async function GET() {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;

  const { data, error } = await sb
    .from('products')
    .select('id, name, sku_code, hsn_code, pack_size, description, image_url, certifications, country_of_origin, fob_price, exw_price, cif_price, ddp_price, pricing_currency, is_active, category_id')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productIds = (data ?? []).map((p: any) => p.id);

  // Canonical pricing (same source the Products table uses). Flat columns are passed
  // in only as a last-resort fallback for CIF/DDP.
  const flatById = new Map<string, any>();
  for (const p of (data ?? []) as any[]) flatById.set(p.id, p);
  const pricing = await resolveProductPricing(sb, orgId, productIds, flatById);

  const variantByProduct: Record<string, any> = {};
  if (productIds.length) {
    const { data: variants } = await sb
      .from('product_variants')
      .select('product_id, moq_cases, moq_kg, lead_time_days, pack_label, pack_size_value, pack_size_unit, is_active, sort_order')
      .in('product_id', productIds)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    for (const v of (variants ?? []) as any[]) if (!variantByProduct[v.product_id]) variantByProduct[v.product_id] = v;
  }

  const products = (data ?? []).map((p: any) => {
    const v = variantByProduct[p.id] ?? null;
    const pr = pricing.get(p.id);
    return {
      ...p,
      // Canonical pricing overrides the stale flat columns for every consumer.
      fob_price: pr?.fob_price ?? p.fob_price ?? null,
      exw_price: pr?.exw_price ?? p.exw_price ?? null,
      cif_price: pr?.cif_price ?? p.cif_price ?? null,
      ddp_price: pr?.ddp_price ?? p.ddp_price ?? null,
      pricing_currency: pr?.pricing_currency ?? p.pricing_currency ?? 'USD',
      pricing_from_rules: pr?.from_rules ?? false,
      moq_cases: v?.moq_cases ?? null,
      moq_kg: v?.moq_kg ?? null,
      lead_time_days: v?.lead_time_days ?? null,
      variant_pack_label: v?.pack_label ?? null,
      variant_pack_size: v?.pack_size_value && v?.pack_size_unit ? `${v.pack_size_value} ${v.pack_size_unit}` : null,
    };
  });

  return NextResponse.json({ products });
}
