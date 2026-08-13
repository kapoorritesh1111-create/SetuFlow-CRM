import { NextResponse } from 'next/server';

import { loadPublicCatalog } from '@/features/catalog-brochures/public-catalog';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const LOGO_BUCKET = 'org-logos';

export const dynamic = 'force-dynamic';

function safeStoragePath(value: string | null) {
  const path = String(value ?? '').trim();
  return Boolean(path) && !path.includes('..') && !/^https?:\/\//i.test(path) && !path.startsWith('/');
}

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const catalog = await loadPublicCatalog(params.token);
  if (!catalog || !safeStoragePath(catalog.organization.logoStoragePath)) {
    return new NextResponse(null, { status: 404 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return new NextResponse(null, { status: 404 });

  const { data, error } = await admin.storage.from(LOGO_BUCKET).download(catalog.organization.logoStoragePath!);
  if (error || !data || !String(data.type || '').toLowerCase().startsWith('image/')) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': data.type || 'image/png',
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=900',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
