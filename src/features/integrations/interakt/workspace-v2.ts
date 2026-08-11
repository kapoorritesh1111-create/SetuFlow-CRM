'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { assessInteraktContact } from '@/features/integrations/interakt/qualification';
import type { InteraktInquiryEvidence, NormalizedInteraktContact } from '@/features/integrations/interakt/types';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SOURCE_PROVIDER = 'interakt';
const INBOUND_PATH = '/leads/inbound';
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales']);
const TERMINAL = ['qualified', 'duplicate', 'existing_customer', 'not_relevant', 'ignored'];

type WorkspaceAccess = Awaited<ReturnType<typeof requireWorkspace>>;
type StarkWorkspace = WorkspaceAccess & {
  organization: NonNullable<WorkspaceAccess['organization']>;
  user: NonNullable<WorkspaceAccess['user']>;
};

function clean(value: unknown) { return String(value ?? '').trim(); }
function nullable(value: unknown) { const text = clean(value); return text || null; }
function nowIso() { return new Date().toISOString(); }
function safeSearch(value: unknown) { return clean(value).replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80); }

async function requireStark(write = false): Promise<StarkWorkspace> {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const user = workspace.user;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !user || !organization) throw new Error('This Interakt connector is restricted to Stark Packmate.');
  if (write && !workspace.currentRoles.some((role) => WRITE_ROLES.has(String(role)))) throw new Error('Sales, Manager, Admin or Owner permission is required.');
  return { ...workspace, organization, user } as StarkWorkspace;
}

function tagsFrom(value: unknown) {
  if (!value) return [] as string[];
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [] as string[];
}

function contactFromRow(row: any): NormalizedInteraktContact {
  const raw = row.raw_payload && typeof row.raw_payload === 'object' ? row.raw_payload : {};
  const traits = row.traits && typeof row.traits === 'object' ? row.traits : {};
  return {
    externalContactId: String(row.external_contact_id), externalUserId: row.external_user_id ?? null,
    phoneNumber: row.phone_number ?? null, countryCode: row.country_code ?? null, fullPhoneNumber: row.full_phone_number ?? null,
    contactName: row.contact_name ?? null, email: row.email ?? null, whatsappOptedIn: row.whatsapp_opted_in ?? null,
    sourceCreatedAt: row.source_created_at ?? null, sourceModifiedAt: row.source_modified_at ?? null,
    sourceCreatedVia: row.source_created_via ?? null, tags: tagsFrom(raw.tags ?? traits.tags), traits, rawPayload: raw,
  };
}

function evidenceFromRow(row: any): InteraktInquiryEvidence {
  return {
    personName: row.person_name, companyName: row.company_name, packagingType: row.packaging_type, pouchType: row.pouch_type,
    quantityText: row.quantity_text, dimensionsPrint: row.dimensions_print, deliveryLocation: row.delivery_location,
    buyingTimeline: row.buying_timeline, industry: row.industry, firstInquiryAt: row.first_inquiry_at,
    lastInboundAt: row.last_inbound_at, channelSource: row.channel_source, acquisitionType: row.acquisition_type,
    adNetwork: row.ad_network, adPlatform: row.ad_platform, adUrl: row.ad_url,
    workflowAnswerCount: [row.company_name, row.packaging_type, row.pouch_type, row.quantity_text, row.industry].filter(Boolean).length,
  };
}

function activeStagingQuery(db: any, organizationId: string, head = false) {
  return db.from('lead_intake_staging')
    .select('id', head ? { count: 'exact', head: true } : undefined)
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`);
}

export type InboundWorkspaceQuery = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  status?: string | null;
  guru?: string | null;
  source?: string | null;
  owner?: string | null;
  sort?: string | null;
};

export async function readInboundWorkspaceV2(input: InboundWorkspaceQuery = {}) {
  const workspace = await requireStark(false);
  const organizationId = workspace.organization.id;
  const db: any = await createClient();
  const pageSize = Math.max(10, Math.min(Number(input.pageSize ?? 15), 50));
  const page = Math.max(1, Number(input.page ?? 1));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = safeSearch(input.q);
  const status = clean(input.status) || 'all';
  const guru = clean(input.guru) || 'all';
  const source = clean(input.source) || 'all';
  const owner = safeSearch(input.owner);
  const sort = clean(input.sort) || 'recent';

  let query = db.from('lead_intake_staging').select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`);

  if (q) query = query.or(`contact_name.ilike.%${q}%,person_name.ilike.%${q}%,company_name.ilike.%${q}%,brand_name.ilike.%${q}%,full_phone_number.ilike.%${q}%`);
  if (status === 'new') query = query.eq('intake_status', 'new');
  else if (status === 'inquiries') query = query.not('last_inbound_at', 'is', null);
  else if (status === 'needs_info') query = query.eq('intake_status', 'needs_info');
  else if (status === 'ready') query = query.eq('intake_status', 'ready_to_qualify');
  else if (status === 'needs_reply') query = query.eq('needs_reply', true);
  else if (status === 'history_pending') query = query.in('historical_backfill_status', ['pending', 'partial', 'not_requested']);
  if (guru !== 'all') query = query.eq('guru_evaluation_status', guru);
  if (source === 'ctwa') query = query.eq('acquisition_type', 'ctwa');
  else if (source === 'instagram') query = query.eq('ad_platform', 'instagram');
  else if (source === 'whatsapp') query = query.eq('channel_source', 'whatsapp');
  if (owner) query = query.ilike('interakt_assignee_name', `%${owner}%`);

  if (sort === 'oldest') query = query.order('last_inbound_at', { ascending: true, nullsFirst: false }).order('source_created_at', { ascending: true });
  else if (sort === 'score') query = query.order('qualification_score', { ascending: false, nullsFirst: false }).order('last_inbound_at', { ascending: false, nullsFirst: false });
  else if (sort === 'name') query = query.order('contact_name', { ascending: true, nullsFirst: false });
  else query = query.order('last_inbound_at', { ascending: false, nullsFirst: false }).order('source_modified_at', { ascending: false, nullsFirst: false });

  const baseCount = () => db.from('lead_intake_staging').select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId).eq('source_provider', SOURCE_PROVIDER).eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`);
  const [{ data, count, error }, totalResult, needsReplyResult, needsInfoResult, readyResult, evaluatedResult, pendingResult, newEvidenceResult, inquiryResult, browsingResult] = await Promise.all([
    query.range(from, to),
    baseCount(),
    baseCount().eq('needs_reply', true),
    baseCount().eq('intake_status', 'needs_info'),
    baseCount().eq('intake_status', 'ready_to_qualify'),
    baseCount().eq('guru_evaluation_status', 'evaluated'),
    baseCount().in('guru_evaluation_status', ['pending', 'partial_history']),
    baseCount().eq('guru_evaluation_status', 'new_evidence'),
    baseCount().not('last_inbound_at', 'is', null),
    db.from('lead_intake_staging').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('source_provider', SOURCE_PROVIDER).eq('sales_queue_suppressed', true),
  ]);
  if (error) throw new Error(`Unable to load inbound workspace: ${String(error.message ?? 'unknown database error')}`);

  const rows = (data ?? []).map((row: any) => {
    const assessment = assessInteraktContact(contactFromRow(row), new Date(), evidenceFromRow(row));
    return {
      ...row,
      computed_score: row.qualification_score ?? assessment.score,
      computed_band: assessment.bandLabel,
      computed_source: assessment.source.label,
      missing_fields: assessment.leadBlockers,
      lead_blockers: assessment.leadBlockers,
      later_enrichment: assessment.laterEnrichment,
    };
  });

  const total = Number(totalResult.count ?? 0);
  return {
    rows,
    count: Number(count ?? 0),
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(Number(count ?? 0) / pageSize)),
    kpis: {
      active: total,
      needsReply: Number(needsReplyResult.count ?? 0),
      needsInfo: Number(needsInfoResult.count ?? 0),
      ready: Number(readyResult.count ?? 0),
      evaluated: Number(evaluatedResult.count ?? 0),
      pending: Number(pendingResult.count ?? 0),
      newEvidence: Number(newEvidenceResult.count ?? 0),
      inquiries: Number(inquiryResult.count ?? 0),
      browsingHidden: Number(browsingResult.count ?? 0),
    },
  };
}

export async function evaluateStarkInteraktPage(formData: FormData): Promise<void> {
  const workspace = await requireStark(true);
  const organizationId = workspace.organization.id;
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const rawIds = clean(formData.get('rowIds'));
  const ids = rawIds.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 50);
  if (!ids.length) return;
  const { data: rows, error } = await db.from('lead_intake_staging').select('*').eq('organization_id', organizationId).eq('source_provider', SOURCE_PROVIDER).in('id', ids);
  if (error) throw new Error(`Unable to load inquiries for Setu Guru: ${String(error.message ?? 'unknown database error')}`);
  const now = nowIso();
  for (const row of rows ?? []) {
    if (row.sales_queue_suppressed) continue;
    const assessment = assessInteraktContact(contactFromRow(row), new Date(), evidenceFromRow(row));
    const evidenceAt = row.last_inbound_at ?? row.first_inquiry_at ?? row.company_intelligence_updated_at ?? row.source_modified_at ?? now;
    await db.from('lead_intake_staging').update({ qualification_score: assessment.score, guru_evaluation_status: 'evaluated', guru_evaluated_at: now, guru_last_evidence_at: evidenceAt, updated_at: now }).eq('id', row.id).eq('organization_id', organizationId);
    await db.from('lead_intake_inquiries').update({
      guru_evaluation_status: 'evaluated', guru_evaluated_at: now, guru_last_evidence_at: evidenceAt,
      guru_score: assessment.score, guru_band: assessment.bandLabel, guru_missing_fields: assessment.leadBlockers,
      guru_evaluation: { reason: assessment.scoreReason, next_step: assessment.nextStep, source: assessment.source.label, lead_blockers: assessment.leadBlockers, later_enrichment: assessment.laterEnrichment },
      updated_at: now,
    }).eq('organization_id', organizationId).eq('intake_id', row.id).is('ended_at', null);
  }
  revalidatePath(INBOUND_PATH);
}

async function findDuplicateLead(db: any, organizationId: string, email: string | null, phone: string | null) {
  if (email) {
    const { data } = await db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).ilike('email', email).limit(1).maybeSingle();
    if (data?.id) return data;
  }
  if (phone) {
    const { data: phoneMatch } = await db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).eq('phone', phone).limit(1).maybeSingle();
    if (phoneMatch?.id) return phoneMatch;
    const { data: waMatch } = await db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).eq('whatsapp_number', phone).limit(1).maybeSingle();
    if (waMatch?.id) return waMatch;
  }
  return null;
}

export async function createStarkInteraktLeadOverride(formData: FormData): Promise<void> {
  const workspace = await requireStark(true);
  const organizationId = workspace.organization.id;
  const userId = workspace.user.id;
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const rowId = clean(formData.get('rowId'));
  const overrideReason = nullable(formData.get('overrideReason'));
  if (!rowId) throw new Error('Inbound inquiry is required.');

  const { data: row, error } = await db.from('lead_intake_staging').select('*').eq('id', rowId).eq('organization_id', organizationId).eq('source_provider', SOURCE_PROVIDER).maybeSingle();
  if (error || !row?.id) throw new Error('Inbound inquiry not found.');
  if (row.qualified_lead_id) redirect(`/leads/${row.qualified_lead_id}`);
  if (row.sales_queue_suppressed) throw new Error('This contact is browsing only. Wait for meaningful requirement details before creating a Lead.');

  const duplicate = await findDuplicateLead(db, organizationId, row.email ?? null, row.full_phone_number ?? null);
  if (duplicate?.id) {
    const now = nowIso();
    await db.from('lead_intake_staging').update({ intake_status: 'duplicate', qualified_lead_id: duplicate.id, qualified_at: now, qualified_by: userId, qualification_notes: [row.qualification_notes, overrideReason ? `Lead creation override: ${overrideReason}` : null].filter(Boolean).join('\n'), updated_at: now }).eq('id', row.id);
    await db.from('lead_intake_inquiries').update({ status: 'duplicate', qualified_lead_id: duplicate.id, qualified_at: now, qualified_by: userId, updated_at: now }).eq('organization_id', organizationId).eq('intake_id', row.id).is('ended_at', null);
    revalidatePath('/leads');
    revalidatePath(INBOUND_PATH);
    redirect(`/leads/${duplicate.id}?source=inbound-duplicate`);
  }

  const { data: pipeline } = await db.from('pipelines').select('id, pipeline_stages(id,name,sort_order)').eq('organization_id', organizationId).eq('lead_type', 'buyer').eq('is_default', true).maybeSingle();
  const stages = Array.isArray(pipeline?.pipeline_stages) ? pipeline.pipeline_stages : [];
  const firstStage = [...stages].sort((a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))[0] ?? null;
  const sourceLabel = [row.ad_network === 'meta' ? 'Meta' : null, row.acquisition_type === 'ctwa' ? 'CTWA' : null, row.ad_platform ? String(row.ad_platform) : null].filter(Boolean).join(' · ') || 'Interakt';
  const needs = [row.packaging_type, row.pouch_type, row.quantity_text, row.dimensions_print].filter(Boolean).join(' · ');
  const companyName = row.company_name || row.contact_name || row.person_name || 'Inbound WhatsApp inquiry';
  const productInterestLabel = row.pouch_type || row.packaging_type || null;
  const assessment = assessInteraktContact(contactFromRow(row), new Date(), evidenceFromRow(row));
  const notes = [
    row.qualification_notes,
    row.brand_name ? `Brand: ${row.brand_name}` : null,
    `Inbound source: ${sourceLabel}`,
    row.ad_url ? `Ad URL: ${row.ad_url}` : null,
    row.delivery_location ? `Delivery: ${row.delivery_location}` : null,
    row.buying_timeline ? `Buying timeline: ${row.buying_timeline}` : null,
    row.industry ? `Industry: ${row.industry}` : null,
    overrideReason ? `Setu Guru override reason: ${overrideReason}` : null,
    `Setu Guru at conversion: ${assessment.score}/100 · ${assessment.bandLabel}`,
    assessment.leadBlockers.length ? `Sales handoff blockers at conversion: ${assessment.leadBlockers.join(', ')}` : null,
    assessment.laterEnrichment.length ? `Can collect during quote preparation: ${assessment.laterEnrichment.join(', ')}` : null,
    `Interakt intake: ${row.id}`,
  ].filter(Boolean).join('\n');
  const now = nowIso();

  const { data: lead, error: leadError } = await db.from('leads').insert({
    organization_id: organizationId, lead_type: 'buyer', owner_user_id: userId,
    created_by: userId, updated_by: userId, company_name: companyName,
    contact_name: row.person_name || row.contact_name, email: row.email, phone: row.full_phone_number,
    whatsapp_number: row.full_phone_number, product_type: productInterestLabel,
    products_or_needs: needs || null, pipeline_id: pipeline?.id ?? null, stage_id: firstStage?.id ?? null,
    source_type: 'interakt', source_label: sourceLabel, notes, last_contacted_at: row.last_inbound_at,
    industry_metadata: {
      inbound_provider: 'interakt', intake_id: row.id, acquisition_type: row.acquisition_type, ad_network: row.ad_network,
      ad_platform: row.ad_platform, ad_url: row.ad_url, meta_campaign_id: row.meta_campaign_id,
      meta_adset_id: row.meta_adset_id, meta_ad_id: row.meta_ad_id, packaging_type: row.packaging_type,
      pouch_type: row.pouch_type, quantity_text: row.quantity_text, brand_name: row.brand_name,
      setu_guru_score_at_conversion: assessment.score, setu_guru_band_at_conversion: assessment.bandLabel,
      setu_guru_missing_at_conversion: assessment.leadBlockers,
      setu_guru_lead_blockers_at_conversion: assessment.leadBlockers,
      setu_guru_later_enrichment_at_conversion: assessment.laterEnrichment,
      manual_override: assessment.leadBlockers.length > 0,
      manual_override_reason: overrideReason,
      quantity_is_advisory: true,
      moq_override_allowed: true,
    },
  }).select('id').single();
  if (leadError || !lead?.id) throw new Error(`Unable to create Lead: ${String(leadError?.message ?? 'unknown database error')}`);

  if (productInterestLabel) {
    const { error: interestError } = await db.from('lead_product_interests').insert({
      organization_id: organizationId,
      lead_id: lead.id,
      product_id: null,
      label: productInterestLabel,
      interest_type: 'captured_requirement',
      source_context: {
        source: 'interakt_inbound', intake_id: row.id, packaging_type: row.packaging_type,
        pouch_type: row.pouch_type, quantity_text: row.quantity_text, industry: row.industry,
        quantity_is_advisory: true, moq_override_allowed: true,
      },
    });
    if (interestError) {
      await db.from('leads').delete().eq('id', lead.id).eq('organization_id', organizationId);
      throw new Error(`Lead requirement could not be carried into quote preparation: ${String(interestError.message ?? 'unknown database error')}`);
    }
  }

  await db.from('lead_intake_staging').update({ intake_status: 'qualified', qualified_lead_id: lead.id, qualified_at: now, qualified_by: userId, qualification_score: assessment.score, qualification_notes: [row.qualification_notes, overrideReason ? `Lead creation override: ${overrideReason}` : null].filter(Boolean).join('\n'), updated_at: now }).eq('id', row.id);
  await db.from('lead_intake_inquiries').update({ status: 'qualified', qualified_lead_id: lead.id, qualified_at: now, qualified_by: userId, guru_score: assessment.score, guru_band: assessment.bandLabel, guru_missing_fields: assessment.leadBlockers, guru_evaluation: { lead_blockers: assessment.leadBlockers, later_enrichment: assessment.laterEnrichment }, updated_at: now }).eq('organization_id', organizationId).eq('intake_id', row.id).is('ended_at', null);
  revalidatePath('/leads');
  revalidatePath(INBOUND_PATH);
  redirect(`/leads/${lead.id}?source=inbound-qualified`);
}
