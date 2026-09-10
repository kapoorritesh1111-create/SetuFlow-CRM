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

const READY_CAPABILITIES = new Set(['enabled', 'verified', 'active', 'ready']);
function normalizeCapability(value: unknown, fallbackStatus: unknown) {
  const explicit = String(value ?? '').trim().toLowerCase();
  if (explicit) return explicit;
  return String(fallbackStatus ?? '').trim().toLowerCase() === 'verified' ? 'verified' : 'pending';
}
function capabilityReady(value: unknown) {
  return READY_CAPABILITIES.has(String(value ?? '').trim().toLowerCase());
}

async function requireMailAdmin() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership || !workspace.canAccessAdmin) {
    return { error: NextResponse.json({ error: 'Owner or admin access is required.' }, { status: 403 }) };
  }
  const organization = workspace.organization;
  const supabase = (await createClient()) as any;
  const { data: grant } = await supabase.from('org_module_grants').select('enabled').eq('organization_id', organization.id).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return { error: NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 }) };
  return { workspace, organization, supabase };
}

export async function GET() {
  const access = await requireMailAdmin();
  if ('error' in access) return access.error;
  const { organization, supabase } = access;
  const organizationId = organization.id;

  const [domainsResult, mailboxesResult, aliasesResult, entitlementResult, membersResult] = await Promise.all([
    supabase.from('mail_domains').select('*').eq('organization_id', organizationId).order('created_at', { ascending: true }),
    supabase.from('mail_mailboxes').select('id,user_id,address,display_name,status,inbound_enabled,created_at').eq('organization_id', organizationId).order('created_at', { ascending: true }),
    supabase.from('mail_aliases').select('id,mailbox_id,address,alias_type,is_active').eq('organization_id', organizationId).order('address'),
    supabase.from('mail_entitlements').select('*').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('organization_members').select('id,user_id,display_name,is_active').eq('organization_id', organizationId).eq('is_active', true).order('display_name'),
  ]);

  const senderConfigured = Boolean(String(process.env.SETU_MAIL_FROM_EMAIL ?? process.env.SETU_NOTIFICATION_FROM_EMAIL ?? '').trim());
  return NextResponse.json({
    organization: { id: organizationId, name: organization.name, slug: organization.slug },
    domains: domainsResult.data ?? [],
    mailboxes: mailboxesResult.data ?? [],
    aliases: aliasesResult.data ?? [],
    entitlement: entitlementResult.data ?? null,
    members: membersResult.data ?? [],
    providerConfigured: Boolean(process.env.RESEND_API_KEY),
    webhookConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    senderConfigured,
    webhookPath: '/api/mail/webhooks/resend',
  });
}

export async function POST(request: NextRequest) {
  const access = await requireMailAdmin();
  if ('error' in access) return access.error;
  const { organization, supabase } = access;
  const organizationId = organization.id;
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
    const status = provider?.status ?? 'pending';
    const sendingStatus = normalizeCapability(provider?.capabilities?.sending, status);
    const receivingStatus = normalizeCapability(provider?.capabilities?.receiving, status);
    const { data, error } = await supabase.from('mail_domains').insert({
      organization_id: organizationId,
      domain,
      provider_domain_id: provider?.id ?? null,
      status,
      region: provider?.region ?? null,
      sending_status: sendingStatus,
      receiving_status: receivingStatus,
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
    const sendingStatus = normalizeCapability(provider?.capabilities?.sending, status);
    const receivingStatus = normalizeCapability(provider?.capabilities?.receiving, status);
    const checkedAt = new Date().toISOString();
    const { data } = await supabase.from('mail_domains').update({ status, sending_status: sendingStatus, receiving_status: receivingStatus, dns_records: records, last_checked_at: checkedAt, updated_at: checkedAt }).eq('id', id).select('*').single();
    const inboundEnabled = capabilityReady(receivingStatus) && Boolean(process.env.RESEND_WEBHOOK_SECRET);
    await supabase.from('mail_mailboxes').update({ inbound_enabled: inboundEnabled, updated_at: checkedAt }).eq('organization_id', organizationId).ilike('address', `%@${domainRow.domain}`);
    return NextResponse.json({ ok: true, domain: data });
  }

  if (action === 'create_mailbox') {
    const userId = String(body?.userId ?? '').trim();
    const address = String(body?.address ?? '').trim().toLowerCase();
    const displayName = String(body?.displayName ?? '').trim() || null;
    if (!userId || !isEmail(address)) return NextResponse.json({ error: 'Select a user and enter a valid mailbox address.' }, { status: 400 });
    const addressDomain = address.split('@')[1];
    const { data: domainRow } = await supabase.from('mail_domains').select('id,status,sending_status,receiving_status').eq('organization_id', organizationId).eq('domain', addressDomain).maybeSingle();
    if (!domainRow) return NextResponse.json({ error: 'Add the mailbox domain to Setu Mail first.' }, { status: 409 });
    if (!capabilityReady(domainRow.sending_status) || !capabilityReady(domainRow.receiving_status)) return NextResponse.json({ error: 'Verify both sending and receiving for this domain before creating mailboxes.' }, { status: 409 });
    const { count } = await supabase.from('mail_mailboxes').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active');
    if (Number(count ?? 0) >= Number(entitlement.mailbox_limit ?? 5)) return NextResponse.json({ error: 'Your Setu Mail plan has reached its mailbox limit.' }, { status: 409 });
    const { data: member } = await supabase.from('organization_members').select('user_id').eq('organization_id', organizationId).eq('user_id', userId).eq('is_active', true).maybeSingle();
    if (!member) return NextResponse.json({ error: 'The selected user is not an active organization member.' }, { status: 400 });
    const inboundEnabled = Boolean(process.env.RESEND_WEBHOOK_SECRET);
    const { data, error } = await supabase.from('mail_mailboxes').insert({ organization_id: organizationId, user_id: userId, address, display_name: displayName, status: 'active', inbound_enabled: inboundEnabled }).select('*').single();
    if (error) return NextResponse.json({ error: error.message || 'Unable to create mailbox.' }, { status: 409 });
    return NextResponse.json({ ok: true, mailbox: data });
  }

  if (action === 'set_mailbox_status') {
    const id = String(body?.id ?? '').trim();
    const status = String(body?.status ?? '').trim().toLowerCase();
    if (!id || !['active', 'disabled'].includes(status)) return NextResponse.json({ error: 'Choose a valid mailbox status.' }, { status: 400 });
    const { data: existing } = await supabase.from('mail_mailboxes').select('id,address,status').eq('id', id).eq('organization_id', organizationId).maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });
    if (status === 'active' && existing.status !== 'active') {
      const { count } = await supabase.from('mail_mailboxes').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active');
      if (Number(count ?? 0) >= Number(entitlement.mailbox_limit ?? 5)) return NextResponse.json({ error: 'Your Setu Mail plan has reached its mailbox limit.' }, { status: 409 });
      const addressDomain = String(existing.address).split('@')[1]?.toLowerCase();
      const { data: domainRow } = await supabase.from('mail_domains').select('sending_status,receiving_status').eq('organization_id', organizationId).eq('domain', addressDomain).maybeSingle();
      if (!domainRow || !capabilityReady(domainRow.sending_status) || !capabilityReady(domainRow.receiving_status)) return NextResponse.json({ error: 'Verify both sending and receiving for this domain before activating the mailbox.' }, { status: 409 });
    }
    const inboundEnabled = status === 'active' && Boolean(process.env.RESEND_WEBHOOK_SECRET);
    const { data, error } = await supabase.from('mail_mailboxes').update({ status, inbound_enabled: inboundEnabled, updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', organizationId).select('*').single();
    if (error) return NextResponse.json({ error: 'Unable to update mailbox status.' }, { status: 500 });
    return NextResponse.json({ ok: true, mailbox: data });
  }

  if (action === 'create_alias') {
    const mailboxId = String(body?.mailboxId ?? '').trim();
    const address = String(body?.address ?? '').trim().toLowerCase();
    const aliasType = String(body?.aliasType ?? 'alias').trim().toLowerCase();
    if (!mailboxId || !isEmail(address)) return NextResponse.json({ error: 'Select a mailbox and enter a valid alias.' }, { status: 400 });
    const { data: mailbox } = await supabase.from('mail_mailboxes').select('id,address,status').eq('id', mailboxId).eq('organization_id', organizationId).maybeSingle();
    if (!mailbox || mailbox.status !== 'active') return NextResponse.json({ error: 'Choose an active destination mailbox.' }, { status: 404 });
    const aliasDomain = address.split('@')[1]?.toLowerCase();
    const mailboxDomain = String(mailbox.address).split('@')[1]?.toLowerCase();
    if (aliasDomain !== mailboxDomain) return NextResponse.json({ error: 'Shared addresses must use the same verified domain as the destination mailbox.' }, { status: 400 });
    const { data, error } = await supabase.from('mail_aliases').insert({ organization_id: organizationId, mailbox_id: mailboxId, address, alias_type: aliasType, is_active: true }).select('*').single();
    if (error) return NextResponse.json({ error: error.message || 'Unable to create alias.' }, { status: 409 });
    return NextResponse.json({ ok: true, alias: data });
  }

  if (action === 'set_alias_status') {
    const id = String(body?.id ?? '').trim();
    const isActive = body?.isActive === true;
    if (!id) return NextResponse.json({ error: 'Alias id is required.' }, { status: 400 });
    const { data, error } = await supabase.from('mail_aliases').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', organizationId).select('*').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Unable to update shared address.' }, { status: 500 });
    return NextResponse.json({ ok: true, alias: data });
  }

  return NextResponse.json({ error: 'Unsupported Setu Mail admin action.' }, { status: 400 });
}
