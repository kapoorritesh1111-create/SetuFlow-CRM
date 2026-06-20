import { NextRequest, NextResponse } from 'next/server';
import { validateShareToken } from '@/lib/catalog-share/validate';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { buildCatalogSharePdf, type CatalogPdfLine } from '@/lib/catalog-share/catalog-pdf';

export const dynamic = 'force-dynamic';

function priceForQty(item: any, tiers: any[], qty: number): number | null {
  const t = (tiers ?? []).filter((x) => x.price_list_item_id === item?.id).sort((a, b) => (a.tier_qty_min ?? 0) - (b.tier_qty_min ?? 0));
  for (const tier of t) { const min = tier.tier_qty_min ?? 0; const max = tier.tier_qty_max ?? Infinity; if (qty >= min && qty <= max) return tier.unit_price ?? null; }
  return item?.unit_price ?? null;
}

// GET /api/public/catalog-share/[token]/pdf?pin= → watermarked catalog PDF for the buyer
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const pin = new URL(request.url).searchParams.get('pin');
  const result = await validateShareToken(params.token, pin);
  if (!result.ok || !result.share) return NextResponse.json({ error: result.reason }, { status: 403 });
  const share = result.share;
  if (!share.pdf_download_allowed) return NextResponse.json({ error: 'Download not permitted for this catalog.' }, { status: 403 });

  const productIds = result.productIds ?? [];
  const svc = createServiceRoleClient() as any;
  const [{ data: org }, { data: products }] = await Promise.all([
    svc.from('organizations').select('name').eq('id', share.organization_id).maybeSingle(),
    productIds.length ? svc.from('products').select('id, name, pack_size, country_of_origin, fob_price, exw_price, cif_price').in('id', productIds) : Promise.resolve({ data: [] }),
  ]);

  let itemByProduct: Record<string, any> = {}; let tiers: any[] = [];
  if (share.price_list_id && productIds.length) {
    const { data: items } = await svc.from('price_list_items').select('*').eq('price_list_id', share.price_list_id).in('product_id', productIds);
    for (const it of (items ?? []) as any[]) itemByProduct[it.product_id] = it;
    const itemIds = (items ?? []).map((i: any) => i.id);
    if (itemIds.length) { const { data: t } = await svc.from('price_list_tiers').select('*').in('price_list_item_id', itemIds); tiers = t ?? []; }
  }

  const lines: CatalogPdfLine[] = productIds.map((id) => {
    const p = (products ?? []).find((x: any) => x.id === id); if (!p) return null;
    const item = itemByProduct[p.id];
    const price = item ? (priceForQty(item, tiers, item.moq ?? 1) ?? item.unit_price) : (p.fob_price ?? p.exw_price ?? p.cif_price ?? null);
    return { name: p.name, packSize: p.pack_size, moq: item?.moq ?? null, moqUnit: item?.moq_unit ?? null, country: p.country_of_origin, price };
  }).filter(Boolean) as CatalogPdfLine[];

  const pdf = buildCatalogSharePdf({
    orgName: org?.name || 'Product Catalog',
    buyerCompany: share.buyer_company, buyerName: share.buyer_name,
    currency: share.currency || 'USD', incoterm: share.incoterm, validUntil: share.valid_until,
    shareRef: params.token.slice(0, 8), lines,
  });

  if (share.tracking_enabled) {
    await svc.from('catalog_share_events').insert({ catalog_share_id: share.id, event_type: 'pdf_downloaded', meta: { kind: 'catalog_pdf' } });
  }

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="catalog-${params.token.slice(0, 8)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
