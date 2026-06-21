import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

// GET /api/catalog-shares/analytics?from=&to=&price_list_id=
export async function GET(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const priceListId = url.searchParams.get('price_list_id');

  let shareQuery = sb.from('catalog_shares').select('id, status, quote_id, price_list_id, use_count, created_at').eq('organization_id', orgId);
  if (from) shareQuery = shareQuery.gte('created_at', from);
  if (to) shareQuery = shareQuery.lte('created_at', to);
  if (priceListId) shareQuery = shareQuery.eq('price_list_id', priceListId);
  const { data: shares } = await shareQuery;
  const shareArr = (shares ?? []) as any[];
  const shareIds = shareArr.map((s) => s.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sharesSent = shareArr.filter((s) => s.status !== 'draft').length;
  const sharesThisMonth = shareArr.filter((s) => s.status !== 'draft' && s.created_at >= monthStart).length;
  const sharesOpened = shareArr.filter((s) => (s.use_count ?? 0) > 0).length;
  const convertedShares = shareArr.filter((s) => s.quote_id).length;

  let events: any[] = [];
  let selections: any[] = [];
  if (shareIds.length) {
    const [{ data: ev }, { data: sels }] = await Promise.all([
      sb.from('catalog_share_events').select('catalog_share_id, event_type, product_id').in('catalog_share_id', shareIds),
      sb.from('buyer_selections').select('catalog_share_id, product_id').in('catalog_share_id', shareIds),
    ]);
    events = ev ?? []; selections = sels ?? [];
  }

  const countByType = (t: string) => events.filter((e) => e.event_type === t).length;
  const uniqueOpenedShares = new Set(events.filter((e) => e.event_type === 'link_opened').map((e) => e.catalog_share_id)).size;

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
  const metrics = {
    sharesSent,
    sharesThisMonth,
    openRate: pct(uniqueOpenedShares || sharesOpened, sharesSent),
    productViewRate: pct(countByType('product_viewed') + countByType('product_detail_opened'), sharesOpened),
    downloadRate: pct(countByType('pdf_downloaded'), sharesOpened),
    quoteRequestRate: pct(countByType('quote_requested'), sharesOpened),
    quoteConversionRate: pct(convertedShares, sharesSent),
  };

  // top viewed + selected products
  const viewCounts: Record<string, number> = {};
  for (const e of events) if ((e.event_type === 'product_viewed' || e.event_type === 'product_detail_opened') && e.product_id) viewCounts[e.product_id] = (viewCounts[e.product_id] ?? 0) + 1;
  const selCounts: Record<string, number> = {};
  for (const s of selections) if (s.product_id) selCounts[s.product_id] = (selCounts[s.product_id] ?? 0) + 1;

  const topViewedIds = Object.entries(viewCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  const topSelectedIds = Object.entries(selCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  const allIds = Array.from(new Set([...topViewedIds, ...topSelectedIds]));
  const nameById: Record<string, string> = {};
  if (allIds.length) { const { data: prods } = await sb.from('products').select('id, name').in('id', allIds); for (const p of (prods ?? []) as any[]) nameById[p.id] = p.name; }

  const topViewed = topViewedIds.map((id) => ({ name: nameById[id] ?? 'Unknown', value: viewCounts[id] }));
  const topSelected = topSelectedIds.map((id) => ({ name: nameById[id] ?? 'Unknown', value: selCounts[id] }));

  return NextResponse.json({ metrics, topViewed, topSelected });
}
