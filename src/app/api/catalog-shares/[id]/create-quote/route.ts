import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export const dynamic = 'force-dynamic';

function priceForQty(item: any, tiers: any[], qty: number): number | null {
  const t = (tiers ?? []).filter((x) => x.price_list_item_id === item?.id).sort((a, b) => (a.tier_qty_min ?? 0) - (b.tier_qty_min ?? 0));
  for (const tier of t) {
    const min = tier.tier_qty_min ?? 0;
    const max = tier.tier_qty_max ?? Infinity;
    if (qty >= min && qty <= max) return tier.unit_price ?? null;
  }
  return item?.unit_price ?? null;
}

// POST /api/catalog-shares/[id]/create-quote → convert buyer_selections into a draft quote
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;

  const { data: share } = await sb.from('catalog_shares').select('*').eq('id', params.id).eq('organization_id', orgId).maybeSingle();
  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!share.lead_id) return NextResponse.json({ error: 'Link this share to a lead before creating a quote.' }, { status: 400 });
  if (share.quote_id) return NextResponse.json({ error: 'A quote already exists for this share.', quote_id: share.quote_id }, { status: 409 });

  const { data: selections } = await sb.from('buyer_selections').select('*').eq('catalog_share_id', share.id);
  if (!selections || !selections.length) return NextResponse.json({ error: 'No buyer selections to convert yet.' }, { status: 400 });

  // pricing source: the share's price list (items + tiers)
  let itemByProduct: Record<string, any> = {};
  let tiers: any[] = [];
  if (share.price_list_id) {
    const { data: items } = await sb.from('price_list_items').select('*').eq('price_list_id', share.price_list_id);
    for (const it of (items ?? []) as any[]) itemByProduct[it.product_id] = it;
    const itemIds = (items ?? []).map((i: any) => i.id);
    if (itemIds.length) { const { data: t } = await sb.from('price_list_tiers').select('*').in('price_list_item_id', itemIds); tiers = t ?? []; }
  }

  const currency = share.currency || 'USD';
  const validDate = share.valid_until ? new Date(share.valid_until).toISOString().slice(0, 10) : null;
  const summary = `Created from catalog share for ${share.buyer_company || 'buyer'} — ${selections.length} product(s) selected by the buyer.`;

  const { data: quote, error: qErr } = await sb.from('quotes').insert({
    organization_id: orgId,
    lead_id: share.lead_id,
    status: 'draft',
    currency,
    display_currency: currency,
    valid_until: validDate,
    destination_port: null,
    source_type: 'catalog_share',
    created_by: ws.user?.id ?? null,
    notes: summary,
  }).select().single();
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const lineRows = selections.map((s: any) => {
    const item = itemByProduct[s.product_id];
    const qty = s.quantity != null ? Number(s.quantity) : 1;
    const unit = item ? priceForQty(item, tiers, qty) : null;
    return {
      quote_id: quote.id,
      product_id: s.product_id,
      quantity: qty > 0 ? qty : 1,
      unit_price: unit,
      currency,
      is_price_overridden: false,
      notes: s.note || null,
    };
  });
  if (lineRows.length) {
    const { error: liErr } = await sb.from('quote_line_items').insert(lineRows);
    if (liErr) return NextResponse.json({ error: `Quote created but line items failed: ${liErr.message}`, quote_id: quote.id }, { status: 500 });
  }

  await sb.from('catalog_shares').update({ quote_id: quote.id, updated_at: new Date().toISOString() }).eq('id', share.id);
  await sb.from('catalog_share_events').insert({ catalog_share_id: share.id, event_type: 'quote_draft_created', meta: { quote_id: quote.id, lines: lineRows.length } });

  return NextResponse.json({ quote_id: quote.id, lines: lineRows.length });
}
