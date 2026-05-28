'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

function buildRedirect(notice: string, openOrderId?: string) {
  const params = new URLSearchParams({ notice });
  if (openOrderId) params.set('openOrderId', openOrderId);
  return `/orders?${params.toString()}`;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function checked(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === 'true' || raw === 'on' || raw === 'yes' || raw === '1';
}

async function requireOrderWriteAccess() {
  if (!hasSupabaseEnv) redirect(buildRedirect('order-config-error'));
  const workspace = await getWorkspaceAccess();
  const user = workspace.user;
  const organization = workspace.organization;
  if (!user || !organization) redirect(buildRedirect('order-auth-error'));

  const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canReviewCompliance = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canManage && !canReviewCompliance) {
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot manage order execution gates.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization };
}

async function findExecutionOrder(db: any, organizationId: string, quoteId: string) {
  return db
    .from('orders')
    .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, order_type, current_stage, status, approval_state, metadata')
    .eq('organization_id', organizationId)
    .eq('source_quote_id', quoteId)
    .maybeSingle();
}

async function saveGate(db: any, payload: {
  organizationId: string;
  orderId: string;
  stageKey: string;
  gateType: string;
  status: 'prepared' | 'previewed' | 'approved';
  actorUserId?: string | null;
  reason?: string | null;
  previewSnapshot?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const { data: existingGate } = await db
    .from('order_approval_gates')
    .select('id')
    .eq('organization_id', payload.organizationId)
    .eq('order_id', payload.orderId)
    .eq('stage_key', payload.stageKey)
    .eq('gate_type', payload.gateType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const next: Record<string, unknown> = {
    organization_id: payload.organizationId,
    order_id: payload.orderId,
    stage_key: payload.stageKey,
    gate_type: payload.gateType,
    status: payload.status,
    reason: payload.reason ?? null,
    preview_snapshot: payload.previewSnapshot ?? {},
    updated_at: now,
  };
  if (payload.status === 'previewed') next.previewed_at = now;
  if (payload.status === 'approved') {
    next.approved_by = payload.actorUserId ?? null;
    next.approved_at = now;
    next.completed_at = now;
  }

  if (existingGate?.id) {
    return db.from('order_approval_gates').update(next).eq('organization_id', payload.organizationId).eq('id', existingGate.id);
  }
  return db.from('order_approval_gates').insert(next);
}

async function recordOrderStageEvent(db: any, payload: {
  organizationId: string;
  orderId: string;
  stageKey: string;
  eventType: string;
  actorUserId: string;
  summary: string;
  eventPayload?: Record<string, unknown>;
}) {
  return db.from('order_stage_events').insert({
    organization_id: payload.organizationId,
    order_id: payload.orderId,
    stage_key: payload.stageKey,
    event_type: payload.eventType,
    actor_user_id: payload.actorUserId,
    summary: payload.summary,
    payload: payload.eventPayload ?? {},
  });
}

async function hasApprovedGate(db: any, organizationId: string, orderId: string, stageKeys: string[], gateTypes?: string[]) {
  const { data } = await db
    .from('order_approval_gates')
    .select('id, stage_key, gate_type, status')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .in('stage_key', stageKeys);
  return (Array.isArray(data) ? data : []).some((gate: any) => String(gate.status).toLowerCase() === 'approved' && (!gateTypes?.length || gateTypes.includes(String(gate.gate_type))));
}

async function requireApprovedGate(db: any, organizationId: string, orderId: string, stageKeys: string[], notice: string, gateTypes?: string[]) {
  const ok = await hasApprovedGate(db, organizationId, orderId, stageKeys, gateTypes);
  if (!ok) redirect(buildRedirect(notice, orderId));
}

export async function savePackingOverridesAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  await requireApprovedGate(db, organizationId, order.id, ['first_document'], 'first-document-approval-required');

  const overrides = {
    cartons: safeNumber(formData.get('cartons'), 0),
    pallets: safeNumber(formData.get('pallets'), 0),
    net_weight_kg: safeNumber(formData.get('net_weight_kg'), 0),
    gross_weight_kg: safeNumber(formData.get('gross_weight_kg'), 0),
    cbm: safeNumber(formData.get('cbm'), 0),
    pickup: clean(formData.get('pickup')),
    delivery_destination: clean(formData.get('delivery_destination')),
    dimensions: clean(formData.get('dimensions')),
    freight_notes: clean(formData.get('freight_notes')),
    updated_at: new Date().toISOString(),
  };
  const metadata = { ...(order.metadata && typeof order.metadata === 'object' ? order.metadata : {}), packing_overrides: overrides };

  await db.from('orders').update({ metadata, current_stage: 'packing_sheet', approval_state: 'packing_overrides_prepared', updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', order.id);
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'packing_sheet', gateType: 'packing_sheet', status: 'prepared', actorUserId, previewSnapshot: overrides });
  if (gateError) redirect(buildRedirect('packing-save-error', order.id));
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'packing_sheet', eventType: 'packing_overrides_prepared', actorUserId, summary: 'Packing overrides saved for review.', eventPayload: overrides });
  revalidatePath('/orders');
  redirect(buildRedirect('packing-overrides-saved', order.id));
}

export async function approvePackingOverridesAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  await requireApprovedGate(db, organizationId, order.id, ['first_document'], 'first-document-approval-required');

  const snapshot = { source_quote_id: quoteId, approved_at: new Date().toISOString(), overrides: order.metadata?.packing_overrides ?? null };
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'packing_sheet', gateType: 'packing_sheet', status: 'approved', actorUserId, reason: 'Human approved packing plan and overrides for processing.', previewSnapshot: snapshot });
  if (gateError) redirect(buildRedirect('packing-approval-error', order.id));
  await db.from('orders').update({ current_stage: 'processing', approval_state: 'packing_sheet_approved', updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', order.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'packing_sheet', eventType: 'packing_sheet_approved', actorUserId, summary: 'Packing approved; processing checks unlocked.', eventPayload: snapshot });
  revalidatePath('/orders');
  redirect(buildRedirect('packing-approved', order.id));
}

export async function saveProcessingCheckAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  await requireApprovedGate(db, organizationId, order.id, ['packing_sheet'], 'packing-approval-required');

  const checks = {
    picked: checked(formData.get('picked')),
    packed: checked(formData.get('packed')),
    qc_passed: checked(formData.get('qc_passed')),
    note: clean(formData.get('processing_note')),
    updated_at: new Date().toISOString(),
  };
  const complete = checks.picked && checks.packed && checks.qc_passed;
  const metadata = { ...(order.metadata && typeof order.metadata === 'object' ? order.metadata : {}), processing_checks: checks };
  await db.from('orders').update({ metadata, current_stage: complete ? 'delivery_note' : 'processing', approval_state: complete ? 'processing_approved' : 'processing_checks_saved', updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', order.id);
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'processing', gateType: 'pick_pack_qc', status: complete ? 'approved' : 'previewed', actorUserId, reason: complete ? 'Pick, pack, and QC checks approved.' : null, previewSnapshot: checks });
  if (gateError) redirect(buildRedirect('processing-check-save-error', order.id));
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'processing', eventType: complete ? 'processing_approved' : 'processing_checks_saved', actorUserId, summary: complete ? 'Processing checks approved; delivery note unlocked.' : 'Processing checks saved but still incomplete.', eventPayload: checks });
  revalidatePath('/orders');
  redirect(buildRedirect(complete ? 'processing-approved' : 'processing-checks-saved', order.id));
}

export async function approveDeliveryNoteAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  await requireApprovedGate(db, organizationId, order.id, ['processing'], 'processing-approval-required');

  const snapshot = { delivery_reference: clean(formData.get('delivery_reference')), approved_at: new Date().toISOString(), source_quote_id: quoteId };
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'delivery_note', gateType: 'delivery_note', status: 'approved', actorUserId, reason: 'Delivery note approved for final invoice preparation.', previewSnapshot: snapshot });
  if (gateError) redirect(buildRedirect('delivery-note-approval-error', order.id));
  await db.from('orders').update({ current_stage: 'final_invoice', approval_state: 'delivery_note_approved', updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', order.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'delivery_note', eventType: 'delivery_note_approved', actorUserId, summary: 'Delivery Note approved; Final Invoice unlocked.', eventPayload: snapshot });
  revalidatePath('/orders');
  redirect(buildRedirect('delivery-note-approved', order.id));
}

export async function closeOrderAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  await requireApprovedGate(db, organizationId, order.id, ['final_invoice', 'dispatch_invoice'], 'final-invoice-approval-required', ['final_invoice', 'dispatch_invoice']);

  const closeout = {
    payment_received: checked(formData.get('payment_received')),
    payment_reference: clean(formData.get('payment_reference')),
    reconciliation_status: clean(formData.get('reconciliation_status')) ?? 'pending',
    outstanding_amount: safeNumber(formData.get('outstanding_amount'), 0),
    receipt_acknowledged: checked(formData.get('receipt_acknowledged')),
    documents_archived: checked(formData.get('documents_archived')),
    activity_note: clean(formData.get('activity_note')),
    closed_at: new Date().toISOString(),
  };
  const complete = closeout.payment_received && closeout.reconciliation_status === 'reconciled' && closeout.outstanding_amount <= 0 && closeout.receipt_acknowledged && closeout.documents_archived;
  if (!complete) redirect(buildRedirect('closeout-gate-incomplete', order.id));

  const metadata = { ...(order.metadata && typeof order.metadata === 'object' ? order.metadata : {}), closeout };
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'closed', gateType: 'paid_closeout', status: 'approved', actorUserId, reason: 'Payment, reconciliation, receipt acknowledgement, archive, and audit closeout completed.', previewSnapshot: closeout });
  if (gateError) redirect(buildRedirect('closeout-save-error', order.id));
  await db.from('orders').update({ current_stage: 'completed', status: 'completed', approval_state: 'paid_closed', metadata, updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', order.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'closed', eventType: 'paid_closeout_approved', actorUserId, summary: 'Payment closeout complete; order marked completed.', eventPayload: closeout });
  await writeAuditLog({ organizationId, action: 'order_closed_paid', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: { status: order.status, approval_state: order.approval_state }, new: { status: 'completed', approval_state: 'paid_closed', closeout }, metadata: { quote_id: quoteId, order_id: order.id } } });
  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('order-closed-paid', order.id));
}
