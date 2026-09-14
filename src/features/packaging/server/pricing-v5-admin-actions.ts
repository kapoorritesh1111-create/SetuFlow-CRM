'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';

const ADMIN_PATH='/admin/packaging-pricing-v5';
const EXPECTED_BANDS:Record<number,number[]>={
  1:[500,1000,2000,3000,5000,10000],
  2:[250,500,1000,2000,3000,5000,10000],
  3:[250,500,1000,2000,3000,5000,10000],
  4:[250,500,1000,2000,3000,5000,10000],
  5:[250,500,1000,2000,3000,5000,10000],
};

function text(formData:FormData,key:string){ return String(formData.get(key)??'').trim(); }
function numberValue(formData:FormData,key:string,label:string,{min=0,max}:{min?:number;max?:number}={}){
  const raw=text(formData,key); const value=Number(raw);
  if(!raw||!Number.isFinite(value)||value<min||(max!=null&&value>max)) throw new Error(`${label} is outside the allowed range.`);
  return value;
}
function checked(formData:FormData,key:string){ return ['true','1','on','yes'].includes(text(formData,key).toLowerCase()); }
function slug(value:string){ return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64); }

async function adminDb(){
  const {organization,user}=await requireAdminWorkspace();
  if(!organization||!user) throw new Error('Admin workspace is required.');
  return {organization,user,supabase:(await createClient()) as any};
}

async function requireDraftTemplate(supabase:any,organizationId:string,templateId:string){
  if(!templateId) throw new Error('Pricing v5 template is required.');
  const {data,error}=await supabase.from('packaging_pricing_templates')
    .select('id,family_id,status,is_active,calculation_version,calculation_engine_key')
    .eq('organization_id',organizationId).eq('id',templateId)
    .eq('calculation_version',5).eq('calculation_engine_key','sup_formula_v5').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 template was not found.');
  if(data.status!=='draft') throw new Error('Published Pricing v5 is immutable. Create a new draft revision before changing pricing structure or rates.');
  return data;
}

export async function savePackagingSizeProfileV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  const templateId=text(formData,'template_id');
  if(!id) throw new Error('Pricing v5 size is required.');
  await requireDraftTemplate(supabase,organization.id,templateId);
  const bucket=Math.trunc(numberValue(formData,'pricing_bucket','Pricing bucket',{min:1,max:5}));
  const gussetMode=text(formData,'gusset_production_mode');
  const registrationMode=text(formData,'bottom_registration_mode');
  if(!['integrated','separate','conditional'].includes(gussetMode)) throw new Error('Unsupported gusset production mode.');
  if(!['not_applicable','optional','required_registered','required_unregistered'].includes(registrationMode)) throw new Error('Unsupported bottom registration mode.');
  const payload={pricing_bucket:bucket,production_profile_key:text(formData,'production_profile_key')||null,gusset_production_mode:gussetMode,bottom_registration_mode:registrationMode,is_quoteable:checked(formData,'is_quoteable'),is_active:checked(formData,'is_active'),updated_by:user.id,updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('packaging_size_profiles_v5').update(payload).eq('organization_id',organization.id).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 size was not found.');
  revalidatePath(ADMIN_PATH);
}

export async function savePackagingCommercialBandV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  const templateId=text(formData,'template_id');
  if(!id) throw new Error('Pricing v5 commercial band is required.');
  await requireDraftTemplate(supabase,organization.id,templateId);
  const wastage=numberValue(formData,'wastage_pct','Wastage',{min:0,max:100});
  const margin=numberValue(formData,'margin_per_frame','Margin per frame',{min:0,max:1000000});
  const {data,error}=await supabase.from('packaging_pricing_commercial_bands_v5').update({wastage_pct:wastage,margin_per_frame:margin,updated_by:user.id,updated_at:new Date().toISOString()}).eq('organization_id',organization.id).eq('template_id',templateId).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 commercial band was not found.');
  revalidatePath(ADMIN_PATH);
}

export async function savePackagingMasterRateV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const masterId=text(formData,'id');
  const templateId=text(formData,'template_id');
  if(!masterId||!templateId) throw new Error('Pricing v5 template and Cost Master item are required.');
  await requireDraftTemplate(supabase,organization.id,templateId);
  const raw=text(formData,'current_rate');
  const rate=raw===''?null:Number(raw);
  if(rate!=null&&(!Number.isFinite(rate)||rate<0)) throw new Error('Rate must be zero or greater.');
  const {data:master,error:masterError}=await supabase.from('packaging_cost_master_items').select('id').eq('organization_id',organization.id).eq('id',masterId).eq('is_active',true).maybeSingle();
  if(masterError||!master?.id) throw new Error(masterError?.message??'Cost Master item was not found.');
  const now=new Date().toISOString();
  const {error}=await supabase.from('packaging_pricing_cost_rates_v5').upsert({organization_id:organization.id,template_id:templateId,cost_master_item_id:masterId,current_rate:rate,updated_by:user.id,updated_at:now,metadata:{source:'pricing_v5_admin_override'}},{onConflict:'organization_id,template_id,cost_master_item_id'});
  if(error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/matrix`);
}

export async function setPackagingConstructionQuoteableV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  const templateId=text(formData,'template_id');
  if(!id) throw new Error('Construction is required.');
  await requireDraftTemplate(supabase,organization.id,templateId);
  const {data,error}=await supabase.from('packaging_constructions_v5').update({is_quoteable:checked(formData,'is_quoteable'),is_active:checked(formData,'is_active'),updated_by:user.id,updated_at:new Date().toISOString()}).eq('organization_id',organization.id).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Construction was not found.');
  revalidatePath(ADMIN_PATH);
}

export async function createPackagingConstructionV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const templateId=text(formData,'template_id');
  const template=await requireDraftTemplate(supabase,organization.id,templateId);
  const name=text(formData,'name');
  if(name.length<3) throw new Error('Construction name is required.');
  const layerIds=[1,2,3,4,5,6].map((position)=>text(formData,`layer_${position}`)).filter(Boolean);
  if(layerIds.length<2||layerIds.length>6) throw new Error('A custom construction requires between 2 and 6 layers.');
  const uniqueLayerIds=[...new Set(layerIds)];
  const {data:materials,error:materialError}=await supabase.from('packaging_cost_master_items').select('id,code,item_type,is_active').eq('organization_id',organization.id).in('id',uniqueLayerIds);
  if(materialError) throw new Error(materialError.message);
  if((materials??[]).length!==uniqueLayerIds.length||(materials??[]).some((item:any)=>item.item_type!=='material'||!item.is_active)) throw new Error('Every construction layer must map to an active material Cost Master item.');
  const materialById=new Map((materials??[]).map((item:any)=>[String(item.id),item]));
  const sealant=materialById.get(layerIds[layerIds.length-1]);
  if(!sealant?.code?.startsWith('MAT_PE_')) throw new Error('The final construction layer must be a PE sealant material.');
  const keyBase=slug(text(formData,'construction_key')||name);
  if(!keyBase) throw new Error('Construction key is required.');
  const now=new Date().toISOString();
  const payload={organization_id:organization.id,family_id:template.family_id,construction_key:keyBase,construction_family_key:slug(text(formData,'construction_family_key')||'custom'),name,finish_type:text(formData,'finish_type')||null,barrier_type:text(formData,'barrier_type')||null,sealant_code:sealant.code,layer_count:layerIds.length,is_active:true,is_quoteable:false,sort_order:900,metadata:{source:'pricing_v5_admin_custom',private_custom:true},created_by:user.id,updated_by:user.id,created_at:now,updated_at:now};
  const {data:construction,error:constructionError}=await supabase.from('packaging_constructions_v5').insert(payload).select('id').single();
  if(constructionError||!construction?.id) throw new Error(constructionError?.message??'Custom construction could not be created.');
  const rows=layerIds.map((masterId,idx)=>({organization_id:organization.id,construction_id:construction.id,layer_position:idx+1,role_key:idx===0?'print_layer':idx===layerIds.length-1?'sealant_layer':`middle_layer_${idx}`,cost_master_item_id:masterId,is_print_layer:idx===0,is_sealant_layer:idx===layerIds.length-1,created_by:user.id}));
  const {error:layerError}=await supabase.from('packaging_construction_layers_v5').insert(rows);
  if(layerError){
    await supabase.from('packaging_constructions_v5').delete().eq('organization_id',organization.id).eq('id',construction.id);
    throw new Error(layerError.message);
  }
  revalidatePath(ADMIN_PATH);
}

export async function validatePackagingTemplateV5(templateId:string){
  const {organization}=await adminDb();
  const context=await loadPricingContextV5(organization.id,templateId);
  const errors:string[]=[];
  const activeSizes=context.sizeProfiles.filter((item)=>item.is_active);
  const quoteableSizes=activeSizes.filter((item)=>item.is_quoteable);
  const activeConstructions=context.constructions.filter((item)=>item.is_active);
  const quoteableConstructions=activeConstructions.filter((item)=>item.is_quoteable);
  if(activeSizes.length!==20) errors.push(`Pricing v5 must contain exactly 20 active workbook sizes; found ${activeSizes.length}.`);
  if(activeConstructions.length<44) errors.push(`Pricing v5 must contain at least the 44 approved workbook constructions; found ${activeConstructions.length}.`);
  if(!quoteableSizes.length) errors.push('At least one Pricing v5 size must be quoteable.');
  if(!quoteableConstructions.length) errors.push('At least one Pricing v5 construction must be quoteable.');
  for(const bucket of [1,2,3,4,5]){
    const actual=context.bands.filter((band)=>band.pricing_bucket===bucket).map((band)=>Number(band.run_length_max_m)).sort((a,b)=>a-b);
    const expected=EXPECTED_BANDS[bucket];
    if(actual.length!==expected.length||expected.some((value,index)=>actual[index]!==value)) errors.push(`Bucket ${bucket} does not match the approved run-length schedule.`);
  }
  for(const size of quoteableSizes){
    if(!size.pricing_bucket) errors.push(`${size.name} does not have a pricing bucket.`);
    if(!size.production_profile_key) errors.push(`${size.name} does not have a production profile.`);
  }
  for(const construction of quoteableConstructions){
    const layers=context.constructionLayers.filter((layer)=>layer.construction_id===construction.id);
    if(layers.length!==construction.layer_count) errors.push(`${construction.name} expects ${construction.layer_count} layers but has ${layers.length}.`);
    for(const layer of layers){
      const master=context.masters.find((item)=>item.id===layer.cost_master_item_id);
      if(!master) errors.push(`${construction.name} has an unmapped material layer.`);
      else if(master.current_rate==null) errors.push(`${construction.name}: ${master.name} needs a v5 rate.`);
      else if(master.gsm==null&&(master.micron==null||master.density==null)) errors.push(`${construction.name}: ${master.name} needs GSM or micron+density.`);
    }
  }
  for(const code of ['MAT_ADHESIVE','PROC_PRINT_CMYK','PROC_PRINT_CMYKW','PROC_LAMINATION','PROC_SLITTING','PROC_POUCHING']){
    const master=context.masters.find((item)=>item.code===code);
    if(!master||master.current_rate==null) errors.push(`${code} needs a Pricing v5 rate.`);
  }
  return {ok:errors.length===0,errors};
}

export async function publishPackagingTemplateV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const templateId=text(formData,'template_id');
  if(!templateId) throw new Error('Pricing v5 template is required.');
  await requireDraftTemplate(supabase,organization.id,templateId);
  const validation=await validatePackagingTemplateV5(templateId);
  if(!validation.ok) throw new Error(validation.errors.join(' '));
  const now=new Date().toISOString();
  const {data,error}=await supabase.from('packaging_pricing_templates').update({status:'published',is_active:true,published_at:now,published_by:user.id,updated_at:now}).eq('organization_id',organization.id).eq('id',templateId).eq('status','draft').eq('calculation_version',5).eq('calculation_engine_key','sup_formula_v5').select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 template was not found or is no longer a draft.');
  revalidatePath(ADMIN_PATH);
}
