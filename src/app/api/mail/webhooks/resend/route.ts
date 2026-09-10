import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const RESEND_API = 'https://api.resend.com';
const ATTACHMENT_BUCKET = 'setu-mail-attachments';

function parseEmails(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value.split(',').map((part) => part.trim().replace(/^.*<([^>]+)>.*$/, '$1').toLowerCase()).filter(Boolean);
}

function normalizeSubject(value: unknown) {
  return String(value ?? '').trim();
}

function subjectKey(subject: string) {
  return subject.replace(/^\s*((re|fwd?|fw)\s*:\s*)+/i, '').trim().toLowerCase();
}

function verifySvixSignature(rawBody: string, request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  const id = request.headers.get('svix-id') ?? '';
  const timestamp = request.headers.get('svix-timestamp') ?? '';
  const signatures = (request.headers.get('svix-signature') ?? '').split(' ').map((part) => part.trim()).filter(Boolean);
  if (!id || !timestamp || signatures.length === 0) return false;

  const secretValue = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let key: Buffer;
  try { key = Buffer.from(secretValue, 'base64'); } catch { return false; }
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
  return signatures.some((signature) => {
    const value = signature.startsWith('v1,') ? signature.slice(3) : signature;
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

async function resendGet(path: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');
  const response = await fetch(`${RESEND_API}${path}`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as any)?.message || `Resend request failed (${response.status}).`);
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

async function findOrCreateThread(admin: any, mailbox: any, subject: string, fromAddress: string, toAddresses: string[]) {
  const key = subjectKey(subject);
  const { data: recent } = await admin.from('mail_threads')
    .select('id,subject,participants')
    .eq('mailbox_id', mailbox.id)
    .order('updated_at', { ascending: false })
    .limit(50);
  const participants = new Set([fromAddress, ...toAddresses].map((value) => value.toLowerCase()));
  const match = (recent ?? []).find((row: any) => subjectKey(row.subject || '') === key && Array.isArray(row.participants) && row.participants.some((value: string) => participants.has(String(value).toLowerCase())));
  if (match) return match.id;
  const { data, error } = await admin.from('mail_threads').insert({
    organization_id: mailbox.organization_id,
    mailbox_id: mailbox.id,
    subject,
    participants: Array.from(participants),
    last_message_at: new Date().toISOString(),
    unread_count: 1,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function ingestInbound(admin: any, webhook: any) {
  const providerMessageId = String(webhook?.data?.email_id ?? webhook?.data?.id ?? '').trim();
  if (!providerMessageId) throw new Error('Inbound webhook did not include an email id.');
  const received = await resendGet(`/emails/receiving/${encodeURIComponent(providerMessageId)}`);
  const toAddresses = parseEmails(received.to ?? webhook?.data?.to);
  const ccAddresses = parseEmails(received.cc ?? webhook?.data?.cc);
  const mailbox = await findMailbox(admin, [...toAddresses, ...ccAddresses]);
  if (!mailbox) throw new Error(`No Setu Mail mailbox matched recipients: ${[...toAddresses, ...ccAddresses].join(', ')}`);

  const fromAddress = parseEmails(received.from ?? webhook?.data?.from)[0] ?? String(received.from ?? webhook?.data?.from ?? '').toLowerCase();
  const subject = normalizeSubject(received.subject ?? webhook?.data?.subject);
  const { data: existing } = await admin.from('mail_messages').select('id').eq('provider_message_id', providerMessageId).maybeSingle();
  if (existing) return { messageId: existing.id, duplicate: true };

  const threadId = await findOrCreateThread(admin, mailbox, subject, fromAddress, toAddresses);
  const headers = received.headers ?? {};
  const messageIdHeader = headers['message-id'] ?? headers['Message-ID'] ?? null;
  const inReplyTo = headers['in-reply-to'] ?? headers['In-Reply-To'] ?? null;
  const referencesRaw = headers.references ?? headers.References ?? '';
  const references = typeof referencesRaw === 'string' ? referencesRaw.split(/\s+/).filter(Boolean) : [];

  const { data: message, error: messageError } = await admin.from('mail_messages').insert({
    organization_id: mailbox.organization_id,
    mailbox_id: mailbox.id,
    thread_id: threadId,
    provider_message_id: providerMessageId,
    direction: 'inbound',
    status: 'received',
    folder: 'inbox',
    from_address: fromAddress,
    to_addresses: toAddresses,
    cc_addresses: ccAddresses,
    bcc_addresses: [],
    subject,
    text_body: received.text ?? null,
    html_body: received.html ?? null,
    is_read: false,
    received_at: webhook?.created_at ?? new Date().toISOString(),
    message_id_header: messageIdHeader,
    in_reply_to: inReplyTo,
    reference_headers: references,
    metadata: { provider: 'resend', headers },
  }).select('id').single();
  if (messageError) throw messageError;

  await admin.from('mail_threads').update({
    last_message_at: webhook?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', threadId);

  const attachmentList = await resendGet(`/emails/receiving/${encodeURIComponent(providerMessageId)}/attachments`).catch(() => ({ data: [] }));
  const attachments = Array.isArray(attachmentList?.data) ? attachmentList.data : Array.isArray(attachmentList) ? attachmentList : [];
  for (const item of attachments) {
    const attachmentId = String(item.id ?? item.attachment_id ?? '').trim();
    if (!attachmentId) continue;
    try {
      const attachment = await resendGet(`/emails/receiving/${encodeURIComponent(providerMessageId)}/attachments/${encodeURIComponent(attachmentId)}`);
      const content = attachment.content ?? attachment.data ?? null;
      if (!content) continue;
      const filename = String(attachment.filename ?? item.filename ?? 'attachment');
      const contentType = String(attachment.content_type ?? item.content_type ?? 'application/octet-stream');
      const bytes = Buffer.from(String(content), 'base64');
      const path = `${mailbox.organization_id}/${mailbox.id}/${message.id}/${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
      const { error: uploadError } = await admin.storage.from(ATTACHMENT_BUCKET).upload(path, bytes, { contentType, upsert: false });
      if (uploadError) continue;
      await admin.from('mail_attachments').insert({
        organization_id: mailbox.organization_id,
        mailbox_id: mailbox.id,
        message_id: message.id,
        filename,
        content_type: contentType,
        size_bytes: bytes.length,
        storage_path: path,
        provider_attachment_id: attachmentId,
      });
    } catch {
      // Attachment retrieval failure should not block the email itself from appearing in Inbox.
    }
  }

  await admin.from('mail_entitlements').update({ updated_at: new Date().toISOString() }).eq('organization_id', mailbox.organization_id);
  return { messageId: message.id, duplicate: false };
}

async function updateDelivery(admin: any, webhook: any) {
  const eventType = String(webhook?.type ?? '');
  const providerMessageId = String(webhook?.data?.email_id ?? webhook?.data?.id ?? '').trim();
  if (!providerMessageId) return;
  const statusMap: Record<string, string> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'delayed',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.failed': 'failed',
  };
  const status = statusMap[eventType];
  if (!status) return;
  await admin.from('mail_messages').update({
    status,
    updated_at: new Date().toISOString(),
    metadata: { provider: 'resend', last_event_type: eventType, last_event_at: webhook?.created_at ?? new Date().toISOString() },
  }).eq('provider_message_id', providerMessageId).eq('direction', 'outbound');
}

export async function POST(request: NextRequest) {
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });

  const rawBody = await request.text();
  if (!verifySvixSignature(rawBody, request)) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });

  const svixId = request.headers.get('svix-id')?.trim();
  if (!svixId) return NextResponse.json({ error: 'Missing svix-id.' }, { status: 400 });
  let webhook: any;
  try { webhook = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  const eventType = String(webhook?.type ?? '').trim() || 'unknown';
  const providerMessageId = String(webhook?.data?.email_id ?? webhook?.data?.id ?? '').trim() || null;
  const { data: existing } = await admin.from('mail_webhook_events').select('id,status').eq('svix_id', svixId).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, duplicate: true, status: existing.status });

  const { error: eventInsertError } = await admin.from('mail_webhook_events').insert({
    svix_id: svixId,
    event_type: eventType,
    provider_message_id: providerMessageId,
    event_created_at: webhook?.created_at ?? null,
    status: 'processing',
    payload: webhook,
  });
  if (eventInsertError) return NextResponse.json({ ok: true, duplicate: true });

  try {
    if (eventType === 'email.received') await ingestInbound(admin, webhook);
    else await updateDelivery(admin, webhook);
    await admin.from('mail_webhook_events').update({ status: 'processed', processed_at: new Date().toISOString(), error_message: null }).eq('svix_id', svixId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed.';
    await admin.from('mail_webhook_events').update({ status: 'failed', processed_at: new Date().toISOString(), error_message: message }).eq('svix_id', svixId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
