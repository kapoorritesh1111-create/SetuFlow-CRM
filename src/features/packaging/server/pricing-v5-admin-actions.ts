'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';

const ADMIN_PATH='/admin/packaging-pricing-v5';

function text(formData:FormData,key:string){ return String(formData.get(key)??'').trim(); }
function numberValue(formData:FormData,key:string,label:string,{min=0,max}:{min?:number;max?:number}={}){
  const raw=text(formData,key); const value=Number(raw);
  if(!raw||!Number.isFinite(value)||value<min||(max!=null&&value>max)) throw new Error(`${label} is outside the allowed range.`);
  return value;
}
function checked(formData:FormData,key:string){ return ['true','1','on','yes'].includes(text(formData,key).toLowerCase()); }

async function adminDb(){
  const {organization,user}=await requireAdminWorkspace();
  if(!organization||!user) throw new Error('Admin workspace is required.');
  return {organization,user,supabase:(await createClient()) as any};
}

export async function savePackagingSizeProfileV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  if(!id) throw new Error('Pricing v5 size is required.');
  const bucket=Math.trunc(numberValue(formData,'pricing_bucket','Pricing bucket',{min:1,max:5}));
  const gussetMode=text(formData,'gusset_production_mode');
  const registrationMode=text(formData,'bottom_registration_mode');
  if(!['integrated','separate','conditional'].includes(gussetMode)) throw new Error('Unsupported gusset production mode.');
  if(!['not_applicable','optional','required_registered','required_unregistered'].includes(registrationMode)) throw new Error('Unsupported bottom registration mode.');
  const payload={
    pricing_bucket:bucket,
    production_profile_key:text(formData,'production_profile_key')||null,
    gusset_production_mode:gussetMode,
    bottom_registration_mode:registrationMode,
    is_quoteable:checked(formData,'is_quoteable'),
    is_active:checked(formData,'is_active'),
    updated_by:user.id,updated_at:new Date().toISOString(),
  };
  const {data,error}=await supabase.from('packaging_size_profiles_v5').update(payload)
    .eq('organization_id',organization.id).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 size was not found.');
  revalidatePath(ADMIN_PATH);
}

export async function savePackagingCommercialBandV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  if(!id) throw new Error('Pricing v5 commercial band is required.');
  const wastage=numberValue(formData,'wastage_pct','Wastage',{min:0,max:100});
  const margin=numberValue(formData,'margin_per_frame','Margin per frame',{min:0,max:1000000});
  const {data,error}=await supabase.from('packaging_pricing_commercial_bands_v5')
    .update({wastage_pct:wastage,margin_per_frame:margin,updated_by:user.id,updated_at:new Date().toISOString()})
    .eq('organization_id',organization.id).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 commercial band was not found.');
  revalidatePath(ADMIN_PATH);
}

export async function savePackagingMasterRateV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  if(!id) throw new Error('Cost Master item is required.');
  const raw=text(formData,'current_rate');
  const rate=raw===''?null:Number(raw);
  if(rate!=null&&(!Number.isFinite(rate)||rate<0)) throw new Error('Rate must be zero or greater.');
  const {data,error}=await supabase.from('packaging_cost_master_items')
    .update({current_rate:rate,updated_by:user.id,updated_at:new Date().toISOString()})
    .eq('organization_id',organization.id).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Cost Master item was not found.');
  revalidatePath(ADMIN_PATH);
}

export async function setPackagingConstructionQuoteableV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  if(!id) throw new Error('Construction is required.');
  const {data,error}=await supabase.from('packaging_constructions_v5')
    .update({is_quoteable:checked(formData,'is_quoteable'),is_active:checked(formData,'is_active'),updated_by:user.id,updated_at:new Date().toISOString()})
    .eq('organization_id',organization.id).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Construction was not found.');
  revalidatePath(ADMIN_PATH);
}

export async function validatePackagingTemplateV5(templateId:string){
  const {organization}=await adminDb();
  const context=await loadPricingContextV5(organization.id,templateId);
  const errors:string[]=[];
  const quoteableSizes=context.sizeProfiles.filter((item)=>item.is_active&&item.is_quoteable);
  const quoteableConstructions=context.constructions.filter((item)=>item.is_active&&item.is_quoteable);
  if(!quoteableSizes.length) errors.push('At least one Pricing v5 size must be quoteable.');
  if(!quoteableConstructions.length) errors.push('At least one Pricing v5 construction must be quoteable.');
  for(const size of quoteableSizes){
    if(!size.pricing_bucket) errors.push(`${size.name} does not have a pricing bucket.`);
    if(!size.production_profile_key) errors.push(`${size.name} does not have a production profile.`);
    if(!context.bands.some((band)=>band.pricing_bucket===size.pricing_bucket)) errors.push(`${size.name} has no commercial bands for bucket ${size.pricing_bucket}.`);
  }
  for(const construction of quoteableConstructions){
    const layers=context.constructionLayers.filter((layer)=>layer.construction_id===construction.id);
    if(layers.length!==construction.layer_count) errors.push(`${construction.name} expects ${construction.layer_count} layers but has ${layers.length}.`);
    for(const layer of layers){
      const master=context.masters.find((item)=>item.id===layer.cost_master_item_id);
      if(!master) errors.push(`${construction.name} has an unmapped material layer.`);
      else if(master.current_rate==null) errors.push(`${construction.name}: ${master.name} needs a rate.`);
      else if(master.gsm==null&&(master.micron==null||master.density==null)) errors.push(`${construction.name}: ${master.name} needs GSM or micron+density.`);
    }
  }
  for(const code of ['MAT_ADHESIVE','PROC_PRINT_CMYK','PROC_PRINT_CMYKW','PROC_LAMINATION','PROC_SLITTING','PROC_POUCHING']){
    const master=context.masters.find((item)=>item.code===code);
    if(!master||master.current_rate==null) errors.push(`${code} needs a Cost Master rate.`);
  }
  return {ok:errors.length===0,errors};
}

export async function publishPackagingTemplateV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const templateId=text(formData,'template_id');
  if(!templateId) throw new Error('Pricing v5 template is required.');
  const validation=await validatePackagingTemplateV5(templateId);
  if(!validation.ok) throw new Error(validation.errors.join(' '));
  const now=new Date().toISOString();
  const {data,error}=await supabase.from('packaging_pricing_templates')
    .update({status:'published',is_active:true,published_at:now,published_by:user.id,updated_at:now})
    .eq('organization_id',organization.id).eq('id',templateId).eq('calculation_version',5).eq('calculation_engine_key','sup_formula_v5')
    .select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 template was not found.');
  revalidatePath(ADMIN_PATH);
}
