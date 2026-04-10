import type { Json } from '@/types/database';
import type { CompiledQuoteLine } from '../types';

export type QuoteVersionLineItemInsert = {
  quote_version_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  sku_code: string;
  hsn_code: string | null;
  product_name: string;
  category_type: CompiledQuoteLine['categoryType'];
  pack_label: string | null;
  basis_applied: CompiledQuoteLine['basisApplied'];
  pricing_mode: CompiledQuoteLine['pricingMode'];
  units_per_case: number | null;
  moq: number | null;
  source_ex_factory_usd: number | null;
  source_fob_usd: number | null;
  source_bulk_usd_per_kg: number | null;
  source_ex_factory_inr: number | null;
  source_fob_inr: number | null;
  source_bulk_inr_per_kg: number | null;
  freight_add_on_usd: number | null;
  fx_rate: number;
  final_unit_price: number | null;
  final_case_price: number | null;
  final_kg_price: number | null;
  display_currency: CompiledQuoteLine['displayCurrency'];
  is_overridden: boolean;
  override_reason: string | null;
  line_notes: string | null;
  sort_order: number;
  calculation_meta: Json;
};

function asNullableNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function mapCompiledLineToVersionInsert(
  quoteVersionId: string,
  line: CompiledQuoteLine,
): QuoteVersionLineItemInsert {
  return {
    quote_version_id: quoteVersionId,
    product_id: line.productId ?? null,
    product_variant_id: line.productVariantId ?? null,
    sku_code: line.skuCode,
    hsn_code: line.hsnCode ?? null,
    product_name: line.productName,
    category_type: line.categoryType,
    pack_label: line.packLabel ?? null,
    basis_applied: line.basisApplied,
    pricing_mode: line.pricingMode,
    units_per_case: asNullableNumber(line.unitsPerCase),
    moq: asNullableNumber(line.moq),
    source_ex_factory_usd: asNullableNumber(line.sourceExFactoryUsd),
    source_fob_usd: asNullableNumber(line.sourceFobUsd),
    source_bulk_usd_per_kg: asNullableNumber(line.sourceBulkUsdPerKg),
    source_ex_factory_inr: asNullableNumber(line.sourceExFactoryInr),
    source_fob_inr: asNullableNumber(line.sourceFobInr),
    source_bulk_inr_per_kg: asNullableNumber(line.sourceBulkInrPerKg),
    freight_add_on_usd: asNullableNumber(line.freightAddOnUsd),
    fx_rate: line.fxRate,
    final_unit_price: asNullableNumber(line.finalUnitPrice),
    final_case_price: asNullableNumber(line.finalCasePrice),
    final_kg_price: asNullableNumber(line.finalKgPrice),
    display_currency: line.displayCurrency,
    is_overridden: line.isOverridden ?? false,
    override_reason: line.overrideReason ?? null,
    line_notes: line.lineNotes ?? null,
    sort_order: line.sortOrder,
    calculation_meta: line.calculationMeta as Json,
  };
}
