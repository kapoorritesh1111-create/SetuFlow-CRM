import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

type Recommendation = {
  price_list_id: string;
  score: number;
  coverage_count: number;
  selected_count: number;
  reasons: string[];
};

function norm(v: unknown) {
  return String(v ?? '').trim().toLowerCase();
}

function isValidDate(v: string | null | undefined) {
  if (!v) return true;
  const t = new Date(v.includes('T') ? v : `${v}T23:59:59`).getTime();
  return Number.isNaN(t) ? true : t >= Date.now();
}

export async function POST(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const productIds = Array.isArray(body.product_ids) ? body.product_ids.map(String).filter(Boolean) : [];
  if (!productIds.length) return NextResponse.json({ recommendations: [] });

  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;
  const [{ data: lists, error }, { data: items }] = await Promise.all([
    sb.from('price_lists').select('*').eq('organization_id', orgId).in('status', ['active', 'draft']),
    sb.from('price_list_items').select('price_list_id, product_id').in('product_id', productIds),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let leadMarket = '';
  let leadSegments: string[] = [];
  if (body.lead_id) {
    const { data: lead } = await sb
      .from('leads')
      .select('market_id, lead_type, product_type, private_label_mode')
      .eq('id', body.lead_id)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (lead?.market_id) {
      const { data: market } = await sb.from('markets').select('name').eq('id', lead.market_id).eq('organization_id', orgId).maybeSingle();
      leadMarket = norm(market?.name);
    }
    leadSegments = [lead?.lead_type, lead?.product_type, lead?.private_label_mode].map(norm).filter(Boolean);
  }

  const desiredCurrency = norm(body.currency || '');
  const desiredIncoterm = norm(body.incoterm || '');
  const selectedCount = productIds.length;
  const itemMap: Record<string, Set<string>> = {};
  for (const it of (items ?? []) as any[]) {
    (itemMap[it.price_list_id] ||= new Set()).add(it.product_id);
  }

  const recommendations: Recommendation[] = (lists ?? []).map((pl: any) => {
    const covered = productIds.filter((id) => itemMap[pl.id]?.has(id)).length;
    const coveragePct = covered / selectedCount;
    const reasons: string[] = [];
    let score = 0;

    score += Math.round(coveragePct * 60);
    if (covered === selectedCount) reasons.push('covers all selected products');
    else if (covered > 0) reasons.push(`covers ${covered}/${selectedCount} selected products`);
    else reasons.push('no selected product coverage yet');

    if (pl.status === 'active') { score += 12; reasons.push('active price list'); }
    else if (pl.status === 'draft') { score += 4; reasons.push('draft price list'); }

    if (isValidDate(pl.valid_until)) { score += 8; reasons.push('valid date window'); }
    else { score -= 12; reasons.push('past validity window'); }

    if (desiredCurrency && norm(pl.currency) === desiredCurrency) { score += 7; reasons.push(`currency match: ${pl.currency}`); }
    if (desiredIncoterm && norm(pl.incoterm) === desiredIncoterm) { score += 7; reasons.push(`Incoterm match: ${pl.incoterm}`); }
    if (leadMarket && norm(pl.market) === leadMarket) { score += 4; reasons.push(`market match: ${pl.market}`); }
    if (pl.buyer_segment && leadSegments.includes(norm(pl.buyer_segment))) { score += 4; reasons.push(`buyer segment match: ${pl.buyer_segment}`); }

    return { price_list_id: pl.id, score, coverage_count: covered, selected_count: selectedCount, reasons };
  })
    .filter((r: Recommendation) => r.coverage_count > 0 || r.score > 20)
    .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
    .slice(0, 3);

  return NextResponse.json({ recommendations });
}
