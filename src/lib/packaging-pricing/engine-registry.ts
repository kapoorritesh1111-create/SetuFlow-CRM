import { calculateMatrixPerFrame } from './matrix-per-frame-engine';
import { calculateSupFormula } from './sup-formula-engine';
import type { MatrixPricingInput, PackagingPricingResult, PricingContext, SupPricingInput } from './types';

export type PackagingPricingInputV4 = SupPricingInput | MatrixPricingInput;

export function calculatePackagingPriceV4(context: PricingContext, input: PackagingPricingInputV4): PackagingPricingResult {
  switch (context.template.calculation_engine_key) {
    case 'sup_formula':
      return calculateSupFormula(context, input as SupPricingInput);
    case 'matrix_per_frame':
      return calculateMatrixPerFrame(context, input as MatrixPricingInput);
    default:
      return {
        ok: false,
        engine_version: 4,
        family_id: context.template.family_id,
        template_id: context.template.id,
        template_version: context.template.calculation_version,
        customer_requirement: {}, production_calculation: {}, commercial_rules: {},
        selling_price: { unit_price: 0, product_total: 0, currency: context.template.currency, gst_pct: 0, gst: 0, grand_total_before_freight: 0 },
        separate_charges: [], kld: { file_id: null }, source_hash: '', warnings: [],
        validation_errors: [`Unsupported packaging pricing engine: ${context.template.calculation_engine_key}`],
      };
  }
}

/**
 * Sales responses are intentionally a whitelist rather than a delete-list.
 * Internal materials, process cost, wastage amount, margin, charge Master IDs,
 * charge rates and charge application rules never cross the non-admin boundary.
 */
export function toSalesPricingResult(result: PackagingPricingResult) {
  return {
    ok: result.ok,
    engine_version: result.engine_version,
    family_id: result.family_id,
    template_id: result.template_id,
    template_version: result.template_version,
    customer_requirement: result.customer_requirement,
    production_calculation: result.production_calculation,
    selling_price: result.selling_price,
    separate_charges: result.separate_charges.map((charge) => ({
      code: charge.code,
      name: charge.name,
      category: charge.category,
      amount: charge.amount,
    })),
    kld: result.kld,
    source_hash: result.source_hash,
    validation_errors: result.validation_errors,
    warnings: result.warnings,
  };
}
