'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

function buildRedirect(notice: string, quoteId?: string) {
  const params = new URLSearchParams({ notice });
  if (quoteId) params.set('openOrderId', quoteId);
  return `/orders?${params.toString()}`;
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
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot manage order dispatch gates.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization };
}

async function findExecutionOrder(db: any, organizationId: string, quoteId: string) {
  return db
    .from('orders')
    .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, order_type, current_stage, status, approval_state, currency, total_order_value')
    .eq('organization_id', organizationId)
    .eq('source_quote_id', quoteId)
    .maybeSingle();
}

async function saveGate(db: any, payload: {
  organizationId: string;
  orderId: string;
  stageKey: string;
  gateType: string;
  status: string;
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
  if (payload.status === 'prepared') next.prepared_at = now;
  if (payload.status === 'approved') {
    next.approved_by = payload.actorUserId ?? null;
    next.approved_at = now;
    next.completed_at = now;
  }
  if (existingGate?.id) return db.from('order_approval_gates').update(next).eq('organization_id', payload.organizationId).eq('id', existingGate.id);
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

async function upsertOrderDocument(db: any, input: {
  organizationId: string;
  orderId: string;
  documentType: 'delivery_note' | 'dispatch_invoice';
  actorUserId: string;
  sourceQuoteId?: string | null;
  sourceQuoteVersionId?: string | null;
  status: 'prepared' | 'approved';
}) {
  const { data: existing } = await db
    .from('order_documents')
    .select('id, version_no')
    .eq('organization_id', input.organizationId)
    .eq('order_id', input.orderId)
    .eq('document_type', input.documentType)
    .is('superseded_by', null)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();
  const payload = {
    status: input.status,
    updated_at: now,
    approved_by: input.status === 'approved' ? input.actorUserId : null,
    approved_at: input.status === 'approved' ? now : null,
    source_snapshot: {
      workflow: 'dispatch_document_gate',
      source_quote_id: input.sourceQuoteId ?? null,
      source_quote_version_id: input.sourceQuoteVersionId ?? null,
      document_type: input.documentType,
      status: input.status,
    },
  };
  if (existing?.id) {
    const { data, error } = await db.from('order_documents').update(payload).eq('organization_id', input.organizationId).eq('id', existing.id).select('id').single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await db.from('order_documents').insert({
    organization_id: input.organizationId,
    order_id: input.orderId,
    document_type: input.documentType,
    stage_key: input.documentType,
    version_no: 1,
    generated_from_snapshot: {
      source: 'dispatch-document-actions',
      source_quote_id: input.sourceQuoteId ?? null,
      source_quote_version_id: input.sourceQuoteVersionId ?? null,
    },
    ...payload,
  }).select('id').single();
  if (error) throw error;
  return data;
}

async function prepareDispatchDocument(formData: FormData, documentType: 'delivery_note' | 'dispatch_invoice') {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));
  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const stageKey = documentType;
  const label = documentType === 'delivery_note' ? 'Delivery Note' : 'Final / Commercial Invoice';
  try {
    await upsertOrderDocument(db, { organizationId, orderId: order.id, documentType, actorUserId, sourceQuoteId: quoteId, sourceQuoteVersionId: order.source_quote_version_id ?? null, status: 'prepared' });
  } catch {
    redirect(buildRedirect(documentType === 'delivery_note' ? 'delivery-note-error' : 'final-invoice-error', quoteId));
  }
  await saveGate(db, { organizationId, orderId: order.id, stageKey, gateType: documentType, status: 'prepared', actorUserId, previewSnapshot: { source_quote_id: quoteId, document_type: documentType, order_total: order.total_order_value ?? null, currency: order.currency ?? null } });
  await db.from('orders').update({ current_stage: documentType === 'delivery_note' ? 'delivery_note' : 'dispatch_invoice', approval_state: `${documentType}_prepared`, status: 'active', updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', order.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey, eventType: `${documentType}_prepared`, actorUserId, summary: `${label} prepared for preview and approval.`, eventPayload: { source_quote_id: quoteId, document_type: documentType } });
  await writeAuditLog({ organizationId, action: `${documentType}_prepared`, entityType: 'order', entityId: order.id, actorUserId, payload: { previous: { current_stage: order.current_stage, approval_state: order.approval_state }, new: { current_stage: documentType === 'delivery_note' ? 'delivery_note' : 'dispatch_invoice', approval_state: `${documentType}_prepared` }, metadata: { quote_id: quoteId } } });
  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect(documentType === 'delivery_note' ? 'delivery-note-prepared' : 'final-invoice-prepared', quoteId));
}

async function approveDispatchDocument(formData: FormData, documentType: 'delivery_note' | 'dispatch_invoice') {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));
  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const nextStage = documentType === 'delivery_note' ? 'dispatch_invoice' : 'completed';
  const nextApproval = documentType === 'delivery_note' ? 'delivery_note_approved' : 'dispatch_invoice_approved';
  const nextStatus = documentType === 'dispatch_invoice' ? 'completed' : 'active';
  const stageKey = documentType;
  const label = documentType === 'delivery_note' ? 'Delivery Note' : 'Final / Commercial Invoice';
  try {
    await upsertOrderDocument(db, { organizationId, orderId: order.id, documentType, actorUserId, sourceQuoteId: quoteId, sourceQuoteVersionId: order.source_quote_version_id ?? null, status: 'approved' });
  } catch {
    redirect(buildRedirect(documentType === 'delivery_note' ? 'delivery-note-error' : 'final-invoice-error', quoteId));
  }
  await saveGate(db, { organizationId, orderId: order.id, stageKey, gateType: documentType, status: 'approved', actorUserId, reason: `${label} approved by user.`, previewSnapshot: { source_quote_id: quoteId, document_type: documentType, next_stage: nextStage, order_total: order.total_order_value ?? null, currency: order.currency ?? null } });
  await db.from('orders').update({ current_stage: nextStage, approval_state: nextApproval, status: nextStatus, updated_by: actorUserId, updated_at: new Date().toISOString() }).eq('organization_id', organizationId).eq('id', order.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey, eventType: `${documentType}_approved`, actorUserId, summary: documentType === 'delivery_note' ? 'Delivery Note approved; order advanced to final invoice.' : 'Final / Commercial Invoice approved; order advanced to paid & closed archive stage.', eventPayload: { source_quote_id: quoteId, document_type: documentType, next_stage: nextStage } });
  await writeAuditLog({ organizationId, action: `${documentType}_approved`, entityType: 'order', entityId: order.id, actorUserId, payload: { previous: { current_stage: order.current_stage, approval_state: order.approval_state, status: order.status }, new: { current_stage: nextStage, approval_state: nextApproval, status: nextStatus }, metadata: { quote_id: quoteId } } });
  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect(documentType === 'delivery_note' ? 'delivery-note-approved' : 'final-invoice-approved', quoteId));
}

export async function prepareDeliveryNoteAction(formData: FormData) {
  return prepareDispatchDocument(formData, 'delivery_note');
}

export async function approveDeliveryNoteAction(formData: FormData) {
  return approveDispatchDocument(formData, 'delivery_note');
}

export async function prepareFinalInvoiceAction(formData: FormData) {
  return prepareDispatchDocument(formData, 'dispatch_invoice');
}

export async function approveFinalInvoiceAction(formData: FormData) {
  return approveDispatchDocument(formData, 'dispatch_invoice');
}
