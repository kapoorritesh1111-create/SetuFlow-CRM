import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { callGuruJson, parseGuruJson } from '@/lib/catalog-share/guru';

export const dynamic = 'force-dynamic';

type Summary = { summary: string; hottest: string[]; next_action: string };

const NEXT_ACTIONS = ['create_quote', 'send_follow_up', 'resend_catalog', 'switch_channel'];

// POST /api/catalog-shares/[id]/guru-summary → engagement summary + next best action
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;

  const { data: share } = await sb.from('catalog_shares').select('*').eq('id', params.id).eq('organization_id', orgId).maybeSingle();
  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [{ data: events }, { data: sels }] = await Promise.all([
    sb.from('catalog_share_events').select('event_type, product_id, occurred_at, meta').eq('catalog_share_id', share.id).order('occurred_at', { ascending: true }).limit(120),
    sb.from('buyer_selections').select('product_id, quantity').eq('catalog_share_id', share.id),
  ]);
  const ev = (events ?? []) as any[];
  const selections = (sels ?? []) as any[];

  // product names
  const pids = Array.from(new Set([...ev.map((e) => e.product_id).filter(Boolean), ...selections.map((s) => s.product_id)]));
  const nameById: Record<string, string> = {};
  if (pids.length) { const { data: prods } = await sb.from('products').select('id, name').in('id', pids); for (const p of (prods ?? []) as any[]) nameById[p.id] = p.name; }

  const counts: Record<string, number> = {};
  for (const e of ev) counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
  const viewedNames = Array.from(new Set(ev.filter((e) => e.product_id && (e.event_type === 'product_detail_opened' || e.event_type === 'product_viewed')).map((e) => nameById[e.product_id]).filter(Boolean)));
  const selectedNames = selections.map((s) => nameById[s.product_id]).filter(Boolean);
  const requestedQuote = (counts['quote_requested'] ?? 0) > 0;
  const askedQuestion = (counts['question_submitted'] ?? 0) > 0;

  const sys = 'You are Setu Guru, an export sales assistant. Given catalog engagement data, write a 2-3 sentence summary of buyer behaviour, list the hottest product names, and recommend ONE next action from: create_quote, send_follow_up, resend_catalog, switch_channel. Return ONLY JSON: {"summary":"...","hottest":["..."],"next_action":"create_quote"}.';
  const payload = { buyer: share.buyer_company, opens: share.use_count, eventCounts: counts, viewedProducts: viewedNames, selectedProducts: selectedNames, requestedQuote, askedQuestion, hasQuote: Boolean(share.quote_id) };
  const guru = await callGuruJson(sys, payload);

  if (guru.ok) {
    const parsed = parseGuruJson<Summary>(guru.text);
    if (parsed?.summary && NEXT_ACTIONS.includes(parsed.next_action)) {
      return NextResponse.json({ ...parsed, fallback: false });
    }
  }

  // Deterministic fallback summary
  const parts: string[] = [];
  const who = share.buyer_company || 'The buyer';
  if (share.use_count > 0) parts.push(`${who} opened the catalog ${share.use_count} time${share.use_count > 1 ? 's' : ''}`);
  if (viewedNames.length) parts.push(`viewed ${viewedNames.length} product${viewedNames.length > 1 ? 's' : ''}`);
  if (selectedNames.length) parts.push(`selected ${selectedNames.join(', ')}`);
  if (requestedQuote) parts.push('and requested a quote');
  const summary = parts.length ? `${parts.join(', ')}.` : `${who} has not engaged with the catalog yet.`;
  let next_action = 'resend_catalog';
  if (requestedQuote || selectedNames.length) next_action = share.quote_id ? 'send_follow_up' : 'create_quote';
  else if (viewedNames.length) next_action = 'send_follow_up';
  else if ((counts['link_opened'] ?? 0) === 0) next_action = 'resend_catalog';

  return NextResponse.json({ summary, hottest: selectedNames.length ? selectedNames : viewedNames.slice(0, 3), next_action, fallback: true });
}
