/**
 * analytics.ts — Sprint 15
 * Analytics data queries for the dashboard analytics tab.
 * Uses live DB queries (not snapshot table) for real-time accuracy.
 * The analytics_snapshots table can be used for heavy historical reports later.
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
  winRate: number; // percentage
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

function safePct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function avgDays(dates: Array<{ created_at: string; updated_at: string }>): number | null {
  if (!dates.length) return null;
  const diffs = dates.map((r) => {
    const created = new Date(r.created_at).getTime();
    const updated = new Date(r.updated_at).getTime();
    return Math.max(0, (updated - created) / (1000 * 60 * 60 * 24));
  });
  return Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10;
}

export async function getAnalyticsData(organizationId: string): Promise<AnalyticsData> {
  const db = (await createClient()) as any;
  const now = new Date().toISOString();

  // Parallel queries for speed
  const [
    leadsResult,
    quotesResult,
    ordersResult,
    docSendsResult,
    marketLeadsResult,
    productInterestsResult,
  ] = await Promise.all([
    // Lead funnel
    db.from('leads')
      .select('id, qualification_status, status')
      .eq('organization_id', organizationId)
      .limit(2000),

    // Quote metrics
    db.from('quotes')
      .select('id, status, created_at, updated_at, lead_id')
      .eq('organization_id', organizationId)
      .limit(1000),

    // Order metrics
    db.from('orders')
      .select('id, status, current_stage, execution_state')
      .eq('organization_id', organizationId)
      .limit(500),

    // Document send metrics (last 90 days)
    db.from('order_document_sends')
      .select('id, channel, open_count, email_delivery_status, opened_at')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5000),

    // Market breakdown
    db.from('lead_markets')
      .select('lead_id, market_id, markets(name)')
      .eq('organization_id', organizationId)
      .limit(2000),

    // Product interest breakdown
    db.from('lead_product_interests')
      .select('lead_id, product_category_id, product_categories(name)')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .limit(2000),
  ]);

  const leads = (leadsResult.data ?? []) as Array<{ id: string; qualification_status: string | null; status: string | null }>;
  const quotes = (quotesResult.data ?? []) as Array<{ id: string; status: string; created_at: string; updated_at: string; lead_id: string | null }>;
  const orders = (ordersResult.data ?? []) as Array<{ id: string; status: string | null; current_stage: string | null; execution_state: string | null }>;
  const docSends = (docSendsResult.data ?? []) as Array<{ id: string; channel: string; open_count: number; email_delivery_status: string | null; opened_at: string | null }>;
  const marketLeads = (marketLeadsResult.data ?? []) as Array<{ lead_id: string; market_id: string; markets: { name: string } | null }>;
  const productInterests = (productInterestsResult.data ?? []) as Array<{ lead_id: string; product_category_id: string | null; product_categories: { name: string } | null }>;

  // ── FUNNEL ──
  const totalLeads = leads.length;
  const qualifiedLeadIds = new Set(
    leads.filter((l) => !['disqualified', 'lost', 'cancelled'].includes(String(l.qualification_status ?? '').toLowerCase())).map((l) => l.id)
  );
  const quotedLeadIds = new Set(quotes.map((q) => q.lead_id).filter(Boolean) as string[]);
  const orderedLeadIds = new Set(orders.map((o) => (o as any).lead_id).filter(Boolean) as string[]);

  const quotedLeads = leads.filter((l) => quotedLeadIds.has(l.id)).length;
  const orderedLeads = leads.filter((l) => orderedLeadIds.has(l.id)).length;
  const dispatchedOrders = orders.filter((o) =>
    ['dispatched', 'completed', 'closed'].includes(String(o.current_stage ?? o.execution_state ?? '').toLowerCase())
  ).length;
  const completedOrders = orders.filter((o) =>
    ['completed', 'closed', 'paid'].includes(String(o.status ?? '').toLowerCase())
  ).length;

  const funnel: FunnelStage[] = [
    { label: 'Total Leads', count: totalLeads, pct: 100, href: '/leads', color: '#3b82f6' },
    { label: 'Quoted', count: quotedLeads, pct: safePct(quotedLeads, totalLeads), href: '/quotes', color: '#8b5cf6' },
    { label: 'Order Created', count: orderedLeads, pct: safePct(orderedLeads, totalLeads), href: '/orders', color: '#f59e0b' },
    { label: 'Dispatched', count: dispatchedOrders, pct: safePct(dispatchedOrders, totalLeads), href: '/orders', color: '#10b981' },
    { label: 'Paid & Closed', count: completedOrders, pct: safePct(completedOrders, totalLeads), href: '/orders', color: '#059669' },
  ];

  // ── QUOTE METRICS ──
  const sentQuotes = quotes.filter((q) => ['sent', 'accepted', 'rejected', 'expired'].includes(q.status));
  const acceptedQuotes = quotes.filter((q) => q.status === 'accepted');
  const rejectedQuotes = quotes.filter((q) => q.status === 'rejected');
  const pendingApproval = quotes.filter((q) => q.status === 'pending_approval').length;
  const winRate = safePct(acceptedQuotes.length, sentQuotes.length);
  const avgAccept = avgDays(acceptedQuotes);

  const quoteMetrics: QuoteMetrics = {
    totalSent: sentQuotes.length,
    totalAccepted: acceptedQuotes.length,
    totalRejected: rejectedQuotes.length,
    winRate,
    avgDaysToAccept: avgAccept,
    pendingApproval,
  };

  // ── ORDER METRICS ──
  const orderMetrics: OrderMetrics = {
    draft: orders.filter((o) => ['draft', 'quote_approved'].includes(String(o.current_stage ?? o.status ?? ''))).length,
    active: orders.filter((o) => !['completed', 'closed', 'dispatched', 'draft', 'quote_approved'].includes(String(o.current_stage ?? o.status ?? ''))).length,
    dispatched: dispatchedOrders,
    completed: completedOrders,
    totalActive: orders.length,
  };

  // ── DOCUMENT SEND METRICS ──
  const emailSends = docSends.filter((d) => d.channel === 'email');
  const whatsappSends = docSends.filter((d) => d.channel === 'whatsapp');
  const openedLinks = docSends.filter((d) => (d.open_count ?? 0) > 0).length;
  const emailDelivered = emailSends.filter((d) => d.email_delivery_status === 'delivered').length;
  const emailBounced = emailSends.filter((d) => d.email_delivery_status === 'bounced').length;

  const docSendMetrics: DocSendMetrics = {
    totalSends: docSends.length,
    emailSends: emailSends.length,
    whatsappSends: whatsappSends.length,
    openedLinks,
    emailDelivered,
    emailBounced,
    openRate: safePct(openedLinks, docSends.length),
    emailDeliveryRate: safePct(emailDelivered, emailSends.filter((e) => e.email_delivery_status !== null).length),
  };

  // ── MARKET BREAKDOWN ──
  const marketMap = new Map<string, { leadIds: Set<string> }>();
  for (const ml of marketLeads) {
    const name = ml.markets?.name ?? 'Unknown';
    if (!marketMap.has(name)) marketMap.set(name, { leadIds: new Set() });
    marketMap.get(name)!.leadIds.add(ml.lead_id);
  }
  const marketBreakdown: MarketBreakdown[] = Array.from(marketMap.entries())
    .map(([market, data]) => ({
      market,
      leadCount: data.leadIds.size,
      quoteCount: [...data.leadIds].filter((lid) => quotedLeadIds.has(lid)).length,
      orderCount: [...data.leadIds].filter((lid) => orderedLeadIds.has(lid)).length,
    }))
    .sort((a, b) => b.leadCount - a.leadCount)
    .slice(0, 8);

  // ── PRODUCT BREAKDOWN ──
  const productMap = new Map<string, Set<string>>();
  for (const pi of productInterests) {
    const name = pi.product_categories?.name ?? 'Uncategorized';
    if (!productMap.has(name)) productMap.set(name, new Set());
    productMap.get(name)!.add(pi.lead_id);
  }
  const productBreakdown: ProductBreakdown[] = Array.from(productMap.entries())
    .map(([category, leadIds]) => ({
      category,
      leadCount: leadIds.size,
      activeQuotes: [...leadIds].filter((lid) => quotedLeadIds.has(lid)).length,
    }))
    .sort((a, b) => b.leadCount - a.leadCount)
    .slice(0, 8);

  return {
    funnel,
    quoteMetrics,
    orderMetrics,
    docSendMetrics,
    marketBreakdown,
    productBreakdown,
    lastUpdated: now,
  };
}
