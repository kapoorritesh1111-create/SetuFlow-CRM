import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

const SCOPES = new Set(['crm','mail','both']);

export async function GET() {
  const { organization } = await requireAdminWorkspace();
  if (!organization) return NextResponse.json({ error: 'Workspace unavailable.' }, { status: 403 });
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Admin service unavailable.' }, { status: 500 });
  const { data, error } = await admin.from('organization_member_product_access').select('user_id,crm_enabled,mail_enabled').eq('organization_id', organization.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ access: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { organization } = await requireAdminWorkspace();
  if (!organization) return NextResponse.json({ error: 'Workspace unavailable.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const userId = String(body.user_id ?? '');
  const scope = String(body.scope ?? '');
  if (!userId || !SCOPES.has(scope)) return NextResponse.json({ error: 'Choose CRM only, Mail only, or CRM + Mail.' }, { status: 400 });
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Admin service unavailable.' }, { status: 500 });
  const { data: member } = await admin.from('organization_members').select('user_id').eq('organization_id', organization.id).eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!member) return NextResponse.json({ error: 'Active workspace user not found.' }, { status: 404 });
  const payload = { organization_id: organization.id, user_id: userId, crm_enabled: scope === 'crm' || scope === 'both', mail_enabled: scope === 'mail' || scope === 'both', updated_at: new Date().toISOString() };
  const { error } = await admin.from('organization_member_product_access').upsert(payload, { onConflict: 'organization_id,user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...payload });
}
