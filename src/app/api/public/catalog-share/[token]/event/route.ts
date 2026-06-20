import { NextRequest, NextResponse } from 'next/server';
import { validateShareToken } from '@/lib/catalog-share/validate';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const PASSIVE = new Set(['product_viewed', 'product_detail_opened', 'pdf_downloaded']);

// POST /api/public/catalog-share/[token]/event
// body: { pin?, event_type, product_id? }  — passive engagement events from the buyer room
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const body = await request.json().catch(() => ({}));
  if (!PASSIVE.has(body.event_type)) return NextResponse.json({ error: 'Unsupported event' }, { status: 400 });
  const result = await validateShareToken(params.token, body.pin ?? null);
  if (!result.ok || !result.share) return NextResponse.json({ error: result.reason }, { status: 403 });
  if (!result.share.tracking_enabled) return NextResponse.json({ ok: true, skipped: true });
  const productId = body.product_id && (result.productIds ?? []).includes(body.product_id) ? body.product_id : null;
  const svc = createServiceRoleClient() as any;
  await svc.from('catalog_share_events').insert({ catalog_share_id: result.share.id, event_type: body.event_type, product_id: productId, meta: null });
  return NextResponse.json({ ok: true });
}
