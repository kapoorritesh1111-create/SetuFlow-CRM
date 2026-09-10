import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeAddresses(value: unknown) {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return Array.from(new Set(list.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean)));
}

function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] ?? char));
}

export async function POST(request: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    threadId?: string;
    includeSignature?: boolean;
  } | null;

  const to = normalizeAddresses(body?.to);
  const cc = normalizeAddresses(body?.cc);
  const bcc = normalizeAddresses(body?.bcc);
  const subject = String(body?.subject ?? '').trim();
  const rawText = String(body?.text ?? '').trim();

  if (!to.length || [...to, ...cc, ...bcc].some((address) => !isEmail(address))) {
    return NextResponse.json({ error: 'Enter valid recipient email addresses.' }, { status: 400 });
  }
  if (!subject || !rawText) return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  if (subject.length > 998 || rawText.length > 200000) return NextResponse.json({ error: 'Email is too large to send.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Resend is not configured for Setu Mail yet.' }, { status: 503 });

  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const userId = workspace.user.id;

  const [{ data: mailGrant }, { data: entitlement }, { data: mailbox }] = await Promise.all([
    supabase.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    supabase.from('mail_entitlements').select('status,monthly_message_limit,current_period_messages,current_period_start').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('mail_mailboxes').select('id,address,display_name,status').eq('organization_id', organizationId).eq('user_id', userId).eq('status', 'active').limit(1).maybeSingle(),
  ]);

  if (!mailGrant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  if (!entitlement || entitlement.status !== 'active') return NextResponse.json({ error: 'Setu Mail subscription is not active.' }, { status: 402 });
  if (Number(entitlement.current_period_messages ?? 0) >= Number(entitlement.monthly_message_limit ?? 0)) {
    return NextResponse.json({ error: 'This organization has reached its Setu Mail monthly message allowance.' }, { status: 429 });
  }
  if (!mailbox) return NextResponse.json({ error: 'No active Setu Mail mailbox is configured for this user.' }, { status: 409 });

  const { data: signature } = body?.includeSignature === false
    ? { data: null }
    : await supabase.from('mail_signatures').select('text_signature,html_signature').eq('mailbox_id', mailbox.id).eq('user_id', userId).eq('is_default', true).limit(1).maybeSingle();

  const text = signature?.text_signature ? `${rawText}\n\n${signature.text_signature}` : rawText;
  const escapedBody = `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.6;color:#0f172a">${htmlEscape(rawText)}</div>`;
  const html = signature?.html_signature
    ? `${escapedBody}<div style="margin-top:24px">${signature.html_signature}</div>`
    : signature?.text_signature
      ? `${escapedBody}<div style="margin-top:24px;white-space:pre-wrap">${htmlEscape(signature.text_signature)}</div>`
      : escapedBody;

  let threadId = String(body?.threadId ?? '').trim() || null;
  if (threadId) {
    const { data: existingThread } = await supabase.from('mail_threads').select('id').eq('id', threadId).eq('mailbox_id', mailbox.id).maybeSingle();
    if (!existingThread) threadId = null;
  }
  if (!threadId) {
    const { data: thread, error: threadError } = await supabase
      .from('mail_threads')
      .insert({ organization_id: organizationId, mailbox_id: mailbox.id, subject, last_message_at: new Date().toISOString() })
      .select('id')
      .single();
    if (threadError || !thread) return NextResponse.json({ error: 'Unable to create the mail conversation.' }, { status: 500 });
    threadId = thread.id;
  }

  const domain = mailbox.address.split('@')[1]?.toLowerCase();
  const { data: verifiedDomain } = domain
    ? await supabase.from('mail_domains').select('status,sending_status').eq('organization_id', organizationId).eq('domain', domain).maybeSingle()
    : { data: null };

  const configuredFrom = String(process.env.SETU_MAIL_FROM_EMAIL ?? process.env.SETU_NOTIFICATION_FROM_EMAIL ?? '').trim();
  const canSendAsMailbox = verifiedDomain && ['verified', 'active'].includes(String(verifiedDomain.status).toLowerCase()) && ['verified', 'active', 'ready'].includes(String(verifiedDomain.sending_status).toLowerCase());
  const senderName = mailbox.display_name || workspace.profile?.full_name || workspace.organization.name || 'Setu Mail';
  const senderAddress = canSendAsMailbox ? mailbox.address : configuredFrom;
  if (!senderAddress) return NextResponse.json({ error: 'Setu Mail sender domain is not configured.' }, { status: 503 });
  const from = senderAddress.includes('<') ? senderAddress : `${senderName} <${senderAddress}>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      ...(cc.length ? { cc } : {}),
      ...(bcc.length ? { bcc } : {}),
      subject,
      text,
      html,
      reply_to: mailbox.address,
      headers: { 'X-Setu-Organization': organizationId, 'X-Setu-Mailbox': mailbox.id, 'X-Setu-Thread': threadId },
    }),
  });

  const provider = await response.json().catch(() => ({})) as { id?: string; message?: string; error?: { message?: string } };
  const commonRecord = {
    organization_id: organizationId,
    mailbox_id: mailbox.id,
    thread_id: threadId,
    direction: 'outbound',
    from_address: mailbox.address,
    to_addresses: to,
    cc_addresses: cc,
    bcc_addresses: bcc,
    subject,
    text_body: text,
    html_body: html,
    is_read: true,
    folder: 'sent',
  };

  if (!response.ok) {
    await supabase.from('mail_messages').insert({ ...commonRecord, status: 'failed' });
    return NextResponse.json({ error: provider?.message || provider?.error?.message || 'Resend rejected the email.' }, { status: 502 });
  }

  const now = new Date().toISOString();
  const { data: message, error: insertError } = await supabase
    .from('mail_messages')
    .insert({ ...commonRecord, provider_message_id: provider.id ?? null, status: 'sent', sent_at: now })
    .select('id')
    .single();

  if (insertError) return NextResponse.json({ error: 'Email sent, but Setu Mail could not save the sent copy.' }, { status: 500 });

  await Promise.all([
    supabase.from('mail_threads').update({ last_message_at: now, updated_at: now }).eq('id', threadId),
    supabase.from('mail_entitlements').update({ current_period_messages: Number(entitlement.current_period_messages ?? 0) + 1, updated_at: now }).eq('organization_id', organizationId),
  ]);

  return NextResponse.json({ ok: true, id: message?.id ?? null, threadId, providerMessageId: provider.id ?? null });
}
