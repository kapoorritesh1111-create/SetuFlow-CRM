import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });
  const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email || !email.includes('@') || email.length > 320) return NextResponse.json({ crmMatch: null });

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const [{ data: grant }, mailbox] = await Promise.all([
    db.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    resolveUserMailbox(db, organizationId, workspace.user.id, 'id,address,status'),
  ]);
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });

  // Uses the signed-in user's Supabase client so existing CRM RLS remains authoritative.
  const { data: lead, error } = await db.from('leads')
    .select('id,lead_type,company_name,contact_name,email,stage_id,owner_user_id,next_follow_up_at,last_contacted_at,deal_value,deal_currency,products_or_needs,updated_at')
    .eq('organization_id', organizationId)
    .ilike('email', email)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Unable to load CRM context for this recipient.' }, { status: 503 });

  let stageName: string | null = null;
  if (lead?.stage_id) {
    const { data: stage } = await db.from('pipeline_stages').select('name').eq('id', lead.stage_id).eq('organization_id', organizationId).maybeSingle();
    stageName = stage?.name ?? null;
  }
  const crmMatch = lead ? { ...lead, stage_name: stageName, href: `/leads/${lead.id}` } : null;
  return NextResponse.json({
    email,
    crmMatch,
    createCrmHref: lead ? null : `/leads?quickLead=1&leadType=buyer&sourceType=setu_mail&sourceLabel=${encodeURIComponent(`Setu Mail · ${email}`)}`,
    permissionScope: 'current-user-crm-access',
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
