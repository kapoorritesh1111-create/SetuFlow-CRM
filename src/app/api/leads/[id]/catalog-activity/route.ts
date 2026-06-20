import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

// GET /api/leads/[id]/catalog-activity → catalog shares for the lead + their engagement events
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;

  const { data: shares } = await sb.from('catalog_shares').select('*').eq('organization_id', orgId).eq('lead_id', params.id).order('created_at', { ascending: false });
  const shareIds = (shares ?? []).map((s: any) => s.id);

  let events: any[] = [];
  let selCounts: Record<string, number> = {};
  let productNames: Record<string, string> = {};
  if (shareIds.length) {
    const [{ data: ev }, { data: sels }] = await Promise.all([
      sb.from('catalog_share_events').select('*').in('catalog_share_id', shareIds).order('occurred_at', { ascending: false }).limit(80),
      sb.from('buyer_selections').select('catalog_share_id, product_id').in('catalog_share_id', shareIds),
    ]);
    events = ev ?? [];
    for (const s of (sels ?? []) as any[]) selCounts[s.catalog_share_id] = (selCounts[s.catalog_share_id] ?? 0) + 1;
    const pids = Array.from(new Set([...(events.map((e) => e.product_id).filter(Boolean)), ...((sels ?? []).map((s: any) => s.product_id))]));
    if (pids.length) {
      const { data: prods } = await sb.from('products').select('id, name').in('id', pids);
      for (const p of (prods ?? []) as any[]) productNames[p.id] = p.name;
    }
  }

  const enriched = (shares ?? []).map((s: any) => ({ ...s, selection_count: selCounts[s.id] ?? 0 }));
  return NextResponse.json({ shares: enriched, events, productNames });
}
