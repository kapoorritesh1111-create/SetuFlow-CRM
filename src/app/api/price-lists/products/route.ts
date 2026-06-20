import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

// GET /api/price-lists/products → org products for the picker + readiness fields
export async function GET() {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  const sb = (await createClient()) as any;
  const { data, error } = await sb
    .from('products')
    .select('id, name, sku_code, hsn_code, pack_size, description, image_url, certifications, country_of_origin, fob_price, exw_price, cif_price, pricing_currency, is_active, category_id')
    .eq('organization_id', ws.organization.id)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}
