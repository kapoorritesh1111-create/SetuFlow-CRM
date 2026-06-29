import { createClient } from '@/lib/supabase/server';
import type { WorkspaceMode } from '@/features/workspace/types';

export interface FunnelStage { label: string; count: number; pct: number; href: string; color: string }
export interface QuoteMetrics { totalSent: number; totalAccepted: number; totalRejected: number; winRate: number; avgDaysToAccept: number | null; pendingApproval: number; openPending: number; stalled14Days: number; stalledValueUsd: number }
export interface RfqMetrics { total: number; leadCount: number; open: number }
export interface OrderMetrics { draft: number; active: number; dispatched: number; completed: number; totalActive: number; totalValueUsd: number }
export interface DocSendMetrics { totalSends: number; emailSends: number; whatsappSends: number; openedLinks: number; emailDelivered: number; emailBounced: number; openRate: number; emailDeliveryRate: number }
export interface MarketBreakdown { market: string; leadCount: number; quoteCount: number; orderCount: number; pipelineValueUsd: number; growthPct: number }
export interface ProductBreakdown { category: string; leadCount: number; activeQuotes: number; pipelineValueUsd: number; imageUrl: string | null; topMarket: string | null }
export interface PipelineMovement { newPipelineUsd: number; movedForwardUsd: number; stalled14DaysUsd: number; closedWonUsd: number; closedLostUsd: number }
export interface AnalyticsData { funnel: FunnelStage[]; quoteMetrics: QuoteMetrics; rfqMetrics: RfqMetrics; orderMetrics: OrderMetrics; docSendMetrics: DocSendMetrics; marketBreakdown: MarketBreakdown[]; productBreakdown: ProductBreakdown[]; pipelineMovement: PipelineMovement; pipelineValueUsd: number; lastUpdated: string }

type DateRange = { from?: string | null; to?: string | null; market?: string | null };
type QueryResult<T> = { data: T[] | null; error?: { message?: string } | null };
type QueryBuilder<T> = PromiseLike<QueryResult<T>> & {
  eq(column: string, value: string | number | boolean): QueryBuilder<T>;
  gte(column: string, value: string): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
};
type QueryClient = { from(table: string): { select<T>(columns: string): QueryBuilder<T> } };

type LeadRow = { id: string; lead_type: string | null; deal_value: number | null; created_at: string | null; updated_at: string | null };
type QuoteRow = { id: string; status: string | null; lead_id: string | null; created_at: string; updated_at: string; sent_at?: string | null; follow_up_at?: string | null; last_customer_response_at?: string | null };
type RfqRow = { id: string; status: string | null; lead_id: string | null; created_at: string | null; updated_at: string | null };
type OrderRow = { id: string; lead_id: string | null; status: string | null; current_stage: string | null; order_lifecycle_status: string | null; dispatch_status: string | null; fulfillment_status: string | null; total_order_value: number | null; created_at: string | null; updated_at: string | null; completed_at: string | null };
type SendRow = { id: string; channel: string | null; open_count: number | null; email_delivery_status: string | null; created_at: string | null };
type MarketRow = { lead_id: string | null; market_id: string | null; markets: { name: string | null } | null };
type ProductRow = { lead_id: string | null; product_id: string | null; label: string | null; interest_type: string | null; created_at: string | null; products?: { name: string | null; image_url: string | null } | null };
type StageHistoryRow = { id: string; lead_id: string | null; from_stage_id: string | null; to_stage_id: string | null; changed_at: string | null };

const DAY_MS = 86400000;
const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;
const norm = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase();
const has = (values: Array<string | null | undefined>, allowed: string[]) => values.some((value) => allowed.includes(norm(value)));
const matchesMode = (leadType: string | null | undefined, mode: WorkspaceMode) => mode === 'all' || (mode === 'buyers' ? leadType === 'buyer' : leadType === 'supplier');
const isOpenQuoteStatus = (status: string | null | undefined) => !['accepted', 'rejected', 'expired', 'archived', 'cancelled', 'canceled'].includes(norm(status));
const isSentQuoteStatus = (status: string | null | undefined) => ['sent', 'accepted', 'rejected', 'expired'].includes(norm(status));

function timeOf(row: { created_at?: string | null; updated_at?: string | null; completed_at?: string | null; sent_at?: string | null }) {
  const value = row.created_at ?? row.completed_at ?? row.updated_at ?? row.sent_at ?? '';
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function quoteActivityTime(row: QuoteRow) {
  const values = [row.last_customer_response_at, row.follow_up_at, row.sent_at, row.updated_at, row.created_at]
    .map((value) => new Date(value ?? '').getTime())
    .filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : null;
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
  const total = rows.reduce((sum, row) => sum + Math.max(0, (new Date(row.updated_at).getTime() - new Date(row.created_at).getTime()) / DAY_MS), 0);
  return Math.round((total / rows.length) * 10) / 10;
}

function growthPct(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function safeImageUrl(value: string | null | undefined) {
  const url = String(value ?? '').trim();
  if (!url) return null;
  if (url.startsWith('/')) return url;
  if (!/^https:\/\//i.test(url)) return null;
  if (/private|signed|token=/i.test(url)) return null;
  return url;
}

function productName(row: ProductRow) { return row.products?.name?.trim() || row.label?.trim() || 'Unspecified product'; }
function isDispatched(order: OrderRow) { return has([order.current_stage, order.status, order.order_lifecycle_status, order.dispatch_status, order.fulfillment_status], ['dispatched', 'dispatch_invoice', 'ready_for_dispatch']); }
function isCompleted(order: OrderRow) { return has([order.current_stage, order.status, order.order_lifecycle_status, order.fulfillment_status], ['completed', 'closed', 'paid']); }
function isDraft(order: OrderRow) { return has([order.current_stage, order.status], ['draft', 'quote_approved', 'order_confirmation', 'confirmation_prepared']); }

export async function getAnalyticsData(organizationId: string, mode: WorkspaceMode = 'all', range?: DateRange): Promise<AnalyticsData> {
  const db = await createClient() as unknown as QueryClient;
  const sendSince = range?.from ? `${range.from}T00:00:00.000Z` : new Date(Date.now() - 90 * DAY_MS).toISOString();
  const [leadsRes, quotesRes, rfqsRes, ordersRes, sendsRes, marketsRes, productsRes, stageHistoryRes] = await Promise.all([
    db.from('leads').select<LeadRow>('id, lead_type, deal_value, created_at, updated_at').eq('organization_id', organizationId).limit(3000),
    db.from('quotes').select<QuoteRow>('id, status, lead_id, created_at, updated_at, sent_at, follow_up_at, last_customer_response_at').eq('organization_id', organizationId).limit(2000),
    db.from('rfqs').select<RfqRow>('id, status, lead_id, created_at, updated_at').eq('organization_id', organizationId).limit(2000),
    db.from('orders').select<OrderRow>('id, lead_id, status, current_stage, order_lifecycle_status, dispatch_status, fulfillment_status, total_order_value, created_at, updated_at, completed_at').eq('organization_id', organizationId).limit(1000),
    db.from('order_document_sends').select<SendRow>('id, channel, open_count, email_delivery_status, created_at').eq('organization_id', organizationId).gte('created_at', sendSince).limit(5000),
    db.from('lead_markets').select<MarketRow>('lead_id, market_id, markets(name)').eq('organization_id', organizationId).limit(3000),
    db.from('lead_product_interests').select<ProductRow>('lead_id, product_id, label, interest_type, created_at, products(name, image_url)').eq('organization_id', organizationId).limit(5000),
    db.from('lead_stage_history').select<StageHistoryRow>('id, lead_id, from_stage_id, to_stage_id, changed_at').eq('organization_id', organizationId).limit(5000),
  ]);

  const now = Date.now();
  const currentFrom = range?.from ? new Date(`${range.from}T00:00:00.000Z`).getTime() : now - 30 * DAY_MS;
  const currentTo = range?.to ? new Date(`${range.to}T23:59:59.999Z`).getTime() : now;
  const windowMs = Math.max(DAY_MS, currentTo - currentFrom);
  const previousFrom = currentFrom - windowMs;

  const allLeads = leadsRes.data ?? [];
  const allMarkets = marketsRes.data ?? [];
  const requestedMarket = norm(range?.market);
  const marketScopedLeadIds = new Set(allMarkets.filter((market) => !requestedMarket || requestedMarket === 'all' || norm(market.markets?.name) === requestedMarket).map((market) => market.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  const scopedLeadsAll = allLeads.filter((lead) => matchesMode(lead.lead_type, mode) && (!requestedMarket || requestedMarket === 'all' || marketScopedLeadIds.has(lead.id)));
  const scopedLeadIds = new Set(scopedLeadsAll.map((lead) => lead.id));
  const leadsInRange = scopedLeadsAll.filter((lead) => inRange(lead, range));
  const quotes = (quotesRes.data ?? []).filter((quote) => quote.lead_id && scopedLeadIds.has(quote.lead_id) && inRange(quote, range));
  const rfqs = (rfqsRes.data ?? []).filter((rfq) => rfq.lead_id && scopedLeadIds.has(rfq.lead_id) && inRange(rfq, range));
  const orders = (ordersRes.data ?? []).filter((order) => order.lead_id && scopedLeadIds.has(order.lead_id) && inRange(order, range));
  const sends = (sendsRes.data ?? []).filter((send) => inRange(send, range));
  const markets = allMarkets.filter((market) => market.lead_id && scopedLeadIds.has(market.lead_id));
  const products = (productsRes.data ?? []).filter((product) => product.lead_id && scopedLeadIds.has(product.lead_id) && inRange(product, range));
  const stageHistory = (stageHistoryRes.data ?? []).filter((history) => history.lead_id && scopedLeadIds.has(history.lead_id));

  const quotedLeadIds = new Set(quotes.map((quote) => quote.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  const rfqLeadIds = new Set(rfqs.map((rfq) => rfq.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  const orderedLeadIds = new Set(orders.map((order) => order.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  const sentQuotes = quotes.filter((quote) => isSentQuoteStatus(quote.status));
  const acceptedQuotes = quotes.filter((quote) => norm(quote.status) === 'accepted');
  const rejectedQuotes = quotes.filter((quote) => norm(quote.status) === 'rejected');
  const pendingQuotes = quotes.filter((quote) => isOpenQuoteStatus(quote.status));
  const dispatched = orders.filter(isDispatched).length;
  const completedOrders = orders.filter(isCompleted);
  const completed = completedOrders.length;
  const base = Math.max(leadsInRange.length, 1);
  const qualifiedLeadIds = new Set([...rfqLeadIds, ...quotedLeadIds, ...orderedLeadIds]);
  const negotiationLeadIds = new Set(pendingQuotes.map((quote) => quote.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  const funnel = [
    { label: 'Leads Captured', count: leadsInRange.length, pct: pct(leadsInRange.length, base), href: '/leads', color: '#2563eb' },
    { label: 'Qualified Leads / RFQs', count: qualifiedLeadIds.size, pct: pct(qualifiedLeadIds.size, base), href: '/leads', color: '#06b6d4' },
    { label: 'Quotes Sent', count: sentQuotes.length, pct: pct(sentQuotes.length, base), href: '/quotes', color: '#34d399' },
    { label: 'Follow-up / Negotiation', count: negotiationLeadIds.size, pct: pct(negotiationLeadIds.size, base), href: '/activities', color: '#8b5cf6' },
    { label: 'Orders Won', count: completed, pct: pct(completed, base), href: '/orders', color: '#f97316' },
  ];

  const dealByLead = new Map(scopedLeadsAll.map((lead) => [lead.id, Number(lead.deal_value ?? 0)]));
  const leadValue = scopedLeadsAll.reduce((sum, lead) => sum + Number(lead.deal_value ?? 0), 0);
  const orderValue = orders.reduce((sum, order) => sum + Number(order.total_order_value ?? 0), 0);
  const avgLeadValue = leadValue / Math.max(scopedLeadsAll.length, 1);
  const quoteValue = (quote: QuoteRow) => quote.lead_id ? (dealByLead.get(quote.lead_id) ?? avgLeadValue) : avgLeadValue;
  const staleCutoff = now - 14 * DAY_MS;
  const stalledQuotes = pendingQuotes.filter((quote) => {
    const activityTime = quoteActivityTime(quote);
    return activityTime !== null && activityTime <= staleCutoff;
  });
  const movedForwardLeadIds = new Set(stageHistory.filter((history) => {
    const time = new Date(history.changed_at ?? '').getTime();
    return Number.isFinite(time) && time >= currentFrom && time <= currentTo;
  }).map((history) => history.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  acceptedQuotes.forEach((quote) => { if (quote.lead_id) movedForwardLeadIds.add(quote.lead_id); });
  const movedForwardUsd = Array.from(movedForwardLeadIds).reduce((sum, leadId) => sum + (dealByLead.get(leadId) ?? avgLeadValue), 0);
  const closedWonUsd = completedOrders.reduce((sum, order) => sum + Number(order.total_order_value ?? (order.lead_id ? dealByLead.get(order.lead_id) ?? avgLeadValue : avgLeadValue)), 0);
  const closedLostUsd = rejectedQuotes.reduce((sum, quote) => sum + quoteValue(quote), 0);
  const stalledValueUsd = stalledQuotes.reduce((sum, quote) => sum + quoteValue(quote), 0);

  const leadMarketNames = new Map<string, string[]>();
  const marketMap = new Map<string, { ids: Set<string>; currentValue: number; previousValue: number }>();
  markets.forEach((market) => {
    const name = market.markets?.name ?? 'Unknown market';
    if (market.lead_id) leadMarketNames.set(market.lead_id, [...(leadMarketNames.get(market.lead_id) ?? []), name]);
    if (!marketMap.has(name)) marketMap.set(name, { ids: new Set(), currentValue: 0, previousValue: 0 });
    const bucket = marketMap.get(name);
    if (!bucket || !market.lead_id) return;
    bucket.ids.add(market.lead_id);
    const lead = scopedLeadsAll.find((item) => item.id === market.lead_id);
    const time = lead ? timeOf(lead) : null;
    const value = dealByLead.get(market.lead_id) ?? 0;
    if (time !== null && time >= currentFrom && time <= currentTo) bucket.currentValue += value;
    if (time !== null && time >= previousFrom && time < currentFrom) bucket.previousValue += value;
  });

  const productMap = new Map<string, { leadIds: Set<string>; quoteIds: Set<string>; valueIds: Set<string>; value: number; imageUrl: string | null; markets: Map<string, number> }>();
  products.forEach((product) => {
    if (!product.lead_id) return;
    const name = productName(product);
    if (!productMap.has(name)) productMap.set(name, { leadIds: new Set(), quoteIds: new Set(), valueIds: new Set(), value: 0, imageUrl: safeImageUrl(product.products?.image_url), markets: new Map() });
    const bucket = productMap.get(name);
    if (!bucket) return;
    bucket.leadIds.add(product.lead_id);
    if (quotedLeadIds.has(product.lead_id)) bucket.quoteIds.add(product.lead_id);
    if (!bucket.imageUrl) bucket.imageUrl = safeImageUrl(product.products?.image_url);
    if (!bucket.valueIds.has(product.lead_id)) { bucket.value += dealByLead.get(product.lead_id) ?? 0; bucket.valueIds.add(product.lead_id); }
    for (const marketName of leadMarketNames.get(product.lead_id) ?? []) bucket.markets.set(marketName, (bucket.markets.get(marketName) ?? 0) + 1);
  });

  const emailSends = sends.filter((send) => send.channel === 'email');
  const opened = sends.filter((send) => (send.open_count ?? 0) > 0).length;
  const delivered = emailSends.filter((send) => send.email_delivery_status === 'delivered').length;
  const measurable = emailSends.filter((send) => send.email_delivery_status !== null).length;

  return {
    funnel,
    rfqMetrics: { total: rfqs.length, leadCount: rfqLeadIds.size, open: rfqs.filter((rfq) => isOpenQuoteStatus(rfq.status)).length },
    quoteMetrics: { totalSent: sentQuotes.length, totalAccepted: acceptedQuotes.length, totalRejected: rejectedQuotes.length, winRate: pct(acceptedQuotes.length, sentQuotes.length), avgDaysToAccept: avgDays(acceptedQuotes), pendingApproval: quotes.filter((quote) => ['pending_approval', 'in_review'].includes(norm(quote.status))).length, openPending: pendingQuotes.length, stalled14Days: stalledQuotes.length, stalledValueUsd },
    orderMetrics: { draft: orders.filter(isDraft).length, active: orders.filter((order) => !isCompleted(order) && !isDispatched(order) && !isDraft(order)).length, dispatched, completed, totalActive: orders.length, totalValueUsd: orderValue },
    docSendMetrics: { totalSends: sends.length, emailSends: emailSends.length, whatsappSends: sends.filter((send) => send.channel === 'whatsapp').length, openedLinks: opened, emailDelivered: delivered, emailBounced: emailSends.filter((send) => send.email_delivery_status === 'bounced').length, openRate: pct(opened, sends.length), emailDeliveryRate: pct(delivered, measurable) },
    marketBreakdown: Array.from(marketMap.entries()).map(([market, data]) => ({ market, leadCount: data.ids.size, quoteCount: [...data.ids].filter((id) => quotedLeadIds.has(id)).length, orderCount: [...data.ids].filter((id) => orderedLeadIds.has(id)).length, pipelineValueUsd: [...data.ids].reduce((sum, id) => sum + (dealByLead.get(id) ?? 0), 0), growthPct: growthPct(data.currentValue, data.previousValue) })).sort((a, b) => b.pipelineValueUsd - a.pipelineValueUsd || b.leadCount - a.leadCount).slice(0, 8),
    productBreakdown: Array.from(productMap.entries()).map(([category, data]) => ({ category, leadCount: data.leadIds.size, activeQuotes: data.quoteIds.size, pipelineValueUsd: data.value, imageUrl: data.imageUrl, topMarket: Array.from(data.markets.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null })).sort((a, b) => b.pipelineValueUsd - a.pipelineValueUsd || b.leadCount - a.leadCount).slice(0, 8),
    pipelineMovement: { newPipelineUsd: leadValue || orderValue, movedForwardUsd, stalled14DaysUsd: stalledValueUsd, closedWonUsd, closedLostUsd },
    pipelineValueUsd: leadValue || orderValue,
    lastUpdated: new Date().toISOString(),
  };
}
