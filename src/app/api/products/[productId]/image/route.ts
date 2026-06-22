import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export const dynamic = 'force-dynamic';

const UPLOAD_BUCKET = 'docs-workspace';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function svgPlaceholder(name: string) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1f487c"/><stop offset="1" stop-color="#279491"/></linearGradient></defs><rect width="320" height="240" rx="28" fill="url(#g)"/><circle cx="260" cy="36" r="56" fill="rgba(255,255,255,.12)"/><text x="160" y="118" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" font-weight="800" fill="white">${initials}</text><text x="160" y="152" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="rgba(255,255,255,.82)">Setu Flow product</text></svg>`;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'product-image';
}

function inferFileName(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).at(-1) ?? null;
    return last ? decodeURIComponent(last) : null;
  } catch {
    const last = url.split('/').filter(Boolean).at(-1) ?? null;
    return last || null;
  }
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

async function writeImageUrl(admin: any, organizationId: string, productId: string, imageUrl: string | null) {
  const result = await admin
    .from('products')
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('id', productId)
    .select('id,name,image_url')
    .single();
  return result;
}

export async function GET(request: NextRequest, { params }: { params: { productId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });
  const sb = await createClient() as any;
  const product = await readProduct(sb, workspace.organization.id, params.productId);
  if (product.error) return NextResponse.json({ error: product.error }, { status: 500 });
  if (!product.data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  const wantsMeta = request.nextUrl.searchParams.get('meta') === '1';
  if (wantsMeta) return NextResponse.json({ image_url: product.data.image_url ?? null, file_name: inferFileName(product.data.image_url), name: product.data.name ?? 'Product' });

  if (product.data.image_url) return NextResponse.redirect(product.data.image_url, 302);
  return new NextResponse(svgPlaceholder(product.data.name ?? 'Product'), { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function PATCH(request: NextRequest, { params }: { params: { productId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return NextResponse.json({ error: 'Workspace membership needed.' }, { status: 401 });
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Catalog manager access required.' }, { status: 403 });

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Service role is required for product image updates.' }, { status: 500 });

  const contentType = request.headers.get('content-type') ?? '';
  let nextImageUrl: string | null = null;
  let uploadedFileName: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing image file.' }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image exceeds 5MB limit.' }, { status: 413 });
    if (!IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG, or WebP image files.' }, { status: 415 });

    const service = createServiceRoleClient();
    if (!service) return NextResponse.json({ error: 'Storage client unavailable.' }, { status: 500 });
    const extension = safeName(file.name).split('.').pop() || 'jpg';
    const path = `${workspace.organization.id}/products/${params.productId}/${Date.now()}-${safeName(file.name || `image.${extension}`)}`;
    const { error: uploadError } = await service.storage.from(UPLOAD_BUCKET).upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: true });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    const { data } = service.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
    nextImageUrl = data.publicUrl;
    uploadedFileName = file.name;
  } else {
    const body = await request.json().catch(() => ({}));
    nextImageUrl = typeof body.image_url === 'string' && body.image_url.trim().length > 0 ? body.image_url.trim() : null;
  }

  const result = await writeImageUrl(admin, workspace.organization.id, params.productId, nextImageUrl);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ image_url: result.data?.image_url ?? null, file_name: uploadedFileName ?? inferFileName(result.data?.image_url ?? null), product: result.data });
}
