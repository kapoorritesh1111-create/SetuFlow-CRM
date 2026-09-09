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

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function safeSearch(value: unknown) {
  return clean(value).replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
}

async function requireStark(): Promise<StarkWorkspace> {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const user = workspace.user;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !user || !organization || !workspace.membership) {
    throw new Error('This Interakt connector is restricted to Stark Packmate.');
  }
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
    externalContactId: String(row.external_contact_id),
    externalUserId: row.external_user_id ?? null,
    phoneNumber: row.phone_number ?? null,
    countryCode: row.country_code ?? null,
    fullPhoneNumber: row.full_phone_number ?? null,
    contactName: row.contact_name ?? null,
    email: row.email ?? null,
    whatsappOptedIn: row.whatsapp_opted_in ?? null,
    sourceCreatedAt: row.source_created_at ?? null,
    sourceModifiedAt: row.source_modified_at ?? null,
    sourceCreatedVia: row.source_created_via ?? null,
    tags: tagsFrom(raw.tags ?? traits.tags),
    traits,
    rawPayload: raw,
  };
}

function evidenceFromRow(row: any): InteraktInquiryEvidence {
  return {
    personName: row.person_name,
    companyName: row.company_name,
    packagingType: row.packaging_type,
    pouchType: row.pouch_type,
    quantityText: row.quantity_text,
    dimensionsPrint: row.dimensions_print,
    deliveryLocation: row.delivery_location,
    buyingTimeline: row.buying_timeline,
    industry: row.industry,
    firstInquiryAt: row.first_inquiry_at,
    lastInboundAt: row.last_inbound_at,
    channelSource: row.channel_source,
    acquisitionType: row.acquisition_type,
    adNetwork: row.ad_network,
    adPlatform: row.ad_platform,
    adUrl: row.ad_url,
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
  const q = safeSearch(input.q);
  const status = clean(input.status) || 'all';
  const guru = clean(input.guru) || 'all';
  const source = clean(input.source) || 'all';
  const owner = canSeeAll ? safeSearch(input.owner) : '';
  const sort = clean(input.sort) || 'recent';

  const { data, error } = await db.rpc('stark_inbound_workspace_page', {
    p_organization_id: organizationId,
    p_assigned_user_id: scopedUserId,
    p_q: q || null,
    p_status: status,
    p_guru: guru,
    p_source: source,
    p_owner: owner || null,
    p_sort: sort,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });

  if (error) {
    throw new Error(`Unable to load inbound workspace: ${String(error.message ?? 'unknown database error')}`);
  }

  const payload = (data ?? {}) as { rows?: any[]; stats?: Record<string, number> };
  const rows = (payload.rows ?? []).map((row: any) => {
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

  const stats = payload.stats ?? {};
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
