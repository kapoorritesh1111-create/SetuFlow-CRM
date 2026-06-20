import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export const dynamic = 'force-dynamic';

async function ownerGuard(sb: any, orgId: string, listId: string) {
  const { data } = await sb.from('price_lists').select('id').eq('id', listId).eq('organization_id', orgId).maybeSingle();
  return Boolean(data);
}

// POST /api/price-lists/[id]/items → add a product (with optional tiers)
// body: { product_id, product_variant_id?, moq?, moq_unit?, unit_price?, currency?, lead_time_days?, notes?, tiers?: [{tier_qty_min,tier_qty_max,unit_price,discount_pct}] }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  const sb = (await createClient()) as any;
  if (!(await ownerGuard(sb, ws.organization.id, params.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (!body.product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  // verify the product belongs to this org
  const { data: product } = await sb.from('products').select('id').eq('id', body.product_id).eq('organization_id', ws.organization.id).maybeSingle();
  if (!product) return NextResponse.json({ error: 'Product not in organization' }, { status: 400 });

  const itemInsert = {
    price_list_id: params.id,
    product_id: body.product_id,
    product_variant_id: body.product_variant_id || null,
    moq: body.moq ?? null,
    moq_unit: ['kg', 'cases', 'units'].includes(body.moq_unit) ? body.moq_unit : 'kg',
    unit_price: body.unit_price ?? null,
    currency: body.currency || null,
    lead_time_days: body.lead_time_days ?? null,
    notes: body.notes || null,
    sort_order: body.sort_order ?? 0,
  };
  const { data: item, error } = await sb.from('price_list_items').insert(itemInsert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let tiers: any[] = [];
  if (Array.isArray(body.tiers) && body.tiers.length) {
    const tierRows = body.tiers.slice(0, 3).map((t: any, i: number) => ({
      price_list_item_id: item.id,
      tier_qty_min: t.tier_qty_min ?? null,
      tier_qty_max: t.tier_qty_max ?? null,
      unit_price: t.unit_price ?? null,
      discount_pct: t.discount_pct ?? null,
      sort_order: i,
    }));
    const { data: t } = await sb.from('price_list_tiers').insert(tierRows).select();
    tiers = t ?? [];
  }
  return NextResponse.json({ item, tiers });
}

// PATCH /api/price-lists/[id]/items → update an item + replace its tiers
// body: { item_id, ...fields, tiers?: [...] }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  const sb = (await createClient()) as any;
  if (!(await ownerGuard(sb, ws.organization.id, params.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (!body.item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ['moq', 'moq_unit', 'unit_price', 'currency', 'lead_time_days', 'notes', 'sort_order', 'product_variant_id']) if (k in body) patch[k] = body[k];
  const { data: item, error } = await sb.from('price_list_items').update(patch).eq('id', body.item_id).eq('price_list_id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let tiers: any[] | undefined;
  if (Array.isArray(body.tiers)) {
    await sb.from('price_list_tiers').delete().eq('price_list_item_id', body.item_id);
    if (body.tiers.length) {
      const tierRows = body.tiers.slice(0, 3).map((t: any, i: number) => ({
        price_list_item_id: body.item_id,
        tier_qty_min: t.tier_qty_min ?? null,
        tier_qty_max: t.tier_qty_max ?? null,
        unit_price: t.unit_price ?? null,
        discount_pct: t.discount_pct ?? null,
        sort_order: i,
      }));
      const { data: t } = await sb.from('price_list_tiers').insert(tierRows).select();
      tiers = t ?? [];
    } else tiers = [];
  }
  return NextResponse.json({ item, tiers });
}

// DELETE /api/price-lists/[id]/items?item_id=... → remove a product from the list
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  const sb = (await createClient()) as any;
  if (!(await ownerGuard(sb, ws.organization.id, params.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const itemId = new URL(request.url).searchParams.get('item_id');
  if (!itemId) return NextResponse.json({ error: 'item_id required' }, { status: 400 });
  const { error } = await sb.from('price_list_items').delete().eq('id', itemId).eq('price_list_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
