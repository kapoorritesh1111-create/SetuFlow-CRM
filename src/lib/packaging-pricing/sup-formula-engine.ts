import { evaluatePackagingCharges, resolveSelectedPackagingCharges, type EvaluatedPackagingCharge } from './charges';
import { pricingSourceHash } from './snapshot';
import { SUP_CONSTRUCTION_LABELS, SUP_CONSTRUCTION_LAYER_ROLES } from './sup-availability';
import type {
  AdminCostLine,
  PackagingPricingResult,
  PricingContext,
  PricingMasterRate,
  RecipeItem,
  SupPricingInput,
} from './types';
import { PACKAGING_PRICING_ENGINE_VERSION } from './types';

function n(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function round(value: number, places = 8): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function stockWeb(required: number, ladder: Array<{ required_max_mm?: number; stock_web_mm: number }>): number {
  for (const row of ladder) {
    if (row.required_max_mm == null || required <= n(row.required_max_mm)) return n(row.stock_web_mm);
  }
  return 0;
}

function masterById(context: PricingContext, id: string | null): PricingMasterRate | null {
  if (!id) return null;
  return context.masters.find((item) => item.id === id) ?? null;
}

function matchesVariation(item: RecipeItem, variationKey: string): boolean {
  const keys = item.condition_json?.variation_keys;
  return !Array.isArray(keys) || keys.includes(variationKey);
}

function recipeForRole(context: PricingContext, constructionKey: string, roleKey: string, variationKey: string): RecipeItem | null {
  return context.recipes
    .filter((item) => (item.construction_key === constructionKey || item.construction_key === '*') && item.role_key === roleKey)
    .find((item) => matchesVariation(item, variationKey)) ?? null;
}

function requireRate(master: PricingMasterRate | null, label: string, errors: string[]): master is PricingMasterRate {
  if (!master) {
    errors.push(`${label} is not mapped to a COGS Master item.`);
    return false;
  }
  if (master.current_rate == null) {
    errors.push(`${master.name} needs a rate before this construction can be quoted.`);
    return false;
  }
  return true;
}

function materialLine(master: PricingMasterRate, stockWebMm: number, webRunMm: number): AdminCostLine {
  const gsm = master.gsm != null ? n(master.gsm) : n(master.micron) * n(master.density);
  const usageGrams = gsm * ((stockWebMm * webRunMm) / 1_000_000);
  const amount = usageGrams * n(master.current_rate) / 1000;
  return {
    master_id: master.id,
    code: master.code,
    name: master.name,
    basis: master.rate_basis,
    snapshotted_rate: n(master.current_rate),
    rate_uom: master.rate_uom,
    amount_per_frame: amount,
    usage: usageGrams,
    usage_uom: 'g/frame',
  };
}

function processLine(master: PricingMasterRate, webRunM: number): AdminCostLine {
  const amount = master.rate_basis === 'per_frame'
    ? n(master.current_rate)
    : master.rate_basis === 'per_running_metre'
      ? n(master.current_rate) * webRunM
      : n(master.current_rate);
  return {
    master_id: master.id,
    code: master.code,
    name: master.name,
    basis: master.rate_basis,
    snapshotted_rate: n(master.current_rate),
    rate_uom: master.rate_uom,
    amount_per_frame: amount,
    usage: master.rate_basis === 'per_running_metre' ? webRunM : 1,
    usage_uom: master.rate_basis === 'per_running_metre' ? 'running_m/frame' : 'frame',
  };
}

function chargeAdminLine(charge: EvaluatedPackagingCharge): AdminCostLine {
  const usageUom = charge.basis === 'per_running_metre' ? 'running_m/frame'
    : charge.basis === 'per_unit' ? 'unit/frame'
      : charge.basis === 'per_frame' ? 'frame'
        : charge.basis === 'percent' ? 'percent_base/frame'
          : 'flat/frame';
  return {
    master_id: charge.master_id,
    code: charge.code,
    name: charge.name,
    basis: charge.basis,
    snapshotted_rate: charge.rate,
    rate_uom: charge.basis,
    amount_per_frame: n(charge.amount_per_frame),
    usage: charge.usage_per_frame == null ? undefined : charge.usage_per_frame,
    usage_uom: charge.usage_per_frame == null ? undefined : usageUom,
  };
}

export function calculateSupFormula(context: PricingContext, input: SupPricingInput): PackagingPricingResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const template = context.template;
  const variation = context.variations.find((item) => item.id === input.product_variation_id);
  const quantity = Math.max(0, Math.floor(n(input.quantity)));
  if (!variation) errors.push('Selected Product Variation is not available on this template.');
  if (!quantity) errors.push('Quantity is required.');
  if (!SUP_CONSTRUCTION_LABELS[input.construction_key]) errors.push('Construction is not supported by the SUP formula engine.');

  const rules = template.production_rules_json ?? {};
  const machineWidth = n(rules.machine_width_mm ?? 740);
  const machineLength = n(rules.machine_length_mm ?? 1120);
  const trim = n(rules.trim_allowance_mm ?? 20);
  const outerPrintWeb = n(rules.outer_print_web_mm ?? 760);
  const innerLadder = Array.isArray(rules.inner_web_ladder) ? rules.inner_web_ladder : [];
  const peLadder = Array.isArray(rules.pe_web_ladder) ? rules.pe_web_ladder : [];

  let pouchesPerFrame = 0;
  let webRunMm = 0;
  let webRunM = 0;
  let openWebMm = 0;
  let webNeededMm = 0;
  let across = 0;
  let along = 0;
  let innerWebMm = 0;
  let peWebMm = 0;

  if (variation) {
    const gussetTotal = n(variation.bottom_gusset_each_mm) * 2;
    openWebMm = (2 * n(variation.height_mm)) + gussetTotal + trim;
    across = openWebMm > 0 ? Math.floor(machineWidth / openWebMm) : 0;
    along = n(variation.width_mm) > 0 ? Math.floor(machineLength / n(variation.width_mm)) : 0;
    pouchesPerFrame = across * along;
    webNeededMm = openWebMm * across;
    webRunMm = n(variation.width_mm) * along;
    webRunM = webRunMm / 1000;
    innerWebMm = stockWeb(webNeededMm, innerLadder);
    peWebMm = stockWeb(webNeededMm, peLadder);
    if (!pouchesPerFrame) errors.push(`The selected variation does not fit the ${machineWidth} × ${machineLength} mm production profile.`);
    if (!innerWebMm || !peWebMm) errors.push('A stock-web rule is missing for this Product Variation.');
  }

  const materialLines: AdminCostLine[] = [];
  const processLines: AdminCostLine[] = [];
  let extraLines: AdminCostLine[] = [];

  if (!errors.length && variation) {
    for (const role of [...SUP_CONSTRUCTION_LAYER_ROLES[input.construction_key], 'inner_pe']) {
      const recipe = recipeForRole(context, input.construction_key, role, variation.variation_key);
      const master = masterById(context, recipe?.cost_master_item_id ?? null);
      if (!requireRate(master, role, errors)) continue;
      const web = role === 'inner_pe' ? peWebMm : recipe?.consumption_rule_json?.web === 'inner' ? innerWebMm : outerPrintWeb;
      materialLines.push(materialLine(master, web, webRunMm));
    }

    const layerCount = SUP_CONSTRUCTION_LAYER_ROLES[input.construction_key].length + 1;
    const adhesiveRecipe = recipeForRole(context, input.construction_key, 'adhesive', variation.variation_key);
    const adhesive = masterById(context, adhesiveRecipe?.cost_master_item_id ?? null);
    if (requireRate(adhesive, 'Adhesive', errors)) {
      const gsmPerBond = n(adhesive.metadata?.gsm_per_bond ?? adhesive.gsm);
      const bonds = Math.max(0, layerCount - 1);
      const usageGrams = bonds * gsmPerBond * ((peWebMm * webRunMm) / 1_000_000);
      materialLines.push({
        master_id: adhesive.id, code: adhesive.code, name: adhesive.name, basis: adhesive.rate_basis,
        snapshotted_rate: n(adhesive.current_rate), rate_uom: adhesive.rate_uom,
        amount_per_frame: usageGrams * n(adhesive.current_rate) / 1000,
        usage: usageGrams, usage_uom: 'g/frame',
      });
    }

    for (const role of [input.print === 'CMYK' ? 'printing_cmyk' : 'printing_cmykw', 'lamination', 'slitting', 'pouching']) {
      const recipe = recipeForRole(context, input.construction_key, role, variation.variation_key);
      const master = masterById(context, recipe?.cost_master_item_id ?? null);
      if (!requireRate(master, role, errors)) continue;
      processLines.push(processLine(master, webRunM));
    }
  }

  const framesExact = pouchesPerFrame ? quantity / pouchesPerFrame : 0;
  const runLengthM = framesExact * webRunM;
  const chargeRunningMetresPerFrame = variation ? n(variation.width_mm) * pouchesPerFrame / 1000 : null;
  const chargeTotalRunningMetres = chargeRunningMetresPerFrame == null ? null : chargeRunningMetresPerFrame * framesExact;
  const materialTotal = materialLines.reduce((sum, line) => sum + line.amount_per_frame, 0);
  const processTotal = processLines.reduce((sum, line) => sum + line.amount_per_frame, 0);
  const materialProcessCogsTotal = (materialTotal + processTotal) * framesExact;
  const selectedCharges = resolveSelectedPackagingCharges(context.charges, input.selected_charge_codes);
  errors.push(...selectedCharges.validation_errors);

  const beforeCharges = evaluatePackagingCharges(context.charges, selectedCharges.by_stage.before_wastage_margin, {
    quantity,
    frames_exact: framesExact,
    units_per_frame: pouchesPerFrame,
    running_metres_per_frame: chargeRunningMetresPerFrame,
    total_running_metres: chargeTotalRunningMetres,
    percent_bases: { material_process_cogs_total: materialProcessCogsTotal },
  });
  errors.push(...beforeCharges.validation_errors);
  extraLines = beforeCharges.before_wastage_margin.map(chargeAdminLine);

  const band = [...context.bands].sort((a, b) => a.run_length_max_m - b.run_length_max_m)
    .find((item) => runLengthM <= n(item.run_length_max_m)) ?? [...context.bands].sort((a, b) => b.run_length_max_m - a.run_length_max_m)[0];
  if (!band && quantity) errors.push('No commercial run-length bands are configured.');

  const extraTotal = extraLines.reduce((sum, line) => sum + line.amount_per_frame, 0);
  const preCommercial = materialTotal + processTotal + extraTotal;
  const wasteCost = band ? preCommercial * n(band.wastage_pct) / 100 : 0;
  const sellingPerFrame = band ? preCommercial + wasteCost + n(band.margin_per_frame) : 0;
  const coreUnitPrice = pouchesPerFrame ? sellingPerFrame / pouchesPerFrame : 0;
  const coreProductTotal = coreUnitPrice * quantity;

  const afterCharges = evaluatePackagingCharges(context.charges, selectedCharges.by_stage.after_core_price, {
    quantity,
    frames_exact: framesExact,
    units_per_frame: pouchesPerFrame,
    running_metres_per_frame: chargeRunningMetresPerFrame,
    total_running_metres: chargeTotalRunningMetres,
    percent_bases: {
      material_process_cogs_total: materialProcessCogsTotal,
      core_product_total: coreProductTotal,
    },
  });
  errors.push(...afterCharges.validation_errors);
  const productTotal = coreProductTotal + afterCharges.after_core_price_total;
  const unitPrice = quantity ? productTotal / quantity : 0;

  const separateChargesEval = evaluatePackagingCharges(context.charges, selectedCharges.by_stage.separate_quote_line, {
    quantity,
    frames_exact: framesExact,
    units_per_frame: pouchesPerFrame,
    running_metres_per_frame: chargeRunningMetresPerFrame,
    total_running_metres: chargeTotalRunningMetres,
    percent_bases: {
      material_process_cogs_total: materialProcessCogsTotal,
      core_product_total: coreProductTotal,
      product_total: productTotal,
    },
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
  const hashPayload = {
    engine_version: PACKAGING_PRICING_ENGINE_VERSION,
    template_id: template.id,
    template_version: template.calculation_version,
    input,
    variation,
    production: { machineWidth, machineLength, trim, outerPrintWeb, openWebMm, across, along, pouchesPerFrame, webRunMm, webNeededMm, innerWebMm, peWebMm },
    masters: [...materialLines, ...processLines].map((line) => ({ master_id: line.master_id, code: line.code, rate: line.snapshotted_rate, rate_uom: line.rate_uom })),
    charges: {
      before_wastage_margin: beforeCharges.before_wastage_margin,
      after_core_price: afterCharges.after_core_price,
      separate_quote_line: separateChargesEval.separate_quote_line,
    },
    band,
  };

  return {
    ok: errors.length === 0,
    engine_version: PACKAGING_PRICING_ENGINE_VERSION,
    family_id: template.family_id,
    template_id: template.id,
    template_version: template.calculation_version,
    customer_requirement: {
      product_variation_id: input.product_variation_id,
      variation_key: variation?.variation_key ?? null,
      product: variation?.name ?? null,
      dimensions: variation ? { width_mm: variation.width_mm, height_mm: variation.height_mm, bottom_gusset_each_mm: variation.bottom_gusset_each_mm } : null,
      construction_key: input.construction_key,
      construction: SUP_CONSTRUCTION_LABELS[input.construction_key] ?? input.construction_key,
      print: input.print,
      quantity,
      selected_charge_codes: input.selected_charge_codes ?? [],
    },
    production_calculation: {
      machine_width_mm: machineWidth, machine_length_mm: machineLength, trim_allowance_mm: trim,
      open_web_mm: openWebMm, lanes_across: across, pouches_along: along, pouches_per_frame: pouchesPerFrame,
      web_run_mm_per_frame: webRunMm, run_length_m: runLengthM, outer_print_web_mm: outerPrintWeb,
      inner_stock_web_mm: innerWebMm, pe_stock_web_mm: peWebMm, frames_exact: framesExact,
    },
    cost_build: {
      admin_only: true,
      materials: materialLines,
      processes: processLines,
      production_extras: extraLines,
      material_total_per_frame: materialTotal,
      process_total_per_frame: processTotal,
      pre_commercial_cogs_per_frame: preCommercial,
    },
    commercial_rules: band ? {
      run_length_max_m: band.run_length_max_m,
      wastage_pct: band.wastage_pct,
      wastage_amount_per_frame: wasteCost,
      margin_per_frame: band.margin_per_frame,
      selling_price_per_frame: sellingPerFrame,
      after_core_charge_total: afterCharges.after_core_price_total,
    } : {},
    selling_price: {
      unit_price: round(unitPrice),
      product_total: round(productTotal, 2),
      currency: template.currency,
      gst_pct: gstPct,
      gst: round(gst, 2),
      grand_total_before_freight: round(productTotal + gst, 2),
    },
    separate_charges: separateCharges,
    kld: { file_id: input.kld_file_id ?? null },
    source_hash: pricingSourceHash(hashPayload),
    validation_errors: errors,
    warnings,
  };
}
