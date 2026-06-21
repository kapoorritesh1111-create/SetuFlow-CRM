import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { callGuruJson, parseGuruJson } from '@/lib/catalog-share/guru';
import { buildCatalogGuruContext } from '@/lib/catalog-share/guru-context';

export const dynamic = 'force-dynamic';

type Rec = { product_id: string; reason: string };

// POST /api/catalog-shares/guru/recommend -> product recommendations for a lead
export async function POST(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;

  const context = await buildCatalogGuruContext(sb, {
    orgId,
    leadId: body.lead_id ?? null,
    productIds: Array.isArray(body.product_ids) ? body.product_ids.map(String).filter(Boolean) : [],
    priceListId: body.price_list_id ?? null,
    candidateLimit: 120,
  });
  const candidates = context.candidate_products;
  if (!candidates.length) return NextResponse.json({ recommendations: [], fallback: false });

  const sys = 'You are Setu Guru, a trade-sales assistant. Given a buyer lead and rich catalog context, pick up to 6 products best matched to the buyer interest, category, market, product readiness, origin, certifications, and price availability. Return ONLY JSON: {"recommendations":[{"product_id":"...","reason":"short reason under 8 words"}]}. Use only product_id values from candidate_products.';
  const payload = {
    lead: context.lead ?? { note: body.note ?? null },
    selected_products: context.selected_products.map((product) => ({ product_id: product.id, name: product.name, readiness: product.readiness_status, missing: product.readiness_missing })),
    candidate_products: candidates.map((product) => ({ product_id: product.id, name: product.name, origin: product.country_of_origin, certifications: product.certifications, readiness: product.readiness_status, has_price: product.fob_price != null || product.exw_price != null || product.cif_price != null })),
    gaps: context.gaps,
  };
  const guru = await callGuruJson(sys, payload);

  if (guru.ok) {
    const parsed = parseGuruJson<{ recommendations: Rec[] }>(guru.text);
    const valid = (parsed?.recommendations ?? []).filter((rec: Rec) => rec && candidates.some((candidate) => candidate.id === rec.product_id)).slice(0, 6);
    if (valid.length) return NextResponse.json({ recommendations: valid, fallback: false });
  }

  // Deterministic fallback: match on category / interest keywords while preferring ready and priced products.
  const lead = context.lead ?? {};
  const interest = `${lead.main_product_category ?? ''} ${lead.products_or_needs ?? ''} ${body.note ?? ''}`.toLowerCase();
  const tokens = interest.split(/[^a-z0-9]+/).filter((token: string) => token.length > 3);
  const scored = candidates.map((product) => {
    const name = String(product.name ?? '').toLowerCase();
    let score = product.readiness_status === 'ready' ? 1 : 0;
    let reason = product.readiness_status === 'ready' ? 'Catalog-ready product' : 'Relevant catalog product';
    for (const token of tokens) {
      if (name.includes(token)) { score += 3; reason = 'Matches buyer interest'; break; }
    }
    const origin = String(product.country_of_origin ?? '').toLowerCase();
    if (origin && interest.includes(origin)) { score += 1; reason = `Origin match: ${product.country_of_origin}`; }
    if (product.fob_price != null || product.exw_price != null || product.cif_price != null) score += 1;
    return { product_id: product.id, reason, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(({ product_id, reason }) => ({ product_id, reason }));

  return NextResponse.json({ recommendations: scored, fallback: true });
}
