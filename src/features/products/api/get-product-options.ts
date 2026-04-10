export type ProductCategoryOption = { id: string; name: string };

export async function getProductOptions(): Promise<{ categories: ProductCategoryOption[] }> {
  const response = await fetch('/api/products', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to load product options.');
  }

  return {
    categories: Array.isArray(body?.categories) ? body.categories : [],
  };
}
