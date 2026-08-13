import { NextResponse } from 'next/server';

import { validCatalogToken } from '@/features/catalog-brochures/public-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const token = validCatalogToken(params.token);
  if (!token) return NextResponse.json({ error: 'Catalog unavailable.' }, { status: 404 });

  const requestUrl = new URL(request.url);
  return NextResponse.redirect(new URL(`/catalogs/${token}/file`, requestUrl.origin), { status: 307 });
}
