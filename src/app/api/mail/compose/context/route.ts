import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';
import { matchCommunicationIdentity, primaryIdentityMatch } from '@/lib/contacts/identity';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });
  const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!email || !email.includes('@') || email.length > 320) return NextResponse.json({ crmMatch: null, identity: null });

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const [{ data: grant }, mailbox] = await Promise.all([
    db.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    resolveUserMailbox(db, organizationId, workspace.user.id, 'id,address,status'),
  ]);
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });

  // Signed-in Supabase client keeps existing CRM RLS authoritative.
  const identity = await matchCommunicationIdentity(db, organizationId, email);
  const primary = primaryIdentityMatch(identity);
  let stageName: string | null = null;
  let followUp: string | null = null;
  let dealValue: number | null = null;
  let dealCurrency: string | null = null;
  const leadRecord = identity.records[0];
  if (leadRecord?.id) {
    const { data: lead } = await db.from('leads').select('stage_id,next_follow_up_at,deal_value,deal_currency').eq('organization_id', organizationId).eq('id', leadRecord.id).maybeSingle();
    followUp = lead?.next_follow_up_at ?? null; dealValue = lead?.deal_value ?? null; dealCurrency = lead?.deal_currency ?? null;
    if (lead?.stage_id) { const { data: stage } = await db.from('pipeline_stages').select('name').eq('organization_id', organizationId).eq('id', lead.stage_id).maybeSingle(); stageName = stage?.name ?? null; }
  }
  const relationship = identity.contact?.relationship_type ? ` · ${identity.contact.relationship_type}` : '';
  const crmMatch = primary ? {
    ...primary,
    company_name: identity.contact ? `${identity.contact.company || primary.company_name || identity.contact.email}${relationship}` : primary.company_name,
    stage_name: stageName,
    next_follow_up_at: followUp,
    deal_value: dealValue,
    deal_currency: dealCurrency,
  } : null;
  const createLeadHref = `/leads?quickLead=1&leadType=buyer&sourceType=setu_mail&sourceLabel=${encodeURIComponent(`Setu Mail · ${email}`)}`;
  return NextResponse.json({
    email,
    identity,
    crmMatch,
    createContactHref: identity.contact ? null : `/contacts?create=1&email=${encodeURIComponent(email)}`,
    createLeadHref,
    // Backwards compatibility for the current composer UI. Lead creation remains explicit.
    createCrmHref: identity.records.length ? null : createLeadHref,
    permissionScope: 'current-user-crm-access',
    autonomousActions: false,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
