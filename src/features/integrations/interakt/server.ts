'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { fetchInteraktContacts, sendInteraktTemplate } from '@/features/integrations/interakt/client';
import { assessInteraktContact } from '@/features/integrations/interakt/qualification';
import type { InteraktInquiryEvidence, NormalizedInteraktContact } from '@/features/integrations/interakt/types';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const INBOUND_PATH = '/leads/inbound';
const SOURCE_PROVIDER = 'interakt';
const SOURCE_ACCOUNT = 'stark-packmate';
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales']);
const TERMINAL_INBOUND_STATUSES = new Set(['qualified', 'duplicate', 'existing_customer', 'not_relevant', 'ignored']);
const ALLOWED_INTAKE_STATUSES = new Set([
  'new', 'staged', 'reviewed', 'needs_info', 'ready_to_qualify', 'nurture', 'not_relevant',
  'qualified', 'duplicate', 'existing_customer', 'ignored',
]);

type ExistingIntakeRow = {
  external_contact_id: string;
  intake_status: string | null;
  source_created_at: string | null;
  source_modified_at: string | null;
};

function clean(value: unknown) { return String(value ?? '').trim(); }
function nullable(value: unknown) { const text = clean(value); return text || null; }
function nowIso() { return new Date().toISOString(); }

async function requireStarkPackmateAccess(write = false) {
  const workspace = await requireWorkspace();
  const org = workspace.organization;
  const isStark = org?.id === STARK_PACKMATE_ORG_ID || String(org?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !workspace.user || !workspace.membership || !workspace.organization) throw new Error('This Interakt connector is restricted to Stark Packmate.');
  if (write && !workspace.currentRoles.some((role) => WRITE_ROLES.has(String(role)))) throw new Error('Sales, Manager, Admin or Owner permission is required.');
  return workspace;
}

function newestSourceWatermark(rows: ExistingIntakeRow[]) {
  let newest: string | null = null;
  let newestMs = 0;
  for (const row of rows) {
    for (const candidate of [row.source_modified_at, row.source_created_at]) {
      if (!candidate) continue;
      const ms = new Date(candidate).getTime();
      if (!Number.isNaN(ms) && ms > newestMs) { newestMs = ms; newest = new Date(ms).toISOString(); }
    }
  }
  return newest;
}

async function readExistingIntakeSnapshot(admin: any, organizationId: string) {
  const { data, error } = await admin.from('lead_intake_staging')
    .select('external_contact_id, intake_status, source_created_at, source_modified_at')
    .eq('organization_id', organizationId).eq('source_provider', SOURCE_PROVIDER).limit(5000);
  if (error) {
    if (String(error.code ?? '') === '42P01') return { rows: [] as ExistingIntakeRow[], tableReady: false };
    throw new Error(`Unable to read Interakt staging state: ${String(error.message ?? 'unknown database error')}`);
  }
  return { rows: (data ?? []) as ExistingIntakeRow[], tableReady: true };
}

export async function previewStarkInteraktContacts(input?: { createdAfter?: string | null; limit?: number }) {
  await requireStarkPackmateAccess(false);
  return fetchInteraktContacts({ offset: 0, limit: Math.min(Math.max(input?.limit ?? 25, 1), 100), createdAfter: input?.createdAfter ?? null });
}

export async function refreshStarkInteraktStaging(): Promise<void> {
  const workspace = await requireStarkPackmateAccess(true);
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error('Supabase service role is required for the isolated staging write.');
  const organizationId = workspace.organization!.id;
  const snapshot = await readExistingIntakeSnapshot(admin as any, organizationId);
  if (!snapshot.tableReady) throw new Error('The lead_intake_staging migration has not been applied.');

  const existingStatus = new Map(snapshot.rows.map((row) => [row.external_contact_id, row.intake_status || 'new']));
  const watermark = newestSourceWatermark(snapshot.rows);
  const contacts = [] as Awaited<ReturnType<typeof fetchInteraktContacts>>['contacts'];
  let offset = 0;
  for (let page = 0; page < 10; page += 1) {
    const result = await fetchInteraktContacts({ offset, limit: 100, modifiedAfter: watermark });
    contacts.push(...result.contacts);
    if (!result.hasNextPage || result.contacts.length === 0) break;
    offset += result.contacts.length;
  }
  if (!contacts.length) { revalidatePath(INBOUND_PATH); return; }

  const batchId = randomUUID();
  const now = nowIso();
  const rows = contacts.map((contact) => ({
    organization_id: organizationId,
    source_provider: SOURCE_PROVIDER,
    source_account: SOURCE_ACCOUNT,
    external_contact_id: contact.externalContactId,
    external_user_id: contact.externalUserId,
    phone_number: contact.phoneNumber,
    country_code: contact.countryCode,
    full_phone_number: contact.fullPhoneNumber,
    contact_name: contact.contactName,
    email: contact.email,
    whatsapp_opted_in: contact.whatsappOptedIn,
    source_created_at: contact.sourceCreatedAt,
    source_modified_at: contact.sourceModifiedAt,
    source_created_via: contact.sourceCreatedVia,
    traits: contact.traits,
    raw_payload: contact.rawPayload,
    intake_status: existingStatus.get(contact.externalContactId) ?? 'new',
    sync_batch_id: batchId,
    fetched_at: now,
    updated_at: now,
  }));

  const { error } = await (admin as any).from('lead_intake_staging').upsert(rows, { onConflict: 'organization_id,source_provider,external_contact_id' });
  if (error) throw new Error(`Interakt staging write failed: ${String(error.message ?? 'unknown database error')}`);
  revalidatePath(INBOUND_PATH);
}

export async function stageStarkInteraktContacts(): Promise<void> { await refreshStarkInteraktStaging(); }

export async function updateStarkInteraktIntakeStatus(formData: FormData): Promise<void> {
  const workspace = await requireStarkPackmateAccess(true);
  const admin = createAdminSupabaseClient() as any;
  if (!admin) throw new Error('Supabase service role is required for the staging update.');
  const rowId = clean(formData.get('rowId'));
  const status = clean(formData.get('status'));
  if (!rowId || !ALLOWED_INTAKE_STATUSES.has(status)) throw new Error('Unsupported inbound status.');
  const { error } = await admin.from('lead_intake_staging').update({ intake_status: status, updated_at: nowIso() })
    .eq('id', rowId).eq('organization_id', workspace.organization!.id).eq('source_provider', SOURCE_PROVIDER);
  if (error) throw new Error(`Unable to update inbound status: ${String(error.message ?? 'unknown database error')}`);
  revalidatePath(INBOUND_PATH);
}

function contactFromRow(row: any): NormalizedInteraktContact {
  const raw = row.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload : {};
  const traits = row.traits && typeof row.traits === 'object' ? row.traits : {};
  return {
    externalContactId: String(row.external_contact_id), externalUserId: row.external_user_id ?? null,
    phoneNumber: row.phone_number ?? null, countryCode: row.country_code ?? null,
    fullPhoneNumber: row.full_phone_number ?? null, contactName: row.contact_name ?? null,
    email: row.email ?? null, whatsappOptedIn: row.whatsapp_opted_in ?? null,
    sourceCreatedAt: row.source_created_at ?? null, sourceModifiedAt: row.source_modified_at ?? null,
    sourceCreatedVia: row.source_created_via ?? null, tags: [], traits, rawPayload: raw,
  };
}

function evidenceFromRow(row: any): InteraktInquiryEvidence {
  return {
    personName: row.person_name, companyName: row.company_name, packagingType: row.packaging_type,
    pouchType: row.pouch_type, quantityText: row.quantity_text, dimensionsPrint: row.dimensions_print,
    deliveryLocation: row.delivery_location, buyingTimeline: row.buying_timeline, industry: row.industry,
    firstInquiryAt: row.first_inquiry_at, lastInboundAt: row.last_inbound_at, channelSource: row.channel_source,
    acquisitionType: row.acquisition_type, adNetwork: row.ad_network, adPlatform: row.ad_platform, adUrl: row.ad_url,
    workflowAnswerCount: [row.packaging_type, row.pouch_type, row.quantity_text, row.industry].filter(Boolean).length,
  };
}

export async function saveStarkInteraktQualification(formData: FormData): Promise<void> {
  const workspace = await requireStarkPackmateAccess(true);
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const rowId = clean(formData.get('rowId'));
  if (!rowId) throw new Error('Inbound inquiry is required.');
  const patch = {
    person_name: nullable(formData.get('personName')),
    company_name: nullable(formData.get('companyName')),
    packaging_type: nullable(formData.get('packagingType')),
    pouch_type: nullable(formData.get('pouchType')),
    quantity_text: nullable(formData.get('quantityText')),
    dimensions_print: nullable(formData.get('dimensionsPrint')),
    delivery_location: nullable(formData.get('deliveryLocation')),
    buying_timeline: nullable(formData.get('buyingTimeline')),
    industry: nullable(formData.get('industry')),
    qualification_notes: nullable(formData.get('qualificationNotes')),
    intake_status: clean(formData.get('status')) === 'ready_to_qualify' ? 'ready_to_qualify' : 'reviewed',
    updated_at: nowIso(),
  };
  const { data: current, error: loadError } = await db.from('lead_intake_staging').select('*')
    .eq('id', rowId).eq('organization_id', workspace.organization!.id).eq('source_provider', SOURCE_PROVIDER).maybeSingle();
  if (loadError || !current?.id) throw new Error('Inbound inquiry not found.');
  const merged = { ...current, ...patch };
  const score = assessInteraktContact(contactFromRow(merged), new Date(), evidenceFromRow(merged)).score;
  const { error } = await db.from('lead_intake_staging').update({ ...patch, qualification_score: score })
    .eq('id', rowId).eq('organization_id', workspace.organization!.id).eq('source_provider', SOURCE_PROVIDER);
  if (error) throw new Error(`Unable to save qualification: ${String(error.message ?? 'unknown database error')}`);
  revalidatePath(INBOUND_PATH);
}

function parseTemplateValues(value: FormDataEntryValue | null) {
  return clean(value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export async function sendStarkInteraktTemplate(formData: FormData): Promise<void> {
  const workspace = await requireStarkPackmateAccess(true);
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const rowId = clean(formData.get('rowId'));
  const templateName = clean(formData.get('templateName'));
  const languageCode = clean(formData.get('languageCode')) || 'en';
  if (!rowId || !templateName) throw new Error('Inquiry and approved Interakt template name are required.');

  const { data: row, error } = await db.from('lead_intake_staging').select('*')
    .eq('id', rowId).eq('organization_id', workspace.organization!.id).eq('source_provider', SOURCE_PROVIDER).maybeSingle();
  if (error || !row?.id) throw new Error('Inbound inquiry not found.');
  if (!row.phone_number || !row.country_code) throw new Error('Interakt phone number/country code is missing for this contact.');

  const callbackData = JSON.stringify({ source: 'setu_flow_inbound', intake_id: row.id, actor_user_id: workspace.user!.id });
  const result = await sendInteraktTemplate({
    countryCode: String(row.country_code), phoneNumber: String(row.phone_number), templateName, languageCode,
    bodyValues: parseTemplateValues(formData.get('bodyValues')), callbackData,
  });
  const now = nowIso();
  const { error: messageError } = await db.from('lead_intake_messages').upsert({
    organization_id: workspace.organization!.id, intake_id: row.id, provider: SOURCE_PROVIDER,
    external_message_id: result.id, event_type: 'message_api_send_requested', direction: 'outbound', actor_type: 'agent',
    actor_name: workspace.profile?.full_name ?? workspace.user?.email ?? 'Setu Flow user', message_type: 'Template',
    message_text: `Template: ${templateName}`, message_payload: { templateName, languageCode, bodyValues: parseTemplateValues(formData.get('bodyValues')) },
    sent_at: now, status: 'sent', callback_data: callbackData, updated_at: now,
  }, { onConflict: 'organization_id,provider,external_message_id' });
  if (messageError) throw new Error(`WhatsApp sent but conversation log failed: ${String(messageError.message ?? 'unknown database error')}`);
  revalidatePath(INBOUND_PATH);
}

export async function readStarkInteraktConversation(intakeId: string) {
  const workspace = await requireStarkPackmateAccess(false);
  const db: any = await createClient();
  const [messagesResult, answersResult] = await Promise.all([
    db.from('lead_intake_messages').select('*').eq('organization_id', workspace.organization!.id).eq('intake_id', intakeId).order('created_at', { ascending: true }).limit(500),
    db.from('lead_intake_workflow_answers').select('*').eq('organization_id', workspace.organization!.id).eq('intake_id', intakeId).order('answered_at', { ascending: true }).limit(500),
  ]);
  return { messages: messagesResult.data ?? [], answers: answersResult.data ?? [], error: messagesResult.error?.message ?? answersResult.error?.message ?? null };
}

async function findDuplicateLead(db: any, organizationId: string, email: string | null, phone: string | null) {
  if (email) {
    const { data } = await db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).ilike('email', email).limit(1).maybeSingle();
    if (data?.id) return data;
  }
  if (phone) {
    const [{ data: phoneMatch }, { data: waMatch }] = await Promise.all([
      db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).eq('phone', phone).limit(1).maybeSingle(),
      db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).eq('whatsapp_number', phone).limit(1).maybeSingle(),
    ]);
    return phoneMatch?.id ? phoneMatch : waMatch?.id ? waMatch : null;
  }
  return null;
}

export async function qualifyStarkInteraktAsLead(formData: FormData): Promise<void> {
  const workspace = await requireStarkPackmateAccess(true);
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const rowId = clean(formData.get('rowId'));
  if (!rowId) throw new Error('Inbound inquiry is required.');
  const { data: row, error } = await db.from('lead_intake_staging').select('*')
    .eq('id', rowId).eq('organization_id', workspace.organization!.id).eq('source_provider', SOURCE_PROVIDER).maybeSingle();
  if (error || !row?.id) throw new Error('Inbound inquiry not found.');
  if (row.intake_status !== 'ready_to_qualify') throw new Error('Mark this inquiry Ready to qualify before creating a Lead.');
  if (row.qualified_lead_id) redirect(`/leads/${row.qualified_lead_id}`);

  const duplicate = await findDuplicateLead(db, workspace.organization!.id, row.email ?? null, row.full_phone_number ?? null);
  if (duplicate?.id) {
    await db.from('lead_intake_staging').update({ intake_status: 'duplicate', qualified_lead_id: duplicate.id, qualified_at: nowIso(), qualified_by: workspace.user!.id, updated_at: nowIso() }).eq('id', row.id);
    revalidatePath(INBOUND_PATH);
    redirect(`/leads/${duplicate.id}?source=inbound-duplicate`);
  }

  const { data: pipeline } = await db.from('pipelines').select('id, pipeline_stages(id,name,sort_order)')
    .eq('organization_id', workspace.organization!.id).eq('lead_type', 'buyer').eq('is_default', true).maybeSingle();
  const stages = Array.isArray(pipeline?.pipeline_stages) ? pipeline.pipeline_stages : [];
  const firstStage = [...stages].sort((a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))[0] ?? null;
  const sourceLabel = [row.ad_network === 'meta' ? 'Meta' : null, row.acquisition_type === 'ctwa' ? 'CTWA' : null, row.ad_platform ? String(row.ad_platform) : null].filter(Boolean).join(' · ') || 'Interakt';
  const needs = [row.packaging_type, row.pouch_type, row.quantity_text, row.dimensions_print].filter(Boolean).join(' · ');
  const companyName = row.company_name || row.contact_name || row.person_name || 'Inbound WhatsApp inquiry';
  const notes = [row.qualification_notes, `Inbound source: ${sourceLabel}`, row.ad_url ? `Ad URL: ${row.ad_url}` : null, row.delivery_location ? `Delivery: ${row.delivery_location}` : null, row.buying_timeline ? `Buying timeline: ${row.buying_timeline}` : null, row.industry ? `Industry: ${row.industry}` : null, `Interakt intake: ${row.id}`].filter(Boolean).join('\n');
  const now = nowIso();

  const { data: lead, error: leadError } = await db.from('leads').insert({
    organization_id: workspace.organization!.id, lead_type: 'buyer', owner_user_id: workspace.user!.id,
    created_by: workspace.user!.id, updated_by: workspace.user!.id, company_name: companyName,
    contact_name: row.person_name || row.contact_name, email: row.email, phone: row.full_phone_number,
    whatsapp_number: row.full_phone_number, product_type: row.pouch_type || row.packaging_type,
    products_or_needs: needs || null, pipeline_id: pipeline?.id ?? null, stage_id: firstStage?.id ?? null,
    source_type: 'interakt', source_label: sourceLabel, notes, last_contacted_at: row.last_inbound_at,
    industry_metadata: {
      inbound_provider: 'interakt', intake_id: row.id, acquisition_type: row.acquisition_type, ad_network: row.ad_network,
      ad_platform: row.ad_platform, ad_url: row.ad_url, meta_campaign_id: row.meta_campaign_id,
      meta_adset_id: row.meta_adset_id, meta_ad_id: row.meta_ad_id, packaging_type: row.packaging_type,
      pouch_type: row.pouch_type, quantity_text: row.quantity_text, qualification_score: row.qualification_score,
    },
  }).select('id').single();
  if (leadError || !lead?.id) throw new Error(`Unable to create Lead: ${String(leadError?.message ?? 'unknown database error')}`);

  await db.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: lead.id, actor_user_id: workspace.user!.id, kind: 'lead_created', message: `Lead qualified from Interakt inbound inquiry (${sourceLabel}).`, occurred_at: now });
  await db.from('lead_intake_staging').update({ intake_status: 'qualified', qualified_lead_id: lead.id, qualified_at: now, qualified_by: workspace.user!.id, updated_at: now }).eq('id', row.id);
  revalidatePath('/leads');
  revalidatePath(INBOUND_PATH);
  redirect(`/leads/${lead.id}?source=inbound-qualified`);
}

export async function readStagedStarkInteraktContacts(limit = 200, activeOnly = true) {
  const workspace = await requireStarkPackmateAccess(false);
  const db: any = await createClient();
  const { data, error } = await db.from('lead_intake_staging').select('*')
    .eq('organization_id', workspace.organization!.id).eq('source_provider', SOURCE_PROVIDER)
    .order('last_inbound_at', { ascending: false, nullsFirst: false }).order('source_created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500));
  if (error) {
    if (String(error.code ?? '') === '42P01') return { rows: [], tableReady: false, error: null };
    return { rows: [], tableReady: true, error: String(error.message ?? 'Unable to read Interakt staging data.') };
  }
  const rows = (data ?? []).filter((row: any) => !activeOnly || !TERMINAL_INBOUND_STATUSES.has(String(row.intake_status ?? 'new')));
  return { rows, tableReady: true, error: null };
}
