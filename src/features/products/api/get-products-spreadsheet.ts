import type { ProductsSpreadsheetResponse } from '@/types/products';

type Args = { page?: number; pageSize?: number; search?: string; category?: string; pricingMode?: string; quoteable?: string; sortBy?: string; sortOrder?: string };

export async function getProductsSpreadsheet(args: Args = {}): Promise<ProductsSpreadsheetResponse> {
  const params = new URLSearchParams();
  if (args.page) params.set('page', String(args.page));
  if (args.pageSize) params.set('page_size', String(args.pageSize));
  if (args.search) params.set('search', args.search);
  if (args.category) params.set('category', args.category);
  if (args.pricingMode) params.set('pricing_mode', args.pricingMode);
  if (args.quoteable) params.set('quoteable', args.quoteable);
  if (args.sortBy) params.set('sort_by', args.sortBy);
  if (args.sortOrder) params.set('sort_order', args.sortOrder);
  const response = await fetch(`/api/products/spreadsheet?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load products spreadsheet.');
  return response.json();
}
