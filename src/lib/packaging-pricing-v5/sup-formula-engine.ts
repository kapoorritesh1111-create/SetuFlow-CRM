import { pricingSourceHash } from '../packaging-pricing/snapshot';
import { resolveCommercialBandV5 } from './commercial-band-resolver';
import { resolveConstructionV5 } from './construction-resolver';
import { constructionAllowedForSizeV5, constructionCompatibilityErrorV5 } from './construction-compatibility';
import { resolveProductionRouteV5 } from './production-route-resolver';
import type {
  AlternativePriceV5,
  ChargeMasterRateV5,
  CostMasterRateV5,
  PackagingPricingResultV5,
  PricingContextV5,
  PricingCostBreakdownV5,
  PricingCostBreakdownValuesV5,
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

function selectedCharges(context: PricingContextV5, codes: string[], errors: string[]): ChargeMasterRateV5[] {
  const unique=[...new Set(codes.filter(Boolean))];
  return unique.map((code)=>{
    const charge=(context.charges ?? []).find((item)=>item.code===code)??null;
    if(!charge){errors.push(`${code} is not configured in Charge Master.`);return null;}
    if(code==='EXTRA_SPOT_UV'){errors.push('Spot UV automatic pricing is on hold. Enter Spot UV as a manual quote charge instead.');return null;}
    if(charge.current_rate==null) errors.push(`${charge.name} needs a rate before it can be quoted.`);
    if(!charge.basis||!charge.application_stage) errors.push(`${charge.name} needs a pricing basis and application stage.`);
    if(charge.basis==='percent'){
      const percentBase=String(charge.metadata?.percent_base??'').trim();
      if(!percentBase) errors.push(`${charge.name} is percent-based but metadata.percent_base is not configured.`);
      else if(charge.application_stage!=='after_core_price'||percentBase!=='core_product_total') {
        errors.push(`${charge.name} uses unsupported percent base "${percentBase}" for Pricing v5.`);
      }
    }
    return charge;
  }).filter((item):item is ChargeMasterRateV5=>Boolean(item));
}

function manualQuoteCharges(context:PricingContextV5,input:SupPricingInputV5,errors:string[]){
  const seen=new Set<string>();
  const rows=[] as Array<{charge:ChargeMasterRateV5;amount:number}>;
  for(const raw of input.manual_quote_charges??[]){
    const code=String(raw?.code??'').trim();
    if(!code) continue;
    if(seen.has(code)){errors.push(`Manual quote charge ${code} was supplied more than once.`);continue;}
    seen.add(code);
    if(code!=='EXTRA_SPOT_UV'){errors.push(`${code} is not supported as a manual Pricing v5 quote charge.`);continue;}
    const charge=(context.charges??[]).find((item)=>item.code===code)??null;
    if(!charge){errors.push('Spot UV is not configured in Charge Master.');continue;}
    const amount=n(raw.amount);
    if(!Number.isFinite(amount)||amount<=0){errors.push('Spot UV manual price must be greater than zero when Spot UV is selected.');continue;}
    rows.push({charge,amount:round(amount,2)});
  }
  return rows;
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

function quantityAllowed(size: PricingContextV5['sizeProfiles'][number], quantity: number) {
  const metadata=size.metadata ?? {};
  const allowed=Array.isArray(metadata.allowed_quantities)
    ? metadata.allowed_quantities.map((value)=>Math.floor(n(value))).filter((value)=>value>0)
    : [];
  const blocked=Array.isArray(metadata.blocked_quantities)
    ? metadata.blocked_quantities.map((value)=>Math.floor(n(value))).filter((value)=>value>0)
    : [];
  if (blocked.includes(quantity)) return false;
  if (allowed.length && !allowed.includes(quantity)) return false;
  return true;
}

function beforeCommercialChargePerFrame(charge:ChargeMasterRateV5,component:{key:string;apply_zipper:boolean;units_per_frame:number;web_run_mm_per_frame:number},errors:string[]){
  if(charge.application_stage!=='before_wastage_margin') return 0;
  if(charge.code==='EXTRA_ZIPPER'&&!component.apply_zipper) return 0;
  if(charge.code!=='EXTRA_ZIPPER'&&component.key!=='main_body') return 0;
  const rate=n(charge.current_rate);
  if(charge.basis==='per_running_metre') return rate*(component.web_run_mm_per_frame/1000);
  if(charge.basis==='per_frame') return rate;
  if(charge.basis==='per_unit') return rate*component.units_per_frame;
  errors.push(`${charge.name} uses an unsupported before-wastage basis for Pricing v5.`);
  return 0;
}

function afterCoreChargeTotal(charge:ChargeMasterRateV5,quantity:number,coreTotal:number,errors:string[]){
  if(charge.application_stage!=='after_core_price') return 0;
  const rate=n(charge.current_rate);
  if(charge.basis==='flat') return rate;
  if(charge.basis==='per_unit') return rate*quantity;
  if(charge.basis==='percent') {
    const percentBase=String(charge.metadata?.percent_base??'').trim();
    if(percentBase!=='core_product_total') {
      errors.push(`${charge.name} must use metadata.percent_base="core_product_total" for Pricing v5.`);
      return 0;
    }
    return coreTotal*rate/100;
  }
  errors.push(`${charge.name} uses an unsupported after-core basis for Pricing v5.`);
  return 0;
}

type CostedComponent = {
  key: 'main_body' | 'bottom_gusset';
  frames_exact: number;
  material_per_frame: number;
  process_per_frame: number;
  production_extras_per_frame: number;
  pre_commercial_per_frame: number;
  wastage_per_frame: number;
  margin_per_frame: number;
  selling_per_frame: number;
  total_for_job: number;
  material_breakdown: Array<Record<string, unknown>>;
  process_breakdown: Array<Record<string, unknown>>;
  charge_breakdown: Array<Record<string, unknown>>;
};

type CoreResult = PackagingPricingResultV5 & { _internal?: { primary_run_length_m: number } };

function zeroBreakdown(): PricingCostBreakdownValuesV5 {
  return {
    material_cost:0,printing_cost:0,lamination_cost:0,slitting_cost:0,pouch_making_cost:0,zipper_cost:0,
    other_process_cost:0,base_production_cost:0,waste_cost:0,margin_cost:0,additional_charges_cost:0,final_price:0,
  };
}

function buildCostBreakdown(
  currency:string,
  quantity:number,
  components:CostedComponent[],
  appliedChargeTotals:Map<string,{charge:ChargeMasterRateV5;amount:number;application_stage?:string}>,
  productTotal:number,
):PricingCostBreakdownV5 {
  const totals=zeroBreakdown();
  for(const component of components){
    totals.material_cost+=component.material_per_frame*component.frames_exact;
    totals.waste_cost+=component.wastage_per_frame*component.frames_exact;
    totals.margin_cost+=component.margin_per_frame*component.frames_exact;
    for(const row of component.process_breakdown){
      const code=String(row.code??'');
      const amount=n(row.amount_per_frame)*component.frames_exact;
      if(code.startsWith('PROC_PRINT_')) totals.printing_cost+=amount;
      else if(code==='PROC_LAMINATION') totals.lamination_cost+=amount;
      else if(code==='PROC_SLITTING') totals.slitting_cost+=amount;
      else if(code==='PROC_POUCHING') totals.pouch_making_cost+=amount;
      else totals.other_process_cost+=amount;
    }
  }
  for(const {charge,amount} of appliedChargeTotals.values()){
    if(charge.code==='EXTRA_ZIPPER') totals.zipper_cost+=amount;
    else totals.additional_charges_cost+=amount;
  }
  totals.base_production_cost=totals.material_cost+totals.printing_cost+totals.lamination_cost+totals.slitting_cost+totals.pouch_making_cost+totals.zipper_cost+totals.other_process_cost;
  totals.final_price=productTotal;
  const divisor=quantity||1;
  const perUnit=zeroBreakdown();
  (Object.keys(perUnit) as Array<keyof PricingCostBreakdownValuesV5>).forEach((key)=>{perUnit[key]=round(totals[key]/divisor,8);});
  const roundedTotals=zeroBreakdown();
  (Object.keys(roundedTotals) as Array<keyof PricingCostBreakdownValuesV5>).forEach((key)=>{roundedTotals[key]=round(totals[key],2);});
  const reconciled=perUnit.base_production_cost+perUnit.waste_cost+perUnit.margin_cost+perUnit.additional_charges_cost;
  return {currency,per_unit:perUnit,totals_for_job:roundedTotals,reconciliation_delta:round(perUnit.final_price-reconciled,8)};
}

function calculateCore(context: PricingContextV5, input: SupPricingInputV5, includeAlternatives: boolean): CoreResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const quantity = Math.max(0, Math.floor(n(input.quantity)));
  const size = context.sizeProfiles.find((item) => item.id === input.size_profile_id) ?? null;
  const resolvedConstruction = resolveConstructionV5(input.construction_id, context.constructions, context.constructionLayers, context.masters);

  if (!quantity) errors.push('Quantity is required.');
  if (!size) errors.push('Selected Pricing v5 size is not available.');
  if (size && quantity && !quantityAllowed(size,quantity)) errors.push(`Quantity ${quantity.toLocaleString()} is not allowed for ${size.name}.`);
  if (!resolvedConstruction) errors.push('Selected Pricing v5 construction is not available.');
  if (resolvedConstruction) errors.push(...resolvedConstruction.validation_errors);
  if(size?.is_quoteable&&resolvedConstruction?.construction.is_quoteable&&!constructionAllowedForSizeV5(size,resolvedConstruction.construction)){
    errors.push(constructionCompatibilityErrorV5(size,resolvedConstruction.construction));
  }

  const charges=selectedCharges(context,input.selected_charge_codes??[],errors);
  const manualCharges=manualQuoteCharges(context,input,errors);
  for(const charge of charges){
    if(charge.application_stage==='separate_quote_line') errors.push(`${charge.name} is not enabled in the Pricing v5 quote flow yet.`);
  }

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
  const appliedChargeTotals=new Map<string,{charge:ChargeMasterRateV5;amount:number;application_stage?:string}>();
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
        // Stark's SUP workbook runs aluminium foil on the 760 mm outer web even when
        // foil is a middle barrier layer. PET/MetPET middle layers continue to use the
        // inner stock-web ladder; PE sealant continues to use the PE ladder.
        const web = layer.is_print_layer || layer.master.code === 'MAT_AL_FOIL_9'
          ? outerPrintWebMm
          : layer.is_sealant_layer ? peWebMm : innerWebMm;
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

      let productionExtrasPerFrame=0;
      const chargeBreakdown:Array<Record<string,unknown>>=[];
      for(const charge of charges.filter((item)=>item.application_stage==='before_wastage_margin')){
        const amount=beforeCommercialChargePerFrame(charge,component,errors);
        if(amount<=0) continue;
        productionExtrasPerFrame+=amount;
        const jobAmount=amount*component.frames_exact;
        const existing=appliedChargeTotals.get(charge.code);
        appliedChargeTotals.set(charge.code,{charge,amount:(existing?.amount??0)+jobAmount});
        chargeBreakdown.push({component:component.key,code:charge.code,name:charge.name,basis:charge.basis,snapshotted_rate:n(charge.current_rate),amount_per_frame:amount,total_for_job:jobAmount});
      }

      const preCommercial = materialPerFrame + processPerFrame + productionExtrasPerFrame;
      const wastagePerFrame = component.apply_wastage ? preCommercial * band.wastage_pct / 100 : 0;
      const marginPerFrame = component.apply_margin ? band.margin_per_frame : 0;
      const sellingPerFrame = preCommercial + wastagePerFrame + marginPerFrame;
      costedComponents.push({
        key:component.key,
        frames_exact:component.frames_exact,
        material_per_frame:materialPerFrame,
        process_per_frame:processPerFrame,
        production_extras_per_frame:productionExtrasPerFrame,
        pre_commercial_per_frame:preCommercial,
        wastage_per_frame:wastagePerFrame,
        margin_per_frame:marginPerFrame,
        selling_per_frame:sellingPerFrame,
        total_for_job:sellingPerFrame * component.frames_exact,
        material_breakdown:materialBreakdown,
        process_breakdown:processBreakdown,
        charge_breakdown:chargeBreakdown,
      });
    }
  }

  const coreProductTotal = costedComponents.reduce((sum,item)=>sum+item.total_for_job,0);
  let afterCoreTotal=0;
  for(const charge of charges.filter((item)=>item.application_stage==='after_core_price')){
    const amount=afterCoreChargeTotal(charge,quantity,coreProductTotal,errors);
    afterCoreTotal+=amount;
    appliedChargeTotals.set(charge.code,{charge,amount});
  }
  const separateChargesTotal=manualCharges.reduce((sum,row)=>sum+row.amount,0);
  const productTotal=coreProductTotal+afterCoreTotal;
  const subtotalBeforeGst=productTotal+separateChargesTotal;
  const unitPrice = quantity ? productTotal / quantity : 0;
  const gstPct = n(context.template.quote_config_json?.gst_pct ?? 18);
  const gst = subtotalBeforeGst * gstPct / 100;
  const appliedCharges=[
    ...[...appliedChargeTotals.values()].map(({charge,amount,application_stage})=>({code:charge.code,name:charge.name,application_stage:String(application_stage??charge.application_stage),amount:round(amount,2)})),
    ...manualCharges.map(({charge,amount})=>({code:charge.code,name:charge.name,application_stage:'separate_quote_line',amount:round(amount,2)})),
  ];
  const costBreakdown=buildCostBreakdown(context.template.currency,quantity,costedComponents,appliedChargeTotals,productTotal);

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
    applied_charges:appliedCharges,
    cost_breakdown:costBreakdown,
  };

  const alternatives: AlternativePriceV5[] = [];
  if (includeAlternatives && !errors.length) {
    const defaultQuantityLadder = [1000,2000,3000,5000,10000,20000,30000,50000];
    const allowedQuantities = Array.isArray(size?.metadata?.allowed_quantities)
      ? size!.metadata!.allowed_quantities.map((value)=>Math.floor(n(value))).filter((value)=>value>0)
      : [];
    const configured = allowedQuantities.length ? allowedQuantities : defaultQuantityLadder;
    const blocked = Array.isArray(size?.metadata?.blocked_quantities)
      ? size!.metadata!.blocked_quantities.map((value)=>Math.floor(n(value))).filter((value)=>value>0)
      : [];
    const ladder = [...new Set(configured)].filter((value)=>!blocked.includes(value)).sort((a,b)=>a-b);
    const higher = ladder.filter((value)=>value>quantity).slice(0,5);
    const targets = [quantity,...higher].filter((value,index,all)=>value>0&&all.indexOf(value)===index);
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
      selected_charge_codes:input.selected_charge_codes??[],
      manual_quote_charges:(input.manual_quote_charges??[]).map((item)=>({code:item.code,amount:round(n(item.amount),2),note:item.note??null})),
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
    applied_charges:appliedCharges,
    cost_breakdown:costBreakdown,
    selling_price:{
      unit_price:round(unitPrice,8),product_total:round(productTotal,2),
      separate_charges_total:round(separateChargesTotal,2),subtotal_before_gst:round(subtotalBeforeGst,2),currency:context.template.currency,
      gst_pct:gstPct,gst:round(gst,2),grand_total_before_freight:round(subtotalBeforeGst+gst,2),
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
