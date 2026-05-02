"use server";

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { writeAuditLog } from '@/lib/auditLog';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';

type ActionState = { error?: string; success?: string };

type TradeEventsActionDb = {
  from: (table: string) => any;
};


function normalizeIsoDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function validateOrganizationRecordIds(db: any, table: string, organizationId: string, ids: string[]) {
  if (!ids.length) return { validIds: [] as string[], error: null as string | null };

  const { data, error } = await db
    .from(table)
    .select('id')
    .eq('organization_id', organizationId)
    .in('id', ids);

  if (error) return { validIds: [] as string[], error: error.message };
  return { validIds: (data ?? []).map((item: { id: string }) => item.id), error: null as string | null };
}

async function resolveDefaultNextStepId(db: any, organizationId: string) {
  const { data, error } = await db
    .from('next_steps')
    .select('id, name')
    .eq('organization_id', organizationId)
    .ilike('name', 'Send Introduction')
    .limit(1)
    .maybeSingle();

  if (error) return { nextStepId: null as string | null, error: error.message };
  if (!data?.id) return { nextStepId: null as string | null, error: 'Default next step "Send Introduction" is not configured.' };
  return { nextStepId: data.id, error: null as string | null };
}

async function resolvePipelineStageDefaults(db: any, organizationId: string, leadType: 'buyer' | 'supplier') {
  const { data: pipelineRows, error: pipelineError } = await db
    .from('pipelines')
    .select('id, lead_type, is_default')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (pipelineError) return { pipelineId: null as string | null, stageId: null as string | null, error: pipelineError.message };

  const matchedPipeline = (pipelineRows ?? []).find((row: any) => row?.lead_type?.toLowerCase() === leadType && row?.is_default)
    ?? (pipelineRows ?? []).find((row: any) => row?.lead_type?.toLowerCase() === leadType)
    ?? (pipelineRows ?? []).find((row: any) => row?.is_default)
    ?? (pipelineRows ?? [])[0];

  if (!matchedPipeline?.id) return { pipelineId: null, stageId: null, error: 'No pipeline is configured for this organization.' };

  const { data: stageRows, error: stageError } = await db
    .from('pipeline_stages')
    .select('id, pipeline_id, sort_order')
    .eq('pipeline_id', matchedPipeline.id)
    .order('sort_order', { ascending: true });

  if (stageError) return { pipelineId: null, stageId: null, error: stageError.message };
  if (!(stageRows ?? []).length) return { pipelineId: null, stageId: null, error: 'The selected pipeline has no stages configured.' };

  return { pipelineId: matchedPipeline.id, stageId: stageRows[0].id as string, error: null as string | null };
}

async function insertCommunication(db: any, payload: Record<string, unknown>) {
  return db.from('communications').insert({
    related_entity: 'trade_event_entry',
    communication_type: 'system_note',
    direction: 'internal',
    channel: 'system',
    draft_source: 'system',
    status: 'sent',
    sent_at: new Date().toISOString(),
    provider_payload: {},
    metadata: {},
    ...payload,
  });
}

async function writeTradeEventAuditLog(input: {
  organizationId: string;
  actorUserId: string;
  action: 'trade_event_created' | 'trade_event_updated' | 'trade_event_deleted' | 'trade_event_entry_captured' | 'trade_event_entry_converted';
  entityType: string;
  entityId?: string | null;
  previous?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  await writeAuditLog({
    organizationId: input.organizationId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    actorUserId: input.actorUserId,
    payload: {
      previous: input.previous ?? null,
      new: input.next ?? null,
      metadata: input.metadata ?? {},
    },
  });
}

export async function saveTradeEvent(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const supabase = await createClient();
  const db = supabase as unknown as TradeEventsActionDb;
  const id = String(formData.get('id') ?? '').trim() || null;
  const organization_id = workspace.organization.id;
  const previousEvent = id
    ? ((await db.from('trade_events').select('id, name, city, country, starts_on, ends_on').eq('id', id).eq('organization_id', organization_id).maybeSingle()).data ?? null) as Record<string, unknown> | null
    : null;

  const payload = {
    organization_id,
    name: String(formData.get('name') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim() || null,
    country: String(formData.get('country') ?? '').trim() || null,
    starts_on: String(formData.get('starts_on') ?? '').trim() || null,
    ends_on: String(formData.get('ends_on') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  };

  if (!payload.name) return { error: 'Trade event name is required.' };
  if (payload.starts_on && payload.ends_on && payload.ends_on < payload.starts_on) {
    return { error: 'Event end date cannot be earlier than the start date.' };
  }

  let savedTradeEventId = id;
  if (id) {
    const { error } = await db.from('trade_events').update(payload).eq('id', id).eq('organization_id', organization_id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await db.from('trade_events').insert(payload).select('id').single();
    if (error) return { error: error.message };
    savedTradeEventId = data?.id ?? null;
  }

  await writeTradeEventAuditLog({
    organizationId: organization_id,
    actorUserId: workspace.user.id,
    action: id ? 'trade_event_updated' : 'trade_event_created',
    entityType: 'trade_event',
    entityId: savedTradeEventId,
    previous: previousEvent,
    next: payload,
    metadata: { name: payload.name },
  });

  revalidatePath('/trade-events');
  revalidatePath('/leads');
  revalidatePath('/dashboard');

  return { success: id ? 'Trade event updated.' : 'Trade event created.' };
}

export async function saveTradeEventCaptureDefaults(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const eventId = formData.get('event_id') as string;
  const sourceLabel = formData.get('source_label') as string;
  const quickLeadTitle = formData.get('quick_lead_title') as string;
  if (!eventId) return;
  const db = supabase as unknown as TradeEventsActionDb;
  await db.from('trade_events')
    .update({ capture_defaults: { source_label: sourceLabel, quick_lead_title: quickLeadTitle } })
    .eq('id', eventId);
  revalidatePath('/admin/trade-events');
  revalidatePath('/trade-events');
  revalidatePath('/leads');
}

export async function deleteTradeEvent(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { error: 'Trade event ID is required.' };

  const supabase = await createClient();
  const db = supabase as unknown as TradeEventsActionDb;
  const { data: existingEvent } = await db.from('trade_events').select('id, name, city, country, starts_on, ends_on').eq('id', id).eq('organization_id', workspace.organization.id).maybeSingle();
  const { error } = await db.from('trade_events').delete().eq('id', id).eq('organization_id', workspace.organization.id);
  if (error) return { error: error.message };

  await writeTradeEventAuditLog({
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    action: 'trade_event_deleted',
    entityType: 'trade_event',
    entityId: id,
    previous: (existingEvent ?? null) as Record<string, unknown> | null,
    metadata: {
      name: typeof (existingEvent as { name?: unknown } | null)?.name === 'string' ? String((existingEvent as { name?: unknown }).name) : null,
    },
  });

  revalidatePath('/trade-events');
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { success: 'Trade event deleted.' };
}

export async function saveTradeEventEntry(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const supabase = await createClient();
  const db = supabase as unknown as TradeEventsActionDb;

  const trade_event_id = String(formData.get('trade_event_id') ?? '').trim();
  const captured_company_name = String(formData.get('captured_company_name') ?? '').trim();
  const captured_contact_name = String(formData.get('captured_contact_name') ?? '').trim();
  const captured_email = String(formData.get('captured_email') ?? '').trim();
  const captured_phone = String(formData.get('captured_phone') ?? '').trim();

  const source_label = String(formData.get('source_label') ?? '').trim() || null;
  const reviewConfirmed = String(formData.get('review_confirmed') ?? '').trim();
  const duplicateDisposition = String(formData.get('duplicate_disposition') ?? '').trim();
  const sourceImageRetained = String(formData.get('source_image_retained') ?? '').trim();
  const qualificationDisposition = String(formData.get('qualification_disposition') ?? '').trim();
  const leadConversionBoundary = String(formData.get('lead_conversion_boundary') ?? '').trim();
  const handoffPreparationReady = String(formData.get('handoff_preparation_ready') ?? '').trim();
  const handoffTrigger = String(formData.get('handoff_trigger') ?? '').trim();
  const handoffDistributionScope = String(formData.get('handoff_distribution_scope') ?? '').trim();
  const handoffPackageProfile = String(formData.get('handoff_package_profile') ?? '').trim();
  const handoffAuditState = String(formData.get('handoff_audit_state') ?? '').trim();
  const handoffIssuanceControl = String(formData.get('handoff_issuance_control') ?? '').trim();
  const handoffRollbackReason = String(formData.get('handoff_rollback_reason') ?? '').trim();
  const handoffReconciliationNotes = String(formData.get('handoff_reconciliation_notes') ?? '').trim();
  const handoffExportEvidence = String(formData.get('handoff_export_evidence') ?? '').trim();
  const handoffExportConfirmed = String(formData.get('handoff_export_confirmed') ?? '').trim();

  if (!trade_event_id) return { error: 'Trade event is required.' };
  if (!captured_company_name) return { error: 'Company name is required.' };
  if (source_label === 'ocr_business_card_review' && reviewConfirmed !== 'yes') {
    return { error: 'Review confirmation is required before saving OCR intake entries.' };
  }
  if (source_label === 'ocr_business_card_review' && !duplicateDisposition) {
    return { error: 'Duplicate review disposition is required before saving OCR intake entries.' };
  }
  if (source_label === 'ocr_business_card_review' && !qualificationDisposition) {
    return { error: 'Qualification disposition is required before saving OCR intake entries.' };
  }
  if (source_label === 'ocr_business_card_review' && !leadConversionBoundary) {
    return { error: 'Lead-conversion boundary is required before saving OCR intake entries.' };
  }
  if (source_label === 'ocr_business_card_review' && !sourceImageRetained) {
    return { error: 'Source image retention metadata is required before saving OCR intake entries.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && handoffPreparationReady !== 'yes') {
    return { error: 'Export-ready handoff requires the entry to be prepared for downstream handoff review before save.' };
  }
  if (source_label === 'ocr_business_card_review' && qualificationDisposition === 'qualification_ready' && !captured_contact_name && !captured_email && !captured_phone) {
    return { error: 'Qualification-ready OCR entries require a contact name, email, or phone before save.' };
  }
  if (source_label === 'ocr_business_card_review' && qualificationDisposition === 'qualification_ready' && leadConversionBoundary !== 'prepare_for_qualification_queue') {
    return { error: 'Qualification-ready OCR entries must be staged for the qualification queue before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && (!captured_contact_name || (!captured_email && !captured_phone))) {
    return { error: 'Export-ready handoff requires a confirmed contact name plus a confirmed email or phone before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && handoffDistributionScope !== 'single_contact_export_review') {
    return { error: 'Export-ready handoff must stay limited to single-contact export review before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && !handoffPackageProfile) {
    return { error: 'Reviewed contact package profile is required before saving export-ready handoff entries.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && !handoffIssuanceControl) {
    return { error: 'Export issuance control is required before saving export-ready OCR intake entries.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && !handoffAuditState) {
    return { error: 'Handoff audit state is required before saving export-ready OCR intake entries.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && !['export_ready_review', 'exported_single_contact', 'export_rolled_back_review'].includes(handoffAuditState)) {
    return { error: 'Export-ready handoff must record export-ready review, exported single-contact visibility, or export rolled back to review before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && handoffIssuanceControl === 'export_ready_not_issued' && handoffAuditState !== 'export_ready_review') {
    return { error: 'Export-ready-not-issued control must keep the handoff in export-ready review state before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && handoffIssuanceControl === 'issue_single_contact_export' && handoffAuditState !== 'exported_single_contact') {
    return { error: 'Issued single-contact export must record exported single-contact audit state before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && handoffIssuanceControl === 'rollback_after_export' && handoffAuditState !== 'export_rolled_back_review') {
    return { error: 'Rolled-back export visibility must record export rolled back to review before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && handoffIssuanceControl === 'rollback_after_export' && handoffDistributionScope !== 'review_only') {
    return { error: 'Rolled-back export visibility must return the handoff to review-only scope before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && handoffAuditState === 'exported_single_contact' && !handoffExportEvidence) {
    return { error: 'Exported single-contact handoff requires export evidence or an exception note before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && handoffIssuanceControl === 'rollback_after_export' && !handoffRollbackReason) {
    return { error: 'Rollback-safe handoff changes require a rollback reason before save.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && !handoffReconciliationNotes) {
    return { error: 'Downstream reconciliation notes are required before saving export-ready OCR intake entries.' };
  }
  if (source_label === 'ocr_business_card_review' && handoffTrigger === 'mark_export_ready' && handoffExportConfirmed !== 'yes') {
    return { error: 'Export-ready handoff confirmation is required before saving OCR intake entries.' };
  }

  const payload = {
    organization_id: workspace.organization.id,
    trade_event_id,
    captured_company_name,
    captured_contact_name: captured_contact_name || null,
    captured_job_title: String(formData.get('captured_job_title') ?? '').trim() || null,
    captured_email: captured_email || null,
    captured_phone: captured_phone || null,
    captured_country: String(formData.get('captured_country') ?? '').trim() || null,
    captured_notes: String(formData.get('captured_notes') ?? '').trim() || null,
    source_label,
    status: 'new',
    created_by: workspace.user.id,
  };

  const { data: createdEntry, error } = await db.from('trade_event_entries').insert(payload).select('id').single();
  if (error) return { error: error.message };

  await writeTradeEventAuditLog({
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    action: 'trade_event_entry_captured',
    entityType: 'trade_event_entry',
    entityId: createdEntry?.id ?? null,
    next: {
      trade_event_id,
      captured_company_name,
      status: 'new',
      qualificationDisposition: qualificationDisposition || null,
      leadConversionBoundary: leadConversionBoundary || null,
      handoffTrigger: handoffTrigger || null,
      handoffAuditState: handoffAuditState || null,
    },
    metadata: {
      captured_company_name,
      duplicateDisposition: duplicateDisposition || null,
      sourceImageRetained: sourceImageRetained || null,
      handoffPreparationReady: handoffPreparationReady || null,
      handoffDistributionScope: handoffDistributionScope || null,
      handoffPackageProfile: handoffPackageProfile || null,
      handoffIssuanceControl: handoffIssuanceControl || null,
    },
  });

  revalidatePath('/trade-events');
  revalidatePath('/leads');
  revalidatePath('/dashboard');

  return { success: 'Trade event entry captured.' };
}

export async function convertTradeEventEntryToLead(formData: FormData): Promise<void> {
  if (!hasSupabaseEnv) return;

  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return;

  const entryId = String(formData.get('entry_id') ?? '').trim();
  if (!entryId) return;

  const supabase = await createClient();
  const db = supabase as unknown as TradeEventsActionDb;

  const { data: entry, error: entryError } = await db
    .from('trade_event_entries')
    .select('id, organization_id, trade_event_id, captured_company_name, captured_contact_name, captured_job_title, captured_email, captured_phone, captured_country, captured_notes, source_label, status, converted_lead_id')
    .eq('organization_id', workspace.organization.id)
    .eq('id', entryId)
    .maybeSingle();

  if (entryError || !entry?.id) return;
  if (entry.converted_lead_id) {
    redirect(`/leads/${entry.converted_lead_id}?tab=workflow&handoff=capture-converted&mode=buyers`);
  }

  const companyName = String(entry.captured_company_name ?? '').trim();
  if (!companyName) return;

  const [{ nextStepId, error: nextStepError }, { pipelineId, stageId, error: pipelineError }] = await Promise.all([
    resolveDefaultNextStepId(db, workspace.organization.id),
    resolvePipelineStageDefaults(db, workspace.organization.id, 'buyer'),
  ]);

  if (nextStepError || pipelineError || !nextStepId || !pipelineId || !stageId) return;

  let countryId: string | null = null;
  let marketId: string | null = null;
  const capturedCountry = String(entry.captured_country ?? '').trim();
  if (capturedCountry) {
    const { data: countryRow } = await db
      .from('countries')
      .select('id, market_id, name')
      .eq('organization_id', workspace.organization.id)
      .ilike('name', capturedCountry)
      .limit(1)
      .maybeSingle();
    countryId = countryRow?.id ?? null;
    marketId = countryRow?.market_id ?? null;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const nextFollowUpAt = normalizeIsoDateTime(tomorrow.toISOString()) ?? new Date().toISOString();

  const leadPayload = {
    organization_id: workspace.organization.id,
    lead_type: 'buyer',
    company_name: companyName,
    contact_name: String(entry.captured_contact_name ?? '').trim() || null,
    job_title: String(entry.captured_job_title ?? '').trim() || null,
    email: String(entry.captured_email ?? '').trim() || null,
    phone: String(entry.captured_phone ?? '').trim() || null,
    country: capturedCountry || null,
    country_id: countryId,
    source_type: 'trade_event_entry',
    source_label: String(entry.source_label ?? '').trim() || 'trade_event_entry',
    stage_id: stageId,
    pipeline_id: pipelineId,
    next_step_id: nextStepId,
    owner_user_id: workspace.user.id,
    trade_event_id: entry.trade_event_id,
    notes: String(entry.captured_notes ?? '').trim() || null,
    next_follow_up_at: nextFollowUpAt,
    intro_sent: false,
    created_by: workspace.user.id,
    updated_by: workspace.user.id,
  };

  const { data: createdLead, error: leadError } = await db
    .from('leads')
    .insert(leadPayload)
    .select('id, company_name')
    .single();

  if (leadError || !createdLead?.id) return;

  if (marketId) {
    const { validIds } = await validateOrganizationRecordIds(db, 'markets', workspace.organization.id, [marketId]);
    if (validIds.length === 1) {
      await db.from('lead_markets').insert({ organization_id: workspace.organization.id, lead_id: createdLead.id, market_id: marketId });
    }
  }

  await db.from('lead_follow_ups').insert({
    organization_id: workspace.organization.id,
    lead_id: createdLead.id,
    assigned_user_id: workspace.user.id,
    scheduled_at: nextFollowUpAt,
    status: 'scheduled',
    notes: 'Auto-created from trade event entry conversion.',
    created_by: workspace.user.id,
  });

  await db.from('lead_activities').insert([
    {
      organization_id: workspace.organization.id,
      lead_id: createdLead.id,
      actor_user_id: workspace.user.id,
      kind: 'lead_created',
      message: `${createdLead.company_name} was created from a trade event entry.`,
      occurred_at: new Date().toISOString(),
    },
    {
      organization_id: workspace.organization.id,
      lead_id: createdLead.id,
      actor_user_id: workspace.user.id,
      kind: 'follow_up_scheduled',
      message: `Follow-up scheduled for ${createdLead.company_name}.`,
      occurred_at: new Date().toISOString(),
    },
  ]);

  await insertCommunication(db, {
    organization_id: workspace.organization.id,
    lead_id: createdLead.id,
    related_id: entry.id,
    communication_type: 'system_note',
    subject: 'Lead converted from trade event entry',
    body: `${createdLead.company_name} was converted from trade event entry capture and assigned a follow-up for ${tomorrow.toLocaleDateString('en-US')}.`,
    summary: 'Trade event entry converted to lead',
    created_by: workspace.user.id,
    metadata: {
      source: 'convertTradeEventEntryToLead',
      trade_event_id: entry.trade_event_id,
      entry_status_before: entry.status,
    },
  });

  await db
    .from('trade_event_entries')
    .update({
      status: 'converted',
      converted_lead_id: createdLead.id,
      converted_at: new Date().toISOString(),
      qualified_at: new Date().toISOString(),
      assigned_user_id: workspace.user.id,
      normalized_payload: {
        lead_id: createdLead.id,
        company_name: createdLead.company_name,
        source_type: 'trade_event_entry',
      },
    })
    .eq('organization_id', workspace.organization.id)
    .eq('id', entry.id);

  await writeTradeEventAuditLog({
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    action: 'trade_event_entry_converted',
    entityType: 'trade_event_entry',
    entityId: entry.id,
    previous: {
      status: entry.status,
      converted_lead_id: entry.converted_lead_id,
    },
    next: {
      status: 'converted',
      lead_id: createdLead.id,
    },
    metadata: {
      company_name: createdLead.company_name,
      lead_id: createdLead.id,
      trade_event_id: entry.trade_event_id,
    },
  });

  revalidatePath('/trade-events');
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  redirect(`/leads/${createdLead.id}?tab=workflow&handoff=capture-converted&mode=buyers`);
}
