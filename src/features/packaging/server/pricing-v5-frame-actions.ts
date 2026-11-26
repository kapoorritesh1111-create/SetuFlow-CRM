'use server';

import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';
import { calculateFrameFamilyPriceReviewV5, type FrameFamilyPricingInputV5 } from '@/lib/packaging-pricing-v5/frame-family-cost-core';
import type { FrameFamilySupplyFormV5 } from '@/lib/packaging-pricing-v5/frame-family-geometry';
import { customerVolumeSuggestions } from '@/lib/packaging-pricing-v5/volume-suggestions';

function bandQuantities(context:any,result:any){
  const ups=Number(result.geometry?.units_per_frame??0);
  const metres=Number(result.geometry?.material_run_mm_per_frame??0)/1000;
  if(!(ups>0&&metres>0)) return [];
  const limits=[...new Set<number>((context.bands??[])
    .filter((b:any)=>Number(b.pricing_bucket)===Number(result.commercial_bucket))
    .map((b:any)=>Number(b.run_length_max_m))
    .filter((v:number)=>Number.isFinite(v)&&v>=0))].sort((a,b)=>a-b);
  // The final band already applies above its upper limit.
  return limits.slice(0,-1).map(m=>Math.floor(m*ups/metres)+1)
    .filter(q=>Number.isSafeInteger(q)&&q>0);
}

function improves(candidate:any,baseline:any,input:FrameFamilyPricingInputV5){
  const roll=input.supply_form.endsWith('_roll');
  const rate=(r:any)=>Number(roll?r.roll_weight?.price_per_kg:r.selling_price?.unit_price);
  return candidate.ok&&rate(candidate)>0&&rate(candidate)<rate(baseline)&&
    candidate.selling_price.unit_price<baseline.selling_price.unit_price;
}

function roundCommercialQty(value:number){
  const qty=Math.max(1,Math.ceil(Number(value)||0));
  const step=qty<=10000?1000:qty<=50000?5000:10000;
  return Math.ceil(qty/step)*step;
}

function smartMoqRecommendation(context:any,result:any,input:FrameFamilyPricingInputV5){
  const unitsPerFrame=Number(result.geometry?.units_per_frame??0);
  const runPerFrameM=Number(result.geometry?.material_run_mm_per_frame??0)/1000;
  const minimumRunM=Number(context.template.production_rules_json?.minimum_run_length_m??250);
  if(!unitsPerFrame||!runPerFrameM||minimumRunM<=0) return null;

  const exactMinimumQty=Math.ceil((minimumRunM*unitsPerFrame)/runPerFrameM);
  const recommendedMinimumQty=roundCommercialQty(exactMinimumQty);
  const minimum=calculateFrameFamilyPriceReviewV5(context,{...input,quantity:recommendedMinimumQty});
  const options:any[]=[];
  let best=minimum;
  for(const quantity of [recommendedMinimumQty,...bandQuantities(context,result).filter(q=>q>recommendedMinimumQty)]){
    const candidate=calculateFrameFamilyPriceReviewV5(context,{...input,quantity});
    if(!candidate.ok||(options.length&&!improves(candidate,best,input))) continue;
    options.push({
      quantity,label:options.length===0?'Minimum order':options.length===1?'Better value':'Best value',
      run_length_m:candidate.run_length_m,
      unit_price:candidate.selling_price.unit_price,
      product_total:candidate.selling_price.product_total,
      finished_weight_kg:candidate.roll_weight?.finished_weight_kg??null,
      price_per_kg:candidate.roll_weight?.price_per_kg??null,
      savings_per_unit:Math.max(0,minimum.selling_price.unit_price-candidate.selling_price.unit_price),
    });
    best=candidate;
    if(options.length>=3) break;
  }

  return {
    minimum_run_length_m:minimumRunM,
    quantity_uom:String(input.supply_form).endsWith('_pouch')?'pcs':'units',
    entered_quantity:Number(input.quantity),
    entered_run_length_m:Number(result.run_length_m??0),
    exact_minimum_quantity:exactMinimumQty,
    recommended_minimum_quantity:recommendedMinimumQty,
    below_minimum:Number(input.quantity)<exactMinimumQty,
    options,
  };
}

async function workspaceContext(){
  const workspace=await requireWorkspace();
  if(!workspace?.user||!workspace?.organization||!workspace?.membership) throw new Error('Not authenticated in an active workspace.');
  return workspace;
}

function safeProjection(result:any,suggestions:any[],smartMoq:any=null){
  const customerSuggestions=customerVolumeSuggestions(result.quantity,result.selling_price?.unit_price,suggestions,3);
  return {
    ok:result.ok,
    engine_version:5,
    family_id:result.family_id??null,
    template_id:result.template_id??null,
    customer_requirement:{
      supply_form:result.supply_form,
      width_mm:result.geometry?.entered_width_mm,
      height_mm:result.geometry?.entered_height_mm,
      quantity:result.quantity,
    },
    construction:result.construction,
    selling_price:result.selling_price,
    roll_weight:result.roll_weight,
    suggested_quantities:customerSuggestions,
    smart_moq:smartMoq,
    validation_errors:result.validation_errors,
    warnings:result.warnings,
  };
}

function sourceHash(payload:unknown){
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function constructionMatchesFrameForm(construction:any,supplyForm:string){
  const source=[construction?.name,construction?.construction_key,construction?.metadata?.source_construction_key].filter(Boolean).join(' ').toLowerCase();
  if(supplyForm.endsWith('_roll')) return source.includes('roll form');
  if(supplyForm.endsWith('_pouch')) return source.includes('pouch form');
  return true;
}

async function calculate(params:{templateId:string;input:FrameFamilyPricingInputV5}){
  const workspace=await workspaceContext();
  const context=await loadPricingContextV5(workspace.organization!.id,params.templateId,{publishedOnly:!workspace.canAccessAdmin});
  if(context.template.calculation_engine_key!=='frame_formula_v5') throw new Error('Selected template is not a frame-family Pricing v5 model.');
  const templateSupplyForm=String(context.template.production_rules_json?.supply_form??'');
  if(templateSupplyForm&&String(params.input.supply_form)!==templateSupplyForm) throw new Error('Selected pouch/roll form does not match the pricing template.');
  const selectedConstruction=context.constructions.find((item:any)=>String(item.id)===String(params.input.construction_id));
  if(!selectedConstruction||!selectedConstruction.is_active||!selectedConstruction.is_quoteable) throw new Error('Selected construction is not available for this pricing template.');
  if(!constructionMatchesFrameForm(selectedConstruction,templateSupplyForm)) throw new Error('Selected construction does not match the selected pouch/roll form.');
  const result=calculateFrameFamilyPriceReviewV5(context,params.input);
  const smartMoq=smartMoqRecommendation(context,result,params.input);
  const suggestions:any[]=[];
  let best=result;
  if(result.ok){
    for(const quantity of bandQuantities(context,result)){
      if(quantity<=result.quantity) continue;
      const candidate=calculateFrameFamilyPriceReviewV5(context,{...params.input,quantity});
      if(!improves(candidate,best,params.input)) continue;
      suggestions.push({
        quantity,unit_price:candidate.selling_price.unit_price,
        product_total:candidate.selling_price.product_total,
        finished_weight_kg:candidate.roll_weight?.finished_weight_kg??null,
        price_per_kg:candidate.roll_weight?.price_per_kg??null,
      });
      best=candidate;
      if(suggestions.length>=3) break;
    }
  }
  return {workspace,context,result,suggestions,smartMoq};
}

export async function previewPackagingFramePricingV5(params:{templateId:string;input:FrameFamilyPricingInputV5}){
  try{
    const {workspace,result,suggestions,smartMoq}=await calculate(params);
    const safe=safeProjection(result,suggestions,smartMoq);
    return {ok:result.ok,result:workspace.canAccessAdmin?{...result,smart_moq:smartMoq,suggested_quantities:customerVolumeSuggestions(result.quantity,result.selling_price?.unit_price,suggestions,3)}:safe,error:result.ok?undefined:result.validation_errors.join(' ')};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Frame-family Pricing v5 preview failed.'};
  }
}

export async function savePackagingFramePricingV5QuoteLine(params:{
  quoteId:string;
  leadId:string;
  familyId:string;
  templateId:string;
  input:FrameFamilyPricingInputV5;
  lineId?:string|null;
}){
  try{
    const {workspace,context,result,suggestions,smartMoq}=await calculate(params);
    if(!result.ok) return {ok:false,error:result.validation_errors.join(' ')||'Fix Pricing v5 validation errors before saving.'};
    const organizationId=workspace.organization!.id;
    if(context.template.family_id!==params.familyId) return {ok:false,error:'Pricing v5 template does not belong to the selected family.'};

    const supabase:any=await createClient();
    const {data:quote,error:quoteError}=await supabase.from('quotes')
      .select('id,organization_id,lead_id,status,current_version_id').eq('organization_id',organizationId).eq('id',params.quoteId).maybeSingle();
    if(quoteError||!quote?.id) return {ok:false,error:'Quote not found in this workspace.'};
    if(quote.lead_id&&quote.lead_id!==params.leadId) return {ok:false,error:'Quote does not belong to this lead.'};
    if(['accepted','rejected','expired','cancelled','declined','sent'].includes(String(quote.status??'').toLowerCase())) return {ok:false,error:'This quote is locked. Create a new draft/version before changing pricing.'};
    if(!quote.current_version_id) return {ok:false,error:'Create or compile a draft quote version before adding Packaging Pricing v5.'};

    const {data:family}=await supabase.from('packaging_service_families')
      .select('id,name,is_quoteable').eq('organization_id',organizationId).eq('id',params.familyId).eq('is_active',true).maybeSingle();
    if(!family?.id||!family.is_quoteable) return {ok:false,error:'This packaging family is not currently quoteable.'};

    const sales=safeProjection(result,suggestions,smartMoq);
    const inputSnapshot={
      engine_version:5,
      family_id:family.id,
      family_name:family.name,
      template_id:context.template.id,
      template_name:context.template.name,
      template_version:5,
      calculation_engine_key:'frame_formula_v5',
      input:params.input,
      source_hash:sourceHash({templateId:context.template.id,input:params.input,result}),
    };
    const hash=inputSnapshot.source_hash;
    const description=`${result.supply_form.includes('three_side')?'3 Side Seal':'Center Seal'} · ${result.supply_form.endsWith('pouch')?'Pouch Form':'Roll Form'}${params.input.selected_charge_codes?.includes('EXTRA_ZIPPER')?' with Zipper':''} · ${result.geometry.entered_width_mm} × ${result.geometry.entered_height_mm} mm`;
    const internal={
      engine_version:5,
      calculation_engine_key:'frame_formula_v5',
      input_snapshot:inputSnapshot,
      result,
      source_hash:hash,
    };

    const service:any=createServiceRoleClient();
    if(!service) return {ok:false,error:'Pricing persistence service is unavailable.'};
    const {data:savedRows,error:saveError}=await service.rpc('app_save_packaging_v5_frame_quote_line_tx',{
      p_organization_id:organizationId,
      p_quote_id:quote.id,
      p_lead_id:params.leadId,
      p_line_id:params.lineId??null,
      p_family_id:family.id,
      p_template_id:context.template.id,
      p_quantity:Math.max(1,Math.floor(Number(params.input.quantity))),
      p_unit_price:result.selling_price.unit_price,
      p_currency:result.selling_price.currency,
      p_description:description,
      p_input_snapshot:inputSnapshot,
      p_sales_pricing:sales,
      p_internal_pricing:internal,
      p_source_hash:hash,
    });
    if(saveError) return {ok:false,error:saveError.message??'Frame-family Pricing v5 quote line could not be persisted.'};
    const saved=Array.isArray(savedRows)?savedRows[0]:savedRows;
    const lineId=saved?.line_id??params.lineId??null;
    if(!lineId) return {ok:false,error:'Packaging Pricing v5 transaction completed without a line id.'};

    revalidatePath(`/leads/${params.leadId}/quote`);
    return {ok:true,lineId,quoteVersionId:saved?.quote_version_id??null,result:sales};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'Frame-family Pricing v5 quote save failed.'};
  }
}
