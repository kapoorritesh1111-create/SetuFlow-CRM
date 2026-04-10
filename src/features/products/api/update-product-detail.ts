import type { ProductDetailResponse, UpdateProductPayload } from '@/types/products';

export async function updateProductDetail(productId: string, payload: UpdateProductPayload): Promise<ProductDetailResponse> {
  const response = await fetch(`/api/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to update product.');
  }

  return body as ProductDetailResponse;
}
