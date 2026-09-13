import { NextRequest, NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const token = String(params.token ?? '').trim();
  if (!token) return NextResponse.json({ error: 'Attachment token is required.' }, { status: 400 });

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Attachment service is unavailable.' }, { status: 503 });

  const { data: row, error } = await admin.from('whatsapp_attachment_shares')
    .select('storage_bucket,storage_path,file_name,expires_at,status')
    .eq('token', token)
    .maybeSingle();

  if (error || !row) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 });
  if (new Date(String(row.expires_at)).getTime() <= Date.now() || row.status === 'expired') {
    return NextResponse.json({ error: 'This attachment link has expired.' }, { status: 410 });
  }

  const { data: signed, error: signError } = await admin.storage.from(String(row.storage_bucket)).createSignedUrl(String(row.storage_path), 120, { download: String(row.file_name) });
  if (signError || !signed?.signedUrl) return NextResponse.json({ error: 'Attachment could not be opened.' }, { status: 404 });
  return NextResponse.redirect(signed.signedUrl, 302);
}
