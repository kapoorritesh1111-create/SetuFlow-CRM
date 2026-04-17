import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { extractContactSource, extractPdfTextLayer } from '@/lib/contact-exchange/contact-extraction';

function trim(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
}

function buildPublicCardSourceLabel(args: { desiredAction: string; repName: string; fallbackLabel: string }) {
  const actionLabel = args.desiredAction === 'book_appointment' ? 'Book Appointment' : 'Request Quote';
  const repLabel = args.repName.trim() || args.fallbackLabel.trim() || 'Shared card';
  return `Public Card · ${actionLabel} · ${repLabel}`;
}

export async function POST(request: NextRequest) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: 'Service role is not configured for public card intake.' }, { status: 500 });
  }

  const formData = await request.formData();
  const organizationId = trim(formData.get('organizationId'));
  if (!organizationId) {
    return NextResponse.json({ error: 'This shared card is missing an organization destination.' }, { status: 400 });
  }

  const source = formData.get('source');
  let extractedNotes = '';
  let extracted = null;
  if (source instanceof File && source.size > 0) {
    let fileText = '';
    let pdfText = '';
    if (source.type.startsWith('text/') || source.type === 'application/json') {
      fileText = await source.text();
    } else if (source.type === 'application/pdf') {
      pdfText = extractPdfTextLayer(Buffer.from(await source.arrayBuffer()));
    }
    extracted = await extractContactSource({
      assistText: '',
      sourceMode: 'upload',
      filename: source.name,
      fileType: source.type,
      fileText,
      pdfText,
      source,
    });
    extractedNotes = extracted.draft.notes;
  }

  const desiredAction = trim(formData.get('desiredAction')) || 'request_quote';
  const leadType = trim(formData.get('leadType')) === 'supplier' ? 'supplier' : 'buyer';
  const repName = trim(formData.get('repName'));
  const contactName = trim(formData.get('contactName')) || extracted?.draft.contactName || 'New card contact';
  const companyName = trim(formData.get('companyName')) || extracted?.draft.companyName || contactName;
  const jobTitle = trim(formData.get('jobTitle')) || extracted?.draft.jobTitle || null;
  const email = trim(formData.get('email')) || extracted?.draft.email || null;
  const phone = trim(formData.get('phone')) || extracted?.draft.phone || null;
  const country = trim(formData.get('country')) || null;
  const preferredTime = trim(formData.get('preferredTime')) || null;
  const fallbackSourceLabel = trim(formData.get('sourceLabel')) || 'Digital card share';
  const sourceLabel = buildPublicCardSourceLabel({ desiredAction, repName, fallbackLabel: fallbackSourceLabel });
  const requestedActionLabel = desiredAction === 'book_appointment' ? 'Book appointment' : 'Request quote';
  const notes = [
    trim(formData.get('notes')),
    preferredTime ? `Preferred timing: ${preferredTime}` : '',
    `Requested action: ${requestedActionLabel}`,
    `Submitted via public card shared by ${repName || 'workspace user'}.`,
    extractedNotes,
  ].filter(Boolean).join('\n\n');

  const { data, error } = await admin
    .from('leads')
    .insert({
      organization_id: organizationId,
      lead_type: leadType,
      company_name: companyName,
      contact_name: contactName,
      job_title: jobTitle,
      email,
      phone,
      country,
      notes,
      source_type: 'public_card',
      source_label: sourceLabel,
      intro_sent: false,
    })
    .select('id, company_name, contact_name, source_label')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || 'Unable to save the shared-card contact into CRM.' }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const leadId = data.id;
  const activityMessage = desiredAction === 'book_appointment'
    ? `${companyName} requested an appointment from the public card.`
    : `${companyName} requested a quote from the public card.`;
  const communicationSubject = desiredAction === 'book_appointment'
    ? 'Public card appointment request'
    : 'Public card quote request';
  const communicationSummary = desiredAction === 'book_appointment'
    ? 'Appointment request captured from public card'
    : 'Quote request captured from public card';

  await Promise.allSettled([
    admin.from('lead_activities').insert({
      organization_id: organizationId,
      lead_id: leadId,
      actor_user_id: null,
      kind: desiredAction === 'book_appointment' ? 'public_card_appointment_requested' : 'public_card_quote_requested',
      message: activityMessage,
      occurred_at: nowIso,
    }),
    admin.from('communications').insert({
      organization_id: organizationId,
      lead_id: leadId,
      related_entity: 'lead',
      related_id: leadId,
      communication_type: 'system_note',
      direction: 'inbound',
      channel: desiredAction === 'book_appointment' ? 'meeting' : 'system',
      subject: communicationSubject,
      body: notes,
      summary: communicationSummary,
      draft_source: 'system',
      status: 'received',
      sent_at: nowIso,
      scheduled_at: null,
      approved_at: null,
      approved_by: null,
      created_by: null,
      provider_payload: {},
      metadata: {
        source: 'public_card',
        rep_name: repName || null,
        desired_action: desiredAction,
        preferred_time: preferredTime,
        source_label: sourceLabel,
      },
    }),
  ]);

  return NextResponse.json({
    success: `${requestedActionLabel} captured and sent into the CRM. Internal teams will see it as ${sourceLabel}.`,
    lead: data,
  });
}
