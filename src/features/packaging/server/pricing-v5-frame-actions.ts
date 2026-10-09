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

const QTY_LADDER=[1000,2000,3000,5000,10000,20000,30000,50000];

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
  const bucket=Number(result.commercial_bucket??context.template.production_rules_json?.default_commercial_bucket??0);
  const bandLimits=(context.bands??[])
    .filter((b:any)=>Number(b.pricing_bucket)===bucket)
    .map((b:any)=>Number(b.run_length_max_m))
    .filter((v:number)=>Number.isFinite(v)&&v>=minimumRunM)
    .sort((a:number,b:number)=>a-b);

  const candidateQuantities=[recommendedMinimumQty];
  for(const runM of bandLimits){
    const exact=Math.ceil(((runM+0.000001)*unitsPerFrame)/runPerFrameM);
    const rounded=roundCommercialQty(exact);
    if(rounded>recommendedMinimumQty&&!candidateQuantities.includes(rounded)) candidateQuantities.push(rounded);
    if(candidateQuantities.length>=3) break;
  }

  const options=candidateQuantities.map((quantity,index)=>{
    const candidate=calculateFrameFamilyPriceReviewV5(context,{...input,quantity});
    return {
      quantity,
      label:index===0?'Minimum order':index===1?'Better value':'Best value',
      run_length_m:Number(candidate.run_length_m??0),
      unit_price:candidate.ok?candidate.selling_price.unit_price:null,
      product_total:candidate.ok?candidate.selling_price.product_total:null,
      savings_per_unit:null as number|null,
    };
  });
  const base=Number(options[0]?.unit_price??0);
  for(const option of options){
    if(base>0&&Number(option.unit_price)>0) option.savings_per_unit=Math.max(0,base-Number(option.unit_price));
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
    suggested_quantities:customerSuggestions,
    smart_moq:smartMoq,
    validation_errors:result.validation_errors,
    warnings:result.warnings,
  };
}

function sourceHash(payload:unknown){
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function calculate(params:{templateId:string;input:FrameFamilyPricingInputV5}){
  const workspace=await workspaceContext();
  const context=await loadPricingContextV5(workspace.organization!.id,params.templateId,{publishedOnly:!workspace.canAccessAdmin});
  if(context.template.calculation_engine_key!=='frame_formula_v5') throw new Error('Selected template is not a frame-family Pricing v5 model.');
  const result=calculateFrameFamilyPriceReviewV5(context,params.input);
  const smartMoq=smartMoqRecommendation(context,result,params.input);
  const next=QTY_LADDER.filter((qty)=>qty>Number(params.input.quantity));
  const suggestions=next.map((qty)=>{
    const candidate=calculateFrameFamilyPriceReviewV5(context,{...params.input,quantity:qty});
    return candidate.ok?{
      quantity:qty,
      unit_price:candidate.selling_price.unit_price,
      product_total:candidate.selling_price.product_total,
    }:null;
  }).filter(Boolean);
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
    const description=`${result.supply_form.includes('three_side')?'3 Side Seal':'Center Seal'} · ${result.supply_form.endsWith('pouch')?'Pouch Form':'Roll Form'} · ${result.geometry.entered_width_mm} × ${result.geometry.entered_height_mm} mm`;
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
