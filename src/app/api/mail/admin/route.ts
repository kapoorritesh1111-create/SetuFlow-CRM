import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { mailMalwareScannerConfigured } from '@/lib/mail/attachment-security';

export const dynamic = 'force-dynamic';
const READY = new Set(['enabled','verified','active','ready']);
const isEmail = (v:string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isDomain = (v:string) => /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(v);
const ready = (v:unknown) => READY.has(String(v ?? '').toLowerCase());
const capability = (v:unknown,status:unknown) => String(v ?? '').trim().toLowerCase() || (String(status ?? '').toLowerCase() === 'verified' ? 'verified' : 'pending');

async function requireAdmin() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership || !workspace.canAccessAdmin) return { error: NextResponse.json({ error: 'Owner or admin access is required.' }, { status: 403 }) };
  const supabase = (await createClient()) as any;
  const { data: grant } = await supabase.from('org_module_grants').select('enabled').eq('organization_id', workspace.organization.id).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return { error: NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 }) };
  return { workspace, organization: workspace.organization, supabase };
}

export async function GET() {
  const a = await requireAdmin();
  if ('error' in a) return a.error;
  const { organization, supabase } = a;
  const oid = organization.id;
  const [domains, mailboxes, aliases, access, entitlement, members, retention] = await Promise.all([
    supabase.from('mail_domains').select('*').eq('organization_id', oid).order('created_at'),
    supabase.from('mail_mailboxes').select('id,address,display_name,status,inbound_enabled,created_at').eq('organization_id', oid).order('address'),
    supabase.from('mail_aliases').select('id,mailbox_id,address,alias_type,is_active').eq('organization_id', oid).order('address'),
    supabase.from('mail_mailbox_access').select('id,mailbox_id,user_id,access_role,can_read,can_send,can_manage,is_primary').eq('organization_id', oid),
    supabase.from('mail_entitlements').select('*').eq('organization_id', oid).maybeSingle(),
    supabase.from('organization_members').select('id,user_id,display_name,is_active').eq('organization_id', oid).eq('is_active', true).order('display_name'),
    supabase.from('mail_retention_policies').select('*').eq('organization_id', oid).maybeSingle(),
  ]);
  return NextResponse.json({
    organization: { id: oid, name: organization.name, slug: organization.slug },
    domains: domains.data ?? [],
    mailboxes: mailboxes.data ?? [],
    aliases: aliases.data ?? [],
    access: access.data ?? [],
    entitlement: entitlement.data ?? null,
    members: members.data ?? [],
    retention: retention.data ?? null,
    providerConfigured: Boolean(process.env.RESEND_API_KEY),
    webhookConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    senderConfigured: Boolean(String(process.env.SETU_MAIL_FROM_EMAIL ?? process.env.SETU_NOTIFICATION_FROM_EMAIL ?? '').trim()),
    malwareScannerConfigured: mailMalwareScannerConfigured(),
    webhookPath: '/api/mail/webhooks/resend',
  });
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin();
  if ('error' in a) return a.error;
  const { workspace, organization, supabase } = a;
  const oid = organization.id;
  const body = await req.json().catch(() => null) as Record<string,unknown> | null;
  const action = String(body?.action ?? '').trim();
  const { data: ent } = await supabase.from('mail_entitlements').select('*').eq('organization_id', oid).maybeSingle();
  if (!ent || ent.status !== 'active') return NextResponse.json({ error: 'Setu Mail subscription is not active.' }, { status: 402 });

  if (action === 'update_retention') {
    const trashDays = Number(body?.trashRetentionDays);
    const quarantineDays = Number(body?.quarantineRetentionDays);
    const orphanDays = Number(body?.orphanAttachmentRetentionDays);
    const enabled = body?.enabled !== false;
    if (!Number.isInteger(trashDays) || trashDays < 1 || trashDays > 365) return NextResponse.json({ error: 'Trash retention must be between 1 and 365 days.' }, { status: 400 });
    if (!Number.isInteger(quarantineDays) || quarantineDays < 1 || quarantineDays > 365) return NextResponse.json({ error: 'Quarantine retention must be between 1 and 365 days.' }, { status: 400 });
    if (!Number.isInteger(orphanDays) || orphanDays < 1 || orphanDays > 90) return NextResponse.json({ error: 'Orphan attachment retention must be between 1 and 90 days.' }, { status: 400 });
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('mail_retention_policies').upsert({
      organization_id: oid,
      trash_retention_days: trashDays,
      quarantine_retention_days: quarantineDays,
      orphan_attachment_retention_days: orphanDays,
      enabled,
      updated_by: workspace.user?.id ?? null,
      updated_at: now,
    }, { onConflict: 'organization_id' }).select('*').single();
    if (error) return NextResponse.json({ error: 'Unable to save Mail retention policy.' }, { status: 500 });
    return NextResponse.json({ ok: true, retention: data });
  }

  if (action === 'create_mailbox') {
    const address = String(body?.address ?? '').trim().toLowerCase(), displayName = String(body?.displayName ?? '').trim() || null, userId = String(body?.userId ?? '').trim() || null;
    if (!isEmail(address)) return NextResponse.json({ error: 'Enter a valid mailbox address.' }, { status: 400 });
    const domain = address.split('@')[1];
    const { data: d } = await supabase.from('mail_domains').select('sending_status,receiving_status').eq('organization_id', oid).eq('domain', domain).maybeSingle();
    if (!d || !ready(d.sending_status) || !ready(d.receiving_status)) return NextResponse.json({ error: 'Verify sending and receiving for this domain before creating mailboxes.' }, { status: 409 });
    const { count } = await supabase.from('mail_mailboxes').select('id', { count:'exact', head:true }).eq('organization_id', oid).eq('status', 'active');
    if (Number(count ?? 0) >= Number(ent.mailbox_limit ?? 5)) return NextResponse.json({ error: 'Your Setu Mail plan has reached its mailbox limit.' }, { status: 409 });
    if (userId) {
      const { data: m } = await supabase.from('organization_members').select('user_id').eq('organization_id', oid).eq('user_id', userId).eq('is_active', true).maybeSingle();
      if (!m) return NextResponse.json({ error: 'The selected user is not an active organization member.' }, { status: 400 });
    }
    const { data: mb, error } = await supabase.from('mail_mailboxes').insert({ organization_id: oid, address, display_name: displayName, status:'active', inbound_enabled: Boolean(process.env.RESEND_WEBHOOK_SECRET) }).select('*').single();
    if (error) return NextResponse.json({ error: error.message || 'Unable to create mailbox.' }, { status: 409 });
    if (userId) await supabase.from('mail_mailbox_access').insert({ organization_id: oid, mailbox_id: mb.id, user_id: userId, access_role:'owner', can_read:true, can_send:true, can_manage:true, is_primary:true });
    return NextResponse.json({ ok:true, mailbox: mb });
  }
  if (action === 'assign_mailbox') {
    const mailboxId = String(body?.mailboxId ?? ''), userId = String(body?.userId ?? '');
    if (!mailboxId || !userId) return NextResponse.json({ error: 'Choose a mailbox and user.' }, { status: 400 });
    const [{ data: mb }, { data: member }] = await Promise.all([
      supabase.from('mail_mailboxes').select('id').eq('id', mailboxId).eq('organization_id', oid).maybeSingle(),
      supabase.from('organization_members').select('user_id').eq('organization_id', oid).eq('user_id', userId).eq('is_active', true).maybeSingle(),
    ]);
    if (!mb || !member) return NextResponse.json({ error: 'Mailbox or user was not found.' }, { status: 404 });
    await supabase.from('mail_mailbox_access').update({ is_primary:false, access_role:'member', can_manage:false, updated_at:new Date().toISOString() }).eq('mailbox_id', mailboxId).eq('organization_id', oid).eq('is_primary', true);
    const { error } = await supabase.from('mail_mailbox_access').upsert({ organization_id:oid, mailbox_id:mailboxId, user_id:userId, access_role:'owner', can_read:true, can_send:true, can_manage:true, is_primary:true, updated_at:new Date().toISOString() }, { onConflict:'mailbox_id,user_id' });
    if (error) return NextResponse.json({ error: 'Unable to assign mailbox.' }, { status: 500 });
    return NextResponse.json({ ok:true });
  }
  if (action === 'unassign_mailbox') {
    const mailboxId = String(body?.mailboxId ?? '');
    if (!mailboxId) return NextResponse.json({ error: 'Mailbox id is required.' }, { status: 400 });
    await supabase.from('mail_mailbox_access').delete().eq('mailbox_id', mailboxId).eq('organization_id', oid).eq('is_primary', true);
    return NextResponse.json({ ok:true });
  }
  if (action === 'grant_mailbox_access') {
    const mailboxId = String(body?.mailboxId ?? ''), userId = String(body?.userId ?? '');
    if (!mailboxId || !userId) return NextResponse.json({ error: 'Choose a mailbox and user.' }, { status: 400 });
    const { error } = await supabase.from('mail_mailbox_access').upsert({ organization_id:oid, mailbox_id:mailboxId, user_id:userId, access_role:'delegate', can_read:true, can_send:true, can_manage:false, is_primary:false, updated_at:new Date().toISOString() }, { onConflict:'mailbox_id,user_id' });
    if (error) return NextResponse.json({ error: 'Unable to grant mailbox access.' }, { status: 500 });
    return NextResponse.json({ ok:true });
  }
  if (action === 'remove_mailbox_access') {
    const id = String(body?.id ?? '');
    const { error } = await supabase.from('mail_mailbox_access').delete().eq('id', id).eq('organization_id', oid).eq('is_primary', false);
    if (error) return NextResponse.json({ error: 'Unable to remove access.' }, { status: 500 });
    return NextResponse.json({ ok:true });
  }
  if (action === 'set_mailbox_status') {
    const id = String(body?.id ?? ''), status = String(body?.status ?? '').toLowerCase();
    if (!['active','disabled'].includes(status)) return NextResponse.json({ error: 'Choose a valid mailbox status.' }, { status: 400 });
    if (status === 'active') {
      const { count } = await supabase.from('mail_mailboxes').select('id', { count:'exact', head:true }).eq('organization_id', oid).eq('status', 'active');
      if (Number(count ?? 0) >= Number(ent.mailbox_limit ?? 5)) return NextResponse.json({ error: 'Your Setu Mail plan has reached its mailbox limit.' }, { status: 409 });
    }
    const { data, error } = await supabase.from('mail_mailboxes').update({ status, inbound_enabled: status === 'active' && Boolean(process.env.RESEND_WEBHOOK_SECRET), updated_at:new Date().toISOString() }).eq('id', id).eq('organization_id', oid).select('*').single();
    if (error) return NextResponse.json({ error: 'Unable to update mailbox.' }, { status: 500 });
    return NextResponse.json({ ok:true, mailbox:data });
  }
  if (action === 'create_alias') {
    const mailboxId = String(body?.mailboxId ?? ''), address = String(body?.address ?? '').trim().toLowerCase();
    if (!mailboxId || !isEmail(address)) return NextResponse.json({ error: 'Select a mailbox and enter a valid shared address.' }, { status: 400 });
    const { data: mb } = await supabase.from('mail_mailboxes').select('address,status').eq('id', mailboxId).eq('organization_id', oid).maybeSingle();
    if (!mb || mb.status !== 'active') return NextResponse.json({ error: 'Choose an active destination mailbox.' }, { status: 404 });
    if (address.split('@')[1] !== String(mb.address).split('@')[1]) return NextResponse.json({ error: 'Shared address must use the destination mailbox domain.' }, { status: 400 });
    const { data, error } = await supabase.from('mail_aliases').insert({ organization_id:oid, mailbox_id:mailboxId, address, alias_type:'alias', is_active:true }).select('*').single();
    if (error) return NextResponse.json({ error: error.message || 'Unable to create shared address.' }, { status: 409 });
    return NextResponse.json({ ok:true, alias:data });
  }
  if (action === 'set_alias_status') {
    const id = String(body?.id ?? '');
    const { data, error } = await supabase.from('mail_aliases').update({ is_active:body?.isActive === true, updated_at:new Date().toISOString() }).eq('id', id).eq('organization_id', oid).select('*').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Unable to update shared address.' }, { status: 500 });
    return NextResponse.json({ ok:true, alias:data });
  }
  if (action === 'create_domain') {
    const domain = String(body?.domain ?? '').trim().toLowerCase().replace(/^@/, '');
    if (!isDomain(domain)) return NextResponse.json({ error: 'Enter a valid business domain.' }, { status: 400 });
    const { count } = await supabase.from('mail_domains').select('id', { count:'exact', head:true }).eq('organization_id', oid);
    if (Number(count ?? 0) >= Number(ent.domain_limit ?? 1)) return NextResponse.json({ error: 'Your Setu Mail plan has reached its domain limit.' }, { status: 409 });
    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ error: 'Resend is not configured.' }, { status: 503 });
    const pr = await fetch('https://api.resend.com/domains', { method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' }, body:JSON.stringify({ name:domain }) });
    const p = await pr.json().catch(() => ({})) as any;
    if (!pr.ok) return NextResponse.json({ error:p?.message || 'Unable to register domain.' }, { status: 502 });
    const status = p?.status ?? 'pending';
    const { data, error } = await supabase.from('mail_domains').insert({ organization_id:oid, domain, provider_domain_id:p?.id ?? null, status, region:p?.region ?? null, sending_status:capability(p?.capabilities?.sending,status), receiving_status:capability(p?.capabilities?.receiving,status), dns_records:Array.isArray(p?.records) ? p.records : [], last_checked_at:new Date().toISOString() }).select('*').single();
    if (error) return NextResponse.json({ error: 'Domain registered but could not be saved.' }, { status: 500 });
    return NextResponse.json({ ok:true, domain:data });
  }
  if (action === 'refresh_domain') {
    const id = String(body?.id ?? '');
    const { data:d } = await supabase.from('mail_domains').select('*').eq('id', id).eq('organization_id', oid).maybeSingle();
    if (!d?.provider_domain_id) return NextResponse.json({ error: 'Domain is not connected to Resend.' }, { status: 404 });
    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ error: 'Resend is not configured.' }, { status: 503 });
    const pr = await fetch(`https://api.resend.com/domains/${encodeURIComponent(d.provider_domain_id)}`, { headers:{ Authorization:`Bearer ${key}` } });
    const p = await pr.json().catch(() => ({})) as any;
    if (!pr.ok) return NextResponse.json({ error:p?.message || 'Unable to refresh domain.' }, { status: 502 });
    const status = p?.status ?? d.status, sending = capability(p?.capabilities?.sending,status), receiving = capability(p?.capabilities?.receiving,status), now = new Date().toISOString();
    const { data } = await supabase.from('mail_domains').update({ status, sending_status:sending, receiving_status:receiving, dns_records:Array.isArray(p?.records) ? p.records : d.dns_records, last_checked_at:now, updated_at:now }).eq('id', id).select('*').single();
    await supabase.from('mail_mailboxes').update({ inbound_enabled:ready(receiving) && Boolean(process.env.RESEND_WEBHOOK_SECRET), updated_at:now }).eq('organization_id', oid).ilike('address', `%@${d.domain}`);
    return NextResponse.json({ ok:true, domain:data });
  }
  return NextResponse.json({ error: 'Unsupported Setu Mail admin action.' }, { status: 400 });
}
