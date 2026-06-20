import { NextRequest, NextResponse } from 'next/server';
import { validateShareToken } from '@/lib/catalog-share/validate';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

// POST /api/public/catalog-share/[token]/select
// body: { pin?, selections: [{product_id, quantity, tier_selected?, note?}], request_quote?: bool, buyer_note? }
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const body = await request.json().catch(() => ({}));
  const result = await validateShareToken(params.token, body.pin ?? null);
  if (!result.ok || !result.share) return NextResponse.json({ error: result.reason }, { status: 403 });
  const share = result.share;
  const allowed = new Set(result.productIds ?? []);

  const selections = Array.isArray(body.selections) ? body.selections.filter((s: any) => s && s.product_id && allowed.has(s.product_id)) : [];
  const svc = createServiceRoleClient() as any;

  // Replace prior selections for this share with the current cart state.
  await svc.from('buyer_selections').delete().eq('catalog_share_id', share.id);
  if (selections.length) {
    const rows = selections.map((s: any) => ({
      catalog_share_id: share.id,
      product_id: s.product_id,
      quantity: s.quantity != null ? Number(s.quantity) : null,
      tier_selected: s.tier_selected || null,
      note: s.note || null,
    }));
    await svc.from('buyer_selections').insert(rows);
  }

  const eventType = body.request_quote ? 'quote_requested' : 'product_selected';
  await svc.from('catalog_share_events').insert({
    catalog_share_id: share.id,
    event_type: eventType,
    meta: { count: selections.length, note: body.buyer_note || null },
  });
  await svc.from('catalog_shares').update({ last_opened_at: new Date().toISOString() }).eq('id', share.id);

  return NextResponse.json({ ok: true, saved: selections.length });
}
