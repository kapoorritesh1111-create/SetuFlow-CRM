import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export type MobileOrderDocument = {
  id: string;
  type: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
};

export type MobileOrderGate = {
  id: string;
  stageKey: string;
  status: string;
};

export type MobileOrderLine = {
  id: string;
  productName: string;
  quantity: number | null;
  packedQuantity: number | null;
  dispatchedQuantity: number | null;
  deliveredQuantity: number | null;
};

export type MobileOrder = {
  id: string;
  orderNumber: string;
  companyName: string;
  contactName: string | null;
  status: string;
  stage: string;
  currency: string;
  totalValue: number | null;
  incoterm: string | null;
  paymentTerms: string | null;
  paymentStatus: string | null;
  fulfillmentStatus: string | null;
  dispatchStatus: string | null;
  blockerReasons: string[];
  documents: MobileOrderDocument[];
  gates: MobileOrderGate[];
  lines: MobileOrderLine[];
  updatedAt: string | null;
};

type OrderRow = {
  id: string;
  lead_id: string | null;
  source_quote_id: string | null;
  legacy_contract_id: string | null;
  order_number: string | null;
  current_stage: string | null;
  status: string | null;
  approval_state: string | null;
  currency: string | null;
  total_order_value: number | string | null;
  incoterm: string | null;
  payment_terms: string | null;
  payment_status: string | null;
  fulfillment_status: string | null;
  dispatch_status: string | null;
  updated_at: string | null;
};

type LeadDisplayRow = { order_id: string | null; company_name?: string | null; contact_name?: string | null };
type DocumentRow = { id: string; order_id: string | null; document_type: string | null; status: string | null; sent_at: string | null; opened_at: string | null };
type GateRow = { id: string; order_id: string | null; stage_key: string | null; status: string | null; reason?: string | null };
type LineRow = { id: string; order_id: string | null; product_name_snapshot: string | null; ordered_quantity: number | string | null; packed_quantity: number | string | null; dispatched_quantity: number | string | null; delivered_quantity: number | string | null };

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function labelize(value: string | null | undefined, fallback: string) {
  return clean(value)?.replaceAll('_', ' ') ?? fallback;
}

function buildBlockers(order: OrderRow, gates: GateRow[], lines: LineRow[]) {
  const blockers: string[] = [];
  if (!lines.length) blockers.push('Order lines need review.');
  if (gates.some((gate) => ['blocked', 'rejected', 'failed'].includes(String(gate.status ?? '').toLowerCase()))) {
    blockers.push('One or more execution gates are blocked.');
  }
  if (!clean(order.payment_status)) blockers.push('Payment status not captured.');
  return blockers;
}

function toMobileOrder(order: OrderRow, lead: LeadDisplayRow | undefined, documents: DocumentRow[], gates: GateRow[], lines: LineRow[]): MobileOrder {
  const orderDocs = documents.filter((doc) => doc.order_id === order.id);
  const orderGates = gates.filter((gate) => gate.order_id === order.id);
  const orderLines = lines.filter((line) => line.order_id === order.id);
  return {
    id: order.id,
    orderNumber: clean(order.order_number) ?? order.id.slice(0, 8),
    companyName: clean(lead?.company_name) ?? 'Order customer',
    contactName: clean(lead?.contact_name),
    status: labelize(order.status, 'active'),
    stage: clean(order.current_stage ?? order.approval_state) ?? 'order_created',
    currency: clean(order.currency) ?? 'USD',
    totalValue: asNumber(order.total_order_value),
    incoterm: clean(order.incoterm),
    paymentTerms: clean(order.payment_terms),
    paymentStatus: clean(order.payment_status),
    fulfillmentStatus: clean(order.fulfillment_status),
    dispatchStatus: clean(order.dispatch_status),
    blockerReasons: buildBlockers(order, orderGates, orderLines),
    documents: orderDocs.map((doc) => ({ id: doc.id, type: labelize(doc.document_type, 'Document'), status: labelize(doc.status, 'pending'), sentAt: doc.sent_at, openedAt: doc.opened_at })),
    gates: orderGates.map((gate) => ({ id: gate.id, stageKey: labelize(gate.stage_key, 'gate'), status: labelize(gate.status, 'pending') })),
    lines: orderLines.map((line) => ({ id: line.id, productName: clean(line.product_name_snapshot) ?? 'Order line', quantity: asNumber(line.ordered_quantity), packedQuantity: asNumber(line.packed_quantity), dispatchedQuantity: asNumber(line.dispatched_quantity), deliveredQuantity: asNumber(line.delivered_quantity) })),
    updatedAt: order.updated_at,
  };
}

export async function loadMobileOrders() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.organization) return [] as MobileOrder[];
  const db = await createClient();
  const orgId = workspace.organization.id;
  const ordersResult = await db
    .from('orders')
    .select('id, lead_id, source_quote_id, legacy_contract_id, order_number, current_stage, status, approval_state, currency, total_order_value, incoterm, payment_terms, payment_status, fulfillment_status, dispatch_status, updated_at')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(80);
  const orders = (ordersResult.data ?? []) as OrderRow[];
  const orderIds = orders.map((order) => order.id);
  if (!orderIds.length) return [] as MobileOrder[];

  const [leadResult, documentResult, gateResult, lineResult] = await Promise.all([
    db.rpc('get_orders_execution_lead_display', { p_org_id: orgId }),
    db.from('order_documents').select('id, order_id, document_type, status, sent_at, opened_at').eq('organization_id', orgId).in('order_id', orderIds),
    db.from('order_approval_gates').select('id, order_id, stage_key, status, reason').eq('organization_id', orgId).in('order_id', orderIds),
    db.from('order_lines').select('id, order_id, product_name_snapshot, ordered_quantity, packed_quantity, dispatched_quantity, delivered_quantity').eq('organization_id', orgId).in('order_id', orderIds).neq('line_status', 'removed'),
  ]);

  const leads = (leadResult.data ?? []) as LeadDisplayRow[];
  const docs = (documentResult.data ?? []) as DocumentRow[];
  const gates = (gateResult.data ?? []) as GateRow[];
  const lines = (lineResult.data ?? []) as LineRow[];
  return orders.map((order) => toMobileOrder(order, leads.find((lead) => lead.order_id === order.id), docs, gates, lines));
}

export async function loadMobileOrder(orderId: string) {
  const orders = await loadMobileOrders();
  return orders.find((order) => order.id === orderId) ?? null;
}
