import type { ProductDetailResponse } from '@/types/products';

export async function getProductDetail(productId: string): Promise<ProductDetailResponse> {
  const response = await fetch(`/api/products/${productId}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load product detail.');
  return response.json();
}
