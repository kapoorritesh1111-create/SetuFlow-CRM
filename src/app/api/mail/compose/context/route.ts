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
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Communications is not enabled for this organization.' }, { status: 403 });
  if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });

  const { data: lead } = await db.from('leads')
    .select('id,lead_type,company_name,contact_name,email,stage_id,owner_user_id')
    .eq('organization_id', organizationId)
    .ilike('email', email)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    email,
    crmMatch: lead ? { ...lead, href: `/leads/${lead.id}` } : null,
    createCrmHref: lead ? null : `/leads?quickLead=1&leadType=buyer&sourceType=setu_mail&sourceLabel=${encodeURIComponent(`Setu Mail · ${email}`)}`,
  });
}
