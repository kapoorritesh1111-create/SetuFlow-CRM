import type {
  AllowedDimensionRanges,
  MaterialRate,
  MoqTiers,
  PackagingBreakdownLine,
  PackagingCalculationInput,
  PackagingCalculationResult,
  PackagingPricingTemplate,
  PrintRules,
} from './types';

/**
 * S24-SPEN-205 — Packaging pricing calculation engine.
 *
 * Pure and deterministic: no database access, no clock, no randomness.
 * Admin Pricing Template Builder preview and the Quote Builder configurator
 * both call this exact function through the same server action, so a price
 * shown in preview is the price saved on a quote line.
 *
 * Saved quote lines persist input_snapshot_json + pricing_breakdown_json +
 * calculation_version. They are never silently re-priced; recalculation only
 * happens when a user edits the line.
 */

export const PACKAGING_ENGINE_VERSION = 1;

const round2 = (value: number) => Math.round(value * 100) / 100;

function inRange(value: number, range?: { min: number; max: number } | null) {
  if (!range) return true;
  return value >= range.min && value <= range.max;
}

function areaSqmPerUnit(ranges: AllowedDimensionRanges, input: PackagingCalculationInput): number {
  const width = Number(input.width_mm ?? 0);
  const height = Number(input.height_mm ?? 0);
  const gusset = Number(input.gusset_mm ?? 0);
  switch (ranges.area_formula) {
    case 'label_single':
      return (width * height) / 1_000_000;
    case 'pouch_gusset':
      // Two faces, each width x (height + gusset allowance).
      return (width * (height + gusset) * 2) / 1_000_000;
    case 'service':
    default:
      return 0;
  }
}

function printMultiplier(rules: PrintRules, colors: number): number {
  if (rules.basis !== 'color_multiplier' || !rules.tiers?.length) return 1;
  const sorted = [...rules.tiers].sort((a, b) => a.max_colors - b.max_colors);
  for (const tier of sorted) {
    if (colors <= tier.max_colors) return tier.multiplier;
  }
  return sorted[sorted.length - 1]?.multiplier ?? 1;
}

function tierMultiplier(moq: MoqTiers, quantity: number): number {
  if (!moq.tiers?.length) return 1;
  for (const tier of moq.tiers) {
    const min = Number(tier.min_qty ?? 0);
    const max = tier.max_qty === null || typeof tier.max_qty === 'undefined' ? Infinity : Number(tier.max_qty);
    if (quantity >= min && quantity <= max) return Number(tier.multiplier ?? 1);
  }
  return 1;
}

function findMaterial(materials: MaterialRate[], key: string | null | undefined) {
  if (!key) return null;
  return materials.find((material) => material.key === key) ?? null;
}

export function calculatePackagingPrice(
  template: PackagingPricingTemplate,
  input: PackagingCalculationInput,
): PackagingCalculationResult {
  const validationErrors: string[] = [];
  const warnings: string[] = [];
  const breakdown: PackagingBreakdownLine[] = [];

  const ranges = template.allowed_dimension_ranges_json ?? { area_formula: 'service' as const };
  const isDimensional = ranges.area_formula !== 'service';
  const isFlexo = isDimensional && template.print_process === 'flexo';
  const quantity = Math.max(0, Math.floor(Number(input.quantity ?? 0)));
  const designs = Math.max(1, Math.floor(Number(input.designs ?? 1)));
  const moq = template.moq_tiers_json ?? { moq: 0, tiers: [] };

  // ---- Validation --------------------------------------------------------
  if (isDimensional) {
    const width = Number(input.width_mm ?? 0);
    const height = Number(input.height_mm ?? 0);
    if (!width || width <= 0) validationErrors.push('Width is required.');
    else if (!inRange(width, ranges.width_mm)) validationErrors.push(`Width must be between ${ranges.width_mm?.min} and ${ranges.width_mm?.max} mm for this template.`);
    if (!height || height <= 0) validationErrors.push('Height is required.');
    else if (!inRange(height, ranges.height_mm)) validationErrors.push(`Height must be between ${ranges.height_mm?.min} and ${ranges.height_mm?.max} mm for this template.`);
    if (ranges.gusset_mm) {
      const gusset = Number(input.gusset_mm ?? 0);
      if (!gusset || gusset <= 0) validationErrors.push('Gusset is required.');
      else if (!inRange(gusset, ranges.gusset_mm)) validationErrors.push(`Gusset must be between ${ranges.gusset_mm.min} and ${ranges.gusset_mm.max} mm for this template.`);
    }
    if (!input.material_key) validationErrors.push('Material is required.');
    else if (!findMaterial(template.material_rates_json ?? [], input.material_key)) validationErrors.push('Selected material is not configured on this template.');
    if ((template.adhesive_options_json ?? []).length) {
      const validAdhesive = (template.adhesive_options_json ?? []).some((option) => option.key === input.adhesive_key);
      if (!input.adhesive_key) validationErrors.push('Adhesive is required.');
      else if (!validAdhesive) validationErrors.push('Selected adhesive is not configured on this template.');
    }
    if (isFlexo) {
      const flexo = template.flexo_rules_json;
      const repeatLength = Number(input.repeat_length_mm ?? 0);
      const webWidth = Number(input.web_width_mm ?? 0);
      if (!flexo) {
        validationErrors.push('This flexo template has no cylinder rules configured.');
      } else {
        if (!repeatLength || repeatLength <= 0) validationErrors.push('Repeat length is required.');
        else if (!inRange(repeatLength, flexo.repeat_length_mm)) validationErrors.push(`Repeat length must be between ${flexo.repeat_length_mm?.min} and ${flexo.repeat_length_mm?.max} mm for this cylinder set.`);
        if (!webWidth || webWidth <= 0) validationErrors.push('Web width is required.');
        else if (!inRange(webWidth, flexo.web_width_mm)) validationErrors.push(`Web width must be between ${flexo.web_width_mm?.min} and ${flexo.web_width_mm?.max} mm for this press.`);
        if (!flexo.cylinder_rate_tiers?.length) validationErrors.push('This flexo template has no cylinder rate tiers configured.');
      }
    }
    if (!quantity) validationErrors.push('Quantity is required.');
  } else {
    const selected = (input.service_item_keys ?? []).filter(Boolean);
    if (!selected.length) validationErrors.push('Select at least one service item.');
    for (const key of selected) {
      if (!findMaterial(template.material_rates_json ?? [], key)) validationErrors.push(`Service item ${key} is not configured on this template.`);
    }
    const hasPerUnit = selected.some((key) => findMaterial(template.material_rates_json ?? [], key)?.basis === 'per_unit');
    if (hasPerUnit && !quantity) validationErrors.push('Quantity is required for per-piece service items.');
  }

  if (quantity && moq.moq && quantity < moq.moq) {
    validationErrors.push(`Quantity ${quantity.toLocaleString()} is below the template MOQ of ${moq.moq.toLocaleString()}.`);
  }

  const rush = input.rush_key
    ? (template.rush_options_json ?? []).find((option) => option.key === input.rush_key) ?? null
    : null;
  if (input.rush_key && !rush) validationErrors.push('Selected rush option is not configured on this template.');

  // ---- Warnings (never block save; Growth Agent surfaces these) ----------
  if (!input.artwork_status || input.artwork_status === 'not_provided') warnings.push('Artwork status is missing.');
  if (input.artwork_status === 'needs_prepress') warnings.push('Artwork needs pre-press — add the pre-press charge if applicable.');
  if (quantity && moq.tiers?.length) {
    const current = tierMultiplier(moq, quantity);
    const better = moq.tiers.find((tier) => Number(tier.min_qty) > quantity && Number(tier.multiplier) < current);
    if (better) warnings.push(`Increasing quantity to ${Number(better.min_qty).toLocaleString()} unlocks a better tier price.`);
  }
  if (!(template.rush_options_json ?? []).length) warnings.push('Template has no rush pricing configured.');

  const currency = template.currency || 'INR';
  const calculationVersion = template.calculation_version || PACKAGING_ENGINE_VERSION;

  if (validationErrors.length) {
    return {
      ok: false,
      unit_price: 0,
      total_price: 0,
      currency,
      lead_time: null,
      breakdown: [],
      warnings,
      validation_errors: validationErrors,
      calculation_version: calculationVersion,
      meta: { area_sqm_per_unit: 0, billable_area_sqm_per_unit: 0, tier_multiplier: 1, tier_adjustment_total: 0, rush_uplift_pct: 0, setup_total: 0 },
    };
  }

  // ---- Calculation -------------------------------------------------------
  const wastePct = Math.max(0, Number(template.waste_factor_pct ?? 0));
  const area = areaSqmPerUnit(ranges, input);
  const billableArea = area * (1 + wastePct / 100);

  let perUnitSubtotal = 0;
  let jobServiceTotal = 0;

  if (isDimensional) {
    const material = findMaterial(template.material_rates_json ?? [], input.material_key)!;
    const materialRate = Number(material.rate_per_sqm ?? 0);
    const materialCost = billableArea * materialRate;
    perUnitSubtotal += materialCost;
    breakdown.push({ key: 'material', label: `Material — ${material.label}${material.thickness ? ` (${material.thickness})` : ''}`, amount: round2(materialCost * quantity), scope: 'per_job' });

    const colors = Math.max(0, Math.floor(Number(input.print_colors ?? 0)));
    const multiplier = printMultiplier(template.print_rules_json ?? { basis: 'none' }, Math.max(1, colors));
    const printCost = materialCost * Math.max(0, multiplier - 1);
    if (printCost > 0 || colors > 0) {
      perUnitSubtotal += printCost;
      breakdown.push({ key: 'print', label: `Print (${Math.max(1, colors)} color${colors === 1 ? '' : 's'} @ ${multiplier.toFixed(2)}x)`, amount: round2(printCost * quantity), scope: 'per_job' });
    }

    const finishRates = template.finish_addon_rates_json ?? [];
    const finishKeys = [...(input.finish_keys ?? []), ...(input.addon_keys ?? [])].filter(Boolean);
    for (const key of finishKeys) {
      const rate = finishRates.find((finish) => finish.key === key);
      if (!rate) {
        warnings.push(`Finish/add-on ${key} is not configured on this template and was skipped.`);
        continue;
      }
      const cost = rate.basis === 'per_sqm' ? billableArea * Number(rate.rate ?? 0) : Number(rate.rate ?? 0);
      perUnitSubtotal += cost;
      breakdown.push({ key: `finish_${rate.key}`, label: rate.label, amount: round2(cost * quantity), scope: 'per_job' });
    }
  } else {
    // Service pricing: sum selected service items. Per-unit items scale with
    // quantity (and tier); per-design / per-job items are fixed job-level
    // amounts, kept outside tier and rush like setup charges.
    for (const key of input.service_item_keys ?? []) {
      const item = findMaterial(template.material_rates_json ?? [], key);
      if (!item) continue;
      const rate = Number(item.rate ?? 0);
      if (item.basis === 'per_unit') {
        perUnitSubtotal += rate;
        breakdown.push({ key: `svc_${item.key}`, label: item.label, amount: round2(rate * quantity), scope: 'per_job' });
      } else if (item.basis === 'per_design') {
        jobServiceTotal += rate * designs;
        breakdown.push({ key: `svc_${item.key}`, label: `${item.label} × ${designs} design${designs === 1 ? '' : 's'}`, amount: round2(rate * designs), scope: 'per_job' });
      } else {
        jobServiceTotal += rate;
        breakdown.push({ key: `svc_${item.key}`, label: item.label, amount: round2(rate), scope: 'per_job' });
      }
    }
  }

  const effectiveQty = Math.max(1, quantity);

  // MOQ / tier adjustment on the per-unit subtotal.
  const tierMult = tierMultiplier(moq, effectiveQty);
  const tierAdjustmentTotal = round2(perUnitSubtotal * effectiveQty * (tierMult - 1));
  if (tierAdjustmentTotal !== 0) {
    breakdown.push({ key: 'tier', label: `MOQ / Tier adjustment (${effectiveQty >= (moq.tiers?.[0]?.min_qty ?? 0) ? tierMult.toFixed(2) : '1.00'}x)`, amount: tierAdjustmentTotal, scope: 'per_job' });
  }

  // S27-STARK-B2 — Flexo cylinder cost: repeat-length tier rate x color count.
  // A one-time plate cost, amortized into the job total like setup charges,
  // never scaled by rush uplift. S27-STARK-B3: if the buyer already has a
  // cylinder on file for this spec, the charge is waived (user-confirmed via
  // input.reuse_existing_cylinder — never inferred/applied automatically).
  let cylinderCost = 0;
  if (isFlexo) {
    const flexo = template.flexo_rules_json!;
    const repeatLength = Number(input.repeat_length_mm ?? 0);
    const colors = Math.max(1, Math.floor(Number(input.print_colors ?? 1)));
    const sortedTiers = [...(flexo.cylinder_rate_tiers ?? [])].sort((a, b) => a.max_repeat_mm - b.max_repeat_mm);
    const tier = sortedTiers.find((candidate) => repeatLength <= candidate.max_repeat_mm) ?? sortedTiers[sortedTiers.length - 1];
    const ratePerColor = Number(tier?.rate_per_color ?? 0);
    const fullCylinderCost = round2(ratePerColor * colors);
    if (input.reuse_existing_cylinder) {
      breakdown.push({ key: 'flexo_cylinder', label: `Cylinder set (${colors} colors) — reusing cylinder on file`, amount: 0, scope: 'per_job' });
      if (fullCylinderCost > 0) warnings.push(`Cylinder charge waived (cylinder on file) — saved ${currency} ${fullCylinderCost.toLocaleString()}.`);
    } else {
      cylinderCost = fullCylinderCost;
      breakdown.push({ key: 'flexo_cylinder', label: `Cylinder set (${colors} colors)`, amount: cylinderCost, scope: 'per_job' });
    }
  }

  // Setup / pre-press charges (job-level, amortized into the total).
  let setupTotal = cylinderCost;
  const optionalSetups = new Set(input.include_optional_setups ?? []);
  for (const setup of template.setup_charges_json ?? []) {
    const included = setup.required || optionalSetups.has(setup.key);
    if (!included) continue;
    let amount = Number(setup.amount ?? 0);
    if (setup.basis === 'per_design') amount *= designs;
    if (setup.basis === 'per_extra_design') amount *= Math.max(0, designs - 1);
    if (amount <= 0) continue;
    setupTotal += amount;
    breakdown.push({ key: `setup_${setup.key}`, label: setup.label, amount: round2(amount), scope: 'per_job' });
  }

  // Rush uplift on the variable subtotal (not on fixed setup charges).
  const variableTotal = perUnitSubtotal * effectiveQty * tierMult;
  const rushPct = rush ? Math.max(0, Number(rush.uplift_pct ?? 0)) : 0;
  const rushAmount = round2(variableTotal * (rushPct / 100));
  if (rushAmount > 0 && rush) {
    breakdown.push({ key: 'rush', label: `${rush.label} (+${rushPct}%)`, amount: rushAmount, scope: 'per_job' });
  }

  const total = round2(variableTotal + jobServiceTotal + rushAmount + setupTotal);
  const unitPrice = effectiveQty > 0 ? round2(total / effectiveQty) : 0;

  const leadRules = template.lead_time_rules_json ?? {};
  const leadTime = rush ? leadRules[rush.key] ?? leadRules.standard ?? null : leadRules.standard ?? null;

  return {
    ok: true,
    unit_price: unitPrice,
    total_price: total,
    currency,
    lead_time: leadTime,
    breakdown,
    warnings,
    validation_errors: [],
    calculation_version: calculationVersion,
    meta: {
      area_sqm_per_unit: area,
      billable_area_sqm_per_unit: billableArea,
      tier_multiplier: tierMult,
      tier_adjustment_total: tierAdjustmentTotal,
      rush_uplift_pct: rushPct,
      setup_total: round2(setupTotal),
      cylinder_cost: round2(cylinderCost),
    },
  };
}

/** Human-readable one-line spec summary for quote rows and PDFs. */
/**
 * S24-SPEN-217 — indicative "from" price for a catalog family card, computed
 * through the exact same engine used for real quotes, at the cheapest valid
 * baseline (min dimensions, cheapest material/service item, 1 color, no
 * finishes, minimum quantity). Directional only — never shown as a quote.
 */
export function estimateStartingPrice(template: PackagingPricingTemplate): { unitPrice: number; currency: string } | null {
  const isDimensional = template.allowed_dimension_ranges_json?.area_formula !== 'service';
  const baseQuantity = Math.max(1, template.moq_tiers_json?.moq ?? 1);

  if (isDimensional) {
    const ranges = template.allowed_dimension_ranges_json;
    if (!ranges?.width_mm || !ranges?.height_mm) return null;
    const cheapestMaterial = [...(template.material_rates_json ?? [])].sort(
      (a, b) => (a.rate_per_sqm ?? Infinity) - (b.rate_per_sqm ?? Infinity),
    )[0];
    if (!cheapestMaterial) return null;
    const input: PackagingCalculationInput = {
      width_mm: ranges.width_mm.min,
      height_mm: ranges.height_mm.min,
      gusset_mm: ranges.gusset_mm?.min ?? null,
      material_key: cheapestMaterial.key,
      adhesive_key: template.adhesive_options_json?.[0]?.key ?? null,
      print_colors: 1,
      finish_keys: [],
      quantity: baseQuantity,
      designs: 1,
      artwork_status: 'print_ready',
    };
    const result = calculatePackagingPrice(template, input);
    if (!result.ok) return null;
    return { unitPrice: result.unit_price, currency: result.currency };
  }

  const cheapestItem = [...(template.material_rates_json ?? [])].sort((a, b) => (a.rate ?? Infinity) - (b.rate ?? Infinity))[0];
  if (!cheapestItem) return null;
  const input: PackagingCalculationInput = { service_item_keys: [cheapestItem.key], quantity: baseQuantity, designs: 1 };
  const result = calculatePackagingPrice(template, input);
  if (!result.ok) return null;
  return { unitPrice: result.unit_price, currency: result.currency };
}

export function buildPackagingSpecSummary(
  familyName: string,
  template: PackagingPricingTemplate,
  input: PackagingCalculationInput,
): string {
  const parts: string[] = [familyName];
  const ranges = template.allowed_dimension_ranges_json;
  if (ranges?.area_formula !== 'service') {
    const dims = [input.width_mm, input.height_mm, ranges?.gusset_mm ? input.gusset_mm : null]
      .filter((value) => Number(value) > 0)
      .join(' × ');
    if (dims) parts.push(`${dims} mm`);
    if (template.print_process === 'flexo' && input.repeat_length_mm) parts.push(`${input.repeat_length_mm}mm repeat`);
    const material = (template.material_rates_json ?? []).find((m) => m.key === input.material_key);
    if (material) parts.push(material.label);
    const adhesive = (template.adhesive_options_json ?? []).find((option) => option.key === input.adhesive_key);
    if (adhesive) parts.push(adhesive.label);
    if (input.print_colors) parts.push(`${input.print_colors} color`);
    const finishes = [...(input.finish_keys ?? []), ...(input.addon_keys ?? [])]
      .map((key) => (template.finish_addon_rates_json ?? []).find((finish) => finish.key === key)?.label)
      .filter(Boolean);
    if (finishes.length) parts.push(finishes.join(', '));
  } else {
    const items = (input.service_item_keys ?? [])
      .map((key) => (template.material_rates_json ?? []).find((item) => item.key === key)?.label)
      .filter(Boolean);
    if (items.length) parts.push(items.join(', '));
  }
  if (input.quantity) parts.push(`${Number(input.quantity).toLocaleString()} pcs`);
  return parts.join(' · ');
}
