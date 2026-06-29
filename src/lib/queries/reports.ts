import { createClient } from '@/lib/supabase/server';
import { getReportsData as getCoreReportsData } from './query-core';
import type { ReportsData as CoreReportsData } from './query-core';

type EnrichedLead = CoreReportsData['leads'][number] & {
  company_name?: string | null;
  contact_name?: string | null;
  country?: string | null;
  lead_type?: string | null;
  trade_event_id?: string | null;
};

type EnrichedProduct = CoreReportsData['products'][number] & {
  name?: string | null;
  sku?: string | null;
};

type EnrichedMarket = CoreReportsData['markets'][number] & {
  name?: string | null;
};

type EnrichedQuoteLineItem = CoreReportsData['quoteLineItems'][number] & {
  product_id?: string | null;
  product_name?: string | null;
  quantity?: number | null;
  line_total?: number | null;
  total_price?: number | null;
};

export type ReportsData = Omit<CoreReportsData, 'leads' | 'products' | 'markets' | 'quoteLineItems'> & {
  leads: EnrichedLead[];
  products: EnrichedProduct[];
  markets: EnrichedMarket[];
  quoteLineItems: EnrichedQuoteLineItem[];
};

export async function getReportsData(organizationId: string): Promise<ReportsData | null> {
  const core = await getCoreReportsData(organizationId);
  if (!core) return null;

  const supabase = await createClient();
  const quoteIds = core.quotes.map((quote) => quote.id).filter(Boolean);

  const [leadsResult, productsResult, marketsResult, lineItemsResult] = await Promise.all([
    supabase
      .from('leads')
      .select('id, company_name, contact_name, country, lead_type, stage_id, created_at, updated_at, deal_value, trade_event_id')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(240),
    supabase
      .from('products')
      .select('id, name, sku, is_active')
      .eq('organization_id', organizationId)
      .order('name')
      .limit(240),
    supabase
      .from('markets')
      .select('id, name, is_active')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true })
      .limit(120),
    quoteIds.length
      ? supabase
          .from('quote_line_items')
          .select('id, quote_id, product_id, product_name, quantity, unit_price, catalog_price_amount, is_price_overridden, line_total, total_price')
          .in('quote_id', quoteIds)
          .limit(720)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const extraIssues = [
    leadsResult.error ? `reports enriched leads: ${leadsResult.error.message}` : null,
    productsResult.error ? `reports enriched products: ${productsResult.error.message}` : null,
    marketsResult.error ? `reports enriched markets: ${marketsResult.error.message}` : null,
    lineItemsResult.error ? `reports enriched quote line items: ${lineItemsResult.error.message}` : null,
  ].filter(Boolean) as string[];

  return {
    ...core,
    queryIssues: [...core.queryIssues, ...extraIssues],
    leads: (leadsResult.data ?? core.leads) as ReportsData['leads'],
    products: (productsResult.data ?? core.products) as ReportsData['products'],
    markets: (marketsResult.data ?? core.markets) as ReportsData['markets'],
    quoteLineItems: (lineItemsResult.data ?? core.quoteLineItems) as ReportsData['quoteLineItems'],
  };
}
