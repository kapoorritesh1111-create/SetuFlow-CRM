import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

function isDomain(value: string) {
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function requireMailAdmin() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership || !workspace.canAccessAdmin) {
    return { error: NextResponse.json({ error: 'Owner or admin access is required.' }, { status: 403 }) };
  }
  const supabase = (await createClient()) as any;
  const { data: grant } = await supabase.from('org_module_grants').select('enabled').eq('organization_id', workspace.organization.id).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return { error: NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 }) };
  return { workspace, supabase };
}

export async function GET() {
  const access = await requireMailAdmin();
  if ('error' in access) return access.error;
  const { workspace, supabase } = access;
  const organizationId = workspace.organization.id;

  const [domainsResult, mailboxesResult, aliasesResult, entitlementResult, membersResult] = await Promise.all([
    supabase.from('mail_domains').select('*').eq('organization_id', organizationId).order('created_at', { ascending: true }),
    supabase.from('mail_mailboxes').select('id,user_id,address,display_name,status,inbound_enabled,created_at').eq('organization_id', organizationId).order('created_at', { ascending: true }),
    supabase.from('mail_aliases').select('id,mailbox_id,address,alias_type,is_active').eq('organization_id', organizationId).order('address'),
    supabase.from('mail_entitlements').select('*').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('organization_members').select('id,user_id,display_name,is_active').eq('organization_id', organizationId).eq('is_active', true).order('display_name'),
  ]);

  return NextResponse.json({
    organization: { id: organizationId, name: workspace.organization.name, slug: workspace.organization.slug },
    domains: domainsResult.data ?? [],
    mailboxes: mailboxesResult.data ?? [],
    aliases: aliasesResult.data ?? [],
    entitlement: entitlementResult.data ?? null,
    members: membersResult.data ?? [],
    providerConfigured: Boolean(process.env.RESEND_API_KEY),
  });
}

export async function POST(request: NextRequest) {
  const access = await requireMailAdmin();
  if ('error' in access) return access.error;
  const { workspace, supabase } = access;
  const organizationId = workspace.organization.id;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = String(body?.action ?? '').trim();

  const { data: entitlement } = await supabase.from('mail_entitlements').select('*').eq('organization_id', organizationId).maybeSingle();
  if (!entitlement || entitlement.status !== 'active') return NextResponse.json({ error: 'Setu Mail subscription is not active.' }, { status: 402 });

  if (action === 'create_domain') {
    const domain = String(body?.domain ?? '').trim().toLowerCase().replace(/^@/, '');
    if (!isDomain(domain)) return NextResponse.json({ error: 'Enter a valid business domain.' }, { status: 400 });
    const { count } = await supabase.from('mail_domains').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
    if (Number(count ?? 0) >= Number(entitlement.domain_limit ?? 1)) return NextResponse.json({ error: 'Your Setu Mail plan has reached its domain limit.' }, { status: 409 });
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Resend is not configured.' }, { status: 503 });

    const providerResponse = await fetch('https://api.resend.com/domains', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: domain }),
    });
    const provider = await providerResponse.json().catch(() => ({})) as any;
    if (!providerResponse.ok) return NextResponse.json({ error: provider?.message || 'Unable to register the domain with Resend.' }, { status: 502 });

    const records = Array.isArray(provider?.records) ? provider.records : [];
    const { data, error } = await supabase.from('mail_domains').insert({
      organization_id: organizationId,
      domain,
      provider_domain_id: provider?.id ?? null,
      status: provider?.status ?? 'pending',
      region: provider?.region ?? null,
      sending_status: provider?.status === 'verified' ? 'verified' : 'pending',
      receiving_status: 'pending',
      dns_records: records,
      last_checked_at: new Date().toISOString(),
    }).select('*').single();
    if (error) return NextResponse.json({ error: 'Domain was registered with Resend but could not be saved in Setu Mail.' }, { status: 500 });
    return NextResponse.json({ ok: true, domain: data });
  }

  if (action === 'refresh_domain') {
    const id = String(body?.id ?? '').trim();
    const { data: domainRow } = await supabase.from('mail_domains').select('*').eq('id', id).eq('organization_id', organizationId).maybeSingle();
    if (!domainRow?.provider_domain_id) return NextResponse.json({ error: 'Domain is not connected to Resend.' }, { status: 404 });
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Resend is not configured.' }, { status: 503 });
    const providerResponse = await fetch(`https://api.resend.com/domains/${encodeURIComponent(domainRow.provider_domain_id)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const provider = await providerResponse.json().catch(() => ({})) as any;
    if (!providerResponse.ok) return NextResponse.json({ error: provider?.message || 'Unable to refresh domain status.' }, { status: 502 });
    const records = Array.isArray(provider?.records) ? provider.records : domainRow.dns_records;
    const status = provider?.status ?? domainRow.status;
    const { data } = await supabase.from('mail_domains').update({ status, sending_status: status === 'verified' ? 'verified' : 'pending', dns_records: records, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    return NextResponse.json({ ok: true, domain: data });
  }

  if (action === 'create_mailbox') {
    const userId = String(body?.userId ?? '').trim();
    const address = String(body?.address ?? '').trim().toLowerCase();
    const displayName = String(body?.displayName ?? '').trim() || null;
    if (!userId || !isEmail(address)) return NextResponse.json({ error: 'Select a user and enter a valid mailbox address.' }, { status: 400 });
    const addressDomain = address.split('@')[1];
    const { data: domainRow } = await supabase.from('mail_domains').select('id,status').eq('organization_id', organizationId).eq('domain', addressDomain).maybeSingle();
    if (!domainRow) return NextResponse.json({ error: 'Add the mailbox domain to Setu Mail first.' }, { status: 409 });
    const { count } = await supabase.from('mail_mailboxes').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active');
    if (Number(count ?? 0) >= Number(entitlement.mailbox_limit ?? 5)) return NextResponse.json({ error: 'Your Setu Mail plan has reached its mailbox limit.' }, { status: 409 });
    const { data: member } = await supabase.from('organization_members').select('user_id').eq('organization_id', organizationId).eq('user_id', userId).eq('is_active', true).maybeSingle();
    if (!member) return NextResponse.json({ error: 'The selected user is not an active organization member.' }, { status: 400 });
    const { data, error } = await supabase.from('mail_mailboxes').insert({ organization_id: organizationId, user_id: userId, address, display_name: displayName, status: 'active', inbound_enabled: false }).select('*').single();
    if (error) return NextResponse.json({ error: error.message || 'Unable to create mailbox.' }, { status: 409 });
    return NextResponse.json({ ok: true, mailbox: data });
  }

  if (action === 'create_alias') {
    const mailboxId = String(body?.mailboxId ?? '').trim();
    const address = String(body?.address ?? '').trim().toLowerCase();
    const aliasType = String(body?.aliasType ?? 'alias').trim().toLowerCase();
    if (!mailboxId || !isEmail(address)) return NextResponse.json({ error: 'Select a mailbox and enter a valid alias.' }, { status: 400 });
    const { data: mailbox } = await supabase.from('mail_mailboxes').select('id').eq('id', mailboxId).eq('organization_id', organizationId).maybeSingle();
    if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });
    const { data, error } = await supabase.from('mail_aliases').insert({ organization_id: organizationId, mailbox_id: mailboxId, address, alias_type: aliasType, is_active: true }).select('*').single();
    if (error) return NextResponse.json({ error: error.message || 'Unable to create alias.' }, { status: 409 });
    return NextResponse.json({ ok: true, alias: data });
  }

  return NextResponse.json({ error: 'Unsupported Setu Mail admin action.' }, { status: 400 });
}
