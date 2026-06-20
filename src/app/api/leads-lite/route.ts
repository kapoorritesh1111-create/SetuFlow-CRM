import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

// GET /api/leads-lite?q=... → leads for the share wizard picker, with prefill fields
export async function GET(request: NextRequest) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const id = url.searchParams.get('id');
  const sb = (await createClient()) as any;
  if (id) {
    const { data, error } = await sb.from('leads').select('id, company_name, contact_name, email, phone, whatsapp_number, trade_show_name, trade_event_id, products_or_needs, main_product_category, market_id').eq('organization_id', ws.organization.id).eq('id', id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lead: data, leads: data ? [data] : [] });
  }
  let query = sb
    .from('leads')
    .select('id, company_name, contact_name, email, phone, whatsapp_number, trade_show_name, trade_event_id, products_or_needs, main_product_category, market_id')
    .eq('organization_id', ws.organization.id)
    .order('created_at', { ascending: false })
    .limit(40);
  if (q) query = query.ilike('company_name', `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [] });
}
