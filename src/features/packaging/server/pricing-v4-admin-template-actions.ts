'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

const ADMIN_PATH='/admin/packaging-templates';
const ENGINES=new Set(['sup_formula','matrix_per_frame','service_formula']);
const RECIPE_METHODS=new Set(['gsm_stock_web','gsm_per_bond','per_frame','per_running_metre','per_unit','flat']);

async function adminDb(){
  const {organization,user}=await requireAdminWorkspace();
  if(!organization||!user) throw new Error('Admin workspace is required.');
  return {organization,user,supabase:(await createClient()) as any};
}
function text(formData:FormData,key:string){return String(formData.get(key)??'').trim();}
function required(formData:FormData,key:string,label:string){const raw=text(formData,key);if(!raw)throw new Error(`${label} is required.`);return raw;}
function slugify(raw:string){const slug=raw.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');if(!slug)throw new Error('A valid slug is required.');return slug;}
function number(formData:FormData,key:string,label:string,options:{positive?:boolean,max?:number}={}){const raw=required(formData,key,label);const parsed=Number(raw);if(!Number.isFinite(parsed)||(options.positive?parsed<=0:parsed<0)||(options.max!=null&&parsed>options.max))throw new Error(`${label} is outside the allowed range.`);return parsed;}
function checked(formData:FormData,key:string){return ['true','1','on','yes'].includes(text(formData,key).toLowerCase());}
function pricingModel(engine:string){return engine==='sup_formula'?'sup_standard_matrix':'legacy_dimensional';}

export async function savePackagingPricingTemplateV4(formData:FormData){
  const {organization,supabase}=await adminDb();
  const id=text(formData,'id');
  const name=required(formData,'name','Template name');
  const description=text(formData,'description')||null;
  const currency=(text(formData,'currency')||'INR').toUpperCase();
  if(id){
    const {data:existing,error:readError}=await supabase.from('packaging_pricing_templates').select('id,status').eq('organization_id',organization.id).eq('id',id).maybeSingle();
    if(readError||!existing)throw new Error(readError?.message??'Template was not found.');
    if(existing.status==='published')throw new Error('Published templates are immutable. Copy it to create a new draft.');
    const {error}=await supabase.from('packaging_pricing_templates').update({name,description,currency,updated_at:new Date().toISOString()}).eq('organization_id',organization.id).eq('id',id);
    if(error)throw new Error(error.message);
    revalidatePath(ADMIN_PATH);return;
  }

  const familyId=required(formData,'family_id','Service family');
  const copyFromId=text(formData,'copy_from_template_id');
  let engine=required(formData,'calculation_engine_key','Pricing engine');
  if(!ENGINES.has(engine))throw new Error('Unsupported pricing engine.');
  let productionRules:Record<string,unknown>={};
  let quoteConfig:Record<string,unknown>={};
  let model=pricingModel(engine);
  let supersedes:string|null=null;
  if(copyFromId){
    const {data:source,error}=await supabase.from('packaging_pricing_templates').select('id,family_id,calculation_engine_key,pricing_model,production_rules_json,quote_config_json').eq('organization_id',organization.id).eq('id',copyFromId).maybeSingle();
    if(error||!source)throw new Error(error?.message??'Source template was not found.');
    if(source.family_id!==familyId)throw new Error('Templates can only be copied inside the same Service Family.');
    engine=source.calculation_engine_key;model=source.pricing_model??pricingModel(engine);
    productionRules=source.production_rules_json??{};quoteConfig=source.quote_config_json??{};supersedes=source.id;
  }
  const {data:created,error:createError}=await supabase.from('packaging_pricing_templates').insert({
    organization_id:organization.id,family_id:familyId,slug:slugify(text(formData,'slug')||name),name,description,currency,
    is_active:false,calculation_version:4,pricing_model:model,calculation_engine_key:engine,status:'draft',
    production_rules_json:productionRules,quote_config_json:quoteConfig,supersedes_template_id:supersedes,
  }).select('id').single();
  if(createError||!created?.id)throw new Error(createError?.message??'Could not create Pricing Template.');

  if(copyFromId){
    const [{data:recipes,error:recipeError},{data:bands,error:bandError},{data:matrix,error:matrixError}]=await Promise.all([
      supabase.from('packaging_pricing_recipe_items').select('construction_key,role_key,source_type,cost_master_item_id,charge_master_item_id,consumption_rule_json,condition_json,sort_order,is_required').eq('organization_id',organization.id).eq('template_id',copyFromId),
      supabase.from('packaging_pricing_commercial_bands').select('run_length_max_m,wastage_pct,margin_per_frame,sort_order,metadata').eq('organization_id',organization.id).eq('template_id',copyFromId),
      supabase.from('packaging_pricing_matrix_rows').select('supply_form,construction_key,client_product_id,width_mm,height_mm,q1_rate_per_frame,q2_rate_per_frame,q3_rate_per_frame,q4_rate_per_frame,q5_rate_per_frame,source_worksheet,source_row_number,source_reference,is_active,metadata').eq('organization_id',organization.id).eq('template_id',copyFromId),
    ]);
    if(recipeError||bandError||matrixError)throw new Error(recipeError?.message??bandError?.message??matrixError?.message);
    if(recipes?.length){const {error}=await supabase.from('packaging_pricing_recipe_items').insert(recipes.map((row:any)=>({organization_id:organization.id,template_id:created.id,...row})));if(error)throw new Error(error.message);}
    if(bands?.length){const {error}=await supabase.from('packaging_pricing_commercial_bands').insert(bands.map((row:any)=>({organization_id:organization.id,template_id:created.id,...row})));if(error)throw new Error(error.message);}
    if(matrix?.length){const {error}=await supabase.from('packaging_pricing_matrix_rows').insert(matrix.map((row:any)=>({organization_id:organization.id,template_id:created.id,...row})));if(error)throw new Error(error.message);}
  }
  revalidatePath(ADMIN_PATH);
}

export async function savePackagingCommercialBandV4(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  const payload={template_id:required(formData,'template_id','Pricing template'),run_length_max_m:number(formData,'run_length_max_m','Maximum run length',{positive:true}),wastage_pct:number(formData,'wastage_pct','Wastage %',{max:100}),margin_per_frame:number(formData,'margin_per_frame','Margin per frame'),sort_order:Math.max(0,Math.trunc(Number(text(formData,'sort_order')||0))),updated_by:user.id,updated_at:new Date().toISOString()};
  const query=id?supabase.from('packaging_pricing_commercial_bands').update(payload).eq('organization_id',organization.id).eq('id',id):supabase.from('packaging_pricing_commercial_bands').insert({organization_id:organization.id,...payload,created_by:user.id});
  const {error}=await query;if(error)throw new Error(error.message);revalidatePath(ADMIN_PATH);
}

export async function removePackagingCommercialBandV4(formData:FormData){
  const {organization,supabase}=await adminDb();
  const id=required(formData,'id','Commercial band');
  const {error}=await supabase.from('packaging_pricing_commercial_bands').delete().eq('organization_id',organization.id).eq('id',id);
  if(error)throw new Error(error.message);revalidatePath(ADMIN_PATH);
}

function buildRecipeJson(formData:FormData){
  const method=required(formData,'method','Consumption method');
  if(!RECIPE_METHODS.has(method))throw new Error('Unsupported consumption method.');
  const consumption:Record<string,unknown>={method};
  for(const key of ['web','bonds','metres']){const raw=text(formData,key);if(raw)consumption[key]=raw;}
  const condition:Record<string,unknown>={};
  const print=text(formData,'condition_print');if(print)condition.print=print;
  const quoteOption=text(formData,'quote_option');if(quoteOption)condition.quote_option=quoteOption;
  const variations=text(formData,'variation_keys').split(',').map((item)=>item.trim()).filter(Boolean);if(variations.length)condition.variation_keys=variations;
  return {consumption,condition};
}

export async function savePackagingRecipeItemV4(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  const sourceType=required(formData,'source_type','Source type');
  if(!new Set(['cost_master','charge_master']).has(sourceType))throw new Error('Unsupported source type.');
  const sourceId=required(formData,'source_id','Master item');
  const {consumption,condition}=buildRecipeJson(formData);
  const payload={template_id:required(formData,'template_id','Pricing template'),construction_key:required(formData,'construction_key','Construction key'),role_key:required(formData,'role_key','Recipe role'),source_type:sourceType,cost_master_item_id:sourceType==='cost_master'?sourceId:null,charge_master_item_id:sourceType==='charge_master'?sourceId:null,consumption_rule_json:consumption,condition_json:condition,sort_order:Math.max(0,Math.trunc(Number(text(formData,'sort_order')||0))),is_required:checked(formData,'is_required'),updated_by:user.id,updated_at:new Date().toISOString()};
  const query=id?supabase.from('packaging_pricing_recipe_items').update(payload).eq('organization_id',organization.id).eq('id',id):supabase.from('packaging_pricing_recipe_items').insert({organization_id:organization.id,...payload,created_by:user.id});
  const {error}=await query;if(error)throw new Error(error.message);revalidatePath(ADMIN_PATH);
}

export async function removePackagingRecipeItemV4(formData:FormData){
  const {organization,supabase}=await adminDb();
  const id=required(formData,'id','Recipe item');
  const {error}=await supabase.from('packaging_pricing_recipe_items').delete().eq('organization_id',organization.id).eq('id',id);
  if(error)throw new Error(error.message);revalidatePath(ADMIN_PATH);
}
