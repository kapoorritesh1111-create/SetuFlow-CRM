'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

type QueueType = 'finance' | 'freight';

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

function normalizeQueueType(value: unknown): QueueType {
  return String(value ?? '').trim().toLowerCase() === 'freight' ? 'freight' : 'finance';
}

async function requireOrderQueueAccess() {
  if (!hasSupabaseEnv) redirect(buildRedirect('order-config-error'));
  const workspace = await getWorkspaceAccess();
  const user = workspace.user;
  const organization = workspace.organization;
  if (!user || !organization) redirect(buildRedirect('order-auth-error'));

  const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canReviewCompliance = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canManage && !canReviewCompliance) {
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot queue order integration events.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization };
}

async function findExecutionOrder(db: any, organizationId: string, quoteId: string) {
  return db
    .from('orders')
    .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, order_number, order_type, current_stage, status, approval_state, currency, total_order_value, incoterm, origin_place, destination_place, destination_port, metadata')
    .eq('organization_id', organizationId)
    .eq('source_quote_id', quoteId)
    .maybeSingle();
}

async function hasApprovedGate(db: any, organizationId: string, orderId: string, stageKeys: string[], gateTypes: string[] = []) {
  const { data } = await db
    .from('order_approval_gates')
    .select('id, stage_key, gate_type, status')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .in('stage_key', stageKeys);
  return (Array.isArray(data) ? data : []).some((gate: any) => {
    const status = String(gate.status ?? '').toLowerCase();
    const gateType = String(gate.gate_type ?? '');
    return status === 'approved' && (!gateTypes.length || gateTypes.includes(gateType));
  });
}

async function latestApprovedDocument(db: any, organizationId: string, orderId: string, documentType: string) {
  const { data } = await db
    .from('order_documents')
    .select('id, document_type, status, pdf_storage_path, source_snapshot, generated_from_snapshot, created_at')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .eq('document_type', documentType)
    .eq('status', 'approved')
    .is('superseded_by', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ? data : null;
}

async function getOrderLines(db: any, organizationId: string, orderId: string) {
  const { data } = await db
    .from('order_lines')
    .select('id, product_name_snapshot, sku_code, hsn_code, ordered_quantity, approved_quantity, packed_quantity, unit_of_measure, unit_price, currency, line_total, line_discount_type, line_discount_value, line_discount_amount, line_discount_reason')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  return Array.isArray(data) ? data : [];
}

async function latestPackingPlan(db: any, organizationId: string, orderId: string) {
  const { data } = await db
    .from('packing_plans')
    .select('id, status, total_units, total_master_cases, total_pallets, total_net_weight_kg, total_gross_weight_kg, total_cbm, pickup_location, delivery_destination, freight_notes, override_snapshot, updated_at, created_at')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ? data : null;
}

async function latestFreightRateRequest(db: any, organizationId: string, orderId: string) {
  const { data } = await db
    .from('freight_rate_requests')
    .select('id, status, shipment_mode, incoterm, pickup_address, delivery_address, request_payload, updated_at, created_at')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ? data : null;
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

function lineSummary(lines: any[]) {
  return lines.map((line) => ({
    order_line_id: line.id,
    product: clean(line.product_name_snapshot),
    sku_code: clean(line.sku_code),
    hsn_code: clean(line.hsn_code),
    quantity: safeNumber(line.approved_quantity ?? line.ordered_quantity, 0),
    unit_of_measure: clean(line.unit_of_measure),
    unit_price: safeNumber(line.unit_price, 0),
    currency: clean(line.currency),
    line_total: safeNumber(line.line_total, 0),
    discount: {
      type: clean(line.line_discount_type) ?? 'none',
      value: safeNumber(line.line_discount_value, 0),
      amount: safeNumber(line.line_discount_amount, 0),
      reason: clean(line.line_discount_reason),
    },
  }));
}

function getPackingMetric(plan: any, order: any, formData: FormData, key: string, metadataKey = key) {
  const fromForm = clean(formData.get(key));
  if (fromForm != null) return fromForm;
  const overrides = order?.metadata?.packing_overrides && typeof order.metadata.packing_overrides === 'object' ? order.metadata.packing_overrides : {};
  return clean(plan?.[metadataKey] ?? overrides?.[metadataKey] ?? overrides?.[key]);
}

export async function queueFinanceIntegrationEventAction(formData: FormData) {
  const workspace = await requireOrderQueueAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db: any = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const finalInvoiceApproved = await hasApprovedGate(db, organizationId, order.id, ['final_invoice', 'dispatch_invoice'], ['dispatch_invoice', 'final_invoice']);
  const finalInvoiceDocument = await latestApprovedDocument(db, organizationId, order.id, 'dispatch_invoice');
  if (!finalInvoiceApproved && !finalInvoiceDocument?.id) redirect(buildRedirect('final-invoice-approval-required', order.id));

  const { data: lead } = order.lead_id
    ? await db.from('leads').select('id, company_name, contact_name, email, country').eq('organization_id', organizationId).eq('id', order.lead_id).maybeSingle()
    : { data: null };
  const lines = await getOrderLines(db, organizationId, order.id);
  const currency = clean(order.currency) ?? clean(lines.find((line: any) => line.currency)?.currency) ?? 'USD';
  const total = safeNumber(order.total_order_value, lines.reduce((sum: number, line: any) => sum + safeNumber(line.line_total, 0), 0));
  const payload = {
    manual_review_required: true,
    provider_delivery_claimed: false,
    adapter_name: 'pending',
    event_type: 'invoice_sync_requested',
    order_id: order.id,
    order_number: clean(order.order_number),
    source_quote_id: order.source_quote_id,
    final_invoice_document_id: finalInvoiceDocument?.id ?? null,
    final_invoice_document_type: finalInvoiceDocument?.document_type ?? 'dispatch_invoice',
    pdf_storage_path: clean(finalInvoiceDocument?.pdf_storage_path),
    currency,
    total,
    buyer: {
      lead_id: lead?.id ?? order.lead_id ?? null,
      company_name: clean(lead?.company_name),
      contact_name: clean(lead?.contact_name),
      email: clean(lead?.email),
      country: clean(lead?.country),
    },
    line_items_summary: lineSummary(lines),
    queued_by: actorUserId,
    queued_at: new Date().toISOString(),
  };

  const { data: eventRow, error: eventError } = await db.from('finance_integration_events').insert({
    organization_id: organizationId,
    order_id: order.id,
    order_document_id: finalInvoiceDocument?.id ?? null,
    event_type: 'invoice_sync_requested',
    adapter_name: 'pending',
    status: 'queued',
    payload,
    created_by: actorUserId,
  }).select('id').single();
  if (eventError || !eventRow?.id) redirect(buildRedirect('finance-queue-error', order.id));

  await recordOrderStageEvent(db, {
    organizationId,
    orderId: order.id,
    stageKey: 'final_invoice',
    eventType: 'invoice_sync_requested',
    actorUserId,
    summary: 'Pending finance integration event queued for manual/provider-later processing.',
    eventPayload: { finance_integration_event_id: eventRow.id, adapter_name: 'pending', event_type: 'invoice_sync_requested' },
  });
  await writeAuditLog({
    organizationId,
    action: 'finance_invoice_sync_queued_pending',
    entityType: 'finance_integration_event',
    entityId: eventRow.id,
    actorUserId,
    payload: { previous: null, new: { status: 'queued', adapter_name: 'pending', event_type: 'invoice_sync_requested' }, metadata: { order_id: order.id, quote_id: quoteId } },
  });

  revalidatePath('/orders');
  redirect(buildRedirect('finance-event-queued-pending', order.id));
}

export async function queueFreightBookingEventAction(formData: FormData) {
  const workspace = await requireOrderQueueAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db: any = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const packingApproved = await hasApprovedGate(db, organizationId, order.id, ['packing_sheet'], ['packing_sheet']);
  if (!packingApproved) redirect(buildRedirect('packing-approval-required', order.id));

  const plan = await latestPackingPlan(db, organizationId, order.id);
  const currentRequest = await latestFreightRateRequest(db, organizationId, order.id);
  const shipmentMode = clean(formData.get('shipment_mode')) ?? clean(currentRequest?.shipment_mode) ?? 'manual_review';
  const incoterm = clean(formData.get('incoterm')) ?? clean(currentRequest?.incoterm) ?? clean(order.incoterm);
  const pickup = clean(formData.get('pickup_address')) ?? clean(currentRequest?.pickup_address) ?? getPackingMetric(plan, order, formData, 'pickup_location', 'pickup') ?? clean(order.origin_place);
  const destination = clean(formData.get('delivery_address')) ?? clean(currentRequest?.delivery_address) ?? getPackingMetric(plan, order, formData, 'delivery_destination') ?? clean(order.destination_place) ?? clean(order.destination_port);
  const cartons = safeNumber(formData.get('cartons') ?? plan?.total_master_cases ?? plan?.total_units ?? order.metadata?.packing_overrides?.cartons, 0);
  const pallets = safeNumber(formData.get('pallets') ?? plan?.total_pallets ?? order.metadata?.packing_overrides?.pallets, 0);
  const netWeight = safeNumber(formData.get('net_weight_kg') ?? plan?.total_net_weight_kg ?? order.metadata?.packing_overrides?.net_weight_kg, 0);
  const grossWeight = safeNumber(formData.get('gross_weight_kg') ?? plan?.total_gross_weight_kg ?? order.metadata?.packing_overrides?.gross_weight_kg, 0);
  const cbm = safeNumber(formData.get('cbm') ?? plan?.total_cbm ?? order.metadata?.packing_overrides?.cbm, 0);
  const missing = [
    !cartons ? 'cartons' : null,
    !pallets ? 'pallets' : null,
    !netWeight ? 'net weight' : null,
    !grossWeight ? 'gross weight' : null,
    !cbm ? 'CBM' : null,
    !pickup ? 'pickup' : null,
    !destination ? 'delivery destination' : null,
    !shipmentMode ? 'shipment mode' : null,
    !incoterm ? 'incoterm' : null,
  ].filter(Boolean);
  if (missing.length) redirect(buildRedirect(`freight-payload-incomplete:${missing.join(',')}`, order.id));

  const payload = {
    manual_review_required: true,
    provider_booking_claimed: false,
    adapter_name: 'pending',
    event_type: 'freight_quote_requested',
    order_id: order.id,
    order_number: clean(order.order_number),
    source_quote_id: order.source_quote_id,
    origin: pickup,
    destination,
    incoterm,
    shipment_mode: shipmentMode,
    cartons,
    pallets,
    net_weight_kg: netWeight,
    gross_weight_kg: grossWeight,
    cbm,
    packing_document_reference: plan?.id ?? null,
    freight_notes: clean(formData.get('freight_notes')) ?? clean(plan?.freight_notes) ?? clean(order.metadata?.packing_overrides?.freight_notes),
    queued_by: actorUserId,
    queued_at: new Date().toISOString(),
  };

  let freightRateRequestId = currentRequest?.id ?? null;
  if (!freightRateRequestId) {
    const { data: requestRow, error: requestError } = await db.from('freight_rate_requests').insert({
      organization_id: organizationId,
      order_id: order.id,
      packing_plan_id: plan?.id ?? null,
      request_method: 'manual',
      status: 'queued',
      shipment_mode: shipmentMode,
      incoterm,
      pickup_address: pickup,
      delivery_address: destination,
      destination_port: clean(order.destination_port),
      request_payload: payload,
      created_by: actorUserId,
    }).select('id').single();
    if (requestError || !requestRow?.id) redirect(buildRedirect('freight-request-queue-error', order.id));
    freightRateRequestId = requestRow.id;
  }

  const { data: eventRow, error: eventError } = await db.from('freight_booking_events').insert({
    organization_id: organizationId,
    order_id: order.id,
    freight_rate_request_id: freightRateRequestId,
    event_type: 'freight_quote_requested',
    adapter_name: 'pending',
    status: 'queued',
    shipment_mode: shipmentMode,
    payload,
    created_by: actorUserId,
  }).select('id').single();
  if (eventError || !eventRow?.id) redirect(buildRedirect('freight-event-queue-error', order.id));

  await recordOrderStageEvent(db, {
    organizationId,
    orderId: order.id,
    stageKey: 'freight_queue',
    eventType: 'freight_quote_requested',
    actorUserId,
    summary: 'Pending freight request event queued for manual/provider-later processing.',
    eventPayload: { freight_booking_event_id: eventRow.id, freight_rate_request_id: freightRateRequestId, adapter_name: 'pending', event_type: 'freight_quote_requested' },
  });
  await writeAuditLog({
    organizationId,
    action: 'freight_quote_request_queued_pending',
    entityType: 'freight_booking_event',
    entityId: eventRow.id,
    actorUserId,
    payload: { previous: null, new: { status: 'queued', adapter_name: 'pending', event_type: 'freight_quote_requested' }, metadata: { order_id: order.id, quote_id: quoteId, freight_rate_request_id: freightRateRequestId } },
  });

  revalidatePath('/orders');
  redirect(buildRedirect('freight-event-queued-pending', order.id));
}

export async function retryPendingQueueEventAction(formData: FormData) {
  const workspace = await requireOrderQueueAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const eventId = String(formData.get('event_id') ?? '').trim();
  const queueType = normalizeQueueType(formData.get('queue_type'));
  if (!quoteId || !eventId) redirect(buildRedirect('order-action-invalid'));

  const db: any = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const table = queueType === 'freight' ? 'freight_booking_events' : 'finance_integration_events';
  const { data: row } = await db
    .from(table)
    .select('id, retry_count, status, adapter_name, event_type, order_id')
    .eq('organization_id', organizationId)
    .eq('id', eventId)
    .eq('order_id', order.id)
    .maybeSingle();
  if (!row?.id) redirect(buildRedirect(`${queueType}-event-missing`, order.id));
  if (String(row.adapter_name ?? '').toLowerCase() !== 'pending') redirect(buildRedirect(`${queueType}-event-not-pending-adapter`, order.id));

  const retryCount = safeNumber(row.retry_count, 0) + 1;
  await db
    .from(table)
    .update({ retry_count: retryCount, status: 'queued', error_message: null, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('id', row.id);
  await recordOrderStageEvent(db, {
    organizationId,
    orderId: order.id,
    stageKey: queueType === 'freight' ? 'freight_queue' : 'final_invoice',
    eventType: `${queueType}_pending_event_retry_requested`,
    actorUserId,
    summary: `${queueType === 'freight' ? 'Freight' : 'Finance'} pending queue event marked for retry. No external provider was called.`,
    eventPayload: { event_id: row.id, event_type: row.event_type, adapter_name: 'pending', retry_count: retryCount },
  });

  revalidatePath('/orders');
  redirect(buildRedirect(`${queueType}-retry-queued-pending`, order.id));
}

export async function markQueueEventManuallyCompletedAction(formData: FormData) {
  const workspace = await requireOrderQueueAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const eventId = String(formData.get('event_id') ?? '').trim();
  const manualReference = clean(formData.get('manual_reference'));
  const queueType = normalizeQueueType(formData.get('queue_type'));
  if (!quoteId || !eventId || !manualReference) redirect(buildRedirect('order-action-invalid'));

  const db: any = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));

  const table = queueType === 'freight' ? 'freight_booking_events' : 'finance_integration_events';
  const { data: row } = await db
    .from(table)
    .select('id, status, adapter_name, event_type, order_id')
    .eq('organization_id', organizationId)
    .eq('id', eventId)
    .eq('order_id', order.id)
    .maybeSingle();
  if (!row?.id) redirect(buildRedirect(`${queueType}-event-missing`, order.id));

  const responsePayload = {
    manual_completion: true,
    manual_reference: manualReference,
    completed_by: actorUserId,
    completed_at: new Date().toISOString(),
    provider_delivery_claimed: false,
  };
  const updatePayload: Record<string, unknown> = {
    status: 'manual_completed',
    response_payload: responsePayload,
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (queueType === 'finance') updatePayload.external_ref = manualReference;
  if (queueType === 'freight') updatePayload.booking_reference = manualReference;

  await db
    .from(table)
    .update(updatePayload)
    .eq('organization_id', organizationId)
    .eq('id', row.id);
  await recordOrderStageEvent(db, {
    organizationId,
    orderId: order.id,
    stageKey: queueType === 'freight' ? 'freight_queue' : 'final_invoice',
    eventType: `${queueType}_queue_manually_completed`,
    actorUserId,
    summary: `${queueType === 'freight' ? 'Freight' : 'Finance'} queue event marked manually completed with reference ${manualReference}.`,
    eventPayload: { event_id: row.id, event_type: row.event_type, manual_reference: manualReference, adapter_name: row.adapter_name ?? 'pending' },
  });

  revalidatePath('/orders');
  redirect(buildRedirect(`${queueType}-event-manual-complete`, order.id));
}
