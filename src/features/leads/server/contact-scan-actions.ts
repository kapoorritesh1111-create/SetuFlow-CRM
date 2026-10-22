'use server';

import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';
import { buildContactPostApplyAssist, type ContactAssistLeadCandidate, type ContactPostApplyAssistDraft, type ContactPostApplyAssistResult } from '@/lib/contact-exchange/contact-post-apply-assist';
import { extractContactSource, extractPdfTextLayer, type ContactServerExtractionResult } from '@/lib/contact-exchange/contact-extraction';
import { saveLead } from '@/features/leads/server/actions';
import { findExistingTradeEventScanLead, linkCreatedLeadToTradeEventScan, type TradeEventScanDraft } from '@/features/trade-events/server/event-scan-link';
import type { ContactSourceProfile } from '@/lib/contact-exchange/contact-parser';

export type ContactScanActionState = { error?: string; extraction?: ContactServerExtractionResult };
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const normalizeSearchValue = (value: string) => value.replace(/[%_]/g, '').trim();

async function fetchLeadCandidates(organizationId: string, draft: ContactPostApplyAssistDraft) {
  if (!hasSupabaseEnv) return [] as ContactAssistLeadCandidate[];
  const db: any = await createClient();
  const selectColumns = 'id, company_name, contact_name, email, phone, phone_secondary, website, next_follow_up_at';
  const candidates = new Map<string, ContactAssistLeadCandidate>();
  const collect = async (runner: (() => Promise<{ data: ContactAssistLeadCandidate[] | null; error?: { message?: string } }>) | null) => {
    if (!runner) return;
    try { const result = await runner(); for (const row of result.data ?? []) if (row?.id) candidates.set(row.id, row); } catch { /* heuristic fallback */ }
  };

  const email = normalizeSearchValue(draft.email);
  const companyName = normalizeSearchValue(draft.companyName);
  const contactName = normalizeSearchValue(draft.contactName);
  const website = normalizeSearchValue(draft.website);
  const phoneDigits = String(draft.phone ?? '').replace(/\D/g, '');
  const phoneSecondaryDigits = String(draft.phoneSecondary ?? '').replace(/\D/g, '');
  const phoneTail = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '';
  const phoneSecondaryTail = phoneSecondaryDigits.length >= 4 ? phoneSecondaryDigits.slice(-4) : '';

  await collect(email ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('email', email).limit(6) : null);
  await collect(companyName ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('company_name', `%${companyName}%`).limit(8) : null);
  await collect(contactName ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('contact_name', `%${contactName}%`).limit(8) : null);
  await collect(website ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('website', `%${website}%`).limit(6) : null);
  await collect(phoneTail ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('phone', `%${phoneTail}%`).limit(6) : null);
  await collect(phoneTail ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('phone_secondary', `%${phoneTail}%`).limit(6) : null);
  await collect(phoneSecondaryTail ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('phone', `%${phoneSecondaryTail}%`).limit(6) : null);
  await collect(phoneSecondaryTail ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('phone_secondary', `%${phoneSecondaryTail}%`).limit(6) : null);
  return Array.from(candidates.values());
}

export async function extractContactScan(_: ContactScanActionState | undefined, formData: FormData): Promise<ContactScanActionState> {
  const assistText = String(formData.get('assist_text') ?? '').trim();
  const sourceModeValue = String(formData.get('source_mode') ?? 'upload').trim();
  const sourceMode = sourceModeValue === 'camera' ? 'camera' : sourceModeValue === 'manual' ? 'manual' : 'upload';
  const source = formData.get('source');
  if (!(source instanceof File) && !assistText) return { error: 'Attach a source or provide assist text before running extraction.' };
  if (source instanceof File && source.size > MAX_SOURCE_BYTES) return { error: 'Source file is too large for quick-entry extraction. Keep files under 10 MB in this batch.' };

  let fileText = ''; let pdfText = ''; let filename = ''; let fileType = '';
  if (source instanceof File) {
    filename = source.name; fileType = source.type;
    if (fileType.startsWith('text/') || fileType === 'application/json') fileText = await source.text();
    else if (fileType === 'application/pdf') pdfText = extractPdfTextLayer(Buffer.from(await source.arrayBuffer()));
  }
  return { extraction: await extractContactSource({ assistText, sourceMode, filename, fileType, fileText, pdfText, source: source instanceof File ? source : null }) };
}

export async function suggestContactScanPostApplyAssist(formData: FormData): Promise<ContactPostApplyAssistResult> {
  const draft: ContactPostApplyAssistDraft = {
    currentLeadId: String(formData.get('current_lead_id') ?? '').trim() || null,
    companyName: String(formData.get('company_name') ?? '').trim(), contactName: String(formData.get('contact_name') ?? '').trim(),
    jobTitle: String(formData.get('job_title') ?? '').trim(), email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(), phoneSecondary: String(formData.get('phone_secondary') ?? '').trim(),
    website: String(formData.get('website') ?? '').trim(), notes: String(formData.get('notes') ?? '').trim(),
    sourceType: String(formData.get('source_type') ?? '').trim(), sourceLabel: String(formData.get('source_label') ?? '').trim(),
    sourceProfile: (String(formData.get('source_profile') ?? '').trim() || 'generic') as ContactSourceProfile,
  };
  const enoughSignal = Boolean(draft.email || draft.phone || draft.phoneSecondary || draft.companyName || draft.contactName || draft.website);
  if (!enoughSignal || !hasSupabaseEnv) return buildContactPostApplyAssist({ draft, lookupMode: 'heuristic' });
  try {
    const workspace = await requireWorkspace();
    const organizationId = workspace.organization?.id;
    if (!organizationId) return buildContactPostApplyAssist({ draft, lookupMode: 'heuristic' });
    const candidates = await fetchLeadCandidates(organizationId, draft);
    return buildContactPostApplyAssist({ draft, candidates, lookupMode: candidates.length ? 'live' : 'heuristic' });
  } catch { return buildContactPostApplyAssist({ draft, lookupMode: 'heuristic' }); }
}

export type ContactScanCreateLeadResult = { error?: string; success?: string; lead?: { id: string; company_name: string; source_label: string | null } };
const buildDefaultFollowUpAt = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const mergeLeadNotes = (...values: Array<string | null | undefined>) => values.map((value) => String(value ?? '').trim()).filter(Boolean).join('\n\n');

function parseReviewedLeadType(formData: FormData): 'buyer' | 'supplier' | null {
  const rawLeadType = String(formData.get('lead_type') ?? '').trim().toLowerCase();
  const rawMode = String(formData.get('mode') ?? formData.get('workspace_mode') ?? formData.get('lead_mode') ?? '').trim().toLowerCase();
  if (rawLeadType === 'supplier' || rawLeadType === 'buyer') return rawLeadType;
  if (rawMode === 'supplier' || rawMode === 'suppliers') return 'supplier';
  if (rawMode === 'buyer' || rawMode === 'buyers') return 'buyer';
  return null;
}


// Trade-show follow-up is best-effort AFTER the canonical CRM save. A failed
// provider call cannot roll back the customer's lead or cause a duplicate scan.
async function sendTradeShowScanThankYou(input: { leadId: string; eventId: string; contactName: string; phone: string; email: string; requirements: string }) {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return;
  const db: any = await createClient();
  const { data: event } = await db.from('trade_events').select('id,name,booth_number').eq('id',input.eventId).eq('organization_id',workspace.organization.id).maybeSingle();
  if (!event?.id) return;
  const { data: sent } = await db.from('communications').select('id').eq('organization_id',workspace.organization.id).eq('lead_id',input.leadId).eq('communication_type','trade_show_scan_thank_you').limit(1);
  if (sent?.length) return;
  const { data: brochures } = await db.from('catalog_brochures').select('id,name').eq('organization_id',workspace.organization.id).eq('is_active',true);
  const active = (brochures ?? []) as Array<{id:string;name:string}>;
  const lower = input.requirements.toLowerCase();
  const family = /flat.?bottom/.test(lower) ? 'flat bottom' : /center.?seal|centre.?seal|3.?side|three.?side|css|3ss/.test(lower) ? 'center seal' : 'stand';
  const selected = active.find((b) => b.name.toLowerCase().includes(family))
    ?? active.find((b) => /stand.?up/i.test(b.name));
  if (!selected) { console.error('[trade-show-thank-you] no active brochure'); return; }
  const { createCatalogBrochureShare } = await import('@/features/catalog-brochures/server');
  const share = await createCatalogBrochureShare({ brochureId:selected.id,leadId:input.leadId,channel:'trade_show_follow_up' });
  const { data: card } = await db.from('my_card_settings').select('share_slug').eq('organization_id',workspace.organization.id).eq('user_id',workspace.user.id).maybeSingle();
  const vcardUrl = card?.share_slug ? `https://www.setuflowcrm.com/card?share=${encodeURIComponent(card.share_slug)}` : '';
  const greeting = input.contactName.trim() || 'Customer';
  const body = `Hi ${greeting}, thank you for visiting the Stark Packmate stall at ${event.name}. Here is our ${share.brochureName}: ${share.url}.${vcardUrl ? ` Save my digital contact card: ${vcardUrl}` : ''}`;
  const templateName = process.env.INTERAKT_STARK_PACKMATE_TRADE_SHOW_TEMPLATE?.trim();
  const digits = input.phone.replace(/\D/g,'');
  const countryCode = digits.length === 12 && digits.startsWith('91') ? '91' : '';
  const localNumber = countryCode ? digits.slice(2) : digits.length === 10 ? digits : '';
  let channel = 'none';
  let providerId = '';
  let failure = '';
  let emailStatus = 'not_attempted';
  let emailFailure = '';
  if (templateName && localNumber) {
    try {
      const { sendInteraktTemplate } = await import('@/features/integrations/interakt/client');
      // Approved template placeholders: {{1}} customer, {{2}} event, {{3}} stall, {{4}} capturing team member.
      const delivered = await sendInteraktTemplate({countryCode:'91',phoneNumber:localNumber,templateName,languageCode:process.env.INTERAKT_STARK_PACKMATE_TRADE_SHOW_TEMPLATE_LANGUAGE || 'en',bodyValues:[greeting,String(event.name),String(event.booth_number || 'our stall'),String(workspace.profile?.full_name || 'Stark Packmate team')],callbackData:JSON.stringify({source:'trade_show_scan_thank_you',lead_id:input.leadId,event_id:input.eventId})});
      providerId = delivered.id;
      channel = 'whatsapp';
    } catch (e) { failure = e instanceof Error ? e.message : 'WhatsApp provider failed'; }
  }
  // Email is attempted independently, even when WhatsApp succeeds.
  if (input.email && /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(input.email)) {
    try {
      const { getSetuNotificationFromAddress,sendTransactionalEmail } = await import('@/features/client-onboarding/server/notifications');
      const from = getSetuNotificationFromAddress();
      if (!from) throw new Error('Missing configured transactional email sender');
      const outcome = await sendTransactionalEmail({from,to:input.email,subject:`Thank you for visiting Stark Packmate at ${event.name}`,text:body,html:`<p>${body.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</p>`});
      if (outcome.status === 'email_sent') {
        emailStatus = 'sent';
        if (channel === 'none') channel = 'email';
      } else {
        emailStatus = 'failed';
        emailFailure = outcome.error || 'Email failed';
        if (channel === 'none') failure = emailFailure;
      }
    } catch(e) {
      emailStatus = 'failed';
      emailFailure = e instanceof Error ? e.message : 'Email provider failed';
      if (channel === 'none') failure = emailFailure;
    }
  } else {
    emailStatus = 'skipped';
    emailFailure = 'No valid customer email supplied';
  }

  const { error: auditError } = await db.from('communications').insert({
    organization_id:workspace.organization.id,lead_id:input.leadId,related_entity:'lead',related_id:input.leadId,
    communication_type:'trade_show_scan_thank_you',direction:'outbound',channel:channel === 'none' ? 'system' : channel,
    subject:`Trade show thank-you: ${event.name}`,body,summary:channel === 'none' ? 'Thank-you pending: provider/template unavailable' : 'Trade show thank-you sent',
    status:channel === 'none' ? 'failed' : 'sent',sent_at:channel === 'none' ? null : new Date().toISOString(),
    created_by:workspace.user.id,metadata:{event_id:input.eventId,booth_number:event.booth_number || null,brochure_id:selected.id,share_id:share.id,vcard_url:vcardUrl,interakt_template:templateName||null,provider_id:providerId,email_status:emailStatus,email_failure:emailFailure||null,failure},
  });
  if (auditError) console.error('[trade-show-thank-you] audit failed',auditError);
}

export async function createLeadFromContactScanReview(formData: FormData): Promise<ContactScanCreateLeadResult> {
  const companyName = String(formData.get('company_name') ?? '').trim() || String(formData.get('contact_name') ?? '').trim() || 'Scanned contact';
  const contactName = String(formData.get('contact_name') ?? '').trim();
  const jobTitle = String(formData.get('job_title') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const phoneSecondary = String(formData.get('phone_secondary') ?? '').trim();
  const website = String(formData.get('website') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  const leadType = parseReviewedLeadType(formData);
  if (!leadType) return { error: 'Choose Buyer or Supplier before creating a reviewed contact scan lead.' };
  const sourceProfile = String(formData.get('source_profile') ?? '').trim() || 'generic';
  const extractionBoundary = String(formData.get('extraction_boundary') ?? '').trim() || 'server_manual_text';
  const rawSourceLabel = String(formData.get('source_label') ?? '').trim() || 'Contact scan review';
  const sourceLabel = rawSourceLabel.startsWith('Contact Scan') ? rawSourceLabel : `Contact Scan Review · ${rawSourceLabel}`;
  const tradeEventId = String(formData.get('trade_event_id') ?? '').trim();

  const eventDraft: TradeEventScanDraft | null = tradeEventId ? {
    tradeEventId, leadType, companyName, contactName, jobTitle, email, phone, notes,
    sourceLabel, sourceProfile, extractionBoundary,
  } : null;

  if (eventDraft) {
    try {
      const existing = await findExistingTradeEventScanLead(eventDraft);
      if (existing) {
        return {
          success: existing.repeatEntryId ? 'This person was already captured at this event. The scan was saved as another event interaction.' : 'Existing CRM contact found. This event scan was linked without creating a duplicate lead.',
          lead: { id: existing.leadId, company_name: existing.companyName, source_label: existing.sourceLabel },
        };
      }
    } catch (error) {
      console.error('[trade-event-scan] existing identity link failed', error);
    }
  }

  const leadFormData = new FormData();
  leadFormData.set('lead_type', leadType);
  leadFormData.set('workspace_mode', leadType === 'supplier' ? 'suppliers' : 'buyers');
  leadFormData.set('company_name', companyName); leadFormData.set('contact_name', contactName); leadFormData.set('job_title', jobTitle);
  leadFormData.set('email', email); leadFormData.set('phone', phone); leadFormData.set('phone_secondary', phoneSecondary); leadFormData.set('website', website);
  leadFormData.set('source_type', 'contact_scan_review'); leadFormData.set('source_label', sourceLabel);
  leadFormData.set('notes', mergeLeadNotes(notes, 'Captured from contact scan review.', `Source profile: ${sourceProfile.replace(/_/g, ' ')}`, `Extraction boundary: ${extractionBoundary.replace(/_/g, ' ')}`));
  leadFormData.set('next_follow_up_at', buildDefaultFollowUpAt()); leadFormData.set('intro_sent', 'false');
  if (tradeEventId) leadFormData.set('trade_event_id', tradeEventId);

  const result = await saveLead(undefined, leadFormData);
  if (result.error) return { error: result.error };
  if (!result.lead?.id) return { error: 'Lead save completed without a CRM record.' };

  let interactionSaved = true;
  if (eventDraft) {
    try { await linkCreatedLeadToTradeEventScan(eventDraft, result.lead.id); }
    catch (error) { interactionSaved = false; console.error('[trade-event-scan] event interaction save failed', error); }
  }

  if (eventDraft && interactionSaved) {
    try {
      await sendTradeShowScanThankYou({leadId:result.lead.id,eventId:tradeEventId,contactName,phone,email,requirements:notes});
    } catch (error) {
      console.error('[trade-show-thank-you] post-save follow-up failed',error);
    }
  }

  return {
    success: interactionSaved ? 'Reviewed scan confirmed and created as a lead with its event interaction.' : 'Reviewed scan created as a lead. The event interaction needs review.',
    lead: { id: result.lead.id, company_name: result.lead.company_name, source_label: result.lead.source_label ?? sourceLabel },
  };
}
