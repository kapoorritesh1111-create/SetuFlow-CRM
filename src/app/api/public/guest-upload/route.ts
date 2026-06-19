import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

const BUCKET = 'chat-attachments';
const MAX_BYTES = 10 * 1024 * 1024;
const OK_TYPES = /^(image\/|application\/pdf|text\/plain)/;

function safeName(name: string) {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-100) || 'file';
}

async function guestOk(svc: any, token: string) {
  const { data } = await svc.from('guest_links').select('id, revoked_at, expires_at').eq('token', token).maybeSingle();
  if (!data || data.revoked_at) return false;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return false;
  return true;
}
async function internalOk() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: m } = await supabase.from('organization_members').select('id').eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
  return Boolean(m);
}

// Guest chat attachment upload. Guests authorize with their guest token; the team with their SETU session.
export async function POST(request: NextRequest) {
  try {
    const svc = createServiceRoleClient() as any;
    if (!svc) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
    const form = await request.formData();
    const file = form.get('file');
    const token = typeof form.get('token') === 'string' ? String(form.get('token')) : '';

    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be 10MB or smaller' }, { status: 413 });
    if (!OK_TYPES.test(file.type || '')) return NextResponse.json({ error: 'Only images, PDFs or text files' }, { status: 415 });

    let scope = 'team';
    if (token) { if (!(await guestOk(svc, token))) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 }); scope = 'guest'; }
    else if (!(await internalOk())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const path = `guest/${scope}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(file.name)}`;
    const { error } = await svc.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data } = svc.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, name: file.name || 'file' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
