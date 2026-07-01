"use server";

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';
import { scheduleLeadFollowUp } from '@/features/leads/server/actions';

function clean(value: FormDataEntryValue | null) { return String(value ?? '').trim(); }
function nullable(value: FormDataEntryValue | null) { const next = clean(value); return next ? next : null; }
function numberOrNull(value: FormDataEntryValue | null) { const raw = clean(value).replace(/,/g, ''); if (!raw) return null; const parsed = Number(raw); return Number.isFinite(parsed) ? parsed : null; }
function goLead(leadId: string, params: Record<string, string>, hash?: string) { const search = new URLSearchParams(params); redirect(`/leads/${leadId}?${search.toString()}${hash ? `#${hash}` : ''}`); }
function canReassignOwner(roles: string[] | undefined) { return (roles ?? []).some((role) => ['owner', 'admin', 'manager'].includes(String(role).toLowerCase())); }

export async function saveCanonicalLeadDetails(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  const companyName = clean(formData.get('company_name'));
  if (!leadId || !companyName) return;
  const supabase = (await createClient()) as any;
  await supabase.from('leads').update({ company_name: companyName, contact_name: nullable(formData.get('contact_name')), job_title: nullable(formData.get('job_title')), email: nullable(formData.get('email')), phone: nullable(formData.get('phone')), whatsapp_number: nullable(formData.get('whatsapp_number')), website: nullable(formData.get('website')), country: nullable(formData.get('country')), deal_value: numberOrNull(formData.get('deal_value')), deal_currency: nullable(formData.get('deal_currency')), notes: nullable(formData.get('notes')), updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'lead_updated', message: 'Lead details updated from the canonical Lead Detail page.', occurred_at: new Date().toISOString() });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/quote`);
  goLead(leadId, { saved: 'lead' }, 'edit-lead');
}

export async function reassignCanonicalLeadOwner(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  const ownerUserId = clean(formData.get('owner_user_id'));
  if (!leadId || !ownerUserId) return;
  if (!canReassignOwner(workspace.currentRoles)) goLead(leadId, { stageError: 'owner-permission' }, 'lead-owner');
  const supabase = (await createClient()) as any;
  const { data: lead } = await supabase.from('leads').select('owner_user_id').eq('organization_id', workspace.organization!.id).eq('id', leadId).maybeSingle();
  const { data: member } = await supabase.from('organization_members').select('user_id').eq('organization_id', workspace.organization!.id).eq('user_id', ownerUserId).eq('is_active', true).maybeSingle();
  if (!member?.user_id) goLead(leadId, { stageError: 'owner-invalid' }, 'lead-owner');
  const { data: oldProfile } = lead?.owner_user_id ? await supabase.from('profiles').select('full_name, email').eq('id', lead.owner_user_id).maybeSingle() : { data: null };
  const { data: newProfile } = await supabase.from('profiles').select('full_name, email').eq('id', ownerUserId).maybeSingle();
  const oldName = oldProfile?.full_name || oldProfile?.email || 'Unassigned';
  const newName = newProfile?.full_name || newProfile?.email || 'New owner';
  const { error } = await supabase.from('leads').update({ owner_user_id: ownerUserId, updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  if (error) goLead(leadId, { stageError: 'owner-update' }, 'lead-owner');
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'owner_changed', message: `Lead owner changed from ${oldName} to ${newName}.`, occurred_at: new Date().toISOString() });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`);
  goLead(leadId, { saved: 'owner' }, 'lead-owner');
}

export async function moveCanonicalLeadStage(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  const stageId = clean(formData.get('stage_id'));
  if (!leadId || !stageId) return;
  const supabase = (await createClient()) as any;
  const { data: stage, error: stageError } = await supabase.from('pipeline_stages').select('id, name, pipeline_id').eq('id', stageId).maybeSingle();
  if (stageError || !stage?.id) goLead(leadId, { stageError: 'stage-not-found' }, 'stage-strip');
  const { error } = await supabase.from('leads').update({ stage_id: stageId, pipeline_id: stage.pipeline_id, updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  if (error) goLead(leadId, { stageError: 'db-update-failed' }, 'stage-strip');
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'stage_changed', message: `Lead stage moved to ${stage.name} from canonical Lead Detail.`, occurred_at: new Date().toISOString() });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`);
  goLead(leadId, { saved: 'stage' }, 'stage-strip');
}

export async function scheduleCanonicalLeadFollowUp(formData: FormData): Promise<void> {
  const leadId = clean(formData.get('lead_id'));
  await scheduleLeadFollowUp(undefined, formData);
  if (leadId) goLead(leadId, { saved: 'follow-up' }, 'follow-up');
}

export async function completeCanonicalLeadFollowUp(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  const followUpId = clean(formData.get('follow_up_id'));
  if (!leadId || !followUpId) return;
  const supabase = (await createClient()) as any;
  const now = new Date().toISOString();
  await supabase.from('lead_follow_ups').update({ status: 'completed', completed_at: now }).eq('organization_id', workspace.organization!.id).eq('lead_id', leadId).eq('id', followUpId);
  await supabase.from('leads').update({ next_follow_up_at: null, updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'follow_up_completed', message: 'Follow-up marked completed from canonical Lead Detail.', occurred_at: now });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`);
  goLead(leadId, { saved: 'follow-up' }, 'follow-up');
}

export async function saveCanonicalQualificationMapping(formData: FormData) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  if (!leadId) return;
  const supabase = (await createClient()) as any;
  const explicitProductIds = formData.getAll('product_ids').map((value) => String(value).trim()).filter(Boolean);
  const categoryIds = formData.getAll('category_ids').map((value) => String(value).trim()).filter(Boolean);
  const marketIds = formData.getAll('market_ids').map((value) => String(value).trim()).filter(Boolean);
  const qualificationNotes = nullable(formData.get('qualification_notes'));
  const now = new Date().toISOString();
  const categoryProductResult = categoryIds.length
    ? await supabase.from('products').select('id, category_id').eq('organization_id', workspace.organization!.id).in('category_id', categoryIds)
    : { data: [], error: null };
  const categoryProductIds = (categoryProductResult.data ?? []).map((item: any) => item.id).filter(Boolean);
  const productIds = Array.from(new Set([...explicitProductIds, ...categoryProductIds]));
  await supabase.from('lead_product_interests').delete().eq('organization_id', workspace.organization!.id).eq('lead_id', leadId);
  if (productIds.length) await supabase.from('lead_product_interests').insert(productIds.map((productId) => ({ organization_id: workspace.organization!.id, lead_id: leadId, product_id: productId, interest_type: categoryProductIds.includes(productId) && !explicitProductIds.includes(productId) ? 'category_mapped' : 'mapped', source_context: { source: 'canonical_lead_detail', categoryIds } })));
  await supabase.from('lead_markets').delete().eq('organization_id', workspace.organization!.id).eq('lead_id', leadId);
  if (marketIds.length) await supabase.from('lead_markets').insert(marketIds.map((marketId) => ({ organization_id: workspace.organization!.id, lead_id: leadId, market_id: marketId })));
  await supabase.from('leads').update({ notes: qualificationNotes ?? undefined, updated_by: workspace.user!.id }).eq('organization_id', workspace.organization!.id).eq('id', leadId);
  await supabase.from('lead_activities').insert({ organization_id: workspace.organization!.id, lead_id: leadId, actor_user_id: workspace.user!.id, kind: 'lead_qualified', message: `Qualification and mapping saved from canonical Lead Detail (${productIds.length} products, ${marketIds.length} markets).`, occurred_at: now });
  revalidatePath('/leads'); revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/quote`);
  goLead(leadId, { saved: 'qualification' }, 'qualification');
}

async function supplierStageByName(db: any, organizationId: string, name: string) {
  const { data, error } = await db
    .from('pipelines')
    .select('id, pipeline_stages(id, name, sort_order)')
    .eq('organization_id', organizationId)
    .eq('lead_type', 'supplier')
    .eq('is_default', true)
    .maybeSingle();
  if (error || !data?.id) return null;
  const stages = Array.isArray(data.pipeline_stages) ? data.pipeline_stages : [];
  const wanted = name.trim().toLowerCase();
  const stage = stages.find((item: any) => String(item?.name ?? '').trim().toLowerCase() === wanted) ?? null;
  return stage?.id ? { id: stage.id, pipelineId: data.id, name: stage.name } : null;
}

async function recordSupplierAction(db: any, input: { organizationId: string; leadId: string; actorUserId: string; kind: string; message: string; metadata?: Record<string, unknown> }) {
  const nowIso = new Date().toISOString();
  await db.from('lead_activities').insert({
    organization_id: input.organizationId,
    lead_id: input.leadId,
    actor_user_id: input.actorUserId,
    kind: input.kind,
    message: input.message,
    occurred_at: nowIso,
  });
  await db.from('communications').insert({
    organization_id: input.organizationId,
    lead_id: input.leadId,
    related_entity: 'lead',
    related_id: input.leadId,
    communication_type: 'system_note',
    direction: 'internal',
    channel: 'system',
    subject: input.message,
    body: input.message,
    summary: input.message,
    draft_source: 'system',
    status: 'sent',
    sent_at: nowIso,
    created_by: input.actorUserId,
    provider_payload: {},
    metadata: input.metadata ?? {},
  });
}

async function transitionSupplierApproval(formData: FormData, next: { status: string; stageName: string; kind: string; saved: string; message: string; requiresReason?: boolean }) {
  if (!hasSupabaseEnv) return;
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) return;
  const leadId = clean(formData.get('lead_id'));
  const reason = nullable(formData.get('reason'));
  if (!leadId) return;
  if (next.requiresReason && !reason) goLead(leadId, { stageError: 'supplier-reason-required' }, 'approval');
  const supabase = (await createClient()) as any;
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, lead_type, notes')
    .eq('organization_id', workspace.organization!.id)
    .eq('id', leadId)
    .maybeSingle();
  if (leadError || !lead?.id || String(lead.lead_type ?? '').toLowerCase() !== 'supplier') goLead(leadId, { stageError: 'supplier-lead-required' }, 'approval');
  const stage = await supplierStageByName(supabase, workspace.organization!.id, next.stageName);
  if (!stage) goLead(leadId, { stageError: 'supplier-stage-missing' }, 'approval');
  const { parseLeadWorkflow, serializeLeadWorkflow } = await import('@/lib/lead-workflow');
  const { writeAuditLog } = await import('@/lib/auditLog');
  const parsed = parseLeadWorkflow(lead.notes);
  const notes = serializeLeadWorkflow(parsed.plainNotes, {
    ...parsed.workflow,
    supplierCapability: {
      ...parsed.workflow.supplierCapability,
      approvalStatus: next.status,
    },
  });
  const { error } = await supabase
    .from('leads')
    .update({ notes, stage_id: stage!.id, pipeline_id: stage!.pipelineId, updated_by: workspace.user!.id })
    .eq('organization_id', workspace.organization!.id)
    .eq('id', leadId);
  if (error) goLead(leadId, { stageError: 'supplier-transition-failed' }, 'approval');
  await recordSupplierAction(supabase, {
    organizationId: workspace.organization!.id,
    leadId,
    actorUserId: workspace.user!.id,
    kind: next.kind,
    message: reason ? `${next.message} Reason: ${reason}` : next.message,
    metadata: { supplier_status: next.status, stage: next.stageName, reason },
  });
  await writeAuditLog({
    organizationId: workspace.organization!.id,
    action: next.kind,
    entityType: 'lead',
    entityId: leadId,
    actorUserId: workspace.user!.id,
    payload: { new: { supplier_status: next.status, stage: next.stageName }, metadata: { reason, source: 'SupplierCommandCenter' } },
  });
  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/pipeline');
  goLead(leadId, { saved: next.saved }, 'approval');
}

export async function markSupplierUnderReview(formData: FormData) {
  await transitionSupplierApproval(formData, {
    status: 'under_review',
    stageName: 'Compliance Review',
    kind: 'supplier_under_review',
    saved: 'supplier-review',
    message: 'Supplier moved into compliance review.',
  });
}

export async function approveSupplier(formData: FormData) {
  await transitionSupplierApproval(formData, {
    status: 'approved',
    stageName: 'Approved Supplier',
    kind: 'supplier_approved',
    saved: 'supplier-approved',
    message: 'Supplier approved for sourcing and buyer demand linkage.',
  });
}

export async function rejectSupplier(formData: FormData) {
  await transitionSupplierApproval(formData, {
    status: 'rejected',
    stageName: 'Rejected Supplier',
    kind: 'supplier_rejected',
    saved: 'supplier-rejected',
    message: 'Supplier rejected from sourcing workflow.',
    requiresReason: true,
  });
}

export async function setSupplierInactive(formData: FormData) {
  await transitionSupplierApproval(formData, {
    status: 'inactive',
    stageName: 'Inactive Supplier',
    kind: 'supplier_inactive',
    saved: 'supplier-inactive',
    message: 'Supplier set inactive.',
    requiresReason: true,
  });
}
