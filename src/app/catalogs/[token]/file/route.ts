import { NextResponse } from 'next/server';

import { loadPublicCatalog } from '@/features/catalog-brochures/public-catalog';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function safeDownloadName(value: string) {
  const cleaned = value.replace(/[\r\n"\\/]+/g, ' ').trim();
  return cleaned || 'catalog.pdf';
}

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const catalog = await loadPublicCatalog(params.token);
  if (!catalog) return NextResponse.json({ error: 'Catalog unavailable.' }, { status: 404 });

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Catalog unavailable.' }, { status: 503 });

  const { data, error } = await admin.storage
    .from(catalog.brochure.storageBucket)
    .download(catalog.brochure.storagePath);
  if (error || !data) return NextResponse.json({ error: 'Catalog file unavailable.' }, { status: 404 });

  await admin.rpc('increment_catalog_brochure_share_open', { p_share_id: catalog.share.id });

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': data.type || 'application/pdf',
      'Content-Disposition': `inline; filename="${safeDownloadName(catalog.brochure.fileName)}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
