import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

// Curated B2B buyer segments. These are commercial buyer types — NOT product
// categories. Existing saved values are merged in so nothing already in use
// disappears (S34-CATALOG-042).
const DEFAULT_BUYER_SEGMENTS = ['Distributor', 'Importer', 'Wholesaler', 'Retail chain', 'Foodservice', 'Private label', 'Manufacturer'];

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export async function GET() {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;

  const [{ data: markets }, { data: lists }, { data: leads }, { data: fx }] = await Promise.all([
    sb.from('markets').select('name').eq('organization_id', orgId).eq('is_active', true).order('sort_order', { ascending: true }),
    sb.from('price_lists').select('market, buyer_segment').eq('organization_id', orgId),
    // NOTE: lead_type only (buyer/supplier-style). product_type is a CATEGORY and
    // must never feed the buyer-segment list — that was the dropdown pollution bug.
    sb.from('leads').select('lead_type').eq('organization_id', orgId).limit(1000),
    sb.from('exchange_rates').select('base_currency, quote_currency, rate, effective_at').order('effective_at', { ascending: false }).limit(500),
  ]);

  // Most-recent market-average rate per base→quote pair, normalised to base USD.
  const fxRates: Record<string, number> = { USD: 1 };
  const seen = new Set<string>();
  for (const r of (fx ?? []) as any[]) {
    const base = String(r.base_currency ?? '').toUpperCase();
    const quote = String(r.quote_currency ?? '').toUpperCase();
    const rate = Number(r.rate);
    if (!base || !quote || !Number.isFinite(rate) || rate <= 0) continue;
    if (base === 'USD') {
      const key = `USD>${quote}`;
      if (!seen.has(key)) { fxRates[quote] = rate; seen.add(key); }
    } else if (quote === 'USD') {
      const key = `USD>${base}`;
      if (!seen.has(key)) { fxRates[base] = 1 / rate; seen.add(key); }
    }
  }

  return NextResponse.json({
    markets: unique([...(markets ?? []).map((m: any) => m.name), ...(lists ?? []).map((l: any) => l.market)]),
    buyerSegments: unique([
      ...DEFAULT_BUYER_SEGMENTS,
      ...(lists ?? []).map((l: any) => l.buyer_segment),
      ...(leads ?? []).map((l: any) => l.lead_type),
    ]),
    fxRates,
  });
}
