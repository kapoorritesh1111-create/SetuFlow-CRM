import { evaluatePackagingCharges, resolveSelectedPackagingCharges } from './charges';
import { pricingSourceHash } from './snapshot';
import type { MatrixPricingInput, MatrixRow, PackagingPricingResult, PricingContext } from './types';
import { PACKAGING_PRICING_ENGINE_VERSION } from './types';

const TIER_FIELD = {
  Q1: 'q1_rate_per_frame', Q2: 'q2_rate_per_frame', Q3: 'q3_rate_per_frame', Q4: 'q4_rate_per_frame', Q5: 'q5_rate_per_frame',
} as const;
const TIER_FRAMES = { Q1: 250, Q2: 500, Q3: 1000, Q4: 2000, Q5: 3000 } as const;
const TIERS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'] as const;

function n(value: unknown): number { return typeof value === 'number' ? value : Number(value ?? 0); }
function round(value: number, places = 8) { const f = 10 ** places; return Math.round((value + Number.EPSILON) * f) / f; }

/**
 * Workbook geometry is intentionally fixed-orientation.
 * Center Seal / 3SS Roll use the exact form-sheet rules:
 *   across = floor(740 / entered open width)
 *   along  = floor(1120 / entered height)
 * 3SS Pouch uses:
 *   open laminate = 2 * formed height + 12
 *   repeat = formed width
 * The engine must never rotate dimensions to find a cheaper/better layout because
 * the client workbook does not do that.
 */
export function matrixGeometry(widthMm: number, heightMm: number, supplyForm: MatrixRow['supply_form'], machineWidthMm = 740, machineLengthMm = 1120) {
  if (widthMm <= 0 || heightMm <= 0) return { pouches_per_frame: 0, orientation: 'invalid', open_laminate_width_mm: null as number | null, repeat_length_mm: null as number | null, across: 0, along: 0 };
  if (supplyForm === 'three_side_seal_pouch') {
    const openLaminateWidth = (2 * heightMm) + 12;
    const repeatLength = widthMm;
    const across = Math.floor(machineWidthMm / openLaminateWidth);
    const along = Math.floor(machineLengthMm / repeatLength);
    return { pouches_per_frame: across * along, orientation: 'open_laminate_across', open_laminate_width_mm: openLaminateWidth, repeat_length_mm: repeatLength, across, along };
  }
  const across = Math.floor(machineWidthMm / widthMm);
  const along = Math.floor(machineLengthMm / heightMm);
  return { pouches_per_frame: across * along, orientation: 'fixed_width_across', open_laminate_width_mm: null, repeat_length_mm: null, across, along };
}

function workbookBreaks(row: MatrixRow | undefined, unitsPerFrame: number) {
  if (!row || !unitsPerFrame) return [];
  return TIERS.map((tier) => {
    const rate = row[TIER_FIELD[tier]];
    const frameRate = rate == null ? null : n(rate);
    const frameQuantity = TIER_FRAMES[tier];
    return {
      tier,
      frame_quantity: frameQuantity,
      quantity: unitsPerFrame * frameQuantity,
      frame_rate: frameRate,
      unit_price: frameRate == null ? null : round(frameRate / unitsPerFrame),
    };
  });
}

export function calculateMatrixPerFrame(context: PricingContext, input: MatrixPricingInput): PackagingPricingResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const template = context.template;
  const width = n(input.width_mm); const height = n(input.height_mm);
  if (!width || !height) errors.push('Width and height are required.');
  if (!input.supply_form) errors.push('Supply form is required.');
  if (!input.client_product_id) errors.push('Construction/product row is required.');
  const row = context.matrixRows.find((item) => item.supply_form === input.supply_form && item.client_product_id === input.client_product_id);
  if (!row) errors.push('Selected construction is not available on this pricing template.');

  const rules = template.production_rules_json ?? {};
  const geometry = matrixGeometry(width, height, input.supply_form, n(rules.machine_width_mm ?? 740), n(rules.machine_length_mm ?? 1120));
  if (!geometry.pouches_per_frame) errors.push('The entered dimensions do not fit the client workbook production frame.');

  const rateField = TIER_FIELD[input.tier];
  if (!rateField) errors.push('Price break is invalid.');
  const frameRate = row && rateField ? n(row[rateField]) : 0;
  if (row && row[rateField] == null) errors.push(`Workbook rate ${input.tier} is missing for ${row.client_product_id}.`);

  const breaks = workbookBreaks(row, geometry.pouches_per_frame);
  const selectedBreak = breaks.find((item) => item.tier === input.tier);
  const strictWorkbookBreaks = template.quote_config_json?.workbook_model === 'dimension_construction_price_breaks';
  const derivedQuantity = selectedBreak?.quantity ?? 0;
  const requestedQuantity = Math.max(0, Math.floor(n(input.quantity)));
  if (strictWorkbookBreaks && requestedQuantity > 0 && requestedQuantity !== derivedQuantity) {
    errors.push(`This client workbook prices only the five approved frame breaks. ${input.tier} is ${derivedQuantity.toLocaleString()} pieces for these dimensions.`);
  }
  const qty = strictWorkbookBreaks ? derivedQuantity : requestedQuantity;
  const frames = strictWorkbookBreaks ? TIER_FRAMES[input.tier] : (qty && geometry.pouches_per_frame ? qty / geometry.pouches_per_frame : TIER_FRAMES[input.tier]);
  const baseUnitPrice = geometry.pouches_per_frame ? frameRate / geometry.pouches_per_frame : 0;
  const baseProductTotal = qty ? baseUnitPrice * qty : 0;

  const selectedCharges = resolveSelectedPackagingCharges(context.charges, input.selected_charge_codes);
  errors.push(...selectedCharges.validation_errors);
  if ((input.selected_charge_codes?.length ?? 0) > 0 && !qty) errors.push('A workbook price break is required when charges are selected.');
  for (const code of selectedCharges.by_stage.before_wastage_margin) {
    const name = context.charges.find((item) => item.code === code)?.name ?? code;
    errors.push(`${name} cannot be applied before wastage/margin in workbook pricing because the feeding-sheet rate is already commercial.`);
  }

  const usage = {
    quantity: qty,
    frames_exact: frames,
    units_per_frame: geometry.pouches_per_frame,
    running_metres_per_frame: null,
    total_running_metres: null,
  };
  const afterCharges = evaluatePackagingCharges(context.charges, selectedCharges.by_stage.after_core_price, {
    ...usage,
    percent_bases: { core_product_total: baseProductTotal },
  });
  errors.push(...afterCharges.validation_errors);
  const productTotal = baseProductTotal + afterCharges.after_core_price_total;
  const unitPrice = qty ? productTotal / qty : baseUnitPrice;
  const separateChargesEval = evaluatePackagingCharges(context.charges, selectedCharges.by_stage.separate_quote_line, {
    ...usage,
    percent_bases: { core_product_total: baseProductTotal, product_total: productTotal },
  });
  errors.push(...separateChargesEval.validation_errors);
  const separateCharges: PackagingPricingResult['separate_charges'] = separateChargesEval.separate_quote_line.map((item) => ({
    master_id: item.master_id,
    code: item.code,
    name: item.name,
    category: item.category,
    basis: item.basis,
    rate: item.rate,
    amount: round(item.amount_total, 2),
  }));

  const gstPct = n(template.quote_config_json?.gst_pct ?? 18);
  const gst = productTotal * gstPct / 100;
  const safeBreaks = breaks.map(({ tier, frame_quantity, quantity, unit_price }) => ({ tier, frame_quantity, quantity, unit_price }));
  const adminBreaks = breaks.map(({ tier, frame_quantity, quantity, frame_rate, unit_price }) => ({ tier, frame_quantity, quantity, frame_rate, unit_price }));

  const hashPayload = {
    engine_version: 4,
    template_id: template.id,
    template_version: template.calculation_version,
    workbook_model: template.quote_config_json?.workbook_model ?? null,
    input: { ...input, quantity: qty || null },
    row,
    geometry,
    selected_break: selectedBreak,
    price_breaks: adminBreaks,
    charges: {
      after_core_price: afterCharges.after_core_price,
      separate_quote_line: separateChargesEval.separate_quote_line,
    },
  };
  return {
    ok: errors.length === 0,
    engine_version: PACKAGING_PRICING_ENGINE_VERSION,
    family_id: template.family_id,
    template_id: template.id,
    template_version: template.calculation_version,
    customer_requirement: { width_mm: width, height_mm: height, supply_form: input.supply_form, client_product_id: input.client_product_id, tier: input.tier, quantity: qty || null, selected_charge_codes: input.selected_charge_codes ?? [] },
    production_calculation: {
      ...geometry,
      machine_width_mm: n(rules.machine_width_mm ?? 740),
      machine_length_mm: n(rules.machine_length_mm ?? 1120),
      frame_tier: input.tier,
      frame_tier_quantity: TIER_FRAMES[input.tier],
      frames_exact: frames,
      price_breaks: safeBreaks,
    },
    cost_build: undefined,
    commercial_rules: {
      source: 'client_workbook_feeding_sheet',
      selected_frame_rate: frameRate,
      source_worksheet: row?.source_worksheet ?? null,
      source_row_number: row?.source_row_number ?? null,
      source_reference: row?.source_reference ?? null,
      price_breaks: adminBreaks,
      after_core_charge_total: afterCharges.after_core_price_total,
      interpolation_allowed: false,
    },
    selling_price: { unit_price: round(unitPrice), product_total: round(productTotal, 2), currency: template.currency, gst_pct: gstPct, gst: round(gst, 2), grand_total_before_freight: round(productTotal + gst, 2) },
    separate_charges: separateCharges,
    kld: { file_id: input.kld_file_id ?? null },
    source_hash: pricingSourceHash(hashPayload),
    validation_errors: errors,
    warnings,
  };
}
