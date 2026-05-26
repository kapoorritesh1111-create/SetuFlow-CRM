import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export type QueueType = 'finance' | 'freight';

export function buildRedirect(notice: string, openOrderId?: string) {
  const params = new URLSearchParams({ notice });
  if (openOrderId) params.set('openOrderId', openOrderId);
  return `/orders?${params.toString()}`;
}

export function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeQueueType(value: unknown): QueueType {
  return String(value ?? '').trim().toLowerCase() === 'freight' ? 'freight' : 'finance';
}

export async function requireOrderQueueAccess() {
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

export async function findExecutionOrder(db: any, organizationId: string, quoteId: string) {
  return db
    .from('orders')
    .select('id, lead_id, source_quote_id, source_quote_version_id, legacy_contract_id, order_number, order_type, current_stage, status, approval_state, currency, total_order_value, incoterm, origin_place, destination_place, destination_port, metadata')
    .eq('organization_id', organizationId)
    .eq('source_quote_id', quoteId)
    .maybeSingle();
}

export async function hasApprovedGate(db: any, organizationId: string, orderId: string, stageKeys: string[], gateTypes: string[] = []) {
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

export async function latestApprovedDocument(db: any, organizationId: string, orderId: string, documentType: string) {
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

export async function getOrderLines(db: any, organizationId: string, orderId: string) {
  const { data } = await db
    .from('order_lines')
    .select('id, product_name_snapshot, sku_code, hsn_code, ordered_quantity, approved_quantity, packed_quantity, unit_of_measure, unit_price, currency, line_total, line_discount_type, line_discount_value, line_discount_amount, line_discount_reason')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  return Array.isArray(data) ? data : [];
}

export async function latestPackingPlan(db: any, organizationId: string, orderId: string) {
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

export async function latestFreightRateRequest(db: any, organizationId: string, orderId: string) {
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

export async function recordOrderStageEvent(db: any, payload: {
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

export function lineSummary(lines: any[]) {
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

export function getPackingMetric(plan: any, order: any, formData: FormData, key: string, metadataKey = key) {
  const fromForm = clean(formData.get(key));
  if (fromForm != null) return fromForm;
  const overrides = order?.metadata?.packing_overrides && typeof order.metadata.packing_overrides === 'object' ? order.metadata.packing_overrides : {};
  return clean(plan?.[metadataKey] ?? overrides?.[metadataKey] ?? overrides?.[key]);
}

