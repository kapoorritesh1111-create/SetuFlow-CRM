'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { assessInteraktContact } from '@/features/integrations/interakt/qualification';
import type { InteraktInquiryEvidence, NormalizedInteraktContact } from '@/features/integrations/interakt/types';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SUPPORTED_PROVIDERS = ['interakt', 'indiamart'] as const;
const INBOUND_PATH = '/leads/inbound';
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales', 'field_sales']);
const MANAGER_ROLES = new Set(['owner', 'admin', 'manager']);

type WorkspaceAccess = Awaited<ReturnType<typeof requireWorkspace>>;
type StarkWorkspace = WorkspaceAccess & {
  organization: NonNullable<WorkspaceAccess['organization']>;
  user: NonNullable<WorkspaceAccess['user']>;
};

function clean(value: unknown) { return String(value ?? '').trim(); }
function splitPersonName(value: unknown) { const parts=clean(value).split(/\s+/).filter(Boolean); return { firstName:parts[0]??'', lastName:parts.slice(1).join(' ') }; }
function nullable(value: unknown) { const text = clean(value); return text || null; }
function nowIso() { return new Date().toISOString(); }
function isSupportedProvider(value: unknown): value is (typeof SUPPORTED_PROVIDERS)[number] {
  return SUPPORTED_PROVIDERS.includes(clean(value).toLowerCase() as (typeof SUPPORTED_PROVIDERS)[number]);
}
function providerLabel(value: unknown) { return clean(value).toLowerCase() === 'indiamart' ? 'IndiaMART' : 'Interakt'; }

async function requireStarkWriteAccess(): Promise<StarkWorkspace> {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const user = workspace.user;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !user || !organization) throw new Error('This inbound lead workspace is restricted to Stark Packmate.');
  if (!workspace.currentRoles.some((role) => WRITE_ROLES.has(String(role)))) throw new Error('Sales, Field Sales, Manager, Admin or Owner permission is required.');
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
  const traits = row.traits && typeof row.traits === 'object' ? row.traits : {};
  const indiaMartProduct = clean(traits.query_product_name);
  const indiaMartMessage = clean(traits.query_message);
  const rawMessage = row.raw_payload?.message?.message;
  const interaktMessage = typeof rawMessage === 'string' && !rawMessage.trim().startsWith('{') ? rawMessage.trim() : '';
  const companyEvidence = row.company_evidence && typeof row.company_evidence === 'object' ? row.company_evidence : {};
  const evidenceHistory = [
    ...(Array.isArray(companyEvidence.history) ? companyEvidence.history : []),
    ...(companyEvidence.latest ? [companyEvidence.latest] : []),
  ]
    .map((entry: any) => clean(entry?.evidence))
    .filter(Boolean);
  return {
    personName: row.person_name,
    companyName: row.company_name,
    brandName: row.brand_name,
    packagingType: row.packaging_type || indiaMartProduct || null,
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
    inboundMessageTexts: [indiaMartMessage, ...evidenceHistory, interaktMessage].filter(Boolean),
    workflowAnswerCount: [row.company_name, row.packaging_type || indiaMartProduct, row.pouch_type, row.quantity_text, row.industry, indiaMartMessage].filter(Boolean).length,
  };
}

export async function evaluateStarkInteraktPage(formData: FormData): Promise<void> {
  const workspace = await requireStarkWriteAccess();
  const organizationId = workspace.organization.id;
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const rawIds = clean(formData.get('rowIds'));
  const ids = rawIds.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 50);
  if (!ids.length) return;
  const { data: rows, error } = await db.from('lead_intake_staging').select('*').eq('organization_id', organizationId).in('source_provider', [...SUPPORTED_PROVIDERS]).in('id', ids);
  if (error) throw new Error(`Unable to load inquiries for Setu Guru: ${String(error.message ?? 'unknown database error')}`);
  const now = nowIso();
  for (const row of rows ?? []) {
    if (row.sales_queue_suppressed) continue;
    const hasConversationEvidence = Boolean(row.first_inquiry_at || row.last_inbound_at || row.packaging_type || row.pouch_type || row.quantity_text || row.industry || row.company_intelligence_updated_at || row.traits?.query_product_name || row.traits?.query_message);
    const assessment = assessInteraktContact(contactFromRow(row), new Date(), evidenceFromRow(row));
    if (!hasConversationEvidence) {
      await db.from('lead_intake_staging').update({
        qualification_score: assessment.score,
        guru_evaluation_status: 'partial_history',
        guru_evaluated_at: null,
        guru_last_evidence_at: null,
        updated_at: now,
      }).eq('id', row.id).eq('organization_id', organizationId);
      continue;
    }
    const evidenceAt = row.last_inbound_at ?? row.first_inquiry_at ?? row.company_intelligence_updated_at ?? now;
    await db.from('lead_intake_staging').update({ qualification_score: assessment.score, guru_evaluation_status: 'evaluated', guru_evaluated_at: now, guru_last_evidence_at: evidenceAt, updated_at: now }).eq('id', row.id).eq('organization_id', organizationId);
    await db.from('lead_intake_inquiries').update({
      guru_evaluation_status: 'evaluated', guru_evaluated_at: now, guru_last_evidence_at: evidenceAt,
      guru_score: assessment.score, guru_band: assessment.bandLabel, guru_missing_fields: assessment.leadBlockers,
      guru_evaluation: { reason: assessment.scoreReason, next_step: assessment.nextStep, source: providerLabel(row.source_provider), lead_blockers: assessment.leadBlockers, later_enrichment: assessment.laterEnrichment },
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

async function resolveInboundLeadOwnerUserId(db: any, organizationId: string, row: any) {
  const assignedUserId = clean(row.setu_assigned_user_id);
  if (!assignedUserId) {
    throw new Error('Assign this inbound inquiry to an active Sales or Field Sales user before creating a Setu Lead.');
  }

  const { data: member, error: memberError } = await db
    .from('organization_members')
    .select('id,user_id,is_active')
    .eq('organization_id', organizationId)
    .eq('user_id', assignedUserId)
    .eq('is_active', true)
    .maybeSingle();
  if (memberError || !member?.id) {
    throw new Error('The assigned inbound owner is not an active Stark Packmate user. Reassign the inquiry before creating a Lead.');
  }

  const { data: roleLinks, error: roleLinkError } = await db
    .from('user_roles')
    .select('role_id')
    .eq('organization_member_id', member.id);
  if (roleLinkError) throw new Error('Unable to validate the assigned sales owner.');

  const roleIds = (roleLinks ?? []).map((link: any) => link.role_id).filter(Boolean);
  const { data: roles, error: rolesError } = roleIds.length
    ? await db.from('roles').select('id,name').in('id', roleIds)
    : { data: [], error: null };
  if (rolesError) throw new Error('Unable to validate the assigned sales owner.');

  const eligibleRole = (roles ?? []).some((role: any) => ['sales', 'field_sales'].includes(clean(role.name).toLowerCase()));
  const { data: profile } = await db.from('profiles').select('id,email,full_name').eq('id', assignedUserId).maybeSingle();
  const supportLike = /^support@/i.test(clean(profile?.email)) || /^support@/i.test(clean(profile?.full_name));
  if (!eligibleRole || supportLike) {
    throw new Error('The inbound owner must be an active Sales or Field Sales user. Support accounts cannot own converted leads.');
  }

  return assignedUserId;
}

export async function createStarkInteraktLeadOverride(formData: FormData): Promise<void> {
  const workspace = await requireStarkWriteAccess();
  const organizationId = workspace.organization.id;
  const userId = workspace.user.id;
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const rowId = clean(formData.get('rowId'));
  const overrideReason = nullable(formData.get('overrideReason'));
  if (!rowId) throw new Error('Inbound inquiry is required.');

  const { data: row, error } = await db.from('lead_intake_staging').select('*').eq('id', rowId).eq('organization_id', organizationId).maybeSingle();
  if (error || !row?.id || !isSupportedProvider(row.source_provider)) throw new Error('Inbound inquiry not found.');
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
  const provider = clean(row.source_provider).toLowerCase();
  const sourceLabel = provider === 'indiamart'
    ? 'IndiaMART'
    : ([row.ad_network === 'meta' ? 'Meta' : null, row.acquisition_type === 'ctwa' ? 'CTWA' : null, row.ad_platform ? String(row.ad_platform) : null].filter(Boolean).join(' · ') || 'Interakt');
  const indiaMartProduct = provider === 'indiamart' ? clean(row.traits?.query_product_name) : '';
  const indiaMartMessage = provider === 'indiamart' ? clean(row.traits?.query_message) : '';
  const needs = [row.packaging_type, row.pouch_type, row.quantity_text, row.dimensions_print, indiaMartProduct || null].filter(Boolean).join(' · ');
  const companyName = row.company_name || row.contact_name || row.person_name || `${providerLabel(provider)} inbound inquiry`;
  const productInterestLabel = row.pouch_type || row.packaging_type || indiaMartProduct || null;
  const assessment = assessInteraktContact(contactFromRow(row), new Date(), evidenceFromRow(row));
  const notes = [
    row.qualification_notes,
    row.brand_name ? `Brand: ${row.brand_name}` : null,
    `Inbound source: ${sourceLabel}`,
    indiaMartMessage ? `IndiaMART enquiry: ${indiaMartMessage}` : null,
    row.ad_url ? `Ad URL: ${row.ad_url}` : null,
    row.delivery_location ? `Delivery: ${row.delivery_location}` : null,
    row.buying_timeline ? `Buying timeline: ${row.buying_timeline}` : null,
    row.industry ? `Industry: ${row.industry}` : null,
    overrideReason ? `Setu Guru override reason: ${overrideReason}` : null,
    `Setu Guru at conversion: ${assessment.score}/100 · ${assessment.bandLabel}`,
    assessment.leadBlockers.length ? `Sales handoff blockers at conversion: ${assessment.leadBlockers.join(', ')}` : null,
    assessment.laterEnrichment.length ? `Can collect during quote preparation: ${assessment.laterEnrichment.join(', ')}` : null,
    `${providerLabel(provider)} intake: ${row.id}`,
  ].filter(Boolean).join('\n');
  const now = nowIso();
  const leadOwnerUserId = await resolveInboundLeadOwnerUserId(db, organizationId, row);
  const canManageAllInbound = workspace.currentRoles.some((role) => MANAGER_ROLES.has(clean(role).toLowerCase()));
  if (!canManageAllInbound && leadOwnerUserId !== userId) {
    const assignedName = clean(row.setu_assigned_name) || clean(row.interakt_assignee_name) || 'another Sales user';
    redirect(`${INBOUND_PATH}?assignmentChanged=1&assigned=${encodeURIComponent(assignedName)}`);
  }

  const { data: lead, error: leadError } = await db.from('leads').insert({
    organization_id: organizationId, lead_type: 'buyer', owner_user_id: leadOwnerUserId,
    created_by: userId, updated_by: userId, company_name: companyName,
    contact_name: row.person_name || row.contact_name, email: row.email, phone: row.full_phone_number,
    whatsapp_number: row.full_phone_number, product_type: productInterestLabel,
    products_or_needs: needs || null, pipeline_id: pipeline?.id ?? null, stage_id: firstStage?.id ?? null,
    source_type: provider, source_label: sourceLabel, notes, last_contacted_at: row.last_inbound_at,
    industry_metadata: {
      inbound_provider: provider, intake_id: row.id, inbound_assigned_user_id: leadOwnerUserId, inbound_assigned_name: row.setu_assigned_name ?? null, acquisition_type: row.acquisition_type, ad_network: row.ad_network,
      ad_platform: row.ad_platform, ad_url: row.ad_url, meta_campaign_id: row.meta_campaign_id,
      meta_adset_id: row.meta_adset_id, meta_ad_id: row.meta_ad_id, packaging_type: row.packaging_type,
      pouch_type: row.pouch_type, quantity_text: row.quantity_text, brand_name: row.brand_name,
      indiamart_query_product: indiaMartProduct || null, indiamart_query_message: indiaMartMessage || null,
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

  const primaryEmail = clean(row.email).toLowerCase();
  if (primaryEmail) {
    const { data: existingContact } = await db.from('contacts').select('id').eq('organization_id', organizationId).eq('normalized_email', primaryEmail).maybeSingle();
    let contactId = existingContact?.id ?? null;
    if (!contactId) {
      const person = splitPersonName(row.person_name || row.contact_name);
      const { data: createdContact } = await db.from('contacts').insert({
        organization_id: organizationId, first_name: person.firstName, last_name: person.lastName,
        company: companyName, job_title: null, department: 'Purchasing / Procurement', contact_role: 'Buyer / Purchasing Contact',
        email: primaryEmail, phone: row.full_phone_number, whatsapp_number: row.full_phone_number,
        relationship_type: 'buyer', created_by: userId,
      }).select('id').single();
      contactId = createdContact?.id ?? null;
    }
    if (contactId) {
      await db.from('contact_crm_links').update({ is_primary: false }).eq('organization_id', organizationId).eq('entity_id', lead.id).eq('is_primary', true);
      await db.from('contact_crm_links').upsert({
        organization_id: organizationId, contact_id: contactId, entity_type: 'buyer', entity_id: lead.id,
        created_by: userId, is_primary: true,
      }, { onConflict: 'contact_id,entity_type,entity_id' });
    }
  }

  if (productInterestLabel) {
    const { error: interestError } = await db.from('lead_product_interests').insert({
      organization_id: organizationId,
      lead_id: lead.id,
      product_id: null,
      label: productInterestLabel,
      interest_type: 'captured_requirement',
      source_context: {
        source: `${provider}_inbound`, intake_id: row.id, packaging_type: row.packaging_type,
        pouch_type: row.pouch_type, quantity_text: row.quantity_text, industry: row.industry,
        indiamart_query_product: indiaMartProduct || null,
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

  if (!canManageAllInbound) {
    const { data: finalAssignment } = await db
      .from('lead_intake_staging')
      .select('setu_assigned_user_id,setu_assigned_name,interakt_assignee_name')
      .eq('id', row.id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    const stillOwnedByCreator = clean(finalAssignment?.setu_assigned_user_id) === userId;
    if (!stillOwnedByCreator) {
      const assignedName = clean(finalAssignment?.setu_assigned_name) || clean(finalAssignment?.interakt_assignee_name) || clean(row.setu_assigned_name) || 'Sales';
      redirect(`${INBOUND_PATH}?converted=${lead.id}&assigned=${encodeURIComponent(assignedName)}`);
    }
  }

  redirect(`/leads/${lead.id}?source=inbound-qualified`);
}
