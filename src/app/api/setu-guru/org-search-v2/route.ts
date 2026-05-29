import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { buildConversationalWorkflowStatusAnswer, type WorkflowStatusRow } from '@/lib/setu-guru/workflow-status-answer';
import { POST as legacyOrgSearchPost } from '../org-search/route';

type QueryResult = { data: WorkflowStatusRow | WorkflowStatusRow[] | null; error?: Error | null };
type QueryBuilder = PromiseLike<QueryResult> & { select: (columns: string) => QueryBuilder; eq: (column: string, value: unknown) => QueryBuilder; order: (column: string, options?: { ascending?: boolean }) => QueryBuilder; limit: (count: number) => QueryBuilder; maybeSingle: () => Promise<{ data: WorkflowStatusRow | null; error?: Error | null }> };
type Reader = { from: (table: string) => QueryBuilder };

const text = (value: unknown) => String(value ?? '').trim();
const list = (value: unknown) => Array.isArray(value) ? value.filter((row): row is WorkflowStatusRow => typeof row === 'object' && row !== null && !Array.isArray(row)) : [];
const first = (value: unknown) => list(value)[0] ?? null;
const routeId = (route: string, pattern: RegExp) => route.match(pattern)?.[1] ?? null;
const wantsOrderStatus = (question: string, mode: string) => mode === 'workflow_status' || /order status|order state|order readiness|check this order|check order/.test(question.toLowerCase());

async function findOrder(db: Reader, organizationId: string, route: string, pageText: string) {
  const columns = 'id, order_number, status, current_stage, order_lifecycle_status, approval_state, payment_status, fulfillment_status, dispatch_status, source_quote_id, source_quote_version_id, lead_id, updated_at';
  const orderId = routeId(route, /\/orders\/([^/?#]+)/);
  if (orderId) {
    const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).eq('id', orderId).maybeSingle();
    if (data?.id) return data;
  }
  const quoteId = routeId(route, /\/quotes\/([^/?#]+)/);
  if (quoteId) {
    const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).eq('source_quote_id', quoteId).order('updated_at', { ascending: false }).limit(1);
    return first(data);
  }
  const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(12);
  const page = pageText.toLowerCase();
  return list(data).find((row) => text(row.order_number).toLowerCase() && page.includes(text(row.order_number).toLowerCase())) ?? first(data);
}

async function answerOrderStatus(body: Record<string, unknown>) {
  if (!hasSupabaseEnv) return NextResponse.json({ answer: 'I cannot read live order data right now.', confidence: 'low', rows: [] }, { status: 500 });
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ answer: 'Please sign in before checking order status.', confidence: 'low', rows: [] }, { status: 401 });
  const db = await createClient() as unknown as Reader;
  const organizationId = workspace.organization.id;
  const order = await findOrder(db, organizationId, text(body.route), text(body.pageText));
  if (!order?.id) return NextResponse.json({ answer: 'I could not identify the active order on this screen. Open the order row and ask again.', confidence: 'medium', rows: [] });
  const orderId = text(order.id);
  const quoteId = text(order.source_quote_id);
  const leadId = text(order.lead_id);
  const [lead, quote, versions, gates, stages, docs, reqs, packing, freight, freightQuotes, shipments, finance, checks] = await Promise.all([
    leadId ? db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).eq('id', leadId).maybeSingle() : Promise.resolve({ data: null }),
    quoteId ? db.from('quotes').select('id, quote_number, status').eq('organization_id', organizationId).eq('id', quoteId).maybeSingle() : Promise.resolve({ data: null }),
    quoteId ? db.from('quote_versions').select('id, quote_id, version_no, status').eq('quote_id', quoteId).order('version_no', { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    db.from('order_approval_gates').select('id, stage_key, gate_type, status').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(12),
    db.from('order_stage_events').select('id, stage_key, event_type, summary, event_at').eq('organization_id', organizationId).eq('order_id', orderId).order('event_at', { ascending: false }).limit(12),
    db.from('order_documents').select('id, document_type, stage_key, status, sent_at').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(12),
    db.from('trade_requirements').select('id, title, requirement_code, stage_key, status').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(12),
    db.from('packing_plans').select('id, plan_type, status').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(4),
    db.from('freight_rate_requests').select('id, status, shipment_mode, incoterm').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(6),
    db.from('freight_rate_quotes').select('id, request_id, provider_name, status').eq('organization_id', organizationId).order('updated_at', { ascending: false }).limit(10),
    db.from('shipments').select('id, status, shipment_mode').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(6),
    db.from('finance_sync_records').select('id, finance_document_type, sync_status').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(6),
    db.from('order_processing_checks').select('id, order_line_id, picked, packed, qc_checked').eq('organization_id', organizationId).eq('order_id', orderId).order('updated_at', { ascending: false }).limit(8),
  ]);
  const customer = text(lead.data?.company_name) || text(lead.data?.contact_name) || text(order.order_number);
  const built = buildConversationalWorkflowStatusAnswer({ organizationName: workspace.organization.name ?? 'this organization', order, customerName: customer, quote: quote.data, quoteVersions: list(versions.data), gates: list(gates.data), stageEvents: list(stages.data), orderDocuments: list(docs.data), tradeRequirements: list(reqs.data), packingPlans: list(packing.data), freightRequests: list(freight.data), freightQuotes: list(freightQuotes.data), shipments: list(shipments.data), financeSync: list(finance.data), processingChecks: list(checks.data) });
  return NextResponse.json({ answer: built.answer, confidence: 'high', mode: 'workflow_status', rows: [], metrics: { blockers: built.blockers.length }, actions: ['Open order workspace'], actionHref: `/orders/${orderId}` });
}

export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => ({}));
  if (wantsOrderStatus(text(body.question), text(body.mode))) return answerOrderStatus(body);
  return legacyOrgSearchPost(request);
}
