import { NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const token = String(params.token ?? '').trim();
  if (!token || token.length < 24) return NextResponse.json({ error: 'Brochure link not found.' }, { status: 404 });
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Brochure service unavailable.' }, { status: 503 });

  const { data: share, error } = await admin.from('catalog_brochure_shares')
    .select('id, brochure_id, open_count, expires_at, catalog_brochures(id,storage_bucket,storage_path,is_active)')
    .eq('token', token)
    .maybeSingle();
  const brochure = Array.isArray(share?.catalog_brochures) ? share.catalog_brochures[0] : share?.catalog_brochures;
  const expired = share?.expires_at ? new Date(share.expires_at).getTime() < Date.now() : false;
  if (error || !share?.id || !brochure?.id || brochure.is_active === false || expired) return NextResponse.json({ error: 'Brochure link is unavailable.' }, { status: 404 });

  const { data: signed, error: signedError } = await admin.storage.from(brochure.storage_bucket).createSignedUrl(brochure.storage_path, 300);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: 'Brochure file is unavailable.' }, { status: 404 });

  const now = new Date().toISOString();
  await admin.from('catalog_brochure_shares').update({ open_count: Number(share.open_count ?? 0) + 1, last_opened_at: now }).eq('id', share.id);
  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
