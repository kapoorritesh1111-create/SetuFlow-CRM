import { redirect } from 'next/navigation';

import { validCatalogToken } from '@/features/catalog-brochures/public-catalog';

export const dynamic = 'force-dynamic';

export default async function LegacyPublicBrochurePage({ params }: { params: { token: string } }) {
  const token = validCatalogToken(params.token);
  if (!token) redirect('/');
  redirect(`/catalogs/${token}`);
}
