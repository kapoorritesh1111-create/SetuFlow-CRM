import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { callGuruJson, parseGuruJson } from '@/lib/catalog-share/guru';

export const dynamic = 'force-dynamic';

type Rec = { product_id: string; reason: string };

// POST /api/catalog-shares/guru/recommend → product recommendations for a lead
export async function POST(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;

  // candidate products (active, org)
  const { data: products } = await sb.from('products').select('id, name, country_of_origin, certifications').eq('organization_id', orgId).eq('is_active', true).limit(120);
  const candidates = (products ?? []) as any[];
  if (!candidates.length) return NextResponse.json({ recommendations: [], fallback: false });

  // lead context
  let lead: any = null;
  if (body.lead_id) {
    const { data } = await sb.from('leads').select('company_name, products_or_needs, main_product_category, trade_show_name, market_id').eq('organization_id', orgId).eq('id', body.lead_id).maybeSingle();
    lead = data;
  }

  const sys = 'You are Setu Guru, a trade-sales assistant. Given a buyer lead and a list of candidate products, pick up to 6 products best matched to the buyer\'s stated interest, category, and market. Return ONLY JSON: {"recommendations":[{"product_id":"...","reason":"short reason under 8 words"}]}. Use only product_id values from the candidates.';
  const payload = { lead: lead ?? { note: body.note ?? null }, candidates: candidates.map((p) => ({ product_id: p.id, name: p.name, origin: p.country_of_origin })) };
  const guru = await callGuruJson(sys, payload);

  if (guru.ok) {
    const parsed = parseGuruJson<{ recommendations: Rec[] }>(guru.text);
    const valid = (parsed?.recommendations ?? []).filter((r) => r && candidates.some((c) => c.id === r.product_id)).slice(0, 6);
    if (valid.length) return NextResponse.json({ recommendations: valid, fallback: false });
  }

  // Deterministic fallback: match on category / interest keywords
  const interest = `${lead?.main_product_category ?? ''} ${lead?.products_or_needs ?? ''} ${body.note ?? ''}`.toLowerCase();
  const tokens = interest.split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  const scored = candidates.map((p) => {
    const name = String(p.name ?? '').toLowerCase();
    let score = 0; let reason = 'Popular in your catalog';
    for (const t of tokens) { if (name.includes(t)) { score += 2; reason = 'Matches buyer interest'; break; } }
    const origin = String(p.country_of_origin ?? '').toLowerCase();
    if (origin && interest.includes(origin)) { score += 1; reason = `Origin match: ${p.country_of_origin}`; }
    return { product_id: p.id, reason, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(({ product_id, reason }) => ({ product_id, reason }));

  return NextResponse.json({ recommendations: scored, fallback: true });
}
