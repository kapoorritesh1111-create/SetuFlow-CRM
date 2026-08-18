import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { getMailtrapFromAddress, sendMailtrapEmail } from '@/lib/email/mailtrap';

export const dynamic = 'force-dynamic';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const senderName = typeof body.sender_name === 'string' && body.sender_name.trim()
    ? body.sender_name.trim()
    : 'SETU Flow Growth';

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }

  const db = auth.supabase as any;
  const { data: lead, error: leadError } = await db
    .from('client_onboarding_requests')
    .select('id, company_name, primary_admin_name, primary_admin_email, activity_log')
    .eq('id', params.id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: leadError?.message ?? 'Lead not found.' }, { status: 404 });
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
    category: 'smc_growth_outreach',
    customVariables: {
      lead_id: String(lead.id),
      company_name: String(lead.company_name ?? ''),
      sender_name: senderName,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, provider: result.provider }, { status: 502 });
  }

  const sentAt = new Date().toISOString();
  const currentLog = Array.isArray(lead.activity_log) ? lead.activity_log : [];
  const activity = {
    id: crypto.randomUUID(),
    kind: 'email',
    note: `Outbound email sent via Mailtrap — ${subject}`,
    actor_name: senderName,
    actor_user_id: auth.user.id,
    provider: 'mailtrap',
    provider_message_id: result.messageId ?? null,
    recipient,
    subject,
    created_at: sentAt,
  };

  const updatePayload: Record<string, unknown> = {
    activity_log: [...currentLog, activity],
    last_contact_at: sentAt,
    updated_at: sentAt,
  };

  // The Growth migration adds outreach_status. Keep the send path compatible with
  // pre-migration previews by retrying without the new field if schema cache is stale.
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
    }, { status: 207 });
  }

  return NextResponse.json({
    sent: true,
    provider: 'mailtrap',
    message_id: result.messageId ?? null,
    lead: update.data,
  });
}
