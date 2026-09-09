'use server';

import { assessInteraktContact } from '@/features/integrations/interakt/qualification';
import type { InteraktInquiryEvidence, NormalizedInteraktContact } from '@/features/integrations/interakt/types';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SOURCE_PROVIDER = 'interakt';
const TERMINAL = ['qualified', 'duplicate', 'existing_customer', 'not_relevant', 'ignored'];
const MANAGEMENT_ROLES = new Set(['owner', 'admin', 'manager']);

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

function clean(value: unknown) { return String(value ?? '').trim(); }
function safeSearch(value: unknown) { return clean(value).replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80); }

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

async function starkReadContext() {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const user = workspace.user;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !organization || !user || !workspace.membership) throw new Error('Stark Packmate workspace access is required.');
  const roles = workspace.currentRoles.map((role) => String(role).toLowerCase());
  const canSeeAll = Boolean(workspace.canAccessAdmin) || roles.some((role) => MANAGEMENT_ROLES.has(role));
  const isSales = roles.includes('sales');
  if (!canSeeAll && !isSales) throw new Error('Sales, Manager, Admin or Owner permission is required.');
  const db: any = createAdminSupabaseClient();
  if (!db) throw new Error('Database admin client unavailable.');
  return { workspace, organization, user, db, canSeeAll, scopedUserId: canSeeAll ? null : user.id };
}

function applyScope(builder: any, scopedUserId: string | null) {
  return scopedUserId ? builder.eq('setu_assigned_user_id', scopedUserId) : builder;
}

function activeBase(db: any, organizationId: string, scopedUserId: string | null) {
  return applyScope(db.from('lead_intake_staging')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`), scopedUserId);
}

export async function readInboundWorkspaceScoped(input: InboundWorkspaceQuery = {}) {
  const { organization, db, canSeeAll, scopedUserId } = await starkReadContext();
  const organizationId = organization.id;
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

  let query = applyScope(db.from('lead_intake_staging').select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`), scopedUserId);

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
  if (owner && canSeeAll) query = query.ilike('setu_assigned_name', `%${owner}%`);

  if (sort === 'oldest') query = query.order('last_inbound_at', { ascending: true, nullsFirst: false }).order('source_created_at', { ascending: true });
  else if (sort === 'score') query = query.order('qualification_score', { ascending: false, nullsFirst: false }).order('last_inbound_at', { ascending: false, nullsFirst: false });
  else if (sort === 'name') query = query.order('contact_name', { ascending: true, nullsFirst: false });
  else query = query.order('last_inbound_at', { ascending: false, nullsFirst: false }).order('source_modified_at', { ascending: false, nullsFirst: false });

  const browsingQuery = applyScope(db.from('lead_intake_staging').select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId).eq('source_provider', SOURCE_PROVIDER).eq('sales_queue_suppressed', true), scopedUserId);

  const [{ data, count, error }, totalResult, needsReplyResult, needsInfoResult, readyResult, evaluatedResult, pendingResult, newEvidenceResult, inquiryResult, browsingResult] = await Promise.all([
    query.range(from, to),
    activeBase(db, organizationId, scopedUserId),
    activeBase(db, organizationId, scopedUserId).eq('needs_reply', true),
    activeBase(db, organizationId, scopedUserId).eq('intake_status', 'needs_info'),
    activeBase(db, organizationId, scopedUserId).eq('intake_status', 'ready_to_qualify'),
    activeBase(db, organizationId, scopedUserId).eq('guru_evaluation_status', 'evaluated'),
    activeBase(db, organizationId, scopedUserId).in('guru_evaluation_status', ['pending', 'partial_history']),
    activeBase(db, organizationId, scopedUserId).eq('guru_evaluation_status', 'new_evidence'),
    activeBase(db, organizationId, scopedUserId).not('last_inbound_at', 'is', null),
    browsingQuery,
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
    count: Number(count ?? 0), page, pageSize,
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

export async function readInboundConversationScoped(intakeId: string) {
  const { organization, user, db, canSeeAll } = await starkReadContext();
  const id = clean(intakeId);
  if (!id) return { messages: [], answers: [], error: 'Inbound inquiry is required.' };

  let accessQuery = db.from('lead_intake_staging').select('id, setu_assigned_user_id')
    .eq('organization_id', organization.id).eq('source_provider', SOURCE_PROVIDER).eq('id', id);
  if (!canSeeAll) accessQuery = accessQuery.eq('setu_assigned_user_id', user.id);
  const { data: intake, error: accessError } = await accessQuery.maybeSingle();
  if (accessError || !intake?.id) return { messages: [], answers: [], error: 'This inbound lead is not assigned to you or is no longer available.' };

  const [messagesResult, answersResult] = await Promise.all([
    db.from('lead_intake_messages').select('*').eq('organization_id', organization.id).eq('intake_id', id).order('created_at', { ascending: true }).limit(500),
    db.from('lead_intake_workflow_answers').select('*').eq('organization_id', organization.id).eq('intake_id', id).order('answered_at', { ascending: true }).limit(500),
  ]);
  return { messages: messagesResult.data ?? [], answers: answersResult.data ?? [], error: messagesResult.error?.message ?? answersResult.error?.message ?? null };
}
