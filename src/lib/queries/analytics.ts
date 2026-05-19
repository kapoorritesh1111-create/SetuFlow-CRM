/**
 * analytics.ts — Sprint 15
 * Live analytics queries for the dashboard analytics page.
 * 6 parallel queries: funnel, quotes, orders, doc sends, markets, products.
 */

import { createClient } from '@/lib/supabase/server';

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
  lastUpdated: string;
}

function safePct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

function avgDays(rows: Array<{ created_at: string; updated_at: string }>) {
  if (!rows.length) return null;
  const diffs = rows.map(r =>
    Math.max(0, (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 86400000)
  );
  return Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10;
}

export async function getAnalyticsData(organizationId: string): Promise<AnalyticsData> {
  const db = (await createClient()) as any;
  const now = new Date().toISOString();
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

  const [leadsRes, quotesRes, ordersRes, sendsRes, marketsRes, productsRes] = await Promise.all([
    db.from('leads').select('id, qualification_status, status').eq('organization_id', organizationId).limit(2000),
    db.from('quotes').select('id, status, lead_id, created_at, updated_at').eq('organization_id', organizationId).limit(1000),
    db.from('orders').select('id, lead_id, status, current_stage, execution_state').eq('organization_id', organizationId).limit(500),
    db.from('order_document_sends').select('id, channel, open_count, email_delivery_status').eq('organization_id', organizationId).gte('created_at', since90).limit(5000),
    db.from('lead_markets').select('lead_id, market_id, markets(name)').eq('organization_id', organizationId).limit(2000),
    db.from('lead_product_interests').select('lead_id, product_category_id, product_categories(name)').eq('organization_id', organizationId).eq('status', 'active').limit(2000),
  ]);

  const leads = (leadsRes.data ?? []) as any[];
  const quotes = (quotesRes.data ?? []) as any[];
  const orders = (ordersRes.data ?? []) as any[];
  const sends = (sendsRes.data ?? []) as any[];
  const markets = (marketsRes.data ?? []) as any[];
  const products = (productsRes.data ?? []) as any[];

  const quotedIds = new Set(quotes.map((q: any) => q.lead_id).filter(Boolean));
  const orderedIds = new Set(orders.map((o: any) => o.lead_id).filter(Boolean));
  const dispatched = orders.filter((o: any) => ['dispatched','completed','closed'].includes(String(o.current_stage ?? o.execution_state ?? '').toLowerCase())).length;
  const completed = orders.filter((o: any) => ['completed','closed','paid'].includes(String(o.status ?? '').toLowerCase())).length;

  const funnel: FunnelStage[] = [
    { label: 'Total Leads', count: leads.length, pct: 100, href: '/leads', color: '#3b82f6' },
    { label: 'Quoted', count: leads.filter((l: any) => quotedIds.has(l.id)).length, pct: safePct(leads.filter((l: any) => quotedIds.has(l.id)).length, leads.length), href: '/quotes', color: '#8b5cf6' },
    { label: 'Order Created', count: leads.filter((l: any) => orderedIds.has(l.id)).length, pct: safePct(leads.filter((l: any) => orderedIds.has(l.id)).length, leads.length), href: '/orders', color: '#f59e0b' },
    { label: 'Dispatched', count: dispatched, pct: safePct(dispatched, leads.length), href: '/orders', color: '#10b981' },
    { label: 'Paid & Closed', count: completed, pct: safePct(completed, leads.length), href: '/orders', color: '#059669' },
  ];

  const sentQ = quotes.filter((q: any) => ['sent','accepted','rejected','expired'].includes(q.status));
  const acceptedQ = quotes.filter((q: any) => q.status === 'accepted');

  const emailSends = sends.filter((s: any) => s.channel === 'email');

  const marketMap = new Map<string, Set<string>>();
  for (const m of markets) {
    const name = m.markets?.name ?? 'Unknown';
    if (!marketMap.has(name)) marketMap.set(name, new Set());
    marketMap.get(name)!.add(m.lead_id);
  }
  const productMap = new Map<string, Set<string>>();
  for (const p of products) {
    const name = p.product_categories?.name ?? 'Uncategorized';
    if (!productMap.has(name)) productMap.set(name, new Set());
    productMap.get(name)!.add(p.lead_id);
  }

  return {
    funnel,
    quoteMetrics: { totalSent: sentQ.length, totalAccepted: acceptedQ.length, totalRejected: quotes.filter((q: any) => q.status === 'rejected').length, winRate: safePct(acceptedQ.length, sentQ.length), avgDaysToAccept: avgDays(acceptedQ), pendingApproval: quotes.filter((q: any) => q.status === 'pending_approval').length },
    orderMetrics: { draft: orders.filter((o: any) => ['draft','quote_approved'].includes(String(o.current_stage ?? o.status ?? ''))).length, active: orders.filter((o: any) => !['completed','closed','dispatched','draft','quote_approved'].includes(String(o.current_stage ?? o.status ?? ''))).length, dispatched, completed, totalActive: orders.length },
    docSendMetrics: { totalSends: sends.length, emailSends: emailSends.length, whatsappSends: sends.filter((s: any) => s.channel === 'whatsapp').length, openedLinks: sends.filter((s: any) => (s.open_count ?? 0) > 0).length, emailDelivered: emailSends.filter((s: any) => s.email_delivery_status === 'delivered').length, emailBounced: emailSends.filter((s: any) => s.email_delivery_status === 'bounced').length, openRate: safePct(sends.filter((s: any) => (s.open_count ?? 0) > 0).length, sends.length), emailDeliveryRate: safePct(emailSends.filter((s: any) => s.email_delivery_status === 'delivered').length, emailSends.filter((s: any) => s.email_delivery_status !== null).length) },
    marketBreakdown: Array.from(marketMap.entries()).map(([market, ids]) => ({ market, leadCount: ids.size, quoteCount: [...ids].filter(id => quotedIds.has(id)).length, orderCount: [...ids].filter(id => orderedIds.has(id)).length })).sort((a, b) => b.leadCount - a.leadCount).slice(0, 8),
    productBreakdown: Array.from(productMap.entries()).map(([category, ids]) => ({ category, leadCount: ids.size, activeQuotes: [...ids].filter(id => quotedIds.has(id)).length })).sort((a, b) => b.leadCount - a.leadCount).slice(0, 8),
    lastUpdated: now,
  };
}
