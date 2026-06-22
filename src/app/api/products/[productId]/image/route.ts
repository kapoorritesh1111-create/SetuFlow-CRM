import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export const dynamic = 'force-dynamic';

function svgPlaceholder(name: string) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1f487c"/><stop offset="1" stop-color="#279491"/></linearGradient></defs><rect width="320" height="240" rx="28" fill="url(#g)"/><circle cx="260" cy="36" r="56" fill="rgba(255,255,255,.12)"/><text x="160" y="118" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" font-weight="800" fill="white">${initials}</text><text x="160" y="152" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="rgba(255,255,255,.82)">Setu Flow product</text></svg>`;
  return svg;
}

async function readProduct(client: any, organizationId: string, productId: string) {
  const result = await client
    .from('products')
    .select('id,name,image_url')
    .eq('organization_id', organizationId)
    .eq('id', productId)
    .maybeSingle();
  return { data: result.data as { id: string; name: string | null; image_url: string | null } | null, error: result.error?.message ?? null };
}

export async function GET(request: NextRequest, { params }: { params: { productId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });
  const sb = await createClient() as any;
  const product = await readProduct(sb, workspace.organization.id, params.productId);
  if (product.error) return NextResponse.json({ error: product.error }, { status: 500 });
  if (!product.data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  const wantsMeta = request.nextUrl.searchParams.get('meta') === '1';
  if (wantsMeta) return NextResponse.json({ image_url: product.data.image_url ?? null, name: product.data.name ?? 'Product' });

  if (product.data.image_url) return NextResponse.redirect(product.data.image_url, 302);
  return new NextResponse(svgPlaceholder(product.data.name ?? 'Product'), {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { productId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Catalog manager access required.' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const nextImageUrl = typeof body.image_url === 'string' && body.image_url.trim().length > 0 ? body.image_url.trim() : null;
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Service role is required for product image updates.' }, { status: 500 });

  const result = await admin
    .from('products')
    .update({ image_url: nextImageUrl, updated_at: new Date().toISOString() })
    .eq('organization_id', workspace.organization.id)
    .eq('id', params.productId)
    .select('id,name,image_url')
    .single();

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ image_url: result.data?.image_url ?? null, product: result.data });
}
