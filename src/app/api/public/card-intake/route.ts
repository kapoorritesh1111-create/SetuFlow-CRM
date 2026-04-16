import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { extractContactSource, extractPdfTextLayer } from '@/lib/contact-exchange/contact-extraction';

function trim(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
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
  const contactName = trim(formData.get('contactName')) || extracted?.draft.contactName || 'New card contact';
  const companyName = trim(formData.get('companyName')) || extracted?.draft.companyName || contactName;
  const jobTitle = trim(formData.get('jobTitle')) || extracted?.draft.jobTitle || null;
  const email = trim(formData.get('email')) || extracted?.draft.email || null;
  const phone = trim(formData.get('phone')) || extracted?.draft.phone || null;
  const country = trim(formData.get('country')) || null;
  const preferredTime = trim(formData.get('preferredTime')) || null;
  const sourceLabel = trim(formData.get('sourceLabel')) || 'Digital card share';
  const notes = [
    trim(formData.get('notes')),
    preferredTime ? `Preferred timing: ${preferredTime}` : '',
    `Requested action: ${desiredAction === 'book_appointment' ? 'Book appointment' : 'Request quote'}`,
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
      source_type: 'card_share',
      source_label: sourceLabel,
      intro_sent: false,
    })
    .select('id, company_name, contact_name')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || 'Unable to save the shared-card contact into CRM.' }, { status: 500 });
  }

  return NextResponse.json({ success: `${desiredAction === 'book_appointment' ? 'Appointment request' : 'Quote request'} captured and sent into the CRM.`, lead: data });
}
