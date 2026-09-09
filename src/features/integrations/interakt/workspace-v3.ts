'use server';

import { assessInteraktContact } from '@/features/integrations/interakt/qualification';
import type { InteraktInquiryEvidence, NormalizedInteraktContact } from '@/features/integrations/interakt/types';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

export {
  createStarkInteraktLeadOverride,
  evaluateStarkInteraktPage,
} from '@/features/integrations/interakt/workspace-v2';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SOURCE_PROVIDER = 'interakt';
const TERMINAL = ['qualified', 'duplicate', 'existing_customer', 'not_relevant', 'ignored'];
const MANAGEMENT_ROLES = new Set(['owner', 'admin', 'manager']);

type WorkspaceAccess = Awaited<ReturnType<typeof requireWorkspace>>;
type StarkWorkspace = WorkspaceAccess & {
  organization: NonNullable<WorkspaceAccess['organization']>;
  user: NonNullable<WorkspaceAccess['user']>;
};

function clean(value: unknown) { return String(value ?? '').trim(); }
function safeSearch(value: unknown) { return clean(value).replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80); }

async function requireStark(): Promise<StarkWorkspace> {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const user = workspace.user;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !user || !organization) throw new Error('This Interakt connector is restricted to Stark Packmate.');
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
  const workspace = await requireStark();
  const organizationId = workspace.organization.id;
  const db: any = createAdminSupabaseClient();
  if (!db) throw new Error('Database admin client unavailable.');

  const roles = workspace.currentRoles.map((role) => String(role).toLowerCase());
  const canSeeAll = Boolean(workspace.canAccessAdmin) || roles.some((role) => MANAGEMENT_ROLES.has(role));
  const isSales = roles.includes('sales');
  if (!canSeeAll && !isSales) throw new Error('Sales, Manager, Admin or Owner permission is required.');
  const scopedUserId = canSeeAll ? null : workspace.user.id;

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

  const scope = (builder: any) => scopedUserId ? builder.eq('setu_assigned_user_id', scopedUserId) : builder;
  const activeBase = () => scope(db.from('lead_intake_staging')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`));

  let query = scope(db.from('lead_intake_staging').select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`));

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

  const browsingQuery = scope(db.from('lead_intake_staging').select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId).eq('source_provider', SOURCE_PROVIDER).eq('sales_queue_suppressed', true));

  const [{ data, count, error }, totalResult, needsReplyResult, needsInfoResult, readyResult, evaluatedResult, pendingResult, newEvidenceResult, inquiryResult, browsingResult] = await Promise.all([
    query.range(from, to),
    activeBase(),
    activeBase().eq('needs_reply', true),
    activeBase().eq('intake_status', 'needs_info'),
    activeBase().eq('intake_status', 'ready_to_qualify'),
    activeBase().eq('guru_evaluation_status', 'evaluated'),
    activeBase().in('guru_evaluation_status', ['pending', 'partial_history']),
    activeBase().eq('guru_evaluation_status', 'new_evidence'),
    activeBase().not('last_inbound_at', 'is', null),
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
