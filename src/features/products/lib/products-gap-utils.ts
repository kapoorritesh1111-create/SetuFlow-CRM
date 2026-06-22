import type { ProductsSpreadsheetRow } from '@/types/products';

export type ProductGapState = 'complete' | 'pricing_gap' | 'bulk_gap' | 'inactive' | 'review';

function hasAnyDisplay(...values: Array<string | null | undefined>) {
  return values.some((value) => typeof value === 'string' && value.trim().length > 0);
}

export function getProductGapState(row: ProductsSpreadsheetRow): ProductGapState {
  if (!row.is_active) return 'inactive';

  // S34-CATALOG-053: base pricing is the default market-active price.
  // Do not mark a row as a market pricing gap just because a normalized
  // per-unit display is missing; case/kg/default display pricing is enough
  // to make the variant shareable unless every usable base price is absent.
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
  const hasBulkPrice = hasAnyDisplay(row.bulk_display);

  if (row.pricing_mode_default === 'kg') {
    if (!hasBulkPrice && !hasExFactoryPrice && !hasFobPrice) return 'bulk_gap';
    return 'complete';
  }

  if (!hasExFactoryPrice && !hasFobPrice) return 'pricing_gap';
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
