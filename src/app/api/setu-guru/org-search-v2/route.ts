import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { POST as legacyOrgSearchPost } from '../org-search/route';

type Row = Record<string, unknown>;
type Result = { data: Row | Row[] | null; error?: Error | null };
type Query = PromiseLike<Result> & { select: (columns: string) => Query; eq: (column: string, value: unknown) => Query; order: (column: string, options?: { ascending?: boolean }) => Query; limit: (count: number) => Query; maybeSingle: () => Promise<{ data: Row | null; error?: Error | null }> };
type Reader = { from: (table: string) => Query };

const text = (value: unknown) => String(value ?? '').trim();
const rows = (value: unknown) => Array.isArray(value) ? value.filter((row): row is Row => typeof row === 'object' && row !== null && !Array.isArray(row)) : [];
const wantsOrderStatus = (question: string, mode: string) => mode === 'workflow_status' || /order status|order state|order readiness|check this order|check order/.test(question.toLowerCase());

function routeOrderId(route: string) {
  return route.match(/\/orders\/([^/?#]+)/)?.[1] ?? '';
}

function selectedOrderNumber(pageText: string) {
  const found = Array.from(pageText.matchAll(/SF-O-[0-9]{6}-[0-9]{3}/g)).map((match) => ({ value: match[0], index: match.index ?? 0 }));
  if (!found.length) return '';
  const anchor = ['CURRENT STAGE', 'PACKING PLAN', 'VALUE', 'READINESS'].map((term) => pageText.indexOf(term)).find((index) => index >= 0) ?? found[0].index;
  found.sort((a, b) => Math.abs(a.index - anchor) - Math.abs(b.index - anchor));
  return found[0]?.value ?? '';
}

function label(value: unknown) {
  return text(value).replaceAll('_', ' ') || 'not set';
}

function incomplete(value: unknown) {
  return ['not_requested', 'not_started', 'not_ready', 'pending', 'draft', 'blocked', 'missing', 'open', ''].includes(text(value).toLowerCase());
}

async function findOrder(db: Reader, organizationId: string, route: string, pageText: string) {
  const columns = 'id, order_number, current_stage, order_lifecycle_status, approval_state, payment_status, fulfillment_status, dispatch_status, source_quote_id, lead_id';
  const id = routeOrderId(route);
  if (id) {
    const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).eq('id', id).maybeSingle();
    if (data?.id) return data;
  }
  const orderNumber = selectedOrderNumber(pageText);
  if (!orderNumber) return null;
  const { data } = await db.from('orders').select(columns).eq('organization_id', organizationId).eq('order_number', orderNumber).maybeSingle();
  return data?.id ? data : null;
}

async function answerOrderStatus(body: Record<string, unknown>) {
  if (!hasSupabaseEnv) return NextResponse.json({ answer: 'I cannot read live order data right now.', confidence: 'low', rows: [] }, { status: 500 });
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ answer: 'Please sign in before checking order status.', confidence: 'low', rows: [] }, { status: 401 });
  const db = await createClient() as unknown as Reader;
  const organizationId = workspace.organization.id;
  const order = await findOrder(db, organizationId, text(body.route), text(body.pageText));
  if (!order?.id) return NextResponse.json({ answer: 'I cannot safely tell which order is selected on this screen, so I will not guess. Open the specific order detail route or select the order card again, then ask me to check it.', confidence: 'medium', rows: [] });
  const [lead, quote, docs, freight, finance] = await Promise.all([
    order.lead_id ? db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).eq('id', order.lead_id).maybeSingle() : Promise.resolve({ data: null }),
    order.source_quote_id ? db.from('quotes').select('id, quote_number, status').eq('organization_id', organizationId).eq('id', order.source_quote_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('order_documents').select('id, status').eq('organization_id', organizationId).eq('order_id', order.id).limit(12),
    db.from('freight_rate_requests').select('id, status').eq('organization_id', organizationId).eq('order_id', order.id).limit(6),
    db.from('finance_sync_records').select('id, sync_status').eq('organization_id', organizationId).eq('order_id', order.id).limit(6),
  ]);
  const customer = text(lead.data?.company_name) || text(lead.data?.contact_name) || 'this customer';
  const blockers = [
    incomplete(order.payment_status) ? `payment is ${label(order.payment_status)}` : '',
    incomplete(order.fulfillment_status) ? `fulfillment is ${label(order.fulfillment_status)}` : '',
    incomplete(order.dispatch_status) ? `dispatch is ${label(order.dispatch_status)}` : '',
    !rows(docs.data).length ? 'no order documents are recorded yet' : '',
    !rows(freight.data).length ? 'no freight request is recorded yet' : '',
    !rows(finance.data).length ? 'no finance handoff is recorded yet' : '',
  ].filter(Boolean);
  const answer = [
    `${customer}'s order ${text(order.order_number)} is ${blockers.length ? 'open and not ready to close yet' : 'clear in the checks I reviewed'}.`,
    `Current state: stage ${label(order.current_stage)}, approval ${label(order.approval_state)}, payment ${label(order.payment_status)}, fulfillment ${label(order.fulfillment_status)}, dispatch ${label(order.dispatch_status)}.`,
    `Quote handoff: ${quote.data ? `${text(quote.data.quote_number)} is ${label(quote.data.status)}.` : 'I did not find a linked quote.'}`,
    blockers.length ? `Next work: ${blockers.join('; ')}.` : 'I did not find incomplete readiness items in these checks.',
    'Read-only analysis only. Setu Guru can explain next work, but humans approve documents, payment, freight, dispatch, and closeout.',
  ].join('\n\n');
  return NextResponse.json({ answer, confidence: 'high', mode: 'workflow_status', rows: [], metrics: { blockers: blockers.length }, actions: ['Open order workspace'], actionHref: `/orders/${text(order.id)}` });
}

export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => ({}));
  if (wantsOrderStatus(text(body.question), text(body.mode))) return answerOrderStatus(body);
  return legacyOrgSearchPost(request);
}
