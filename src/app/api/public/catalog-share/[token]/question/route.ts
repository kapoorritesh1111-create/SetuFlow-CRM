import { NextRequest, NextResponse } from 'next/server';
import { validateShareToken } from '@/lib/catalog-share/validate';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

// POST /api/public/catalog-share/[token]/question
// body: { pin?, question (required), product_id?, contact_name?, contact_email? }
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const body = await request.json().catch(() => ({}));
  const question = String(body.question ?? '').trim();
  if (!question) return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  const result = await validateShareToken(params.token, body.pin ?? null);
  if (!result.ok || !result.share) return NextResponse.json({ error: result.reason }, { status: 403 });
  const share = result.share;
  const productId = body.product_id && (result.productIds ?? []).includes(body.product_id) ? body.product_id : null;

  const svc = createServiceRoleClient() as any;
  await svc.from('catalog_share_events').insert({
    catalog_share_id: share.id,
    event_type: 'question_submitted',
    product_id: productId,
    meta: { question, contact_name: body.contact_name || share.buyer_name || null, contact_email: body.contact_email || share.buyer_email || null },
  });
  await svc.from('catalog_shares').update({ last_opened_at: new Date().toISOString() }).eq('id', share.id);

  return NextResponse.json({ ok: true });
}
