import { calculateSupFormulaV5 } from './sup-formula-engine';
import type { PackagingPricingResultV5, PricingContextV5, SupPricingInputV5 } from './types';

export type PackagingPricingInputV5 = SupPricingInputV5;

export function calculatePackagingPriceV5(
  context: PricingContextV5,
  input: PackagingPricingInputV5,
): PackagingPricingResultV5 {
  if (context.template.calculation_version !== 5 || context.template.calculation_engine_key !== 'sup_formula_v5') {
    throw new Error('Unsupported Packaging Pricing v5 engine/template combination.');
  }
  return calculateSupFormulaV5(context, input);
}

export function toSalesPricingResultV5(result: PackagingPricingResultV5) {
  return {
    ok: result.ok,
    engine_version: result.engine_version,
    family_id: result.family_id,
    template_id: result.template_id,
    template_version: result.template_version,
    customer_requirement: result.customer_requirement,
    construction: result.construction,
    production_route: {
      route_type: result.production_route.route_type,
      pricing_bucket: result.production_route.pricing_bucket,
      components: result.production_route.components.map((component) => ({
        key: component.key,
        description: component.description,
        units_per_frame: component.units_per_frame,
      })),
    },
    selling_price: result.selling_price,
    alternative_quantities: result.alternative_quantities,
    source_hash: result.source_hash,
    validation_errors: result.validation_errors,
    warnings: result.warnings,
  };
}
