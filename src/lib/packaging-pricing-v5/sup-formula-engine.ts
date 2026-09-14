import { pricingSourceHash } from '../packaging-pricing/snapshot';
import { resolveCommercialBandV5 } from './commercial-band-resolver';
import { resolveConstructionV5 } from './construction-resolver';
import { resolveProductionRouteV5 } from './production-route-resolver';
import type {
  AlternativePriceV5,
  CostMasterRateV5,
  PackagingPricingResultV5,
  PricingContextV5,
  SupPricingInputV5,
} from './types';

function n(value: unknown): number { return typeof value === 'number' ? value : Number(value ?? 0); }
function round(value: number, places = 8) { const f = 10 ** places; return Math.round((value + Number.EPSILON) * f) / f; }

function stockWeb(required: number, ladder: Array<{ required_max_mm?: number; stock_web_mm: number }>): number {
  for (const row of ladder) if (row.required_max_mm == null || required <= n(row.required_max_mm)) return n(row.stock_web_mm);
  return 0;
}

function requireMaster(context: PricingContextV5, code: string, errors: string[]): CostMasterRateV5 | null {
  const master = context.masters.find((item) => item.code === code) ?? null;
  if (!master) { errors.push(`${code} is not configured in Cost Master.`); return null; }
  if (master.current_rate == null) errors.push(`${master.name} needs a rate before this construction can be quoted.`);
  return master;
}

function materialAmount(master: CostMasterRateV5, webMm: number, runMm: number) {
  const gsm = master.gsm != null ? n(master.gsm) : n(master.micron) * n(master.density);
  const grams = gsm * ((webMm * runMm) / 1_000_000);
  return { grams, amount: grams * n(master.current_rate) / 1000 };
}

function processAmount(master: CostMasterRateV5, runM: number) {
  if (master.rate_basis === 'per_frame') return n(master.current_rate);
  if (master.rate_basis === 'per_running_metre') return n(master.current_rate) * runM;
  return n(master.current_rate);
}

type CostedComponent = {
  key: 'main_body' | 'bottom_gusset';
  material_per_frame: number;
  process_per_frame: number;
  pre_commercial_per_frame: number;
  wastage_per_frame: number;
  margin_per_frame: number;
  selling_per_frame: number;
  total_for_job: number;
  material_breakdown: Array<Record<string, unknown>>;
  process_breakdown: Array<Record<string, unknown>>;
};

type CoreResult = PackagingPricingResultV5 & { _internal?: { primary_run_length_m: number } };

function calculateCore(context: PricingContextV5, input: SupPricingInputV5, includeAlternatives: boolean): CoreResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const quantity = Math.max(0, Math.floor(n(input.quantity)));
  const size = context.sizeProfiles.find((item) => item.id === input.size_profile_id) ?? null;
  const resolvedConstruction = resolveConstructionV5(input.construction_id, context.constructions, context.constructionLayers, context.masters);

  if (!quantity) errors.push('Quantity is required.');
  if (!size) errors.push('Selected Pricing v5 size is not available.');
  if (!resolvedConstruction) errors.push('Selected Pricing v5 construction is not available.');
  if (resolvedConstruction) errors.push(...resolvedConstruction.validation_errors);

  const rules = context.template.production_rules_json ?? {};
  const route = size ? resolveProductionRouteV5(size, quantity, rules, input.bottom_print_mode) : null;
  if (route) errors.push(...route.validation_errors);

  const mainComponent = route?.components.find((component)=>component.key==='main_body') ?? null;
  const primaryRunLengthM = mainComponent?.run_length_m ?? 0;
  const band = size ? resolveCommercialBandV5(context.bands, size.pricing_bucket, primaryRunLengthM) : null;
  if (size && !band) errors.push(`No Pricing v5 commercial band is configured for bucket ${size.pricing_bucket}.`);

  const innerLadder = Array.isArray(rules.inner_web_ladder) ? rules.inner_web_ladder : [];
  const peLadder = Array.isArray(rules.pe_web_ladder) ? rules.pe_web_ladder : [];
  const outerPrintWebMm = n(rules.outer_print_web_mm ?? 760);

  const adhesive = resolvedConstruction ? requireMaster(context, 'MAT_ADHESIVE', errors) : null;
  const printMaster = resolvedConstruction ? requireMaster(context, input.print === 'CMYK' ? 'PROC_PRINT_CMYK' : 'PROC_PRINT_CMYKW', errors) : null;
  const lamination = resolvedConstruction ? requireMaster(context, 'PROC_LAMINATION', errors) : null;
  const slitting = resolvedConstruction ? requireMaster(context, 'PROC_SLITTING', errors) : null;
  const pouching = resolvedConstruction ? requireMaster(context, 'PROC_POUCHING', errors) : null;

  const costedComponents: CostedComponent[] = [];
  if (route && resolvedConstruction && band && !errors.length) {
    for (const component of route.components) {
      const innerWebMm = stockWeb(component.web_needed_mm, innerLadder);
      const peWebMm = stockWeb(component.web_needed_mm, peLadder);
      if (!innerWebMm || !peWebMm) {
        errors.push(`A Pricing v5 stock-web rule is missing for ${component.description}.`);
        continue;
      }

      let materialPerFrame = 0;
      const materialBreakdown: Array<Record<string, unknown>> = [];
      for (const layer of resolvedConstruction.layers) {
        const web = layer.is_print_layer ? outerPrintWebMm : layer.is_sealant_layer ? peWebMm : innerWebMm;
        const usage = materialAmount(layer.master, web, component.web_run_mm_per_frame);
        materialPerFrame += usage.amount;
        materialBreakdown.push({
          component: component.key,
          layer_position: layer.layer_position,
          master_id: layer.master.id,
          code: layer.master.code,
          name: layer.master.name,
          snapshotted_rate: n(layer.master.current_rate),
          usage_g_per_frame: usage.grams,
          amount_per_frame: usage.amount,
          web_mm: web,
        });
      }

      if (adhesive?.current_rate != null) {
        const bonds = Math.max(0, resolvedConstruction.construction.layer_count - 1);
        const gsmPerBond = n(adhesive.metadata?.gsm_per_bond ?? adhesive.gsm);
        const grams = bonds * gsmPerBond * ((peWebMm * component.web_run_mm_per_frame) / 1_000_000);
        const amount = grams * n(adhesive.current_rate) / 1000;
        materialPerFrame += amount;
        materialBreakdown.push({ component:component.key, master_id:adhesive.id, code:adhesive.code, name:adhesive.name, bonds, usage_g_per_frame:grams, amount_per_frame:amount });
      }

      const runMPerFrame = component.web_run_mm_per_frame / 1000;
      let processPerFrame = 0;
      const processBreakdown: Array<Record<string, unknown>> = [];
      if (component.apply_printing && printMaster?.current_rate != null) {
        const amount = processAmount(printMaster, runMPerFrame); processPerFrame += amount;
        processBreakdown.push({ component:component.key, code:printMaster.code, rate:n(printMaster.current_rate), amount_per_frame:amount });
      }
      if (component.apply_lamination && lamination?.current_rate != null) {
        const schedule = rules.lamination_rate_by_layer_count ?? {};
        const layerRate = n(schedule[String(resolvedConstruction.construction.layer_count)] ?? lamination.current_rate);
        const amount = layerRate * runMPerFrame; processPerFrame += amount;
        processBreakdown.push({ component:component.key, code:lamination.code, base_rate:n(lamination.current_rate), applied_rate:layerRate, amount_per_frame:amount });
      }
      if (component.apply_slitting && slitting?.current_rate != null) {
        const amount = processAmount(slitting, runMPerFrame); processPerFrame += amount;
        processBreakdown.push({ component:component.key, code:slitting.code, rate:n(slitting.current_rate), amount_per_frame:amount });
      }
      if (component.apply_pouching && pouching?.current_rate != null) {
        const amount = processAmount(pouching, runMPerFrame); processPerFrame += amount;
        processBreakdown.push({ component:component.key, code:pouching.code, rate:n(pouching.current_rate), amount_per_frame:amount });
      }

      const preCommercial = materialPerFrame + processPerFrame;
      const wastagePerFrame = component.apply_wastage ? preCommercial * band.wastage_pct / 100 : 0;
      const marginPerFrame = component.apply_margin ? band.margin_per_frame : 0;
      const sellingPerFrame = preCommercial + wastagePerFrame + marginPerFrame;
      costedComponents.push({
        key:component.key,
        material_per_frame:materialPerFrame,
        process_per_frame:processPerFrame,
        pre_commercial_per_frame:preCommercial,
        wastage_per_frame:wastagePerFrame,
        margin_per_frame:marginPerFrame,
        selling_per_frame:sellingPerFrame,
        total_for_job:sellingPerFrame * component.frames_exact,
        material_breakdown:materialBreakdown,
        process_breakdown:processBreakdown,
      });
    }
  }

  const productTotal = costedComponents.reduce((sum,item)=>sum+item.total_for_job,0);
  const unitPrice = quantity ? productTotal / quantity : 0;
  const gstPct = n(context.template.quote_config_json?.gst_pct ?? 18);
  const gst = productTotal * gstPct / 100;

  const hashPayload = {
    engine_version:5,
    template:{id:context.template.id,version:context.template.calculation_version},
    input,
    size,
    construction:resolvedConstruction ? {
      id:resolvedConstruction.construction.id,
      key:resolvedConstruction.construction.construction_key,
      layer_count:resolvedConstruction.construction.layer_count,
      structure_label:resolvedConstruction.structure_label,
    } : null,
    route,
    component_costs:costedComponents,
    commercial_band:band,
  };

  const alternatives: AlternativePriceV5[] = [];
  if (includeAlternatives && !errors.length) {
    const targets = [quantity,10000,15000,20000].filter((value,index,all)=>value>0&&all.indexOf(value)===index).sort((a,b)=>a-b);
    for (const target of targets) {
      if (target===quantity) {
        alternatives.push({ quantity,unit_price:round(unitPrice,8),product_total:round(productTotal,2),run_length_m:round(primaryRunLengthM,8),wastage_pct:band?.wastage_pct??0,margin_per_frame:band?.margin_per_frame??0 });
        continue;
      }
      const result=calculateCore(context,{...input,quantity:target},false);
      if (result.ok) alternatives.push({
        quantity:target,unit_price:result.selling_price.unit_price,product_total:result.selling_price.product_total,
        run_length_m:result.commercial_rules.run_length_m,wastage_pct:result.commercial_rules.wastage_pct,margin_per_frame:result.commercial_rules.margin_per_frame,
      });
    }
  }

  return {
    ok:errors.length===0,
    engine_version:5,
    family_id:context.template.family_id,
    template_id:context.template.id,
    template_version:5,
    customer_requirement:{
      size_profile_id:input.size_profile_id,
      size:size?.name??null,
      dimensions:size?{width_mm:size.width_mm,height_mm:size.height_mm,bottom_gusset_each_mm:size.bottom_gusset_each_mm}:null,
      construction_id:input.construction_id,print:input.print,quantity,bottom_print_mode:input.bottom_print_mode??null,
    },
    construction:resolvedConstruction?{
      id:resolvedConstruction.construction.id,name:resolvedConstruction.construction.name,
      layer_count:resolvedConstruction.construction.layer_count,structure_label:resolvedConstruction.structure_label,
    }:null,
    production_route:{
      route_type:size?.gusset_production_mode??null,
      pricing_bucket:size?.pricing_bucket??null,
      components:(route?.components??[]).map(({web_needed_mm:_internal,...component})=>component),
    },
    commercial_rules:{
      bucket_no:size?.pricing_bucket??null,run_length_m:round(primaryRunLengthM,8),band_max_m:band?.run_length_max_m??null,
      wastage_pct:band?.wastage_pct??0,margin_per_frame:band?.margin_per_frame??0,
    },
    selling_price:{
      unit_price:round(unitPrice,8),product_total:round(productTotal,2),currency:context.template.currency,
      gst_pct:gstPct,gst:round(gst,2),grand_total_before_freight:round(productTotal+gst,2),
    },
    alternative_quantities:alternatives,
    source_hash:pricingSourceHash(hashPayload),
    validation_errors:errors,
    warnings,
    _internal:{primary_run_length_m:primaryRunLengthM},
  };
}

export function calculateSupFormulaV5(context: PricingContextV5,input:SupPricingInputV5):PackagingPricingResultV5 {
  const result=calculateCore(context,input,true);
  const {_internal:_ignored,...publicResult}=result;
  return publicResult;
}
