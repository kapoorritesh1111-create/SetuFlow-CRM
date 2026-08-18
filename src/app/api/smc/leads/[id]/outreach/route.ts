import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { getMailtrapFromAddress, sendMailtrapEmail } from '@/lib/email/mailtrap';

export const dynamic = 'force-dynamic';

const MARKETING_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.setuflowcrm.com';
const CONTACT_KINDS = new Set(['call', 'email', 'whatsapp', 'demo_completed']);

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hasPriorContact(activityLog: unknown, lastContactAt: unknown) {
  if (lastContactAt) return true;
  return Array.isArray(activityLog) && activityLog.some((entry: any) => CONTACT_KINDS.has(String(entry?.kind ?? '').toLowerCase()));
}

async function assertSetuMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await (supabase as any)
    .from('organization_members')
    .select('id')
    .eq('organization_id', INTERNAL_ORG_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  return membership ? { supabase, user } : null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertSetuMember();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  let message = typeof body.message === 'string' ? body.message.trim() : '';
  const senderName = typeof body.sender_name === 'string' && body.sender_name.trim()
    ? body.sender_name.trim()
    : 'SETU Flow Growth';
  const requestedMode = body.message_mode === 'first_inquiry' || body.message_mode === 'follow_up'
    ? body.message_mode
    : 'auto';

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }

  const db = auth.supabase as any;
  const { data: lead, error: leadError } = await db
    .from('client_onboarding_requests')
    .select('id, company_name, primary_admin_name, primary_admin_email, activity_log, last_contact_at')
    .eq('id', params.id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: leadError?.message ?? 'Lead not found.' }, { status: 404 });
  }

  const mode = requestedMode === 'auto'
    ? (hasPriorContact(lead.activity_log, lead.last_contact_at) ? 'follow_up' : 'first_inquiry')
    : requestedMode;

  // First-contact outreach always includes the public marketing site, even after manual edits.
  if (mode === 'first_inquiry' && !message.includes(MARKETING_SITE)) {
    message = `${message}\n\nLearn more: ${MARKETING_SITE}`;
  }

  const recipient = String(lead.primary_admin_email ?? '').trim();
  if (!recipient) {
    return NextResponse.json({ error: 'This lead does not have an email address yet.' }, { status: 400 });
  }

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#0f172a;white-space:normal">${escapeHtml(message).replaceAll('\n', '<br>')}</div>`;
  const result = await sendMailtrapEmail({
    from: getMailtrapFromAddress(),
    fromName: 'SETU Flow',
    to: recipient,
    subject,
    text: message,
    html,
    category: mode === 'first_inquiry' ? 'smc_growth_first_inquiry' : 'smc_growth_follow_up',
    customVariables: {
      lead_id: String(lead.id),
      company_name: String(lead.company_name ?? ''),
      sender_name: senderName,
      message_mode: mode,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'Email delivery failed. Please try again.', provider: result.provider }, { status: 502 });
  }

  const sentAt = new Date().toISOString();
  const currentLog = Array.isArray(lead.activity_log) ? lead.activity_log : [];
  const activity = {
    id: crypto.randomUUID(),
    kind: 'email',
    note: `${mode === 'first_inquiry' ? 'First inquiry' : 'Follow-up'} email sent — ${subject}`,
    actor_name: senderName,
    actor_user_id: auth.user.id,
    provider: 'mailtrap',
    provider_message_id: result.messageId ?? null,
    recipient,
    subject,
    message_mode: mode,
    created_at: sentAt,
  };

  const updatePayload: Record<string, unknown> = {
    activity_log: [...currentLog, activity],
    last_contact_at: sentAt,
    updated_at: sentAt,
  };

  let update = await db
    .from('client_onboarding_requests')
    .update({ ...updatePayload, outreach_status: 'contacted' })
    .eq('id', params.id)
    .select()
    .single();

  if (update.error && String(update.error.message ?? '').includes('outreach_status')) {
    update = await db
      .from('client_onboarding_requests')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single();
  }

  if (update.error) {
    return NextResponse.json({
      error: `Email sent but SMC activity could not be updated: ${update.error.message}`,
      sent: true,
      provider: 'mailtrap',
      message_id: result.messageId ?? null,
      message_mode: mode,
    }, { status: 207 });
  }

  return NextResponse.json({
    sent: true,
    provider: 'mailtrap',
    message_id: result.messageId ?? null,
    message_mode: mode,
    lead: update.data,
  });
}
