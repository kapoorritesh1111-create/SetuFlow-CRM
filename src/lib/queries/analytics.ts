/**
 * analytics.ts — Sprint 15
 * Live analytics queries for the dashboard analytics page.
 */

import { createClient } from '@/lib/supabase/server';
import type { WorkspaceMode } from '@/features/workspace/types';

export interface FunnelStage {
  label: string;
  count: number;
  pct: number;
  href: string;
  color: string;
}

export interface QuoteMetrics {
  totalSent: number;
  totalAccepted: number;
  totalRejected: number;
  winRate: number;
  avgDaysToAccept: number | null;
  pendingApproval: number;
}

export interface OrderMetrics {
  draft: number;
  active: number;
  dispatched: number;
  completed: number;
  totalActive: number;
}

export interface DocSendMetrics {
  totalSends: number;
  emailSends: number;
  whatsappSends: number;
  openedLinks: number;
  emailDelivered: number;
  emailBounced: number;
  openRate: number;
  emailDeliveryRate: number;
}

export interface MarketBreakdown {
  market: string;
  leadCount: number;
  quoteCount: number;
  orderCount: number;
}

export interface ProductBreakdown {
  category: string;
  leadCount: number;
  activeQuotes: number;
}

export interface AnalyticsData {
  funnel: FunnelStage[];
  quoteMetrics: QuoteMetrics;
  orderMetrics: OrderMetrics;
  docSendMetrics: DocSendMetrics;
  marketBreakdown: MarketBreakdown[];
  productBreakdown: ProductBreakdown[];
  pipelineValueUsd: number;
  lastUpdated: string;
}

type AnalyticsDateRange = {
  from?: string | null;
  to?: string | null;
};

type LeadAnalyticsRow = {
  id: string;
  lead_type: string | null;
  qualification_status: string | null;
  status: string | null;
  deal_value: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type QuoteAnalyticsRow = { id: string; status: string | null; lead_id: string | null; created_at: string; updated_at: string };
type OrderAnalyticsRow = { id: string; lead_id: string | null; status: string | null; current_stage: string | null; execution_state: string | null; created_at: string | null; updated_at: string | null };
type SendAnalyticsRow = { id: string; channel: string | null; open_count: number | null; email_delivery_status: string | null; created_at: string | null };
type LeadMarketAnalyticsRow = { lead_id: string | null; market_id: string | null; markets: { name: string | null } | null };
type LeadProductAnalyticsRow = { lead_id: string | null; product_category_id: string | null; product_categories: { name: string | null } | null };

function safePct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

function avgDays(rows: Array<{ created_at: string; updated_at: string }>) {
  if (!rows.length) return null;
  const diffs = rows.map((row) => Math.max(0, (new Date(row.updated_at).getTime() - new Date(row.created_at).getTime()) / 86400000));
  return Math.round((diffs.reduce((sum, value) => sum + value, 0) / diffs.length) * 10) / 10;
}

function matchesWorkspaceMode(leadType: string | null | undefined, mode: WorkspaceMode) {
  if (mode === 'all') return true;
  return mode === 'buyers' ? leadType === 'buyer' : leadType === 'supplier';
}

function normalizedStatus(...values: Array<string | null | undefined>) {
  return values.map((value) => String(value ?? '').trim().toLowerCase()).filter(Boolean);
}

function hasStatus(values: Array<string | null | undefined>, allowed: string[]) {
  const statuses = normalizedStatus(...values);
  return statuses.some((status) => allowed.includes(status));
}

function recordTime(record: { created_at?: string | null; updated_at?: string | null }) {
  const value = record.created_at ?? record.updated_at ?? '';
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function withinAnalyticsRange(record: { created_at?: string | null; updated_at?: string | null }, range?: AnalyticsDateRange) {
  if (!range?.from && !range?.to) return true;
  const time = recordTime(record);
  if (time === null) return false;
  const fromTime = range.from ? new Date(`${range.from}T00:00:00.000Z`).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = range.to ? new Date(`${range.to}T23:59:59.999Z`).getTime() : Number.POSITIVE_INFINITY;
  return time >= fromTime && time <= toTime;
}

export async function getAnalyticsData(organizationId: string, mode: WorkspaceMode = 'all', range?: AnalyticsDateRange): Promise<AnalyticsData> {
  const db = await createClient();
  const now = new Date().toISOString();
  const sendSince = range?.from ? `${range.from}T00:00:00.000Z` : new Date(Date.now() - 90 * 86400000).toISOString();

  const [leadsRes, quotesRes, ordersRes, sendsRes, marketsRes, productsRes] = await Promise.all([
    db.from('leads').select('id, lead_type, qualification_status, status, deal_value, created_at, updated_at').eq('organization_id', organizationId).limit(2000),
    db.from('quotes').select('id, status, lead_id, created_at, updated_at').eq('organization_id', organizationId).limit(1000),
    db.from('orders').select('id, lead_id, status, current_stage, execution_state, created_at, updated_at').eq('organization_id', organizationId).limit(500),
    db.from('order_document_sends').select('id, channel, open_count, email_delivery_status, created_at').eq('organization_id', organizationId).gte('created_at', sendSince).limit(5000),
    db.from('lead_markets').select('lead_id, market_id, markets(name)').eq('organization_id', organizationId).limit(2000),
    db.from('lead_product_interests').select('lead_id, product_category_id, product_categories(name)').eq('organization_id', organizationId).eq('status', 'active').limit(2000),
  ]);

  const allLeads = (leadsRes.data ?? []) as LeadAnalyticsRow[];
  const leads = allLeads.filter((lead) => matchesWorkspaceMode(lead.lead_type, mode) && withinAnalyticsRange(lead, range));
  const scopedLeadIds = new Set(leads.map((lead) => lead.id));
  const quotes = ((quotesRes.data ?? []) as QuoteAnalyticsRow[]).filter((quote) => quote.lead_id && scopedLeadIds.has(quote.lead_id) && withinAnalyticsRange(quote, range));
  const orders = ((ordersRes.data ?? []) as OrderAnalyticsRow[]).filter((order) => order.lead_id && scopedLeadIds.has(order.lead_id) && withinAnalyticsRange(order, range));
  const sends = ((sendsRes.data ?? []) as SendAnalyticsRow[]).filter((send) => withinAnalyticsRange(send, range));
  const markets = ((marketsRes.data ?? []) as LeadMarketAnalyticsRow[]).filter((market) => market.lead_id && scopedLeadIds.has(market.lead_id));
  const products = ((productsRes.data ?? []) as LeadProductAnalyticsRow[]).filter((product) => product.lead_id && scopedLeadIds.has(product.lead_id));

  const quotedIds = new Set(quotes.map((quote) => quote.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  const orderedIds = new Set(orders.map((order) => order.lead_id).filter((leadId): leadId is string => Boolean(leadId)));
  const dispatched = orders.filter((order) => hasStatus([order.current_stage, order.execution_state, order.status], ['dispatched', 'completed', 'closed'])).length;
  const completed = orders.filter((order) => hasStatus([order.current_stage, order.execution_state, order.status], ['completed', 'closed', 'paid'])).length;
  const quotedLeadCount = leads.filter((lead) => quotedIds.has(lead.id)).length;
  const orderedLeadCount = leads.filter((lead) => orderedIds.has(lead.id)).length;

  const funnel: FunnelStage[] = [
    { label: 'Total Leads', count: leads.length, pct: 100, href: '/leads', color: '#3b82f6' },
    { label: 'Quoted', count: quotedLeadCount, pct: safePct(quotedLeadCount, leads.length), href: '/quotes', color: '#8b5cf6' },
    { label: 'Order Created', count: orderedLeadCount, pct: safePct(orderedLeadCount, leads.length), href: '/orders', color: '#f59e0b' },
    { label: 'Dispatched', count: dispatched, pct: safePct(dispatched, leads.length), href: '/orders', color: '#10b981' },
    { label: 'Paid & Closed', count: completed, pct: safePct(completed, leads.length), href: '/orders', color: '#059669' },
  ];

  const sentQ = quotes.filter((quote) => ['sent', 'accepted', 'rejected', 'expired'].includes(String(quote.status ?? '').toLowerCase()));
  const acceptedQ = quotes.filter((quote) => String(quote.status ?? '').toLowerCase() === 'accepted');
  const emailSends = sends.filter((send) => send.channel === 'email');

  const marketMap = new Map<string, Set<string>>();
  for (const market of markets) {
    const name = market.markets?.name ?? 'Unknown';
    if (!marketMap.has(name)) marketMap.set(name, new Set());
    if (market.lead_id) marketMap.get(name)?.add(market.lead_id);
  }
  const productMap = new Map<string, Set<string>>();
  for (const product of products) {
    const name = product.product_categories?.name ?? 'Uncategorized';
    if (!productMap.has(name)) productMap.set(name, new Set());
    if (product.lead_id) productMap.get(name)?.add(product.lead_id);
  }

  const openedLinks = sends.filter((send) => (send.open_count ?? 0) > 0).length;
  const deliveredEmails = emailSends.filter((send) => send.email_delivery_status === 'delivered').length;
  const measurableEmails = emailSends.filter((send) => send.email_delivery_status !== null).length;
  const pipelineValueUsd = leads.reduce((sum, lead) => sum + Number(lead.deal_value ?? 0), 0);

  return {
    funnel,
    quoteMetrics: {
      totalSent: sentQ.length,
      totalAccepted: acceptedQ.length,
      totalRejected: quotes.filter((quote) => String(quote.status ?? '').toLowerCase() === 'rejected').length,
      winRate: safePct(acceptedQ.length, sentQ.length),
      avgDaysToAccept: avgDays(acceptedQ),
      pendingApproval: quotes.filter((quote) => String(quote.status ?? '').toLowerCase() === 'pending_approval').length,
    },
    orderMetrics: {
      draft: orders.filter((order) => hasStatus([order.current_stage, order.status], ['draft', 'quote_approved'])).length,
      active: orders.filter((order) => !hasStatus([order.current_stage, order.execution_state, order.status], ['completed', 'closed', 'dispatched', 'draft', 'quote_approved'])).length,
      dispatched,
      completed,
      totalActive: orders.length,
    },
    docSendMetrics: {
      totalSends: sends.length,
      emailSends: emailSends.length,
      whatsappSends: sends.filter((send) => send.channel === 'whatsapp').length,
      openedLinks,
      emailDelivered: deliveredEmails,
      emailBounced: emailSends.filter((send) => send.email_delivery_status === 'bounced').length,
      openRate: safePct(openedLinks, sends.length),
      emailDeliveryRate: safePct(deliveredEmails, measurableEmails),
    },
    marketBreakdown: Array.from(marketMap.entries()).map(([market, ids]) => ({ market, leadCount: ids.size, quoteCount: [...ids].filter((id) => quotedIds.has(id)).length, orderCount: [...ids].filter((id) => orderedIds.has(id)).length })).sort((a, b) => b.leadCount - a.leadCount).slice(0, 8),
    productBreakdown: Array.from(productMap.entries()).map(([category, ids]) => ({ category, leadCount: ids.size, activeQuotes: [...ids].filter((id) => quotedIds.has(id)).length })).sort((a, b) => b.leadCount - a.leadCount).slice(0, 8),
    pipelineValueUsd,
    lastUpdated: now,
  };
}
