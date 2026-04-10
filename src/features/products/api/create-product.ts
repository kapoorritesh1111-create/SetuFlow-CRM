import type { CreateProductPayload } from '@/types/products';

export async function createProduct(payload: CreateProductPayload): Promise<{ product_id: string; product_variant_id: string }> {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to create product.');
  }

  return body as { product_id: string; product_variant_id: string };
}
