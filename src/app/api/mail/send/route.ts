import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] ?? char));
}

export async function POST(request: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const body = await request.json().catch(() => null) as { to?: string; subject?: string; text?: string } | null;
  const to = String(body?.to ?? '').trim().toLowerCase();
  const subject = String(body?.subject ?? '').trim();
  const text = String(body?.text ?? '').trim();

  if (!isEmail(to)) return NextResponse.json({ error: 'Enter a valid recipient email address.' }, { status: 400 });
  if (!subject || !text) return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  if (subject.length > 998 || text.length > 200000) return NextResponse.json({ error: 'Email is too large to send.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Resend is not configured for Setu Mail yet.' }, { status: 503 });

  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const userId = workspace.user.id;

  const { data: mailbox } = await supabase
    .from('mail_mailboxes')
    .select('id,address,display_name,status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!mailbox) return NextResponse.json({ error: 'No active Setu Mail mailbox is configured for this user.' }, { status: 409 });

  const configuredFrom = String(process.env.SETU_MAIL_FROM_EMAIL ?? process.env.SETU_NOTIFICATION_FROM_EMAIL ?? '').trim();
  if (!configuredFrom) return NextResponse.json({ error: 'Setu Mail sender domain is not configured.' }, { status: 503 });

  const senderName = mailbox.display_name || workspace.profile?.full_name || workspace.organization.name || 'Setu Mail';
  const from = configuredFrom.includes('<') ? configuredFrom : `${senderName} <${configuredFrom}>`;

  const { data: thread, error: threadError } = await supabase
    .from('mail_threads')
    .insert({ organization_id: organizationId, mailbox_id: mailbox.id, subject, last_message_at: new Date().toISOString() })
    .select('id')
    .single();

  if (threadError || !thread) return NextResponse.json({ error: 'Unable to create the mail conversation.' }, { status: 500 });

  const html = `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.6;color:#0f172a">${htmlEscape(text)}</div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
      reply_to: mailbox.address,
      headers: { 'X-Setu-Organization': organizationId, 'X-Setu-Mailbox': mailbox.id },
    }),
  });

  const provider = await response.json().catch(() => ({})) as { id?: string; message?: string; error?: { message?: string } };

  if (!response.ok) {
    await supabase.from('mail_messages').insert({
      organization_id: organizationId,
      mailbox_id: mailbox.id,
      thread_id: thread.id,
      direction: 'outbound',
      status: 'failed',
      from_address: mailbox.address,
      to_addresses: [to],
      subject,
      text_body: text,
      html_body: html,
      is_read: true,
    });
    return NextResponse.json({ error: provider?.message || provider?.error?.message || 'Resend rejected the email.' }, { status: 502 });
  }

  const now = new Date().toISOString();
  const { data: message, error: insertError } = await supabase
    .from('mail_messages')
    .insert({
      organization_id: organizationId,
      mailbox_id: mailbox.id,
      thread_id: thread.id,
      provider_message_id: provider.id ?? null,
      direction: 'outbound',
      status: 'sent',
      from_address: mailbox.address,
      to_addresses: [to],
      subject,
      text_body: text,
      html_body: html,
      is_read: true,
      sent_at: now,
    })
    .select('id')
    .single();

  if (insertError) return NextResponse.json({ error: 'Email sent, but Setu Mail could not save the sent copy.' }, { status: 500 });

  return NextResponse.json({ ok: true, id: message?.id ?? null, providerMessageId: provider.id ?? null });
}
