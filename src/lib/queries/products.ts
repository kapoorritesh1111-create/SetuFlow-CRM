export type { ProductsData } from '@/lib/queries/data';

export async function getProductsData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getProductsData(organizationId);
}
