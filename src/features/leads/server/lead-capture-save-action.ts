"use server";

import type { ActionState } from './shared';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { getSetuNotificationFromAddress, sendTransactionalEmail } from '@/features/client-onboarding/server/notifications';
import { saveLead as saveLeadBase } from './actions/legacy-actions';

const unique = (items: FormDataEntryValue[]) => Array.from(new Set(items.map((item) => String(item ?? '').trim()).filter(Boolean)));
const clean = (value: unknown) => String(value ?? '').trim();
const firstText = (...values: unknown[]) => values.map(clean).find(Boolean) ?? '';

function htmlFromText(value: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;white-space:pre-line">${value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')}</div>`;
}

function capturedInterest(notes: string) {
  const line = notes
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .reverse()
    .find((item) => /^(interested in products|interested in category|can supply products|can supply category|new buyer request|new supplier category):/i.test(item));
  return line?.replace(/^(interested in products|interested in category|can supply products|can supply category|new buyer request|new supplier category):\s*/i, '').trim() || 'your request';
}

function formatFollowUp(value?: string | null) {
  const raw = clean(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

async function introAlreadyExists(db: any, leadId: string) {
  const { data, error } = await db.from('communications').select('id').eq('lead_id', leadId).eq('communication_type', 'lead_capture_intro').limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

async function insertIntroCommunication(db: any, row: Record<string, unknown>) {
  const { data, error } = await db
    .from('communications')
    .insert({ related_entity: 'lead', communication_type: 'lead_capture_intro', draft_source: 'system', provider_payload: {}, metadata: {}, ...row })
    .select('id')
    .single();
  if (error) throw error;
  return data as { id?: string | null } | null;
}

async function sendLeadCaptureIntro(params: { db: any; organization: any; actorUserId: string; lead: any; notes: string }) {
  const { db, organization, actorUserId, lead, notes } = params;
  if (!lead?.id || await introAlreadyExists(db, lead.id)) return;

  const [{ data: profile }, { data: card }, { data: event }, { data: trial }] = await Promise.all([
    db.from('profiles').select('full_name, email').eq('id', actorUserId).maybeSingle(),
    db.from('my_card_settings').select('primary_phone, secondary_phone, website, share_slug').eq('user_id', actorUserId).maybeSingle(),
    lead.trade_event_id ? db.from('trade_events').select('name, booth_number').eq('organization_id', organization.id).eq('id', lead.trade_event_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('trade_show_trial_workspaces').select('main_product_category').eq('organization_id', organization.id).maybeSingle(),
  ]);

  const nowIso = new Date().toISOString();
  const recipient = firstText(lead.contact_name, lead.company_name, 'there');
  const senderName = firstText(profile?.full_name, profile?.email, 'Your contact');
  const senderEmail = firstText(profile?.email, organization.contact_email);
  const senderPhone = firstText(card?.primary_phone, card?.secondary_phone);
  const orgName = firstText(organization.name, 'our team');
  const eventName = firstText(event?.name, lead.source_label, lead.source_type, 'our recent conversation');
  const booth = clean(event?.booth_number);
  const interest = capturedInterest(notes);
  const category = firstText(trial?.main_product_category, 'our products');
  const followUp = formatFollowUp(lead.next_follow_up_at);
  const siteUrl = (clean(process.env.NEXT_PUBLIC_SITE_URL) || 'https://www.setuflowcrm.com').replace(/\/$/, '');
  const shareSlug = clean(card?.share_slug);
  const cardUrl = shareSlug ? `${siteUrl}/card?share=${encodeURIComponent(shareSlug)}` : '';
  const from = getSetuNotificationFromAddress() ?? senderEmail;
  const baseMetadata = { source: 'lead_capture_intro_service', event_name: eventName, booth_number: booth, product_interest: interest };

  let emailStatus = 'not_available';
  let whatsappStatus = 'not_available';
  let customerRows = 0;

  if (clean(lead.email)) {
    const subject = `Great meeting you at ${eventName}`;
    const body = [
      `Hi ${recipient},`,
      '',
      `It was great meeting you at ${eventName}.`,
      '',
      `Thank you for stopping by${booth ? ` booth ${booth}` : ''} and speaking with ${senderName} from ${orgName}. We specialize in ${category}, and I wanted to reconnect while the conversation is fresh.`,
      '',
      `I noted your interest in ${interest}. I’ll be happy to share more details and answer any questions.`,
      '',
      followUp ? `I’ll follow up with you on ${followUp}. You can also reach me anytime using the contact details below.` : 'I’ll follow up with you soon. You can also reach me anytime using the contact details below.',
      '',
      'Best regards,',
      senderName,
      orgName,
      '',
      senderEmail ? `Email: ${senderEmail}` : '',
      senderPhone ? `Phone: ${senderPhone}` : '',
      senderPhone ? `WhatsApp: ${senderPhone}` : '',
      card?.website ? `Website: ${card.website}` : '',
      cardUrl ? `You can save my digital vCard here: ${cardUrl}` : '',
    ].filter((line, index, lines) => line || lines[index - 1] !== '').join('\n');
    const delivery = from ? await sendTransactionalEmail({ from, to: clean(lead.email), subject, text: body, html: htmlFromText(body) }) : { status: 'email_env_missing' as const, error: 'Missing sender email.' };
    const sent = delivery.status === 'email_sent';
    emailStatus = sent ? 'sent' : 'failed';
    const emailRow = await insertIntroCommunication(db, {
      organization_id: organization.id,
      lead_id: lead.id,
      related_id: lead.id,
      direction: 'outbound',
      channel: 'email',
      subject,
      body,
      summary: sent ? 'Intro email sent after lead capture.' : 'Intro email delivery failed after lead capture.',
      status: sent ? 'sent' : 'failed',
      sent_at: sent ? nowIso : null,
      created_by: actorUserId,
      email_provider: 'mailtrap',
      email_delivery_status: sent ? 'sent' : 'failed',
      email_delivered_at: sent ? nowIso : null,
      email_bounce_reason: sent ? null : delivery.error,
      metadata: { ...baseMetadata, target: clean(lead.email), delivery_error: delivery.error ?? null },
    });
    if (sent && emailRow?.id) customerRows += 1;
  }

  const whatsappTarget = clean(lead.whatsapp_number || lead.phone);
  if (whatsappTarget) {
    const body = `Hi ${recipient}, great meeting you at ${eventName}. This is ${senderName} from ${orgName}.${booth ? ` Thanks for stopping by booth ${booth}.` : ''} We specialize in ${category}, and I noted your interest in ${interest}.${followUp ? ` I’ll follow up with you on ${followUp}.` : ' I’ll follow up with you soon.'}${cardUrl ? ` You can save my vCard here: ${cardUrl}` : ''}`;
    const whatsappRow = await insertIntroCommunication(db, {
      organization_id: organization.id,
      lead_id: lead.id,
      related_id: lead.id,
      direction: 'outbound',
      channel: 'whatsapp',
      subject: 'Lead capture intro WhatsApp',
      body,
      summary: 'Intro WhatsApp drafted after lead capture.',
      status: 'draft',
      created_by: actorUserId,
      whatsapp_link_type: 'draft',
      metadata: { ...baseMetadata, target: whatsappTarget, live_delivery_enabled: false },
    });
    if (whatsappRow?.id) {
      whatsappStatus = 'draft';
      customerRows += 1;
    }
  }

  await insertIntroCommunication(db, {
    organization_id: organization.id,
    lead_id: lead.id,
    related_id: lead.id,
    direction: 'internal',
    channel: 'system',
    subject: 'Intro message created after lead capture',
    body: `Email: ${emailStatus}\nWhatsApp: ${whatsappStatus}\nProduct/request: ${interest}\nInternal note: saved separately for team visibility only. Not included in customer message.`,
    summary: customerRows > 0 ? 'Lead capture intro prepared.' : 'Lead capture intro did not create a sent email or draft WhatsApp channel.',
    status: 'sent',
    sent_at: nowIso,
    created_by: actorUserId,
    metadata: { ...baseMetadata, email_status: emailStatus, whatsapp_status: whatsappStatus, customer_communication_count: customerRows },
  });

  if (customerRows > 0) {
    const { error } = await db.from('leads').update({ intro_sent: true, last_contacted_at: nowIso }).eq('organization_id', organization.id).eq('id', lead.id);
    if (error) throw error;
  }
}

export async function saveLead(previousState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const result = await saveLeadBase(previousState, formData);
  if (!result?.success || !result.lead?.id || result.lead.intro_sent) return result;

  try {
    const workspace = await requireWorkspace();
    if (!workspace.user || !workspace.organization) return result;
    const db: any = await createClient();
    await sendLeadCaptureIntro({
      db,
      organization: workspace.organization,
      actorUserId: workspace.user.id,
      lead: result.lead,
      notes: String(formData.get('notes') ?? '').trim(),
    });
  } catch {
    return result;
  }

  return result;
}
