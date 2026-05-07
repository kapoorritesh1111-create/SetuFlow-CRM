import type { ProductsSpreadsheetRow } from '@/types/products';

export type ProductGapState = 'complete' | 'pricing_gap' | 'bulk_gap' | 'inactive' | 'review';

export function getProductGapState(row: ProductsSpreadsheetRow): ProductGapState {
  if (!row.is_active) return 'inactive';
  if (row.pricing_mode_default === 'kg') {
    if (!row.bulk_display) return 'bulk_gap';
    if (!row.ex_factory_per_unit_display || !row.fob_per_unit_display) return 'pricing_gap';
    return 'complete';
  }
  if (!row.ex_factory_per_unit_display || !row.fob_per_unit_display) return 'pricing_gap';
  return 'complete';
}

export function getProductGapLabel(state: ProductGapState) {
  switch (state) {
    case 'complete': return 'Ready';
    case 'pricing_gap': return 'Price gap';
    case 'bulk_gap': return 'Bulk gap';
    case 'inactive': return 'Inactive';
    default: return 'Review';
  }
}

export function getProductGapActionLabel(row: ProductsSpreadsheetRow) {
  const gap = getProductGapState(row);
  if (gap === 'pricing_gap' || gap === 'bulk_gap') return 'Open pricing';
  if (gap === 'inactive') return 'Review product';
  return 'Open product';
}
