import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
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
  const lastActivity: Record<string, string> = {};
  if (ids.length) {
    const { data: sels } = await sb.from('buyer_selections').select('catalog_share_id').in('catalog_share_id', ids);
    for (const s of (sels ?? []) as any[]) selCounts[s.catalog_share_id] = (selCounts[s.catalog_share_id] ?? 0) + 1;
    const { data: ev } = await sb.from('catalog_share_events').select('catalog_share_id, occurred_at').in('catalog_share_id', ids).order('occurred_at', { ascending: false });
    for (const e of (ev ?? []) as any[]) if (!lastActivity[e.catalog_share_id]) lastActivity[e.catalog_share_id] = e.occurred_at;
  }

  // enrich: lead company, price list name, quote status
  const leadIds = Array.from(new Set((shares ?? []).map((s: any) => s.lead_id).filter(Boolean)));
  const plIds = Array.from(new Set((shares ?? []).map((s: any) => s.price_list_id).filter(Boolean)));
  const quoteIds = Array.from(new Set((shares ?? []).map((s: any) => s.quote_id).filter(Boolean)));
  const leadName: Record<string, string> = {};
  const plName: Record<string, string> = {};
  const quoteStatus: Record<string, string> = {};
  await Promise.all([
    leadIds.length ? sb.from('leads').select('id, company_name').in('id', leadIds).then(({ data }: any) => { for (const l of data ?? []) leadName[l.id] = l.company_name; }) : Promise.resolve(),
    plIds.length ? sb.from('price_lists').select('id, name').in('id', plIds).then(({ data }: any) => { for (const p of data ?? []) plName[p.id] = p.name; }) : Promise.resolve(),
    quoteIds.length ? sb.from('quotes').select('id, status').in('id', quoteIds).then(({ data }: any) => { for (const q of data ?? []) quoteStatus[q.id] = q.status; }) : Promise.resolve(),
  ]);

  const withCounts = (shares ?? []).map((s: any) => ({
    ...s,
    selection_count: selCounts[s.id] ?? 0,
    lead_company: s.lead_id ? (leadName[s.lead_id] ?? null) : null,
    price_list_name: s.price_list_id ? (plName[s.price_list_id] ?? null) : null,
    quote_status: s.quote_id ? (quoteStatus[s.quote_id] ?? 'draft') : null,
    last_activity: lastActivity[s.id] ?? s.last_opened_at ?? null,
  }));
  return NextResponse.json({ shares: withCounts });
}

// POST /api/catalog-shares → create a share (catalog_shares + catalog_share_products + share_created event)
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

  await sb.from('catalog_share_events').insert({
    catalog_share_id: share.id,
    event_type: 'share_created',
    meta: {
      status: share.status,
      product_count: productIds.length,
      price_list_id: share.price_list_id,
      share_channel: share.share_channel,
      created_by: ws.user?.id ?? null,
    },
  });

  return NextResponse.json({ share });
}
