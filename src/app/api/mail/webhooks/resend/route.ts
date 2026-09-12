import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { prepareIncomingOrganization } from '@/lib/mail/incoming-organization';
import { claimMailWebhook } from '@/lib/mail/webhook-claim';
import { secureStoredMailAttachment } from '@/lib/mail/attachment-security';
import { applyCalendarReply } from '@/lib/calendar/ics-reply';
import { dispatchCommunicationNotification } from '@/lib/notifications/communication-notification-service';

export const dynamic = 'force-dynamic';
const RESEND_API = 'https://api.resend.com';
const ATTACHMENT_BUCKET = 'setu-mail-attachments';
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function parseEmails(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim().replace(/^.*<([^>]+)>.*$/, '$1').toLowerCase()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value.split(',').map(part => part.trim().replace(/^.*<([^>]+)>.*$/, '$1').toLowerCase()).filter(Boolean);
}
function subjectKey(subject: string) { return subject.replace(/^\s*((re|fwd?|fw)\s*:\s*)+/i, '').trim().toLowerCase(); }
function verifySvixSignature(rawBody: string, request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const id = request.headers.get('svix-id') ?? '';
  const timestamp = request.headers.get('svix-timestamp') ?? '';
  const ts = Number(timestamp);
  const signatures = (request.headers.get('svix-signature') ?? '').split(' ').map(part => part.trim()).filter(Boolean);
  if (!id || !Number.isFinite(ts) || signatures.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const secretValue = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let key: Buffer;
  try { key = Buffer.from(secretValue, 'base64'); } catch { return false; }
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
  return signatures.some(signature => {
    const value = signature.startsWith('v1,') ? signature.slice(3) : signature;
    const a = Buffer.from(value); const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
async function resendGet(path: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');
  const response = await fetch(`${RESEND_API}${path}`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend request failed (${response.status}).`);
  return payload as any;
}
async function findMailbox(admin: any, addresses: string[]) {
  for (const address of addresses) {
    const { data: direct } = await admin.from('mail_mailboxes').select('*').eq('address', address).eq('status', 'active').maybeSingle();
    if (direct) return direct;
    const { data: alias } = await admin.from('mail_aliases').select('mailbox_id').eq('address', address).eq('is_active', true).maybeSingle();
    if (alias?.mailbox_id) {
      const { data: mailbox } = await admin.from('mail_mailboxes').select('*').eq('id', alias.mailbox_id).eq('status', 'active').maybeSingle();
      if (mailbox) return mailbox;
    }
  }
  return null;
}
async function findOrCreateThread(admin: any, mailbox: any, subject: string, fromAddress: string, toAddresses: string[], headers: Record<string, unknown>) {
  const inReplyTo = String(headers['in-reply-to'] ?? headers['In-Reply-To'] ?? '').trim();
  const referencesRaw = String(headers.references ?? headers.References ?? '').trim();
  const headerIds = [inReplyTo, ...referencesRaw.split(/\s+/)].filter(Boolean);
  if (headerIds.length) {
    const { data: parent } = await admin.from('mail_messages').select('thread_id').eq('mailbox_id', mailbox.id).in('message_id_header', headerIds).not('thread_id', 'is', null).limit(1).maybeSingle();
    if (parent?.thread_id) return parent.thread_id;
  }
  const key = subjectKey(subject);
  const { data: recent } = await admin.from('mail_threads').select('id,subject,participants').eq('mailbox_id', mailbox.id).order('updated_at', { ascending: false }).limit(50);
  const participants = new Set([fromAddress, ...toAddresses].map(value => value.toLowerCase()));
  const match = (recent ?? []).find((row: any) => subjectKey(row.subject || '') === key && Array.isArray(row.participants) && row.participants.some((value: string) => participants.has(String(value).toLowerCase())));
  if (match) return match.id;
  const { data, error } = await admin.from('mail_threads').insert({ organization_id: mailbox.organization_id, mailbox_id: mailbox.id, subject, participants: Array.from(participants), last_message_at: new Date().toISOString(), unread_count: 1 }).select('id').single();
  if (error) throw error;
  return data.id;
}
async function inboundNotificationUsers(admin: any, organizationId: string, mailboxId: string) {
  const { data: access, error } = await admin.from('mail_mailbox_access')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('mailbox_id', mailboxId)
    .eq('can_read', true);
  if (error) throw error;
  const userIds = [...new Set((access ?? []).map((row: any) => String(row.user_id ?? '')).filter(Boolean))];
  if (!userIds.length) return [];
  const { data: members, error: memberError } = await admin.from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .in('user_id', userIds);
  if (memberError) throw memberError;
  return (members ?? []).map((row: any) => String(row.user_id));
}
async function ingestInbound(admin: any, webhook: any) {
  const providerMessageId = String(webhook?.data?.email_id ?? webhook?.data?.id ?? '').trim();
  if (!providerMessageId) throw new Error('Inbound webhook did not include an email id.');
  const received = await resendGet(`/emails/receiving/${encodeURIComponent(providerMessageId)}`);
  const toAddresses = parseEmails(received.to ?? webhook?.data?.to);
  const ccAddresses = parseEmails(received.cc ?? webhook?.data?.cc);
  const mailbox = await findMailbox(admin, [...toAddresses, ...ccAddresses]);
  if (!mailbox) throw new Error('No active Setu Mail mailbox matched the recipients.');
  const fromAddress = parseEmails(received.from ?? webhook?.data?.from)[0] ?? String(received.from ?? webhook?.data?.from ?? '').toLowerCase();
  const subject = String(received.subject ?? webhook?.data?.subject ?? '').trim();
  const lookup = () => admin.from('mail_messages').select('id').eq('organization_id', mailbox.organization_id).eq('mailbox_id', mailbox.id).eq('provider_message_id', providerMessageId).maybeSingle();
  const existing = await lookup();
  if (existing.error) throw existing.error;
  if (existing.data) return { messageId: existing.data.id, duplicate: true };

  const attachmentList = await resendGet(`/emails/receiving/${encodeURIComponent(providerMessageId)}/attachments`).catch(() => null);
  const attachments: any[] = Array.isArray(attachmentList?.data) ? attachmentList.data : [];
  const attachmentMetadata = Array.isArray(attachmentList?.data) ? attachmentList.data : Array.isArray(received.attachments) ? received.attachments : Array.isArray(webhook?.data?.attachments) ? webhook.data.attachments : null;
  const now = new Date().toISOString();
  const organization = await prepareIncomingOrganization(admin, { organizationId: mailbox.organization_id, mailboxId: mailbox.id, direction: 'inbound', from: fromAddress, to: toAddresses, cc: ccAddresses, subject, hasAttachment: attachmentMetadata === null ? null : attachmentMetadata.length > 0 }, now);
  const headers = (received.headers ?? {}) as Record<string, unknown>;
  const threadId = await findOrCreateThread(admin, mailbox, subject, fromAddress, toAddresses, headers);
  const referencesRaw = String(headers.references ?? headers.References ?? '').trim();
  const values = {
    organization_id: mailbox.organization_id, mailbox_id: mailbox.id, thread_id: threadId, provider_message_id: providerMessageId,
    direction: 'inbound', status: 'received', from_address: fromAddress, to_addresses: toAddresses, cc_addresses: ccAddresses,
    bcc_addresses: [], subject, text_body: received.text ?? null, html_body: received.html ?? null,
    received_at: webhook?.created_at ?? now,
    message_id_header: String(headers['message-id'] ?? headers['Message-ID'] ?? '').trim() || null,
    in_reply_to: String(headers['in-reply-to'] ?? headers['In-Reply-To'] ?? '').trim() || null,
    reference_headers: referencesRaw ? referencesRaw.split(/\s+/).filter(Boolean) : [],
    ...organization.placement,
    metadata: { provider: 'resend', headers, ...organization.audit },
  };
  let saved = await admin.from('mail_messages').insert(values).select('id').single();
  if (saved.error?.code === '23503' && values.custom_folder_id) {
    const destination = await admin.from('mail_folders').select('id').eq('id', values.custom_folder_id).eq('mailbox_id', mailbox.id).eq('organization_id', mailbox.organization_id).maybeSingle();
    if (!destination.error && !destination.data) {
      saved = await admin.from('mail_messages').insert({ ...values, folder: 'inbox', custom_folder_id: null, is_read: false, is_starred: false, archived_at: null, metadata: { ...values.metadata, rule_status: 'target_removed', matched_rule_id: null } }).select('id').single();
    }
  }
  if (saved.error?.code === '23505') {
    const duplicate = await lookup();
    if (duplicate.error) throw duplicate.error;
    if (duplicate.data) return { messageId: duplicate.data.id, duplicate: true };
  }
  if (saved.error || !saved.data) throw saved.error || new Error('Unable to save inbound message.');
  const message = saved.data;

  for (const item of attachments) {
    const downloadUrl = String(item.download_url ?? '').trim();
    if (!downloadUrl) continue;
    const providerAttachmentId = String(item.id ?? '').trim() || null;
    try {
      const download = await fetch(downloadUrl, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!download.ok) {
        console.error('[setu-mail:webhook] attachment download failed', { providerMessageId, providerAttachmentId, messageId: message.id, status: download.status });
        continue;
      }
      const bytes = Buffer.from(await download.arrayBuffer());
      const filename = String(item.filename ?? 'attachment');
      const contentType = String(item.content_type ?? 'application/octet-stream');
      const path = `${mailbox.organization_id}/${mailbox.id}/${message.id}/${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
      const { error: uploadError } = await admin.storage.from(ATTACHMENT_BUCKET).upload(path, bytes, { contentType, upsert: false });
      if (uploadError) {
        console.error('[setu-mail:webhook] attachment storage failed', { providerMessageId, providerAttachmentId, messageId: message.id, error: uploadError.message });
        continue;
      }
      const { data: attachment, error: insertError } = await admin.from('mail_attachments').insert({
        organization_id: mailbox.organization_id,
        mailbox_id: mailbox.id,
        message_id: message.id,
        filename,
        content_type: contentType,
        size_bytes: bytes.length,
        storage_path: path,
        provider_attachment_id: item.id ?? null,
        security_status: 'pending',
      }).select('id,organization_id,mailbox_id,message_id,filename,content_type,size_bytes,storage_path,security_status,scan_attempts').single();
      if (insertError || !attachment) {
        await admin.storage.from(ATTACHMENT_BUCKET).remove([path]);
        console.error('[setu-mail:webhook] attachment record failed', { providerMessageId, providerAttachmentId, messageId: message.id, error: insertError?.message ?? 'unknown' });
        continue;
      }
      // The message remains available even when an attachment is unavailable.
      const secured = await secureStoredMailAttachment(admin, attachment, bytes);
      if (secured.security_status !== 'clean') {
        console.warn('[setu-mail:webhook] attachment blocked', { providerMessageId, providerAttachmentId, messageId: message.id, attachmentId: attachment.id, securityStatus: secured.security_status });
      } else if (contentType.toLowerCase().startsWith('text/calendar') || filename.toLowerCase().endsWith('.ics')) {
        const reply = await applyCalendarReply(admin, { organizationId: mailbox.organization_id, fromAddress, ics: bytes.toString('utf8') }).catch(() => ({ matched: false, updated: false }));
        if (reply.updated) console.info('[setu-calendar:rsvp] calendar client reply applied', { messageId: message.id, providerMessageId });
      }
    } catch (error) {
      console.error('[setu-mail:webhook] attachment processing failed', { providerMessageId, providerAttachmentId, messageId: message.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const unread = await admin.from('mail_messages').select('id', { head: true, count: 'exact' }).eq('organization_id', mailbox.organization_id).eq('mailbox_id', mailbox.id).eq('thread_id', threadId).eq('is_read', false);
  await admin.from('mail_threads').update({ last_message_at: webhook?.created_at ?? now, ...(unread.error ? {} : { unread_count: unread.count ?? 0 }), updated_at: now }).eq('id', threadId).eq('mailbox_id', mailbox.id);
  const { data: entitlement } = await admin.from('mail_entitlements').select('current_period_messages,monthly_message_limit').eq('organization_id', mailbox.organization_id).maybeSingle();
  if (entitlement) await admin.from('mail_entitlements').update({ current_period_messages: Number(entitlement.current_period_messages ?? 0) + 1, updated_at: now }).eq('organization_id', mailbox.organization_id);

  const effectiveFolder = String((values as any).folder ?? 'inbox').toLowerCase();
  if (!['junk', 'spam', 'trash'].includes(effectiveFolder)) {
    try {
      const userIds = await inboundNotificationUsers(admin, mailbox.organization_id, mailbox.id);
      if (userIds.length) await dispatchCommunicationNotification(admin, {
        organizationId: mailbox.organization_id,
        userIds,
        type: 'mail_received',
        title: subject ? `New email: ${subject}` : 'New email received',
        body: `From ${fromAddress}`,
        icon: 'envelope-o',
        entityType: 'mail_message',
        entityId: message.id,
        entityRef: message.id,
        actionUrl: `/api/mail/open?mailboxId=${encodeURIComponent(mailbox.id)}&messageId=${encodeURIComponent(message.id)}`,
        priority: 'normal',
      });
    } catch (error) {
      console.warn('[setu-mail:webhook] notification delivery failed', { messageId: message.id, mailboxId: mailbox.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { messageId: message.id, duplicate: false };
}
async function updateDelivery(admin: any, webhook: any) {
  const eventType = String(webhook?.type ?? '');
  const providerMessageId = String(webhook?.data?.email_id ?? webhook?.data?.id ?? '').trim();
  if (!providerMessageId) return;
  const statusMap: Record<string, string> = { 'email.sent': 'sent', 'email.delivered': 'delivered', 'email.delivery_delayed': 'delayed', 'email.bounced': 'bounced', 'email.complained': 'complained', 'email.failed': 'failed' };
  const status = statusMap[eventType]; if (!status) return;
  const { data: row } = await admin.from('mail_messages').select('metadata').eq('provider_message_id', providerMessageId).eq('direction', 'outbound').maybeSingle();
  await admin.from('mail_messages').update({ status, updated_at: new Date().toISOString(), metadata: { ...(row?.metadata ?? {}), provider: 'resend', last_event_type: eventType, last_event_at: webhook?.created_at ?? new Date().toISOString() } }).eq('provider_message_id', providerMessageId).eq('direction', 'outbound');
}
export async function POST(request: NextRequest) {
  if (!process.env.RESEND_WEBHOOK_SECRET?.trim()) return NextResponse.json({ error: 'Webhook verification is not configured.' }, { status: 503 });
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });
  const rawBody = await request.text();
  if (!verifySvixSignature(rawBody, request)) return NextResponse.json({ error: 'Invalid or stale webhook signature.' }, { status: 401 });
  const svixId = request.headers.get('svix-id')?.trim();
  if (!svixId) return NextResponse.json({ error: 'Missing svix-id.' }, { status: 400 });
  let webhook: any; try { webhook = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const eventType = String(webhook?.type ?? '').trim() || 'unknown';
  const providerMessageId = String(webhook?.data?.email_id ?? webhook?.data?.id ?? '').trim() || null;
  const now = new Date().toISOString();
  let claim: Awaited<ReturnType<typeof claimMailWebhook>>;
  try { claim = await claimMailWebhook(admin, { svix_id: svixId, event_type: eventType, provider_message_id: providerMessageId, event_created_at: webhook?.created_at ?? null, payload: webhook }, now); }
  catch (error) {
    console.error('[setu-mail:webhook] claim failed', { svixId, eventType, providerMessageId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: `Unable to record webhook. Reference: ${svixId}. Please retry.`, reference: svixId }, { status: 503 });
  }
  if (claim.duplicate) return NextResponse.json({ ok: true, duplicate: true });
  if (!claim.claimed) return NextResponse.json({ error: 'Webhook is already processing. Please retry.' }, { status: 503 });
  try {
    if (eventType === 'email.received') await ingestInbound(admin, webhook); else await updateDelivery(admin, webhook);
    const completed = await admin.from('mail_webhook_events').update({ status: 'processed', processed_at: new Date().toISOString(), error_message: null }).eq('svix_id', svixId).eq('status', 'processing').eq('processed_at', claim.claimedAt);
    if (completed.error) throw completed.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed.';
    const failureUpdate = await admin.from('mail_webhook_events').update({ status: 'failed', processed_at: new Date().toISOString(), error_message: message }).eq('svix_id', svixId).eq('status', 'processing').eq('processed_at', claim.claimedAt);
    console.error('[setu-mail:webhook] processing failed', { svixId, eventType, providerMessageId, error: message, failureRecorded: !failureUpdate.error });
    return NextResponse.json({ error: `Unable to process webhook. Reference: ${svixId}. Please retry.`, reference: svixId }, { status: 500 });
  }
}
