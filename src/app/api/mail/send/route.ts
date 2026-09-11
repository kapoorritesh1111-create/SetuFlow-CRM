import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';
import { isMailId } from '@/lib/mail/organization';
import { plainTextToMailHtml, sanitizeMailHtml } from '@/lib/mail/safe-html';

export const dynamic = 'force-dynamic';
const ATTACHMENT_BUCKET = 'setu-mail-attachments';
const MAX_RECIPIENTS = 50;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAILBOX_BURST_WINDOW_MS = 10 * 60 * 1000;
const MAILBOX_BURST_LIMIT = 30;
const ORG_HOURLY_WINDOW_MS = 60 * 60 * 1000;
const ORG_HOURLY_LIMIT = 300;
const isEmail = (value: string) => /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(value);
const normalizeAddresses = (value: unknown) => Array.from(new Set((Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []).map(x => String(x).trim().toLowerCase()).filter(Boolean)));
const ids = (value: unknown) => Array.isArray(value) ? Array.from(new Set(value.map(x => String(x).trim()).filter(Boolean))) : [];
const currentMonthStart = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

export async function POST(request: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const body = await request.json().catch(() => null) as any;
  const requestedMailboxId = String(body?.mailboxId ?? '').trim() || null;
  if (requestedMailboxId && !isMailId(requestedMailboxId)) return NextResponse.json({ error: 'Choose a valid sending mailbox.' }, { status: 400 });
  const to = normalizeAddresses(body?.to), cc = normalizeAddresses(body?.cc), bcc = normalizeAddresses(body?.bcc);
  const attachmentIds = ids(body?.attachmentIds), all = [...to, ...cc, ...bcc];
  const subject = String(body?.subject ?? '').trim();
  const rawText = String(body?.text ?? '').trim();
  const cleanBodyHtml = sanitizeMailHtml(body?.html) || plainTextToMailHtml(rawText);
  const includeSignature = body?.includeSignature !== false;
  if (!to.length || all.some(address => !isEmail(address))) return NextResponse.json({ error: 'Enter valid recipient email addresses.' }, { status: 400 });
  if (all.length > MAX_RECIPIENTS) return NextResponse.json({ error: `Setu Mail supports up to ${MAX_RECIPIENTS} recipients per message.` }, { status: 400 });
  if (!subject || !rawText) return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Resend is not configured for Setu Mail yet.' }, { status: 503 });
  const db = (await createClient()) as any;
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Setu Mail safety service is unavailable.' }, { status: 503 });

  const organizationId = workspace.organization.id, userId = workspace.user.id;
  const periodStart = currentMonthStart();
  const [{ data: grant }, { data: entitlement }, mailbox, usageResult] = await Promise.all([
    db.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    db.from('mail_entitlements').select('status,monthly_message_limit').eq('organization_id', organizationId).maybeSingle(),
    resolveUserMailbox(db, organizationId, userId, 'id,address,display_name,status', requestedMailboxId ? { mailboxId: requestedMailboxId, permission: 'send' } : { permission: 'send' }),
    admin.from('mail_usage_monthly_rollups').select('resend_inbound_messages,resend_outbound_messages').eq('organization_id', organizationId).eq('period_start', periodStart).maybeSingle(),
  ]);
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  if (!entitlement || entitlement.status !== 'active') return NextResponse.json({ error: 'Setu Mail subscription is not active.' }, { status: 402 });
  if (!mailbox) return NextResponse.json({ error: requestedMailboxId ? 'You do not have sending access to this mailbox.' : 'No active Setu Mail mailbox with sending access is assigned to you.' }, { status: 403 });
  if (usageResult.error) return NextResponse.json({ error: 'Setu Mail usage allowance could not be verified.' }, { status: 503 });
  const currentPeriodMessages = Number(usageResult.data?.resend_inbound_messages ?? 0) + Number(usageResult.data?.resend_outbound_messages ?? 0);
  const nextProviderEmailUnits = all.length;
  if (currentPeriodMessages + nextProviderEmailUnits > Number(entitlement.monthly_message_limit ?? 0)) return NextResponse.json({ error: 'This message would exceed the organization’s Setu Mail monthly email allowance.' }, { status: 429 });

  const nowMs = Date.now();
  const [mailboxRate, orgRate] = await Promise.all([
    admin.from('mail_messages').select('id', { count: 'exact', head: true }).eq('mailbox_id', mailbox.id).eq('direction', 'outbound').gte('sent_at', new Date(nowMs - MAILBOX_BURST_WINDOW_MS).toISOString()),
    admin.from('mail_messages').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('direction', 'outbound').gte('sent_at', new Date(nowMs - ORG_HOURLY_WINDOW_MS).toISOString()),
  ]);
  if (mailboxRate.error || orgRate.error) return NextResponse.json({ error: 'Setu Mail safety check could not be completed.' }, { status: 503 });
  if (Number(mailboxRate.count ?? 0) >= MAILBOX_BURST_LIMIT) return NextResponse.json({ error: 'This mailbox is sending unusually quickly. Try again shortly.' }, { status: 429 });
  if (Number(orgRate.count ?? 0) >= ORG_HOURLY_LIMIT) return NextResponse.json({ error: 'This organization has reached the Setu Mail hourly safety limit. Try again later.' }, { status: 429 });

  const { data: signature } = includeSignature
    ? await db.from('mail_signatures').select('text_signature,html_signature').eq('mailbox_id', mailbox.id).eq('user_id', userId).eq('is_default', true).limit(1).maybeSingle()
    : { data: null };
  const signatureText = String(signature?.text_signature ?? '').trim();
  const signatureHtml = sanitizeMailHtml(signature?.html_signature) || (signatureText ? plainTextToMailHtml(signatureText) : '');
  const text = signatureText ? `${rawText}\n\n${signatureText}` : rawText;
  const html = signatureHtml ? `${cleanBodyHtml}<div data-setu-mail-signature="true" style="margin-top:24px">${signatureHtml}</div>` : cleanBodyHtml;

  let threadId = String(body?.threadId ?? '').trim() || null;
  let parent: any = null;
  const parentId = String(body?.parentMessageId ?? '').trim();
  if (parentId) {
    const { data } = await db.from('mail_messages').select('id,thread_id,message_id_header,reference_headers').eq('id', parentId).eq('mailbox_id', mailbox.id).maybeSingle();
    parent = data;
    if (parent?.thread_id) threadId = parent.thread_id;
  }
  if (threadId) {
    const { data } = await db.from('mail_threads').select('id').eq('id', threadId).eq('mailbox_id', mailbox.id).maybeSingle();
    if (!data) threadId = null;
  }
  if (!threadId) {
    const { data, error } = await db.from('mail_threads').insert({ organization_id: organizationId, mailbox_id: mailbox.id, subject, participants: all, last_message_at: new Date().toISOString() }).select('id').single();
    if (error || !data) return NextResponse.json({ error: 'Unable to create the mail conversation.' }, { status: 500 });
    threadId = data.id;
  }
  const thread = String(threadId);

  const attachments: any[] = [];
  let attachmentBytes = 0;
  if (attachmentIds.length) {
    const { data, error } = await admin.from('mail_attachments')
      .select('id,filename,size_bytes,storage_path,message_id,security_status')
      .in('id', attachmentIds).eq('organization_id', organizationId).eq('mailbox_id', mailbox.id);
    if (error || (data ?? []).length !== attachmentIds.length) return NextResponse.json({ error: 'One or more attachments could not be found.' }, { status: 400 });

    const unsafe = (data ?? []).find((attachment: any) => attachment.security_status !== 'clean');
    if (unsafe) {
      const blocked = unsafe.security_status === 'quarantined'
        ? `${unsafe.filename} was blocked by malware scanning and cannot be sent.`
        : `${unsafe.filename} has not passed malware scanning and cannot be sent.`;
      return NextResponse.json({ error: blocked, securityStatus: unsafe.security_status }, { status: 409 });
    }

    for (const attachment of data ?? []) {
      attachmentBytes += Number(attachment.size_bytes ?? 0);
      if (attachmentBytes > MAX_ATTACHMENT_BYTES) return NextResponse.json({ error: 'Total attachment size must be 25 MB or less.' }, { status: 400 });
      if (!attachment.storage_path) return NextResponse.json({ error: `Attachment ${attachment.filename} is unavailable.` }, { status: 409 });
      const { data: file, error: downloadError } = await admin.storage.from(ATTACHMENT_BUCKET).download(attachment.storage_path);
      if (downloadError || !file) return NextResponse.json({ error: `Unable to read attachment ${attachment.filename}. Remove it or try again.` }, { status: 500 });
      attachments.push({ filename: attachment.filename, content: Buffer.from(await file.arrayBuffer()).toString('base64') });
    }
  }

  const domain = mailbox.address.split('@')[1]?.toLowerCase();
  const { data: verifiedDomain } = domain ? await db.from('mail_domains').select('status,sending_status').eq('organization_id', organizationId).eq('domain', domain).maybeSingle() : { data: null };
  const canSend = verifiedDomain && ['verified','active'].includes(String(verifiedDomain.status).toLowerCase()) && ['verified','active','ready','enabled'].includes(String(verifiedDomain.sending_status).toLowerCase());
  if (!canSend) return NextResponse.json({ error: `${mailbox.address} is assigned to you, but its domain is not ready for sending.` }, { status: 503 });

  const senderName = mailbox.display_name || workspace.profile?.full_name || workspace.organization.name || 'Setu Mail';
  const from = `${senderName} <${mailbox.address}>`;
  const references = Array.from(new Set([...(parent?.reference_headers ?? []), ...(parent?.message_id_header ? [parent.message_id_header] : [])]));
  const headers: Record<string, string> = { 'X-Setu-Organization': organizationId, 'X-Setu-Mailbox': mailbox.id, 'X-Setu-Thread': thread };
  if (parent?.message_id_header) headers['In-Reply-To'] = parent.message_id_header;
  if (references.length) headers.References = references.join(' ');

  const providerResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, ...(cc.length ? { cc } : {}), ...(bcc.length ? { bcc } : {}), subject, text, html, reply_to: mailbox.address, ...(attachments.length ? { attachments } : {}), headers }),
  });
  const provider = await providerResponse.json().catch(() => ({})) as any;
  const common = { organization_id: organizationId, mailbox_id: mailbox.id, thread_id: thread, direction: 'outbound', from_address: mailbox.address, to_addresses: to, cc_addresses: cc, bcc_addresses: bcc, subject, text_body: text, html_body: html, compose_options: { includeSignature }, is_read: true, folder: 'sent', in_reply_to: parent?.message_id_header ?? null, reference_headers: references };
  if (!providerResponse.ok) {
    if (!body?.draftId) await db.from('mail_messages').insert({ ...common, status: 'failed' });
    return NextResponse.json({ error: provider?.message || provider?.error?.message || 'Resend rejected the email.' }, { status: 502 });
  }

  const now = new Date().toISOString();
  let message: any = null, error: any = null;
  const draftId = String(body?.draftId ?? '').trim();
  if (draftId) {
    const result = await db.from('mail_messages').update({ ...common, provider_message_id: provider.id ?? null, status: 'sent', folder: 'sent', sent_at: now, draft_saved_at: null, updated_at: now }).eq('id', draftId).eq('mailbox_id', mailbox.id).eq('status', 'draft').select('id').maybeSingle();
    message = result.data; error = result.error || (!result.data ? new Error('Draft not found.') : null);
  } else {
    const result = await db.from('mail_messages').insert({ ...common, provider_message_id: provider.id ?? null, status: 'sent', sent_at: now }).select('id').single();
    message = result.data; error = result.error;
  }
  if (error || !message) return NextResponse.json({ error: 'Email sent, but Setu Mail could not save the sent copy.' }, { status: 500 });
  if (attachmentIds.length) await admin.from('mail_attachments').update({ message_id: message.id }).in('id', attachmentIds).eq('mailbox_id', mailbox.id).eq('security_status', 'clean');
  await db.from('mail_threads').update({ last_message_at: now, participants: Array.from(new Set([mailbox.address, ...all])), updated_at: now }).eq('id', thread);
  return NextResponse.json({ ok: true, id: message.id, threadId: thread, providerMessageId: provider.id ?? null, from: mailbox.address });
}
