import { NextResponse } from 'next/server';

import { listCatalogBrochures } from '@/features/catalog-brochures/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const brochures = await listCatalogBrochures();
    return NextResponse.json({ brochures: brochures.map((item) => ({ id: item.id, name: item.name, description: item.description, family_names: item.family_names, family_slugs: item.family_slugs })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Brochures could not load.';
    return NextResponse.json({ error: message, brochures: [] }, { status: 400 });
  }
}
