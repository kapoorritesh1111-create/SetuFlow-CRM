import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export const dynamic = 'force-dynamic';

// GET /api/price-lists  → list all price lists for the active org (with product counts)
export async function GET() {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;
  const { data: lists, error } = await sb.from('price_lists').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // product counts per list
  const ids = (lists ?? []).map((l: any) => l.id);
  let counts: Record<string, number> = {};
  if (ids.length) {
    const { data: items } = await sb.from('price_list_items').select('price_list_id').in('price_list_id', ids);
    for (const it of (items ?? []) as any[]) counts[it.price_list_id] = (counts[it.price_list_id] ?? 0) + 1;
  }
  const withCounts = (lists ?? []).map((l: any) => ({ ...l, product_count: counts[l.id] ?? 0 }));
  return NextResponse.json({ priceLists: withCounts });
}

// POST /api/price-lists  → create a price list
export async function POST(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const sb = (await createClient()) as any;
  const insert = {
    organization_id: ws.organization.id,
    name: String(body.name ?? '').trim() || 'Untitled price list',
    currency: String(body.currency ?? 'USD').toUpperCase().slice(0, 3),
    incoterm: body.incoterm || null,
    incoterm_location: body.incoterm_location || null,
    market: body.market || null,
    buyer_segment: body.buyer_segment || null,
    valid_from: body.valid_from || null,
    valid_until: body.valid_until || null,
    status: ['draft', 'active', 'expired', 'archived'].includes(body.status) ? body.status : 'draft',
    notes: body.notes || null,
    created_by: ws.user?.id ?? null,
  };
  const { data, error } = await sb.from('price_lists').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ priceList: { ...data, product_count: 0 } });
}
