import { resolveCommercialBandV5 } from './commercial-band-resolver';
import { resolveConstructionV5 } from './construction-resolver';
import { resolveFrameFamilyGeometryV5, type FrameFamilySupplyFormV5 } from './frame-family-geometry';
import type { PricingBucketV5, PricingContextV5 } from './types';

function n(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, places = 8) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function requireMaster(context: PricingContextV5, code: string, errors: string[]) {
  const master = context.masters.find((item) => item.code === code) ?? null;
  if (!master) {
    errors.push(`${code} is not configured in Cost Master.`);
    return null;
  }
  if (master.current_rate == null) errors.push(`${master.name} needs a rate before this family can be reviewed.`);
  return master;
}

export type FrameFamilyPricingInputV5 = {
  supply_form: FrameFamilySupplyFormV5;
  width_mm: number;
  height_mm: number;
  construction_id: string;
  print: 'CMYK' | 'CMYKW';
  quantity: number;
  /**
   * Sales normally passes null. The engine then uses the template's provisional
   * owner-selected default bucket. Admin/review tools may override it explicitly.
   */
  commercial_bucket: PricingBucketV5 | null;
};

export type FrameFamilyPricingReviewResultV5 = {
  ok: boolean;
  review_only: boolean;
  supply_form: FrameFamilySupplyFormV5;
  geometry: ReturnType<typeof resolveFrameFamilyGeometryV5>;
  construction: {
    id: string;
    name: string;
    layer_count: number;
    structure_label: string;
  } | null;
  quantity: number;
  frames_exact: number;
  run_length_m: number;
  commercial_bucket: PricingBucketV5 | null;
  wastage_pct: number | null;
  margin_per_frame: number | null;
  cost_breakdown: {
    material_per_frame: number;
    adhesive_per_frame: number;
    printing_per_frame: number;
    lamination_per_frame: number;
    slitting_per_frame: number;
    pouching_per_frame: number;
    process_per_frame: number;
    pre_commercial_per_frame: number;
    wastage_per_frame: number;
    margin_per_frame: number;
    selling_per_frame: number;
  };
  selling_price: {
    unit_price: number;
    product_total: number;
    currency: string;
    gst_pct: number;
    gst: number;
    grand_total_before_freight: number;
  };
  validation_errors: string[];
  warnings: string[];
};

/**
 * Review-only v5 costing core for Center Seal / 3SS migration.
 *
 * It intentionally reuses the Pricing v5 Cost Master, construction layers,
 * process rates and commercial-band model rather than the v4 workbook's static
 * commercial rate-per-frame lookup.
 *
 * Nothing in this file publishes or activates a pricing template.
 */
export function calculateFrameFamilyPriceReviewV5(
  context: PricingContextV5,
  input: FrameFamilyPricingInputV5,
): FrameFamilyPricingReviewResultV5 {
  const errors: string[] = [];
  const reviewOnly=Boolean(context.template.quote_config_json?.review_only);
  const warnings: string[] = reviewOnly
    ? ['Review-only calculation. Existing v4 workbook matrix remains the production baseline until Stark Packmate explicitly approves migration.']
    : [];

  const quantity = Math.max(0, Math.floor(n(input.quantity)));
  if (!quantity) errors.push('Quantity is required.');
  if (!input.width_mm || !input.height_mm) errors.push('Width and height are required.');

  const geometry = resolveFrameFamilyGeometryV5(
    input.supply_form,
    n(input.width_mm),
    n(input.height_mm),
    n(context.template.production_rules_json?.machine_width_mm ?? 740),
    n(context.template.production_rules_json?.machine_length_mm ?? 1120),
  );
  if (!geometry.units_per_frame) errors.push('Entered dimensions do not fit the Stark workbook production frame.');

  const construction = resolveConstructionV5(
    input.construction_id,
    context.constructions,
    context.constructionLayers,
    context.masters,
  );
  if (!construction) errors.push('Selected Pricing v5 construction is not available for this review template.');
  if (construction) errors.push(...construction.validation_errors);

  const configuredBucket = Number(context.template.production_rules_json?.default_commercial_bucket ?? 0);
  const resolvedBucket = input.commercial_bucket
    ?? ([1,2,3,4,5].includes(configuredBucket) ? configuredBucket as PricingBucketV5 : null);
  if (resolvedBucket == null) {
    errors.push('Commercial bucket mapping is not configured for this frame-family Pricing v5 template.');
  }

  const framesExact = geometry.units_per_frame > 0 ? quantity / geometry.units_per_frame : 0;
  const runLengthM = framesExact * (geometry.material_run_mm_per_frame / 1000);
  const band = resolvedBucket == null
    ? null
    : resolveCommercialBandV5(context.bands, resolvedBucket, runLengthM);
  if (resolvedBucket != null && !band) {
    errors.push(`No Pricing v5 commercial band is configured for bucket ${resolvedBucket}.`);
  }
  if (input.commercial_bucket == null && resolvedBucket != null) {
    warnings.push(`Using provisional owner-selected bucket ${resolvedBucket}; Stark may replace this with a dedicated Center Seal / 3SS bucket after review.`);
  }

  let materialPerFrame = 0;
  let adhesivePerFrame = 0;
  let printingPerFrame = 0;
  let laminationPerFrame = 0;
  let slittingPerFrame = 0;
  let pouchingPerFrame = 0;

  const printMaster = construction ? requireMaster(context, input.print === 'CMYK' ? 'PROC_PRINT_CMYK' : 'PROC_PRINT_CMYKW', errors) : null;
  const lamination = construction ? requireMaster(context, 'PROC_LAMINATION', errors) : null;
  const slitting = construction ? requireMaster(context, 'PROC_SLITTING', errors) : null;
  const pouching = construction && geometry.apply_pouching ? requireMaster(context, 'PROC_POUCHING', errors) : null;
  const adhesive = construction ? requireMaster(context, 'MAT_ADHESIVE', errors) : null;

  if (construction && !errors.some((error) => error.includes('Construction layer'))) {
    const frameAreaM2 = geometry.frame_web_area_m2;
    for (const layer of construction.layers) {
      const gsm = layer.master.gsm != null
        ? n(layer.master.gsm)
        : n(layer.master.micron) * n(layer.master.density);
      const gramsPerFrame = gsm * frameAreaM2;
      materialPerFrame += gramsPerFrame * n(layer.master.current_rate) / 1000;
    }

    if (adhesive?.current_rate != null) {
      const bonds = Math.max(0, construction.construction.layer_count - 1);
      const gsmPerBond = n(adhesive.metadata?.gsm_per_bond ?? adhesive.gsm);
      const grams = bonds * gsmPerBond * frameAreaM2;
      adhesivePerFrame = grams * n(adhesive.current_rate) / 1000;
    }

    const runMPerFrame = geometry.material_run_mm_per_frame / 1000;
    if (printMaster?.current_rate != null) {
      printingPerFrame = printMaster.rate_basis === 'per_running_metre'
        ? n(printMaster.current_rate) * runMPerFrame
        : n(printMaster.current_rate);
    }
    if (lamination?.current_rate != null) {
      const schedule = context.template.production_rules_json?.lamination_rate_by_layer_count ?? {};
      const rate = n(schedule[String(construction.construction.layer_count)] ?? lamination.current_rate);
      laminationPerFrame = rate * runMPerFrame;
    }
    if (slitting?.current_rate != null) {
      slittingPerFrame = slitting.rate_basis === 'per_running_metre'
        ? n(slitting.current_rate) * runMPerFrame
        : n(slitting.current_rate);
    }
    if (geometry.apply_pouching && pouching?.current_rate != null) {
      pouchingPerFrame = pouching.rate_basis === 'per_running_metre'
        ? n(pouching.current_rate) * runMPerFrame
        : pouching.rate_basis === 'per_unit'
          ? n(pouching.current_rate) * geometry.units_per_frame
          : n(pouching.current_rate);
    }
  }

  const processPerFrame = printingPerFrame + laminationPerFrame + slittingPerFrame + pouchingPerFrame;
  const preCommercialPerFrame = materialPerFrame + adhesivePerFrame + processPerFrame;
  const wastagePerFrame = band ? preCommercialPerFrame * band.wastage_pct / 100 : 0;
  const marginPerFrame = band ? band.margin_per_frame : 0;
  const sellingPerFrame = preCommercialPerFrame + wastagePerFrame + marginPerFrame;
  const productTotal = framesExact * sellingPerFrame;
  const unitPrice = quantity ? productTotal / quantity : 0;
  const gstPct = n(context.template.quote_config_json?.gst_pct ?? 18);
  const gst = productTotal * gstPct / 100;

  if (geometry.apply_pouching) {
    warnings.push('Pouch Form includes pouching in the v5 review cost build; Roll Form does not.');
  }

  return {
    ok: errors.length === 0,
    review_only: reviewOnly,
    supply_form: input.supply_form,
    geometry,
    construction: construction ? {
      id: construction.construction.id,
      name: construction.construction.name,
      layer_count: construction.construction.layer_count,
      structure_label: construction.structure_label,
    } : null,
    quantity,
    frames_exact: round(framesExact),
    run_length_m: round(runLengthM),
    commercial_bucket: resolvedBucket,
    wastage_pct: band?.wastage_pct ?? null,
    margin_per_frame: band?.margin_per_frame ?? null,
    cost_breakdown: {
      material_per_frame: round(materialPerFrame),
      adhesive_per_frame: round(adhesivePerFrame),
      printing_per_frame: round(printingPerFrame),
      lamination_per_frame: round(laminationPerFrame),
      slitting_per_frame: round(slittingPerFrame),
      pouching_per_frame: round(pouchingPerFrame),
      process_per_frame: round(processPerFrame),
      pre_commercial_per_frame: round(preCommercialPerFrame),
      wastage_per_frame: round(wastagePerFrame),
      margin_per_frame: round(marginPerFrame),
      selling_per_frame: round(sellingPerFrame),
    },
    selling_price: {
      unit_price: round(unitPrice),
      product_total: round(productTotal, 2),
      currency: context.template.currency,
      gst_pct: gstPct,
      gst: round(gst, 2),
      grand_total_before_freight: round(productTotal + gst, 2),
    },
    validation_errors: errors,
    warnings,
  };
}
