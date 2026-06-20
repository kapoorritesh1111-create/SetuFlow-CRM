import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export const dynamic = 'force-dynamic';

function token() { return randomBytes(16).toString('hex'); }

// GET /api/catalog-shares → list shares for the org (Hub Shared Links tab)
export async function GET() {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const { data: shares, error } = await sb.from('catalog_shares').select('*').eq('organization_id', ws.organization.id).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // selection counts per share
  const ids = (shares ?? []).map((s: any) => s.id);
  const selCounts: Record<string, number> = {};
  if (ids.length) {
    const { data: sels } = await sb.from('buyer_selections').select('catalog_share_id').in('catalog_share_id', ids);
    for (const s of (sels ?? []) as any[]) selCounts[s.catalog_share_id] = (selCounts[s.catalog_share_id] ?? 0) + 1;
  }
  const withCounts = (shares ?? []).map((s: any) => ({ ...s, selection_count: selCounts[s.id] ?? 0 }));
  return NextResponse.json({ shares: withCounts });
}

// POST /api/catalog-shares → create a share (catalog_shares + catalog_share_products + 'created' event)
export async function POST(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const productIds: string[] = Array.isArray(body.product_ids) ? body.product_ids.filter(Boolean) : [];
  if (!productIds.length) return NextResponse.json({ error: 'Select at least one product' }, { status: 400 });

  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;
  const validUntil = body.valid_until ? new Date(body.valid_until).toISOString() : new Date(Date.now() + 7 * 864e5).toISOString();

  const insert = {
    organization_id: orgId,
    lead_id: body.lead_id || null,
    token: token(),
    price_list_id: body.price_list_id || null,
    buyer_name: body.buyer_name || null,
    buyer_company: body.buyer_company || null,
    buyer_email: body.buyer_email || null,
    buyer_phone: body.buyer_phone || null,
    incoterm: body.incoterm || null,
    currency: body.currency || 'USD',
    valid_until: validUntil,
    status: body.status === 'draft' ? 'draft' : 'active',
    pdf_download_allowed: body.pdf_download_allowed !== false,
    tracking_enabled: body.tracking_enabled !== false,
    pin_code: body.pin_code || null,
    share_channel: body.share_channel || null,
    created_by: ws.user?.id ?? null,
  };
  const { data: share, error } = await sb.from('catalog_shares').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productRows = productIds.map((pid, i) => ({ catalog_share_id: share.id, product_id: pid, sort_order: i }));
  await sb.from('catalog_share_products').insert(productRows);

  return NextResponse.json({ share });
}
