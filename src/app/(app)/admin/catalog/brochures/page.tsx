import { redirect } from 'next/navigation';

export default function CatalogBrochuresCompatibilityPage() {
  redirect('/admin/catalog?brochures=1');
}
