import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export async function GET() {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;

  const [{ data: markets }, { data: lists }, { data: leads }] = await Promise.all([
    sb.from('markets').select('name').eq('organization_id', orgId).eq('is_active', true).order('sort_order', { ascending: true }),
    sb.from('price_lists').select('market, buyer_segment').eq('organization_id', orgId),
    sb.from('leads').select('lead_type, product_type, private_label_mode').eq('organization_id', orgId).limit(1000),
  ]);

  return NextResponse.json({
    markets: unique([...(markets ?? []).map((m: any) => m.name), ...(lists ?? []).map((l: any) => l.market)]),
    buyerSegments: unique([
      ...(lists ?? []).map((l: any) => l.buyer_segment),
      ...(leads ?? []).map((l: any) => l.lead_type),
      ...(leads ?? []).map((l: any) => l.product_type),
      ...(leads ?? []).map((l: any) => l.private_label_mode),
    ]),
  });
}
