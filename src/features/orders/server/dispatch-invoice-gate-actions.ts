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

function cleanText(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot manage dispatch or invoice gates.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization };
}

async function findExecutionOrder(db: any, organizationId: string, quoteId: string) {
  return db
    .from('orders')
    .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, order_type, current_stage, status, approval_state, currency, incoterm, destination_place, destination_port')
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

async function getOrderLines(db: any, organizationId: string, orderId: string) {
  const { data } = await db
    .from('order_lines')
    .select('id, ordered_quantity, approved_quantity, packed_quantity, loaded_quantity, dispatched_quantity, delivered_quantity, unit_price, line_total, currency, sku_code, product_name_snapshot')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  return Array.isArray(data) ? data : [];
}

async function ensureRequiredTradeRequirementsReviewed(db: any, organizationId: string, orderId: string, stageKeys: string[]) {
  const { data } = await db
    .from('trade_requirements')
    .select('id, title, severity, status, stage_key')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .in('stage_key', stageKeys)
    .in('severity', ['required_before_dispatch', 'required_before_docs_release', 'blocking']);
  const open = (Array.isArray(data) ? data : []).filter((item: any) => !['confirmed', 'satisfied', 'waived'].includes(String(item.status ?? '').toLowerCase()));
  return open;
}

export async function preparePackingListGateAction(formData: FormData) {
  return updateDocumentGate(formData, 'packing_list', 'packing_list', 'prepared');
}

export async function previewPackingListGateAction(formData: FormData) {
  return updateDocumentGate(formData, 'packing_list', 'packing_list', 'previewed');
}

export async function approvePackingListGateAction(formData: FormData) {
  return updateDocumentGate(formData, 'packing_list', 'packing_list', 'approved');
}

export async function prepareLogisticsDocsGateAction(formData: FormData) {
  return updateDocumentGate(formData, 'logistics', 'logistics_documents', 'prepared');
}

export async function previewLogisticsDocsGateAction(formData: FormData) {
  return updateDocumentGate(formData, 'logistics', 'logistics_documents', 'previewed');
}

export async function approveLogisticsDocsGateAction(formData: FormData) {
  return updateDocumentGate(formData, 'logistics', 'logistics_documents', 'approved');
}

export async function prepareFinalInvoiceGateAction(formData: FormData) {
  return updateDocumentGate(formData, 'final_invoice', 'final_invoice', 'prepared');
}

export async function previewFinalInvoiceGateAction(formData: FormData) {
  return updateDocumentGate(formData, 'final_invoice', 'final_invoice', 'previewed');
}

export async function approveFinalInvoiceGateAction(formData: FormData) {
  return updateDocumentGate(formData, 'final_invoice', 'final_invoice', 'approved');
}

async function updateDocumentGate(formData: FormData, stageKey: string, gateType: string, status: 'prepared' | 'previewed' | 'approved') {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const lines = await getOrderLines(db, organizationId, order.id);
  if (!lines.length) redirect(buildRedirect('actual-order-lines-required', quoteId));

  if (status === 'approved' && (gateType === 'logistics_documents' || gateType === 'final_invoice')) {
    const openRequirements = await ensureRequiredTradeRequirementsReviewed(db, organizationId, order.id, ['trade_requirements', 'logistics', 'docs_release', 'final_invoice']);
    if (openRequirements.length) redirect(buildRedirect('trade-requirements-open', quoteId));
  }

  const totalQuantity = lines.reduce((sum: number, line: any) => sum + safeNumber(line.approved_quantity ?? line.ordered_quantity, 0), 0);
  const totalValue = lines.reduce((sum: number, line: any) => {
    const qty = safeNumber(line.dispatched_quantity ?? line.loaded_quantity ?? line.approved_quantity ?? line.ordered_quantity, 0);
    const unit = safeNumber(line.unit_price, 0);
    return sum + (unit ? qty * unit : safeNumber(line.line_total, 0));
  }, 0);
  const snapshot = {
    line_count: lines.length,
    total_quantity: totalQuantity,
    total_value: totalValue || null,
    currency: order.currency ?? lines.find((line: any) => line.currency)?.currency ?? null,
    order_type: order.order_type,
    incoterm: order.incoterm,
    destination_place: order.destination_place,
    destination_port: order.destination_port,
    source_quote_id: quoteId,
    updated_at: new Date().toISOString(),
  };

  const { data: gateResult, error: gateError } = await saveGate(db, {
    organizationId,
    orderId: order.id,
    stageKey,
    gateType,
    status,
    actorUserId,
    reason: status === 'approved' ? `Human approved ${gateType.replace(/_/g, ' ')} gate.` : null,
    previewSnapshot: snapshot,
  });
  if (gateError) redirect(buildRedirect('order-gate-update-failed', quoteId));

  if (status === 'prepared') {
    const { data: existingDocument } = await db
      .from('order_documents')
      .select('id, version_no')
      .eq('organization_id', organizationId)
      .eq('order_id', order.id)
      .eq('document_type', gateType)
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!existingDocument?.id) {
      await db.from('order_documents').insert({
        organization_id: organizationId,
        order_id: order.id,
        legacy_contract_id: order.legacy_contract_id ?? null,
        document_id: null,
        approval_gate_id: gateResult?.id ?? null,
        document_type: gateType,
        stage_key: stageKey,
        status: 'draft',
        version_no: 1,
        generated_from_snapshot: snapshot,
        source_snapshot: { source: 'Sprint 8O gate foundation', source_quote_id: quoteId },
      });
    }
  }

  if (status === 'approved') {
    await db
      .from('order_documents')
      .update({ status: 'approved', approved_by: actorUserId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('order_id', order.id)
      .eq('document_type', gateType)
      .is('superseded_by', null);
  }

  await db
    .from('orders')
    .update({ current_stage: stageKey, approval_state: `${gateType}_${status}`, updated_by: actorUserId, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('id', order.id);

  await recordOrderStageEvent(db, {
    organizationId,
    orderId: order.id,
    stageKey,
    eventType: `${gateType}_${status}`,
    actorUserId,
    summary: `${gateType.replace(/_/g, ' ')} ${status}.`,
    eventPayload: snapshot,
  });

  if (status === 'approved') {
    await writeAuditLog({
      organizationId,
      action: 'order_document_gate_approved',
      entityType: 'order',
      entityId: order.id,
      actorUserId,
      payload: { previous: { approval_state: order.approval_state }, new: { approval_state: `${gateType}_${status}` }, metadata: { quote_id: quoteId, stage_key: stageKey, gate_type: gateType } },
    });
  }

  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect(`${gateType}-${status}`, quoteId));
}

export async function createShipmentDraftGateAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const shipmentMode = cleanText(formData.get('shipment_mode')) ?? 'road';
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const { data: existingShipment } = await db
    .from('shipments')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingShipment?.id) redirect(buildRedirect('shipment-draft-ready', quoteId));

  const { data: shipment, error: shipmentError } = await db
    .from('shipments')
    .insert({
      organization_id: organizationId,
      order_id: order.id,
      freight_rate_quote_id: null,
      shipment_mode: shipmentMode,
      carrier_name: cleanText(formData.get('carrier_name')),
      forwarder_name: cleanText(formData.get('forwarder_name')),
      booking_reference: cleanText(formData.get('booking_reference')),
      bol_awb_number: null,
      tracking_number: cleanText(formData.get('tracking_number')),
      status: 'draft',
      shipment_payload: { source: 'Sprint 8O shipment draft', order_type: order.order_type, destination_place: order.destination_place, destination_port: order.destination_port },
    })
    .select('id')
    .single();
  if (shipmentError || !shipment?.id) redirect(buildRedirect('shipment-draft-error', quoteId));

  await saveGate(db, { organizationId, orderId: order.id, stageKey: 'dispatch', gateType: 'shipment_draft', status: 'prepared', actorUserId, previewSnapshot: { shipment_id: shipment.id, shipment_mode: shipmentMode } });
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'dispatch', eventType: 'shipment_draft_prepared', actorUserId, summary: 'Shipment draft prepared for logistics/dispatch review.', eventPayload: { shipment_id: shipment.id, shipment_mode: shipmentMode } });
  await writeAuditLog({ organizationId, action: 'shipment_draft_prepared', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: null, new: { shipment_id: shipment.id, shipment_mode: shipmentMode }, metadata: { quote_id: quoteId } } });

  revalidatePath('/orders');
  redirect(buildRedirect('shipment-draft-prepared', quoteId));
}

export async function approveDispatchGateAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const openRequirements = await ensureRequiredTradeRequirementsReviewed(db, organizationId, order.id, ['trade_requirements', 'logistics', 'dispatch', 'docs_release']);
  if (openRequirements.length) redirect(buildRedirect('trade-requirements-open', quoteId));

  const { data: shipment } = await db
    .from('shipments')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!shipment?.id) redirect(buildRedirect('shipment-draft-required', quoteId));

  const now = new Date().toISOString();
  await db.from('shipments').update({ status: 'dispatched', dispatched_at: now, updated_at: now }).eq('organization_id', organizationId).eq('id', shipment.id);
  await saveGate(db, { organizationId, orderId: order.id, stageKey: 'dispatch', gateType: 'dispatch_release', status: 'approved', actorUserId, reason: 'Human approved dispatch after logistics/document review.', previewSnapshot: { shipment_id: shipment.id, dispatched_at: now } });
  await db.from('orders').update({ current_stage: 'dispatch', approval_state: 'dispatch_release_approved', updated_by: actorUserId, updated_at: now }).eq('organization_id', organizationId).eq('id', order.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'dispatch', eventType: 'dispatch_release_approved', actorUserId, summary: 'Dispatch release approved by human reviewer.', eventPayload: { shipment_id: shipment.id, dispatched_at: now } });
  await writeAuditLog({ organizationId, action: 'dispatch_release_approved', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: { approval_state: order.approval_state }, new: { approval_state: 'dispatch_release_approved' }, metadata: { quote_id: quoteId, shipment_id: shipment.id } } });

  revalidatePath('/orders');
  redirect(buildRedirect('dispatch-approved', quoteId));
}
