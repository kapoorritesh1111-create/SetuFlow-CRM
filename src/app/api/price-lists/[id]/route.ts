import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export const dynamic = 'force-dynamic';

const ALLOWED = ['name', 'currency', 'incoterm', 'incoterm_location', 'market', 'buyer_segment', 'valid_from', 'valid_until', 'status', 'notes'];

async function ensureOwner(sb: any, orgId: string, id: string) {
  const { data } = await sb.from('price_lists').select('id').eq('id', id).eq('organization_id', orgId).maybeSingle();
  return Boolean(data);
}

// GET /api/price-lists/[id] → full price list with items + tiers
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;
  const { data: list } = await sb.from('price_lists').select('*').eq('id', params.id).eq('organization_id', orgId).maybeSingle();
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: items } = await sb.from('price_list_items').select('*').eq('price_list_id', params.id).order('sort_order', { ascending: true });
  const itemIds = (items ?? []).map((i: any) => i.id);
  let tiers: any[] = [];
  if (itemIds.length) {
    const { data: t } = await sb.from('price_list_tiers').select('*').in('price_list_item_id', itemIds).order('sort_order', { ascending: true });
    tiers = t ?? [];
  }
  return NextResponse.json({ priceList: list, items: items ?? [], tiers });
}

// PATCH /api/price-lists/[id] → update price list metadata / status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;
  if (!(await ensureOwner(sb, orgId, params.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ALLOWED) if (k in body) patch[k] = body[k];
  const { data, error } = await sb.from('price_lists').update(patch).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ priceList: data });
}

// DELETE /api/price-lists/[id] → archive (soft) by default; ?hard=1 to delete
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;
  if (!(await ensureOwner(sb, orgId, params.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const hard = new URL(request.url).searchParams.get('hard') === '1';
  if (hard) {
    const { error } = await sb.from('price_lists').delete().eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  }
  const { data, error } = await sb.from('price_lists').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ priceList: data });
}
