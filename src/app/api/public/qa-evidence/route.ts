import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

const BUCKET = 'qa-evidence';
const MAX_BYTES = 10 * 1024 * 1024;

function safeName(name: string) {
  return (name || 'shot.png').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-100) || 'shot.png';
}

async function tokenOk(svc: any, token: string) {
  const { data } = await svc.from('qa_share_links').select('id, revoked_at, expires_at, link_type').eq('token', token).eq('link_type', 'tester_run').maybeSingle();
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

// QA evidence screenshot upload. External testers authorize with a valid tester_run
// token; internal users authorize with their SETU session. Uploads via service role.
export async function POST(request: NextRequest) {
  try {
    const svc = createServiceRoleClient() as any;
    if (!svc) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

    const form = await request.formData();
    const file = form.get('file');
    const token = typeof form.get('token') === 'string' ? String(form.get('token')) : '';
    const suite = typeof form.get('suite') === 'string' ? String(form.get('suite')) : 'qa';

    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be 10MB or smaller' }, { status: 413 });
    if (!/^image\//.test(file.type || '')) return NextResponse.json({ error: 'Images only' }, { status: 415 });

    let scope = 'internal';
    if (token) { if (!(await tokenOk(svc, token))) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 }); scope = 'external'; }
    else if (!(await internalOk())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const path = `${scope}/${safeName(suite)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(file.name)}`;
    const { error } = await svc.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data } = svc.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
