import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { callGuruJson, parseGuruJson } from '@/lib/catalog-share/guru';
import { buildCatalogGuruContext } from '@/lib/catalog-share/guru-context';

export const dynamic = 'force-dynamic';

type Summary = { summary: string; hottest: string[]; next_action: string };

const NEXT_ACTIONS = ['create_quote', 'send_follow_up', 'resend_catalog', 'switch_channel'];

// POST /api/catalog-shares/[id]/guru-summary -> engagement summary + next best action
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;

  const context = await buildCatalogGuruContext(sb, { orgId, shareId: params.id, candidateLimit: 80 });
  const share = context.share;
  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const counts = context.engagement.event_counts;
  const selectedProducts = context.selected_products.filter((product) => context.engagement.selected_product_ids.includes(product.id));
  const viewedProducts = context.selected_products.filter((product) => context.engagement.viewed_product_ids.includes(product.id));
  const viewedNames = viewedProducts.map((product) => String(product.name ?? '')).filter(Boolean);
  const selectedNames = selectedProducts.map((product) => String(product.name ?? '')).filter(Boolean);
  const requestedQuote = context.engagement.quote_requested;
  const askedQuestion = context.engagement.question_count > 0;

  const sys = 'You are Setu Guru, an export sales assistant. Given rich catalog share context, write a 2-3 sentence summary of buyer behaviour, list the hottest product names, and recommend ONE next action from: create_quote, send_follow_up, resend_catalog, switch_channel. Consider selections, viewed products, questions, quote status, missing data, and price-list coverage. Return ONLY JSON: {"summary":"...","hottest":["..."],"next_action":"create_quote"}.';
  const payload = {
    buyer: share.buyer_company,
    opens: share.use_count,
    eventCounts: counts,
    viewedProducts: viewedNames,
    selectedProducts: selectedNames,
    requestedQuote,
    askedQuestion,
    hasQuote: Boolean(share.quote_id),
    priceList: context.price_list,
    gaps: context.gaps,
    selectedProductContext: selectedProducts.map((product) => ({ name: product.name, readiness: product.readiness_status, missing: product.readiness_missing })),
  };
  const guru = await callGuruJson(sys, payload);

  if (guru.ok) {
    const parsed = parseGuruJson<Summary>(guru.text);
    if (parsed?.summary && NEXT_ACTIONS.includes(parsed.next_action)) {
      return NextResponse.json({ ...parsed, fallback: false });
    }
  }

  // Deterministic fallback summary
  const parts: string[] = [];
  const who = String(share.buyer_company || 'The buyer');
  const openCount = Number(share.use_count ?? 0);
  if (openCount > 0) parts.push(`${who} opened the catalog ${openCount} time${openCount > 1 ? 's' : ''}`);
  if (viewedNames.length) parts.push(`viewed ${viewedNames.length} product${viewedNames.length > 1 ? 's' : ''}`);
  if (selectedNames.length) parts.push(`selected ${selectedNames.join(', ')}`);
  if (requestedQuote) parts.push('and requested a quote');
  const summary = parts.length ? `${parts.join(', ')}.` : `${who} has not engaged with the catalog yet.`;
  let next_action = 'resend_catalog';
  if (requestedQuote || selectedNames.length) next_action = share.quote_id ? 'send_follow_up' : 'create_quote';
  else if (askedQuestion || viewedNames.length) next_action = 'send_follow_up';
  else if ((counts.link_opened ?? 0) === 0) next_action = 'resend_catalog';

  return NextResponse.json({ summary, hottest: selectedNames.length ? selectedNames : viewedNames.slice(0, 3), next_action, fallback: true });
}
