import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export const dynamic = 'force-dynamic';

type PlanItemInput = {
  product_id?: string;
  price_list_item_id?: string | null;
  base_unit_price?: number | string | null;
  requested_unit_price?: number | string | null;
  currency?: string | null;
  override_reason?: string | null;
  sort_order?: number;
};

function toNumber(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function evaluateItem(item: PlanItemInput) {
  const base = toNumber(item.base_unit_price);
  const requested = toNumber(item.requested_unit_price);
  if (base == null || requested == null || base <= 0) {
    return { discount_pct: null, guardrail_status: 'ok', guardrail_reason: null, approval_required: false };
  }
  const discount = Number((((base - requested) / base) * 100).toFixed(2));
  if (discount >= 20) return { discount_pct: discount, guardrail_status: 'blocked', guardrail_reason: 'Discount is 20% or greater and requires approval before buyer visibility.', approval_required: true };
  if (discount >= 10) return { discount_pct: discount, guardrail_status: 'warning', guardrail_reason: 'Discount is 10% or greater and should be reviewed before sending.', approval_required: true };
  return { discount_pct: discount, guardrail_status: 'ok', guardrail_reason: null, approval_required: false };
}

export async function GET(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('lead_id');
  const shareId = searchParams.get('catalog_share_id');

  let query = sb.from('buyer_pricing_plans').select('*').eq('organization_id', ws.organization.id).order('created_at', { ascending: false }).limit(50);
  if (leadId) query = query.eq('lead_id', leadId);
  if (shareId) query = query.eq('catalog_share_id', shareId);
  const { data: plans, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const planIds = (plans ?? []).map((plan: any) => plan.id);
  let items: any[] = [];
  if (planIds.length) {
    const { data } = await sb.from('buyer_pricing_plan_items').select('*').in('buyer_pricing_plan_id', planIds).order('sort_order', { ascending: true });
    items = data ?? [];
  }

  return NextResponse.json({ plans: plans ?? [], items });
}

export async function POST(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const rawItems: PlanItemInput[] = Array.isArray(body.items) ? body.items.filter((item: PlanItemInput) => item?.product_id) : [];
  const evaluated = rawItems.map(evaluateItem);
  const approvalRequired = evaluated.some((item) => item.approval_required) || body.status === 'pending_approval';
  const status = body.status === 'pending_approval' || approvalRequired ? 'pending_approval' : 'draft';
  const sb = (await createClient()) as any;

  const planInsert = {
    organization_id: ws.organization.id,
    lead_id: body.lead_id || null,
    catalog_share_id: body.catalog_share_id || null,
    price_list_id: body.price_list_id || null,
    buyer_company: body.buyer_company || null,
    buyer_segment: body.buyer_segment || null,
    currency: body.currency || 'USD',
    incoterm: body.incoterm || null,
    status,
    approval_required: approvalRequired,
    approval_reason: approvalRequired ? (body.approval_reason || 'Buyer-specific pricing requires review before buyer visibility.') : null,
    submitted_at: status === 'pending_approval' ? new Date().toISOString() : null,
    submitted_by: status === 'pending_approval' ? ws.user?.id ?? null : null,
    notes: body.notes || null,
    created_by: ws.user?.id ?? null,
  };

  const { data: plan, error } = await sb.from('buyer_pricing_plans').insert(planInsert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (rawItems.length) {
    const rows = rawItems.map((item, index) => {
      const guardrail = evaluated[index];
      return {
        buyer_pricing_plan_id: plan.id,
        product_id: item.product_id,
        price_list_item_id: item.price_list_item_id || null,
        base_unit_price: toNumber(item.base_unit_price),
        requested_unit_price: toNumber(item.requested_unit_price),
        currency: item.currency || body.currency || 'USD',
        discount_pct: guardrail.discount_pct,
        guardrail_status: guardrail.guardrail_status,
        guardrail_reason: guardrail.guardrail_reason,
        approval_required: guardrail.approval_required,
        override_reason: item.override_reason || null,
        sort_order: item.sort_order ?? index,
      };
    });
    const { error: itemError } = await sb.from('buyer_pricing_plan_items').insert(rows);
    if (itemError) return NextResponse.json({ error: itemError.message, plan }, { status: 500 });
  }

  return NextResponse.json({ plan, approval_required: approvalRequired });
}
