'use client';

import { getProductGapLabel, type ProductGapState } from '@/features/products/lib/products-gap-utils';

const toneMap: Record<ProductGapState, string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pricing_gap: 'border-amber-200 bg-amber-50 text-amber-700',
  bulk_gap: 'border-amber-200 bg-amber-50 text-amber-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-600',
  review: 'border-blue-200 bg-blue-50 text-blue-700',
};

export function ProductsGapBadge({ state }: { state: ProductGapState }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneMap[state]}`}>{getProductGapLabel(state)}</span>;
}
