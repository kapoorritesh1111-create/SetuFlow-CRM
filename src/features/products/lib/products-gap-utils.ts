import type { ProductsSpreadsheetRow } from '@/types/products';

export type ProductGapState = 'complete' | 'pricing_gap' | 'bulk_gap' | 'inactive' | 'review';

function hasAnyDisplay(...values: Array<string | null | undefined>) {
  return values.some((value) => typeof value === 'string' && value.trim().length > 0);
}

export function getProductGapState(row: ProductsSpreadsheetRow): ProductGapState {
  if (!row.is_active) return 'inactive';

  const hasExFactoryPrice = hasAnyDisplay(
    row.ex_factory_display,
    row.ex_factory_per_unit_display,
    row.ex_factory_per_case_display,
  );
  const hasFobPrice = hasAnyDisplay(
    row.fob_display,
    row.fob_per_unit_display,
    row.fob_per_case_display,
  );
  const hasCifPrice = hasAnyDisplay(row.cif_display);
  const hasBulkPrice = hasAnyDisplay(row.bulk_display);
  const hasAnyPrice = hasExFactoryPrice || hasFobPrice || hasCifPrice || hasBulkPrice;

  if (row.pricing_mode_default === 'kg') {
    if (!hasAnyPrice) return 'bulk_gap';
    return 'complete';
  }

  if (!hasAnyPrice) return 'pricing_gap';
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
