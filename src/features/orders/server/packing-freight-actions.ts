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
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot manage packing or freight gates.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }
  return { user, organization };
}

async function findExecutionOrder(db: any, organizationId: string, quoteId: string) {
  return db
    .from('orders')
    .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, order_type, current_stage, status, approval_state, incoterm, origin_country_id, destination_country_id, origin_place, destination_place, destination_port')
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

async function hasApprovedGate(db: any, organizationId: string, orderId: string, stageKey: string) {
  const { data } = await db
    .from('order_approval_gates')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .eq('stage_key', stageKey)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function preparePackingSheetAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const templateKey = String(formData.get('template_key') ?? 'regional_truck').trim() || 'regional_truck';
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  if (!await hasApprovedGate(db, organizationId, order.id, 'first_document')) redirect(buildRedirect('first-document-approval-required', order.id));

  const { data: existingPlan } = await db
    .from('packing_plans')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPlan?.id) redirect(buildRedirect('packing-sheet-ready', order.id));

  const { data: lines } = await db
    .from('order_lines')
    .select('id, sku_code, product_name_snapshot, ordered_quantity, unit_of_measure')
    .eq('organization_id', organizationId)
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (!Array.isArray(lines) || lines.length === 0) redirect(buildRedirect('actual-order-lines-required', order.id));

  const planType = templateKey.includes('20ft') || templateKey.includes('40ft') ? 'container' : templateKey.includes('custom') ? 'custom' : 'regional_truck';
  const containerType = templateKey.includes('40ft') ? '40ft' : templateKey.includes('20ft') ? '20ft' : null;
  const vehicleType = planType === 'regional_truck' ? 'truck' : null;
  const totalUnits = lines.reduce((sum: number, line: any) => sum + safeNumber(line.ordered_quantity, 0), 0);

  const { data: plan, error: planError } = await db
    .from('packing_plans')
    .insert({
      organization_id: organizationId,
      order_id: order.id,
      plan_type: planType,
      template_key: templateKey,
      container_type: containerType,
      vehicle_type: vehicleType,
      status: 'draft',
      total_units: totalUnits || null,
      total_master_cases: totalUnits || null,
      total_inner_boxes: null,
      total_pallets: null,
      total_net_weight_kg: null,
      total_gross_weight_kg: null,
      total_cbm: null,
      assumptions_snapshot: {
        source: 'Sprint 8M foundation',
        template_key: templateKey,
        note: 'Initial plan uses one master case per ordered unit until org/product packaging templates are configured.',
      },
      preview_snapshot: {
        line_count: lines.length,
        template_key: templateKey,
        order_type: order.order_type,
      },
    })
    .select('id')
    .single();

  if (planError || !plan?.id) redirect(buildRedirect('packing-sheet-error', order.id));

  const planLines = lines.map((line: any) => {
    const units = safeNumber(line.ordered_quantity, 0);
    return {
      organization_id: organizationId,
      packing_plan_id: plan.id,
      order_line_id: line.id,
      sku_code: line.sku_code ?? null,
      product_name_snapshot: line.product_name_snapshot ?? 'Order line',
      cartons: units || null,
      units_per_carton: units ? 1 : null,
      inner_boxes: null,
      units_per_inner_box: null,
      pallets: null,
      cases_per_pallet: null,
      pallet_pattern: null,
      net_weight_kg: null,
      gross_weight_kg: null,
      length_mm: null,
      width_mm: null,
      height_mm: null,
      cbm: null,
      marks_numbers: null,
      notes: `Foundation estimate from actual order quantity: ${units} ${line.unit_of_measure ?? 'units'}.`,
    };
  });

  const { error: lineError } = await db.from('packing_plan_lines').insert(planLines);
  if (lineError) redirect(buildRedirect('packing-sheet-error', order.id));

  await saveGate(db, { organizationId, orderId: order.id, stageKey: 'packing_sheet', gateType: 'packing_sheet', status: 'prepared', actorUserId, previewSnapshot: { packing_plan_id: plan.id, template_key: templateKey, line_count: lines.length, total_units: totalUnits || null } });
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'packing_sheet', eventType: 'packing_sheet_prepared', actorUserId, summary: 'Packing Sheet foundation prepared for freight/delivery rate request.', eventPayload: { packing_plan_id: plan.id, template_key: templateKey } });
  await writeAuditLog({ organizationId, action: 'packing_sheet_prepared', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: null, new: { packing_plan_id: plan.id, template_key: templateKey, line_count: lines.length }, metadata: { quote_id: quoteId } } });

  revalidatePath('/orders');
  if (order.lead_id) revalidatePath(`/leads/${order.lead_id}`);
  redirect(buildRedirect('packing-sheet-prepared', order.id));
}

export async function previewPackingSheetAction(formData: FormData) {
  return updatePackingGate(formData, 'previewed');
}

export async function approvePackingSheetAction(formData: FormData) {
  return updatePackingGate(formData, 'approved');
}

async function updatePackingGate(formData: FormData, status: 'previewed' | 'approved') {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));
  const db = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  if (!await hasApprovedGate(db, organizationId, order.id, 'first_document')) redirect(buildRedirect('first-document-approval-required', order.id));
  const { data: plan } = await db.from('packing_plans').select('id, template_key, total_units, total_cbm, total_gross_weight_kg').eq('organization_id', organizationId).eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!plan?.id) redirect(buildRedirect('packing-sheet-required', order.id));

  const now = new Date().toISOString();
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'packing_sheet', gateType: 'packing_sheet', status, actorUserId, reason: status === 'approved' ? 'Human approved packing sheet for freight/delivery rate request.' : null, previewSnapshot: { packing_plan_id: plan.id, template_key: plan.template_key, total_units: plan.total_units, total_cbm: plan.total_cbm, total_gross_weight_kg: plan.total_gross_weight_kg, updated_at: now } });
  if (gateError) redirect(buildRedirect('order-gate-update-failed', order.id));
  await db.from('packing_plans').update({ status, approved_by: status === 'approved' ? actorUserId : null, approved_at: status === 'approved' ? now : null, updated_at: now }).eq('organization_id', organizationId).eq('id', plan.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'packing_sheet', eventType: `packing_sheet_${status}`, actorUserId, summary: status === 'approved' ? 'Packing Sheet approved for freight/delivery request.' : 'Packing Sheet preview marked complete.', eventPayload: { packing_plan_id: plan.id } });
  revalidatePath('/orders');
  redirect(buildRedirect(status === 'approved' ? 'packing-sheet-approved' : 'packing-sheet-previewed', order.id));
}

export async function prepareFreightRateRequestAction(formData: FormData) {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const requestMethod = String(formData.get('request_method') ?? 'email').trim() || 'email';
  const shipmentMode = String(formData.get('shipment_mode') ?? 'road').trim() || 'road';
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));

  const db = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  if (!await hasApprovedGate(db, organizationId, order.id, 'packing_sheet')) redirect(buildRedirect('packing-approval-required', order.id));
  const { data: plan } = await db.from('packing_plans').select('id, status, template_key, total_units, total_cbm, total_gross_weight_kg').eq('organization_id', organizationId).eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!plan?.id) redirect(buildRedirect('packing-sheet-required', order.id));

  const { data: request, error: requestError } = await db
    .from('freight_rate_requests')
    .insert({
      organization_id: organizationId,
      order_id: order.id,
      packing_plan_id: plan.id,
      request_method: requestMethod,
      status: 'draft',
      shipment_mode: shipmentMode,
      incoterm: order.incoterm ?? null,
      pickup_address: order.origin_place ?? null,
      delivery_address: order.destination_place ?? null,
      origin_country_id: order.origin_country_id ?? null,
      destination_country_id: order.destination_country_id ?? null,
      origin_port: order.origin_place ?? null,
      destination_port: order.destination_port ?? null,
      requested_to_snapshot: {},
      request_payload: { packing_plan_id: plan.id, template_key: plan.template_key, total_units: plan.total_units, total_cbm: plan.total_cbm, total_gross_weight_kg: plan.total_gross_weight_kg, fallback_channel: requestMethod },
      created_by: actorUserId,
    })
    .select('id')
    .single();
  if (requestError || !request?.id) redirect(buildRedirect('freight-request-error', order.id));

  await saveGate(db, { organizationId, orderId: order.id, stageKey: 'freight_request', gateType: 'freight_rate_request', status: 'prepared', actorUserId, previewSnapshot: { freight_rate_request_id: request.id, packing_plan_id: plan.id, shipment_mode: shipmentMode, request_method: requestMethod } });
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'freight_request', eventType: 'freight_rate_request_prepared', actorUserId, summary: 'Freight/delivery rate request prepared for preview.', eventPayload: { freight_rate_request_id: request.id, packing_plan_id: plan.id } });
  await writeAuditLog({ organizationId, action: 'freight_rate_request_prepared', entityType: 'order', entityId: order.id, actorUserId, payload: { previous: null, new: { freight_rate_request_id: request.id, shipment_mode: shipmentMode, request_method: requestMethod }, metadata: { quote_id: quoteId, packing_plan_id: plan.id } } });
  revalidatePath('/orders');
  redirect(buildRedirect('freight-request-prepared', order.id));
}

export async function previewFreightRateRequestAction(formData: FormData) {
  return updateFreightGate(formData, 'previewed');
}

export async function approveFreightRateRequestAction(formData: FormData) {
  return updateFreightGate(formData, 'approved');
}

async function updateFreightGate(formData: FormData, status: 'previewed' | 'approved') {
  const workspace = await requireOrderWriteAccess();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect(buildRedirect('order-action-invalid'));
  const db = await createClient();
  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const { data: order, error } = await findExecutionOrder(db, organizationId, quoteId);
  if (error || !order?.id) redirect(buildRedirect('actual-order-lines-required', quoteId));
  if (!await hasApprovedGate(db, organizationId, order.id, 'packing_sheet')) redirect(buildRedirect('packing-approval-required', order.id));
  const { data: request } = await db.from('freight_rate_requests').select('id, packing_plan_id, request_method, shipment_mode').eq('organization_id', organizationId).eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!request?.id) redirect(buildRedirect('freight-request-required', order.id));
  const now = new Date().toISOString();
  const { error: gateError } = await saveGate(db, { organizationId, orderId: order.id, stageKey: 'freight_request', gateType: 'freight_rate_request', status, actorUserId, reason: status === 'approved' ? 'Human approved freight/delivery rate request for fallback send or future integration.' : null, previewSnapshot: { freight_rate_request_id: request.id, packing_plan_id: request.packing_plan_id, request_method: request.request_method, shipment_mode: request.shipment_mode, updated_at: now } });
  if (gateError) redirect(buildRedirect('order-gate-update-failed', order.id));
  await db.from('freight_rate_requests').update({ status, updated_at: now }).eq('organization_id', organizationId).eq('id', request.id);
  await recordOrderStageEvent(db, { organizationId, orderId: order.id, stageKey: 'freight_request', eventType: `freight_rate_request_${status}`, actorUserId, summary: status === 'approved' ? 'Freight/delivery rate request approved for fallback send or future integration.' : 'Freight/delivery rate request preview marked complete.', eventPayload: { freight_rate_request_id: request.id } });
  revalidatePath('/orders');
  redirect(buildRedirect(status === 'approved' ? 'freight-request-approved' : 'freight-request-previewed', order.id));
}
