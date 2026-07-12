import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { resolveProductPricing } from '@/lib/catalog-share/pricing-resolver';

export const dynamic = 'force-dynamic';

type SuggestedRequest = {
  market?: string;
  currency?: string;
  incoterm?: string;
  buyerSegment?: string;
  createDraft?: boolean;
};

function clean(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function roundPrice(value: number) {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

function priceForIncoterm(pricing: any, incoterm: string) {
  const key = incoterm.toUpperCase();
  if (key === 'EXW' || key === 'FCA') return pricing?.exw_price ?? pricing?.fob_price ?? pricing?.cif_price ?? pricing?.ddp_price ?? null;
  if (key === 'CIF' || key === 'CFR') return pricing?.cif_price ?? pricing?.fob_price ?? pricing?.exw_price ?? pricing?.ddp_price ?? null;
  if (key === 'DAP' || key === 'DDP') return pricing?.ddp_price ?? pricing?.cif_price ?? pricing?.fob_price ?? pricing?.exw_price ?? null;
  return pricing?.fob_price ?? pricing?.exw_price ?? pricing?.cif_price ?? pricing?.ddp_price ?? null;
}

function marketAdjustment(market: string, buyerSegment: string) {
  const value = `${market} ${buyerSegment}`.toLowerCase();
  let adjustment = 0;
  if (/retail|retailer|retail chain/.test(value)) adjustment += 0.12;
  else if (/distributor|wholesaler/.test(value)) adjustment += 0.06;
  else if (/importer|private label/.test(value)) adjustment += 0.03;
  if (/europe|united kingdom|uk|north america|united states|usa|canada/.test(value)) adjustment += 0.03;
  return adjustment;
}

async function resolveFx(sb: any, fromCurrency: string, toCurrency: string) {
  if (fromCurrency === toCurrency) return 1;
  const direct = await sb
    .from('exchange_rates')
    .select('rate')
    .eq('base_currency', fromCurrency)
    .eq('quote_currency', toCurrency)
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const directRate = Number(direct.data?.rate);
  if (Number.isFinite(directRate) && directRate > 0) return directRate;

  const reverse = await sb
    .from('exchange_rates')
    .select('rate')
    .eq('base_currency', toCurrency)
    .eq('quote_currency', fromCurrency)
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const reverseRate = Number(reverse.data?.rate);
  if (Number.isFinite(reverseRate) && reverseRate > 0) return 1 / reverseRate;
  return null;
}

export async function POST(request: NextRequest) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as SuggestedRequest;
  const market = clean(body.market, 'General export market');
  const currency = clean(body.currency, 'USD').toUpperCase().slice(0, 3);
  const incoterm = clean(body.incoterm, 'FOB').toUpperCase();
  const buyerSegment = clean(body.buyerSegment, 'Importer');
  const createDraft = body.createDraft === true;

  const sb = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const { data: products, error: productError } = await sb
    .from('products')
    .select('id,name,sku_code,is_active,pricing_currency,exw_price,fob_price,cif_price,ddp_price')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(500);
  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

  const productIds = (products ?? []).map((product: any) => product.id);
  const flatById = new Map<string, any>((products ?? []).map((product: any) => [product.id, product]));
  const pricingMap = await resolveProductPricing(sb, organizationId, productIds, flatById);

  const { data: variants } = productIds.length
    ? await sb
        .from('product_variants')
        .select('id,product_id,moq_cases,moq_kg,lead_time_days,pack_label,is_active,sort_order')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .in('product_id', productIds)
        .order('sort_order', { ascending: true })
    : { data: [] };

  const firstVariantByProduct = new Map<string, any>();
  for (const variant of variants ?? []) if (!firstVariantByProduct.has(variant.product_id)) firstVariantByProduct.set(variant.product_id, variant);

  const adjustment = marketAdjustment(market, buyerSegment);
  const suggestions: any[] = [];
  for (const product of products ?? []) {
    const pricing = pricingMap.get(product.id) ?? product;
    const basePrice = Number(priceForIncoterm(pricing, incoterm));
    if (!Number.isFinite(basePrice) || basePrice <= 0) continue;
    const sourceCurrency = clean(pricing?.pricing_currency ?? product.pricing_currency, 'USD').toUpperCase();
    const fx = await resolveFx(sb, sourceCurrency, currency);
    if (!fx) continue;
    const variant = firstVariantByProduct.get(product.id) ?? null;
    const converted = basePrice * fx;
    const suggestedPrice = roundPrice(converted * (1 + adjustment));
    suggestions.push({
      productId: product.id,
      productVariantId: variant?.id ?? null,
      productName: product.name,
      skuCode: product.sku_code,
      packLabel: variant?.pack_label ?? null,
      sourcePrice: roundPrice(basePrice),
      sourceCurrency,
      fxRate: fx,
      marketAdjustmentPercent: Math.round(adjustment * 100),
      suggestedPrice,
      currency,
      incoterm,
      moq: variant?.moq_cases ?? variant?.moq_kg ?? null,
      moqUnit: variant?.moq_cases ? 'cases' : variant?.moq_kg ? 'kg' : null,
      leadTimeDays: variant?.lead_time_days ?? null,
      rationale: `Based on stored ${incoterm} pricing, current FX, and a ${Math.round(adjustment * 100)}% ${market}/${buyerSegment} commercial adjustment.`,
    });
  }

  if (!createDraft) {
    return NextResponse.json({ market, currency, incoterm, buyerSegment, suggestions });
  }

  const today = new Date();
  const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data: priceList, error: listError } = await sb
    .from('price_lists')
    .insert({
      organization_id: organizationId,
      name: `${market} ${currency} ${incoterm} Suggested Price List`,
      currency,
      incoterm,
      market,
      buyer_segment: buyerSegment,
      valid_from: today.toISOString().slice(0, 10),
      valid_until: validUntil.toISOString().slice(0, 10),
      status: 'draft',
      notes: 'Generated by Setu Guru from stored product pricing, current FX, market, and buyer-segment context. Review every price before activation or sharing.',
      created_by: workspace.user?.id ?? null,
    })
    .select('*')
    .single();
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  if (suggestions.length) {
    const rows = suggestions.map((item, index) => ({
      price_list_id: priceList.id,
      product_id: item.productId,
      product_variant_id: item.productVariantId,
      moq: item.moq,
      moq_unit: item.moqUnit,
      unit_price: item.suggestedPrice,
      currency,
      lead_time_days: item.leadTimeDays,
      notes: item.rationale,
      sort_order: index,
    }));
    const { error: itemError } = await sb.from('price_list_items').insert(rows);
    if (itemError) return NextResponse.json({ error: itemError.message, priceList }, { status: 500 });
  }

  return NextResponse.json({ priceList, suggestions, redirectHref: `/price-lists?open=${priceList.id}` });
}
