import { pricingSourceHash } from './snapshot';
import type { MatrixPricingInput, MatrixRow, PackagingPricingResult, PricingContext } from './types';
import { PACKAGING_PRICING_ENGINE_VERSION } from './types';

const TIER_FIELD = {
  Q1: 'q1_rate_per_frame', Q2: 'q2_rate_per_frame', Q3: 'q3_rate_per_frame', Q4: 'q4_rate_per_frame', Q5: 'q5_rate_per_frame',
} as const;
const TIER_FRAMES = { Q1: 250, Q2: 500, Q3: 1000, Q4: 2000, Q5: 3000 } as const;

function n(value: unknown): number { return typeof value === 'number' ? value : Number(value ?? 0); }
function round(value: number, places = 8) { const f = 10 ** places; return Math.round((value + Number.EPSILON) * f) / f; }

export function matrixGeometry(widthMm: number, heightMm: number, supplyForm: MatrixRow['supply_form'], machineWidthMm = 740, machineLengthMm = 1120) {
  if (widthMm <= 0 || heightMm <= 0) return { pouches_per_frame: 0, orientation: 'invalid', open_laminate_width_mm: null as number | null, across: 0, along: 0 };
  if (supplyForm === 'three_side_seal_pouch') {
    const openLaminateWidth = (2 * heightMm) + 12;
    const across = Math.floor(machineWidthMm / openLaminateWidth);
    const along = Math.floor(machineLengthMm / widthMm);
    return { pouches_per_frame: across * along, orientation: 'open_laminate_across', open_laminate_width_mm: openLaminateWidth, across, along };
  }
  const direct = { across: Math.floor(machineWidthMm / widthMm), along: Math.floor(machineLengthMm / heightMm), orientation: 'width_across' };
  const rotated = { across: Math.floor(machineWidthMm / heightMm), along: Math.floor(machineLengthMm / widthMm), orientation: 'height_across' };
  const picked = direct.across * direct.along >= rotated.across * rotated.along ? direct : rotated;
  return { pouches_per_frame: picked.across * picked.along, orientation: picked.orientation, open_laminate_width_mm: null, across: picked.across, along: picked.along };
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
  if (!row) errors.push('Selected matrix row is not available on this template.');
  const rules = template.production_rules_json ?? {};
  const geometry = matrixGeometry(width, height, input.supply_form, n(rules.machine_width_mm ?? 740), n(rules.machine_length_mm ?? 1120));
  if (!geometry.pouches_per_frame) errors.push('The selected dimensions do not fit the configured production profile.');
  const rateField = TIER_FIELD[input.tier];
  const frameRate = row && rateField ? n(row[rateField]) : 0;
  if (!rateField) errors.push('Frame tier is invalid.');
  if (row && row[rateField] == null) errors.push(`Matrix rate ${input.tier} is missing for ${row.client_product_id}.`);
  const unitPrice = geometry.pouches_per_frame ? frameRate / geometry.pouches_per_frame : 0;
  const qty = Math.max(0, Math.floor(n(input.quantity)));
  const frames = qty && geometry.pouches_per_frame ? qty / geometry.pouches_per_frame : TIER_FRAMES[input.tier];
  const productTotal = qty ? unitPrice * qty : 0;
  const gstPct = n(template.quote_config_json?.gst_pct ?? 18);
  const gst = productTotal * gstPct / 100;
  if (row?.metadata && (row as any).metadata?.seed_scope === 'anchor_only') warnings.push('Only the source-backed acceptance anchor is loaded; full workbook import is still required before publication.');
  const hashPayload = { engine_version: 4, template_id: template.id, template_version: template.calculation_version, input, row, geometry, frame_rate: frameRate };
  return {
    ok: errors.length === 0,
    engine_version: PACKAGING_PRICING_ENGINE_VERSION,
    family_id: template.family_id,
    template_id: template.id,
    template_version: template.calculation_version,
    customer_requirement: { width_mm: width, height_mm: height, supply_form: input.supply_form, client_product_id: input.client_product_id, tier: input.tier, quantity: qty || null },
    production_calculation: { ...geometry, machine_width_mm: n(rules.machine_width_mm ?? 740), machine_length_mm: n(rules.machine_length_mm ?? 1120), frame_tier: input.tier, frame_tier_quantity: TIER_FRAMES[input.tier], frames_exact: frames },
    cost_build: undefined,
    commercial_rules: { source: 'approved_matrix_row', frame_rate: frameRate, source_worksheet: row?.source_worksheet ?? null, source_row_number: row?.source_row_number ?? null, source_reference: row?.source_reference ?? null },
    selling_price: { unit_price: round(unitPrice), product_total: round(productTotal, 2), currency: template.currency, gst_pct: gstPct, gst: round(gst, 2), grand_total_before_freight: round(productTotal + gst, 2) },
    separate_charges: [],
    kld: { file_id: input.kld_file_id ?? null },
    source_hash: pricingSourceHash(hashPayload),
    validation_errors: errors,
    warnings,
  };
}
