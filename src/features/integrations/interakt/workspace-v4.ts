'use server';

import { assessInteraktContact } from '@/features/integrations/interakt/qualification';
import type { InteraktInquiryEvidence, NormalizedInteraktContact } from '@/features/integrations/interakt/types';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

export {
  createStarkInteraktLeadOverride,
  evaluateStarkInteraktPage,
} from './workspace-v2';

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

async function requireStark(): Promise<StarkWorkspace> {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const user = workspace.user;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !user || !organization || !workspace.membership) throw new Error('This Interakt connector is restricted to Stark Packmate.');
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
  const owner = canSeeAll ? safeSearch(input.owner) : '';
  const sort = clean(input.sort) || 'recent';

  let query = db.from('lead_intake_staging').select('*')
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .eq('sales_queue_suppressed', false)
    .not('intake_status', 'in', `(${TERMINAL.join(',')})`);

  if (scopedUserId) query = query.eq('setu_assigned_user_id', scopedUserId);
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
  if (owner) query = query.ilike('setu_assigned_name', `%${owner}%`);

  if (sort === 'oldest') query = query.order('last_inbound_at', { ascending: true, nullsFirst: false }).order('source_created_at', { ascending: true });
  else if (sort === 'score') query = query.order('qualification_score', { ascending: false, nullsFirst: false }).order('last_inbound_at', { ascending: false, nullsFirst: false });
  else if (sort === 'name') query = query.order('contact_name', { ascending: true, nullsFirst: false });
  else query = query.order('last_inbound_at', { ascending: false, nullsFirst: false }).order('source_modified_at', { ascending: false, nullsFirst: false });

  const [rowsResult, statsResult] = await Promise.all([
    query.range(from, to),
    db.rpc('stark_inbound_workspace_stats', {
      p_organization_id: organizationId,
      p_assigned_user_id: scopedUserId,
      p_q: q || null,
      p_status: status,
      p_guru: guru,
      p_source: source,
      p_owner: owner || null,
    }),
  ]);

  if (rowsResult.error) throw new Error(`Unable to load inbound workspace: ${String(rowsResult.error.message ?? 'unknown database error')}`);
  if (statsResult.error) throw new Error(`Unable to load inbound workspace stats: ${String(statsResult.error.message ?? 'unknown database error')}`);

  const rows = (rowsResult.data ?? []).map((row: any) => {
    const assessment = assessInteraktContact(contactFromRow(row), new Date(), evidenceFromRow(row));
    const setuAssignee = clean(row.setu_assigned_name || row.setu_assigned_email) || 'Unassigned';
    return {
      ...row,
      computed_score: row.qualification_score ?? assessment.score,
      computed_band: assessment.bandLabel,
      computed_source: `${assessment.source.label} · Assigned to ${setuAssignee}`,
      missing_fields: assessment.leadBlockers,
      lead_blockers: assessment.leadBlockers,
      later_enrichment: assessment.laterEnrichment,
    };
  });

  const stats = (statsResult.data ?? {}) as Record<string, number>;
  const filteredCount = Number(stats.filteredCount ?? 0);
  return {
    rows,
    count: filteredCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filteredCount / pageSize)),
    kpis: {
      active: Number(stats.active ?? 0),
      needsReply: Number(stats.needsReply ?? 0),
      needsInfo: Number(stats.needsInfo ?? 0),
      ready: Number(stats.ready ?? 0),
      evaluated: Number(stats.evaluated ?? 0),
      pending: Number(stats.pending ?? 0),
      newEvidence: Number(stats.newEvidence ?? 0),
      inquiries: Number(stats.inquiries ?? 0),
      browsingHidden: Number(stats.browsingHidden ?? 0),
    },
  };
}
