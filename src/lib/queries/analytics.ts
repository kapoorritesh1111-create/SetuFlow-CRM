import { createClient } from '@/lib/supabase/server';
import type { WorkspaceMode } from '@/features/workspace/types';

export interface FunnelStage { label: string; count: number; pct: number; href: string; color: string }
export interface QuoteMetrics { totalSent: number; totalAccepted: number; totalRejected: number; winRate: number; avgDaysToAccept: number | null; pendingApproval: number }
export interface OrderMetrics { draft: number; active: number; dispatched: number; completed: number; totalActive: number; totalValueUsd: number }
export interface DocSendMetrics { totalSends: number; emailSends: number; whatsappSends: number; openedLinks: number; emailDelivered: number; emailBounced: number; openRate: number; emailDeliveryRate: number }
export interface MarketBreakdown { market: string; leadCount: number; quoteCount: number; orderCount: number }
export interface ProductBreakdown { category: string; leadCount: number; activeQuotes: number; pipelineValueUsd: number }
export interface AnalyticsData { funnel: FunnelStage[]; quoteMetrics: QuoteMetrics; orderMetrics: OrderMetrics; docSendMetrics: DocSendMetrics; marketBreakdown: MarketBreakdown[]; productBreakdown: ProductBreakdown[]; pipelineValueUsd: number; lastUpdated: string }

type DateRange = { from?: string | null; to?: string | null };
type QueryResult<T> = { data: T[] | null; error?: { message?: string } | null };
type QueryBuilder<T> = PromiseLike<QueryResult<T>> & {
  eq(column: string, value: string | number | boolean): QueryBuilder<T>;
  gte(column: string, value: string): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
};
type QueryClient = { from(table: string): { select<T>(columns: string): QueryBuilder<T> } };

type LeadRow = { id: string; lead_type: string | null; deal_value: number | null; created_at: string | null; updated_at: string | null };
type QuoteRow = { id: string; status: string | null; lead_id: string | null; created_at: string; updated_at: string };
type OrderRow = { id: string; lead_id: string | null; status: string | null; current_stage: string | null; order_lifecycle_status: string | null; dispatch_status: string | null; fulfillment_status: string | null; total_order_value: number | null; created_at: string | null; updated_at: string | null; completed_at: string | null };
type SendRow = { id: string; channel: string | null; open_count: number | null; email_delivery_status: string | null; created_at: string | null };
type MarketRow = { lead_id: string | null; market_id: string | null; markets: { name: string | null } | null };
type ProductRow = { lead_id: string | null; product_id: string | null; label: string | null; interest_type: string | null; created_at: string | null };

const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;
const norm = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase();
const has = (values: Array<string | null | undefined>, allowed: string[]) => values.some((value) => allowed.includes(norm(value)));
const matchesMode = (leadType: string | null | undefined, mode: WorkspaceMode) => mode === 'all' || (mode === 'buyers' ? leadType === 'buyer' : leadType === 'supplier');

function timeOf(row: { created_at?: string | null; updated_at?: string | null; completed_at?: string | null }) {
  const value = row.created_at ?? row.completed_at ?? row.updated_at ?? '';
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function inRange(row: { created_at?: string | null; updated_at?: string | null; completed_at?: string | null }, range?: DateRange) {
  if (!range?.from && !range?.to) return true;
  const time = timeOf(row);
  if (time === null) return false;
  const from = range.from ? new Date(`${range.from}T00:00:00.000Z`).getTime() : Number.NEGATIVE_INFINITY;
  const to = range.to ? new Date(`${range.to}T23:59:59.999Z`).getTime() : Number.POSITIVE_INFINITY;
  return time >= from && time <= to;
}

function avgDays(rows: QuoteRow[]) {
  if (!rows.length) return null;
  const total = rows.reduce((sum, row) => sum + Math.max(0, (new Date(row.updated_at).getTime() - new Date(row.created_at).getTime()) / 86400000), 0);
  return Math.round((total / rows.length) * 10) / 10;
}

function productName(row: ProductRow) { return row.label?.trim() || 'Unspecified product'; }
function isDispatched(order: OrderRow) { return has([order.current_stage, order.status, order.order_lifecycle_status, order.dispatch_status, order.fulfillment_status], ['dispatched', 'dispatch_invoice', 'ready_for_dispatch']); }
function isCompleted(order: OrderRow) { return has([order.current_stage, order.status, order.order_lifecycle_status, order.fulfillment_status], ['completed', 'closed', 'paid']); }
function isDraft(order: OrderRow) { return has([order.current_stage, order.status], ['draft', 'quote_approved', 'order_confirmation', 'confirmation_prepared']); }

export async function getAnalyticsData(organizationId: string, mode: WorkspaceMode = 'all', range?: DateRange): Promise<AnalyticsData> {
  const db = await createClient() as unknown as QueryClient;
  const sendSince = range?.from ? `${range.from}T00:00:00.000Z` : new Date(Date.now() - 90 * 86400000).toISOString();
  const [leadsRes, quotesRes, ordersRes, sendsRes, marketsRes, productsRes] = await Promise.all([
    db.from('leads').select<LeadRow>('id, lead_type, deal_value, created_at, updated_at').eq('organization_id', organizationId).limit(3000),
    db.from('quotes').select<QuoteRow>('id, status, lead_id, created_at, updated_at').eq('organization_id', organizationId).limit(2000),
    db.from('orders').select<OrderRow>('id, lead_id, status, current_stage, order_lifecycle_status, dispatch_status, fulfillment_status, total_order_value, created_at, updated_at, completed_at').eq('organization_id', organizationId).limit(1000),
    db.from('order_document_sends').select<SendRow>('id, channel, open_count, email_delivery_status, created_at').eq('organization_id', organizationId).gte('created_at', sendSince).limit(5000),
    db.from('lead_markets').select<MarketRow>('lead_id, market_id, markets(name)').eq('organization_id', organizationId).limit(3000),
    db.from('lead_product_interests').select<ProductRow>('lead_id, product_id, label, interest_type, created_at').eq('organization_id', organizationId).limit(5000),
  ]);

  const allLeads = leadsRes.data ?? [];
  const scopedLeadsAll = allLeads.filter((lead) => matchesMode(lead.lead_type, mode));
  const scopedLeadIds = new Set(scopedLeadsAll.map((lead) => lead.id));
  const leadsInRange = scopedLeadsAll.filter((lead) => inRange(lead, range));
  const quotes = (quotesRes.data ?? []).filter((quote) => quote.lead_id && scopedLeadIds.has(quote.lead_id) && inRange(quote, range));
  const orders = (ordersRes.data ?? []).filter((order) => order.lead_id && scopedLeadIds.has(order.lead_id) && inRange(order, range));
  const sends = (sendsRes.data ?? []).filter((send) => inRange(send, range));
  const markets = (marketsRes.data ?? []).filter((market) => market.lead_id && scopedLeadIds.has(market.lead_id));
  const products = (productsRes.data ?? []).filter((product) => product.lead_id && scopedLeadIds.has(product.lead_id) && inRange(product, range));

  const quotedLeadIds = new Set(quotes.map((quote) => quote.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  const orderedLeadIds = new Set(orders.map((order) => order.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  const sentQuotes = quotes.filter((quote) => ['sent', 'accepted', 'rejected', 'expired'].includes(norm(quote.status)));
  const acceptedQuotes = quotes.filter((quote) => norm(quote.status) === 'accepted');
  const dispatched = orders.filter(isDispatched).length;
  const completed = orders.filter(isCompleted).length;
  const base = Math.max(scopedLeadsAll.length, 1);
  const funnel = [
    { label: 'Total Leads', count: leadsInRange.length, pct: pct(leadsInRange.length, base), href: '/leads', color: '#3b82f6' },
    { label: 'Quoted', count: [...quotedLeadIds].length, pct: pct(quotedLeadIds.size, base), href: '/quotes', color: '#8b5cf6' },
    { label: 'Order Created', count: [...orderedLeadIds].length, pct: pct(orderedLeadIds.size, base), href: '/orders', color: '#f59e0b' },
    { label: 'Dispatched', count: dispatched, pct: pct(dispatched, Math.max(orders.length, 1)), href: '/orders', color: '#10b981' },
    { label: 'Paid & Closed', count: completed, pct: pct(completed, Math.max(orders.length, 1)), href: '/orders', color: '#059669' },
  ];

  const marketMap = new Map<string, Set<string>>();
  markets.forEach((market) => {
    const name = market.markets?.name ?? 'Unknown market';
    if (!marketMap.has(name)) marketMap.set(name, new Set());
    if (market.lead_id) marketMap.get(name)?.add(market.lead_id);
  });

  const dealByLead = new Map(scopedLeadsAll.map((lead) => [lead.id, Number(lead.deal_value ?? 0)]));
  const productMap = new Map<string, { leadIds: Set<string>; quoteIds: Set<string>; valueIds: Set<string>; value: number }>();
  products.forEach((product) => {
    if (!product.lead_id) return;
    const name = productName(product);
    if (!productMap.has(name)) productMap.set(name, { leadIds: new Set(), quoteIds: new Set(), valueIds: new Set(), value: 0 });
    const bucket = productMap.get(name);
    if (!bucket) return;
    bucket.leadIds.add(product.lead_id);
    if (quotedLeadIds.has(product.lead_id)) bucket.quoteIds.add(product.lead_id);
    if (!bucket.valueIds.has(product.lead_id)) { bucket.value += dealByLead.get(product.lead_id) ?? 0; bucket.valueIds.add(product.lead_id); }
  });

  const emailSends = sends.filter((send) => send.channel === 'email');
  const opened = sends.filter((send) => (send.open_count ?? 0) > 0).length;
  const delivered = emailSends.filter((send) => send.email_delivery_status === 'delivered').length;
  const measurable = emailSends.filter((send) => send.email_delivery_status !== null).length;
  const leadValue = scopedLeadsAll.reduce((sum, lead) => sum + Number(lead.deal_value ?? 0), 0);
  const orderValue = orders.reduce((sum, order) => sum + Number(order.total_order_value ?? 0), 0);

  return {
    funnel,
    quoteMetrics: { totalSent: sentQuotes.length, totalAccepted: acceptedQuotes.length, totalRejected: quotes.filter((quote) => norm(quote.status) === 'rejected').length, winRate: pct(acceptedQuotes.length, sentQuotes.length), avgDaysToAccept: avgDays(acceptedQuotes), pendingApproval: quotes.filter((quote) => ['pending_approval', 'in_review'].includes(norm(quote.status))).length },
    orderMetrics: { draft: orders.filter(isDraft).length, active: orders.filter((order) => !isCompleted(order) && !isDispatched(order) && !isDraft(order)).length, dispatched, completed, totalActive: orders.length, totalValueUsd: orderValue },
    docSendMetrics: { totalSends: sends.length, emailSends: emailSends.length, whatsappSends: sends.filter((send) => send.channel === 'whatsapp').length, openedLinks: opened, emailDelivered: delivered, emailBounced: emailSends.filter((send) => send.email_delivery_status === 'bounced').length, openRate: pct(opened, sends.length), emailDeliveryRate: pct(delivered, measurable) },
    marketBreakdown: Array.from(marketMap.entries()).map(([market, ids]) => ({ market, leadCount: ids.size, quoteCount: [...ids].filter((id) => quotedLeadIds.has(id)).length, orderCount: [...ids].filter((id) => orderedLeadIds.has(id)).length })).sort((a, b) => b.leadCount - a.leadCount).slice(0, 8),
    productBreakdown: Array.from(productMap.entries()).map(([category, data]) => ({ category, leadCount: data.leadIds.size, activeQuotes: data.quoteIds.size, pipelineValueUsd: data.value })).sort((a, b) => b.leadCount - a.leadCount || b.pipelineValueUsd - a.pipelineValueUsd).slice(0, 8),
    pipelineValueUsd: leadValue || orderValue,
    lastUpdated: new Date().toISOString(),
  };
}
