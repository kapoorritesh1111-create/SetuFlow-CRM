'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { loadPricingContextV5 } from '@/lib/packaging-pricing-v5/repository';

const ADMIN_PATH='/admin/packaging-pricing-v5';
const V5_ENGINES=['sup_formula_v5','frame_formula_v5'];
const KLD_BUCKET='compliance-docs';
const MAX_KLD_BYTES=10*1024*1024;
function safeFileName(value:string){const last=value.split(/[\\/]/).pop()||'kld.pdf';return last.replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-');}
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
    .select('id,family_id,status,is_active,calculation_version,calculation_engine_key,supersedes_template_id')
    .eq('organization_id',organizationId).eq('id',templateId)
    .eq('calculation_version',5).in('calculation_engine_key',V5_ENGINES).maybeSingle();
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
  const bucket=Math.trunc(numberValue(formData,'pricing_bucket','Pricing group',{min:1,max:99}));
  const gussetMode=text(formData,'gusset_production_mode');
  const registrationMode=text(formData,'bottom_registration_mode');
  if(!['integrated','separate','conditional'].includes(gussetMode)) throw new Error('Unsupported gusset production mode.');
  if(!['not_applicable','optional','required_registered','required_unregistered'].includes(registrationMode)) throw new Error('Unsupported bottom registration mode.');
  const allowedPeMicrons=[60,75,95,120].filter((micron)=>checked(formData,`pe_${micron}`));
  if(!allowedPeMicrons.length) throw new Error('Select at least one approved PE option for this size.');
  const fillRaw=text(formData,'recommended_fill_grams');
  const recommendedFillGrams=fillRaw
    ? [...new Set(fillRaw.split(',').map((item)=>Number(item.trim())).filter((item)=>Number.isFinite(item)&&item>0).map((item)=>Math.round(item)))].sort((a,b)=>a-b)
    : [];
  const applicationExamples=text(formData,'application_examples');
  const {data:existing,error:existingError}=await supabase.from('packaging_size_profiles_v5')
    .select('metadata,width_mm,height_mm,bottom_gusset_each_mm').eq('organization_id',organization.id).eq('template_id',templateId).eq('id',id).maybeSingle();
  if(existingError||!existing) throw new Error(existingError?.message??'Pricing v5 size was not found in this revision.');
  const metadata:any={
    ...(existing.metadata??{}),
    allowed_pe_microns:allowedPeMicrons,
    recommended_fill_grams:recommendedFillGrams,
    application_examples:applicationExamples||null,
    owner_review_source:'2026-09-25 transcript + approved PE options sheet',
  };
  if(gussetMode==='conditional'&&registrationMode==='optional'){
    const solidRouteBucket=Math.trunc(numberValue(formData,'solid_route_pricing_bucket','Solid bottom pricing group',{min:1,max:99}));
    const artworkRouteBucket=Math.trunc(numberValue(formData,'registered_route_pricing_bucket','Artwork bottom pricing group',{min:1,max:99}));
    metadata.route_pricing_buckets={
      ...(metadata.route_pricing_buckets??{}),
      solid_unregistered:solidRouteBucket,
      registered_artwork:artworkRouteBucket,
    };
  }else if(metadata.route_pricing_buckets){
    delete metadata.route_pricing_buckets;
  }
  const name=text(formData,'name')||undefined;
  const width=numberValue(formData,'width_mm','Width',{min:1,max:5000});
  const height=numberValue(formData,'height_mm','Height',{min:1,max:5000});
  const bottomGusset=numberValue(formData,'bottom_gusset_each_mm','Bottom gusset',{min:0,max:2000});
  const dimensionsChanged=Number(existing.width_mm)!==width||Number(existing.height_mm)!==height||Number(existing.bottom_gusset_each_mm)!==bottomGusset;
  if(dimensionsChanged) metadata.kld_status='needs_regeneration';
  const payload={name:name||undefined,width_mm:width,height_mm:height,bottom_gusset_each_mm:bottomGusset,pricing_bucket:bucket,production_profile_key:text(formData,'production_profile_key')||null,gusset_production_mode:gussetMode,bottom_registration_mode:registrationMode,is_quoteable:checked(formData,'is_quoteable'),is_active:checked(formData,'is_active'),metadata,updated_by:user.id,updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('packaging_size_profiles_v5').update(payload).eq('organization_id',organization.id).eq('template_id',templateId).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 size was not found in this revision.');
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/matrix`);
}

export async function savePackagingCommercialBandV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  const templateId=text(formData,'template_id');
  if(!id) throw new Error('Pricing v5 commercial band is required.');
  await requireDraftTemplate(supabase,organization.id,templateId);
  const runLength=numberValue(formData,'run_length_max_m','Run length',{min:1,max:100000000});
  const wastage=numberValue(formData,'wastage_pct','Wastage',{min:0,max:100});
  const margin=numberValue(formData,'margin_per_frame','Margin per frame',{min:0,max:1000000});
  const {data,error}=await supabase.from('packaging_pricing_commercial_bands_v5').update({run_length_max_m:runLength,wastage_pct:wastage,margin_per_frame:margin,updated_by:user.id,updated_at:new Date().toISOString()}).eq('organization_id',organization.id).eq('template_id',templateId).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 commercial band was not found.');
  revalidatePath(ADMIN_PATH);
}

export async function savePackagingCommercialBandsV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const templateId=text(formData,'template_id');
  await requireDraftTemplate(supabase,organization.id,templateId);
  const ids=formData.getAll('band_id').map((value)=>String(value).trim()).filter(Boolean);
  const runs=formData.getAll('run_length_max_m').map((value)=>Number(value));
  const wastes=formData.getAll('wastage_pct').map((value)=>Number(value));
  const margins=formData.getAll('margin_per_frame').map((value)=>Number(value));
  if(!ids.length||ids.length!==runs.length||ids.length!==wastes.length||ids.length!==margins.length) throw new Error('Waste and margin changes are incomplete. Refresh the page and try again.');
  const rows=ids.map((id,index)=>{
    const runLength=runs[index],wastage=wastes[index],margin=margins[index];
    if(!Number.isFinite(runLength)||runLength<1||runLength>100000000) throw new Error('Run length is outside the allowed range.');
    if(!Number.isFinite(wastage)||wastage<0||wastage>100) throw new Error('Wastage is outside the allowed range.');
    if(!Number.isFinite(margin)||margin<0||margin>1000000) throw new Error('Margin per frame is outside the allowed range.');
    return {id,runLength,wastage,margin};
  });
  const saveBandId=text(formData,'save_band_id');
  const rowsToSave=saveBandId?rows.filter((row)=>row.id===saveBandId):rows;
  if(saveBandId&&!rowsToSave.length) throw new Error('The selected Waste & Margin row could not be matched. Refresh the page and try again.');
  const now=new Date().toISOString();
  for(const row of rowsToSave){
    const {data,error}=await supabase.from('packaging_pricing_commercial_bands_v5')
      .update({run_length_max_m:row.runLength,wastage_pct:row.wastage,margin_per_frame:row.margin,updated_by:user.id,updated_at:now})
      .eq('organization_id',organization.id).eq('template_id',templateId).eq('id',row.id).select('id').maybeSingle();
    if(error||!data?.id) throw new Error(error?.message??'A Waste & Margin row could not be saved.');
  }
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/matrix`);
}

export async function saveAndPublishPackagingCommercialBandsV5(formData:FormData){
  await savePackagingCommercialBandsV5(formData);
  await publishPackagingTemplateV5(formData);
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

export async function savePackagingChargeRateV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const chargeId=text(formData,'id');
  const templateId=text(formData,'template_id');
  const template=await requireDraftTemplate(supabase,organization.id,templateId);
  if(!chargeId) throw new Error('Charge Master item is required.');
  const raw=text(formData,'current_rate');
  const rate=raw===''?null:Number(raw);
  if(rate!=null&&(!Number.isFinite(rate)||rate<0)) throw new Error('Charge rate must be zero or greater.');
  const {data:charge,error:chargeError}=await supabase.from('packaging_charge_master_items')
    .select('id').eq('organization_id',organization.id).eq('id',chargeId).eq('is_active',true).maybeSingle();
  if(chargeError||!charge?.id) throw new Error(chargeError?.message??'Charge Master item was not found.');
  const {data:link,error:linkError}=await supabase.from('packaging_charge_master_family_links')
    .select('charge_master_item_id').eq('organization_id',organization.id).eq('family_id',template.family_id).eq('charge_master_item_id',chargeId).maybeSingle();
  if(linkError||!link?.charge_master_item_id) throw new Error(linkError?.message??'Charge is not linked to this Pricing v5 service family.');
  const now=new Date().toISOString();
  const {error}=await supabase.from('packaging_pricing_charge_rates_v5').upsert({organization_id:organization.id,template_id:templateId,charge_master_item_id:chargeId,current_rate:rate,updated_by:user.id,updated_at:now,metadata:{source:'pricing_v5_admin_override'}},{onConflict:'organization_id,template_id,charge_master_item_id'});
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
  const {data,error}=await supabase.from('packaging_constructions_v5').update({is_quoteable:checked(formData,'is_quoteable'),is_active:checked(formData,'is_active'),updated_by:user.id,updated_at:new Date().toISOString()}).eq('organization_id',organization.id).eq('template_id',templateId).eq('id',id).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Construction was not found in this revision.');
  revalidatePath(ADMIN_PATH);
}

export async function savePackagingConstructionLayersV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const id=text(formData,'id');
  const templateId=text(formData,'template_id');
  if(!id) throw new Error('Construction is required.');
  await requireDraftTemplate(supabase,organization.id,templateId);

  const rawLayerIds=[1,2,3,4,5,6].map((position)=>text(formData,`layer_${position}`));
  const layerIds=rawLayerIds.filter(Boolean);
  if(layerIds.length<2||layerIds.length>6) throw new Error('A construction requires between 2 and 6 material layers.');
  const firstGap=rawLayerIds.findIndex((value,index)=>!value&&rawLayerIds.slice(index+1).some(Boolean));
  if(firstGap>=0) throw new Error('Construction layers must be contiguous. Remove empty gaps between layers.');

  const uniqueLayerIds=[...new Set(layerIds)];
  const {data:materials,error:materialError}=await supabase.from('packaging_cost_master_items')
    .select('id,code,item_type,rate_basis,is_active')
    .eq('organization_id',organization.id).in('id',uniqueLayerIds);
  if(materialError) throw new Error(materialError.message);
  if((materials??[]).length!==uniqueLayerIds.length||(materials??[]).some((item:any)=>item.item_type!=='material'||item.rate_basis!=='per_kg'||!item.is_active)){
    throw new Error('Every construction layer must map to an active per-kg film material.');
  }
  const materialById=new Map<string,any>((materials??[]).map((item:any)=>[String(item.id),item]));
  const sealant=materialById.get(layerIds[layerIds.length-1]);
  if(!sealant?.code?.startsWith('MAT_PE_')) throw new Error('The final construction layer must be a PE sealant material.');

  const {data:construction,error:constructionError}=await supabase.from('packaging_constructions_v5')
    .select('id').eq('organization_id',organization.id).eq('template_id',templateId).eq('id',id).maybeSingle();
  if(constructionError||!construction?.id) throw new Error(constructionError?.message??'Construction was not found in this revision.');

  const now=new Date().toISOString();
  const rows=layerIds.map((masterId,idx)=>({
    organization_id:organization.id,
    template_id:templateId,
    construction_id:id,
    layer_position:idx+1,
    role_key:idx===0?'print_layer':idx===layerIds.length-1?'sealant_layer':`middle_layer_${idx}`,
    cost_master_item_id:masterId,
    is_print_layer:idx===0,
    is_sealant_layer:idx===layerIds.length-1,
    created_by:user.id,
  }));
  const {error:upsertError}=await supabase.from('packaging_construction_layers_v5')
    .upsert(rows,{onConflict:'organization_id,template_id,construction_id,layer_position'});
  if(upsertError) throw new Error(upsertError.message);

  const {error:deleteError}=await supabase.from('packaging_construction_layers_v5')
    .delete().eq('organization_id',organization.id).eq('template_id',templateId).eq('construction_id',id).gt('layer_position',layerIds.length);
  if(deleteError) throw new Error(deleteError.message);

  const {error:updateError}=await supabase.from('packaging_constructions_v5')
    .update({layer_count:layerIds.length,sealant_code:sealant.code,updated_by:user.id,updated_at:now})
    .eq('organization_id',organization.id).eq('template_id',templateId).eq('id',id);
  if(updateError) throw new Error(updateError.message);

  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/matrix`);
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
  const {data:materials,error:materialError}=await supabase.from('packaging_cost_master_items').select('id,code,item_type,rate_basis,is_active').eq('organization_id',organization.id).in('id',uniqueLayerIds);
  if(materialError) throw new Error(materialError.message);
  if((materials??[]).length!==uniqueLayerIds.length||(materials??[]).some((item:any)=>item.item_type!=='material'||item.rate_basis!=='per_kg'||!item.is_active)) throw new Error('Every construction layer must map to an active per-kg film material.');
  const materialById=new Map<string,any>((materials??[]).map((item:any)=>[String(item.id),item]));
  const sealant=materialById.get(layerIds[layerIds.length-1]);
  if(!sealant?.code?.startsWith('MAT_PE_')) throw new Error('The final construction layer must be a PE sealant material.');
  const keyBase=slug(text(formData,'construction_key')||name);
  if(!keyBase) throw new Error('Construction key is required.');
  const now=new Date().toISOString();
  const payload={organization_id:organization.id,template_id:templateId,family_id:template.family_id,construction_key:keyBase,construction_family_key:slug(text(formData,'construction_family_key')||'custom'),name,finish_type:text(formData,'finish_type')||null,barrier_type:text(formData,'barrier_type')||null,sealant_code:sealant.code,layer_count:layerIds.length,is_active:true,is_quoteable:false,sort_order:900,metadata:{source:'pricing_v5_admin_custom',private_custom:true},created_by:user.id,updated_by:user.id,created_at:now,updated_at:now};
  const {data:construction,error:constructionError}=await supabase.from('packaging_constructions_v5').insert(payload).select('id').single();
  if(constructionError||!construction?.id) throw new Error(constructionError?.message??'Custom construction could not be created.');
  const rows=layerIds.map((masterId,idx)=>({organization_id:organization.id,template_id:templateId,construction_id:construction.id,layer_position:idx+1,role_key:idx===0?'print_layer':idx===layerIds.length-1?'sealant_layer':`middle_layer_${idx}`,cost_master_item_id:masterId,is_print_layer:idx===0,is_sealant_layer:idx===layerIds.length-1,created_by:user.id}));
  const {error:layerError}=await supabase.from('packaging_construction_layers_v5').insert(rows);
  if(layerError){
    await supabase.from('packaging_constructions_v5').delete().eq('organization_id',organization.id).eq('template_id',templateId).eq('id',construction.id);
    throw new Error(layerError.message);
  }
  revalidatePath(ADMIN_PATH);
}


export async function createPackagingSizeProfileV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const templateId=text(formData,'template_id');
  const template=await requireDraftTemplate(supabase,organization.id,templateId);
  const width=numberValue(formData,'width_mm','Width',{min:1,max:5000});
  const height=numberValue(formData,'height_mm','Height',{min:1,max:5000});
  const bottomGusset=numberValue(formData,'bottom_gusset_each_mm','Bottom gusset',{min:0,max:2000});
  const bucket=Math.trunc(numberValue(formData,'pricing_bucket','Pricing group',{min:1,max:99}));
  const name=text(formData,'name')||(width+' x '+height+' mm');
  const gussetMode=text(formData,'gusset_production_mode')||'integrated';
  const registrationMode=text(formData,'bottom_registration_mode')||'not_applicable';
  if(!['integrated','separate','conditional'].includes(gussetMode)) throw new Error('Unsupported gusset production mode.');
  if(!['not_applicable','optional','required_registered','required_unregistered'].includes(registrationMode)) throw new Error('Unsupported bottom registration mode.');
  const allowedPeMicrons=[60,75,95,120].filter((micron)=>checked(formData,'pe_'+micron));
  if(!allowedPeMicrons.length) throw new Error('Select at least one approved PE option for this size.');
  const keyBase=slug(text(formData,'size_key')||(width+'x'+height+'_bg'+bottomGusset+'_'+bottomGusset));
  if(!keyBase) throw new Error('Size key could not be generated.');
  const now=new Date().toISOString();
  const {error}=await supabase.from('packaging_size_profiles_v5').insert({
    organization_id:organization.id,template_id:templateId,family_id:template.family_id,size_key:keyBase,name,
    width_mm:width,height_mm:height,bottom_gusset_each_mm:bottomGusset,pricing_bucket:bucket,
    production_profile_key:text(formData,'production_profile_key')||null,
    gusset_production_mode:gussetMode,bottom_registration_mode:registrationMode,
    is_active:true,is_quoteable:false,sort_order:900,
    metadata:{source:'pricing_v5_admin_custom',custom_size:true,kld_status:'needs_regeneration',allowed_pe_microns:allowedPeMicrons},
    created_by:user.id,updated_by:user.id,created_at:now,updated_at:now,
  });
  if(error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
  revalidatePath(ADMIN_PATH+'/matrix');
}

export async function createPackagingCommercialBandV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const templateId=text(formData,'template_id');
  await requireDraftTemplate(supabase,organization.id,templateId);
  const bucket=Math.trunc(numberValue(formData,'pricing_bucket','Pricing group',{min:1,max:99}));
  const runLength=numberValue(formData,'run_length_max_m','Run length',{min:1,max:100000000});
  const wastage=numberValue(formData,'wastage_pct','Wastage',{min:0,max:100});
  const margin=numberValue(formData,'margin_per_frame','Margin per frame',{min:0,max:1000000});
  const {data:maxSort,error:sortError}=await supabase.from('packaging_pricing_commercial_bands_v5').select('sort_order').eq('organization_id',organization.id).eq('template_id',templateId).eq('pricing_bucket',bucket).order('sort_order',{ascending:false}).limit(1).maybeSingle();
  if(sortError) throw new Error(sortError.message);
  const now=new Date().toISOString();
  const {error}=await supabase.from('packaging_pricing_commercial_bands_v5').upsert({
    organization_id:organization.id,template_id:templateId,pricing_bucket:bucket,run_length_max_m:runLength,
    wastage_pct:wastage,margin_per_frame:margin,sort_order:Number(maxSort?.sort_order??0)+10,
    metadata:{source:'pricing_v5_admin_custom'},created_by:user.id,updated_by:user.id,created_at:now,updated_at:now,
  },{onConflict:'organization_id,template_id,pricing_bucket,run_length_max_m'});
  if(error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
  revalidatePath(ADMIN_PATH+'/matrix');
}

export async function deletePackagingCommercialBandV5(formData:FormData){
  const {organization,supabase}=await adminDb();
  const templateId=text(formData,'template_id');
  const id=text(formData,'delete_id')||text(formData,'id');
  await requireDraftTemplate(supabase,organization.id,templateId);
  if(!id) throw new Error('Commercial band is required.');
  const {data:band,error:bandError}=await supabase.from('packaging_pricing_commercial_bands_v5').select('pricing_bucket').eq('organization_id',organization.id).eq('template_id',templateId).eq('id',id).maybeSingle();
  if(bandError||!band) throw new Error(bandError?.message??'Commercial band was not found.');
  const {count,error:countError}=await supabase.from('packaging_pricing_commercial_bands_v5').select('id',{count:'exact',head:true}).eq('organization_id',organization.id).eq('template_id',templateId).eq('pricing_bucket',band.pricing_bucket);
  if(countError) throw new Error(countError.message);
  if((count??0)<=1) throw new Error('A pricing group must keep at least one commercial band.');
  const {error}=await supabase.from('packaging_pricing_commercial_bands_v5').delete().eq('organization_id',organization.id).eq('template_id',templateId).eq('id',id);
  if(error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
  revalidatePath(ADMIN_PATH+'/matrix');
}

export async function clonePackagingTemplateRevisionV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const sourceId=text(formData,'template_id');
  if(!sourceId) throw new Error('Published Pricing v5 template is required.');
  const {data:requestedSource,error:sourceError}=await supabase.from('packaging_pricing_templates')
    .select('id,family_id,slug,name,description,currency,pricing_model,calculation_engine_key,calculation_version,status,production_rules_json,quote_config_json')
    .eq('organization_id',organization.id).eq('id',sourceId).eq('calculation_version',5).in('calculation_engine_key',V5_ENGINES).maybeSingle();
  if(sourceError||!requestedSource?.id) throw new Error(sourceError?.message??'Source Pricing v5 template was not found.');

  let source:any=requestedSource;
  const requestedSupplyForm=String(requestedSource.production_rules_json?.supply_form??'');
  if(requestedSource.status!=='published'){
    const {data:published,error:publishedError}=await supabase.from('packaging_pricing_templates')
      .select('id,family_id,slug,name,description,currency,pricing_model,calculation_engine_key,calculation_version,status,production_rules_json,quote_config_json')
      .eq('organization_id',organization.id).eq('family_id',requestedSource.family_id)
      .eq('calculation_version',5).eq('calculation_engine_key',requestedSource.calculation_engine_key)
      .eq('status','published').eq('is_active',true).order('created_at',{ascending:false});
    if(publishedError) throw new Error(publishedError.message);
    const currentPublished=(published??[]).find((item:any)=>String(item.production_rules_json?.supply_form??'')===requestedSupplyForm);
    if(currentPublished?.id) source=currentPublished;
    else if(requestedSource.status==='draft'){
      revalidatePath(ADMIN_PATH);
      return;
    }else{
      throw new Error('The current published Pricing v5 revision could not be resolved. Refresh the pricing page and try again.');
    }
  }

  const supplyForm=String(source.production_rules_json?.supply_form??'');
  const {data:drafts,error:draftError}=await supabase.from('packaging_pricing_templates')
    .select('id,name,production_rules_json').eq('organization_id',organization.id).eq('family_id',source.family_id)
    .eq('calculation_version',5).eq('calculation_engine_key',source.calculation_engine_key).eq('status','draft');
  if(draftError) throw new Error(draftError.message);
  const existingDraft=(drafts??[]).find((item:any)=>String(item.production_rules_json?.supply_form??'')===supplyForm);
  if(existingDraft?.id){
    revalidatePath(ADMIN_PATH);
    return;
  }

  const stamp=Date.now().toString(36);
  const baseSlug=String(source.slug??'pricing-v5').split('-r-')[0];
  const baseName=String(source.name??'Pricing v5').replace(/(?: · Revision)+$/,'');
  const {data:created,error:createError}=await supabase.from('packaging_pricing_templates').insert({
    organization_id:organization.id,family_id:source.family_id,slug:`${baseSlug}-r-${stamp}`,name:`${baseName} · Revision`,description:source.description,currency:source.currency,
    is_active:false,calculation_version:5,pricing_model:source.pricing_model,calculation_engine_key:source.calculation_engine_key,status:'draft',production_rules_json:source.production_rules_json??{},quote_config_json:source.quote_config_json??{},supersedes_template_id:source.id,
  }).select('id').single();
  if(createError||!created?.id) throw new Error(createError?.message??'Pricing v5 revision could not be created.');
  const newTemplateId=String(created.id);

  try{
    const [sizes,constructions,layers,costRates,chargeRates,bands]=await Promise.all([
      supabase.from('packaging_size_profiles_v5').select('family_id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,pricing_bucket,production_profile_key,gusset_production_mode,bottom_registration_mode,is_active,is_quoteable,sort_order,metadata').eq('organization_id',organization.id).eq('template_id',source.id),
      supabase.from('packaging_constructions_v5').select('id,family_id,construction_key,construction_family_key,name,finish_type,barrier_type,sealant_code,layer_count,is_active,is_quoteable,sort_order,metadata').eq('organization_id',organization.id).eq('template_id',source.id),
      supabase.from('packaging_construction_layers_v5').select('construction_id,layer_position,role_key,cost_master_item_id,is_print_layer,is_sealant_layer').eq('organization_id',organization.id).eq('template_id',source.id),
      supabase.from('packaging_pricing_cost_rates_v5').select('cost_master_item_id,current_rate,micron_override,gsm_override,density_override,metadata').eq('organization_id',organization.id).eq('template_id',source.id),
      supabase.from('packaging_pricing_charge_rates_v5').select('charge_master_item_id,current_rate,metadata').eq('organization_id',organization.id).eq('template_id',source.id),
      supabase.from('packaging_pricing_commercial_bands_v5').select('pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order,metadata').eq('organization_id',organization.id).eq('template_id',source.id),
    ]);
    for(const result of [sizes,constructions,layers,costRates,chargeRates,bands]) if(result.error) throw new Error(result.error.message);
    const now=new Date().toISOString();
    if(sizes.data?.length){
      const {error}=await supabase.from('packaging_size_profiles_v5').insert(sizes.data.map((row:any)=>({organization_id:organization.id,template_id:newTemplateId,...row,created_by:user.id,updated_by:user.id,created_at:now,updated_at:now})));
      if(error) throw new Error(error.message);
    }
    const idMap=new Map<string,string>();
    const constructionRows=(constructions.data??[]).map((row:any)=>{
      const newId=crypto.randomUUID(); idMap.set(String(row.id),newId);
      const {id:oldId,...rest}=row;
      return {id:newId,organization_id:organization.id,template_id:newTemplateId,...rest,created_by:user.id,updated_by:user.id,created_at:now,updated_at:now};
    });
    if(constructionRows.length){
      const {error}=await supabase.from('packaging_constructions_v5').insert(constructionRows);
      if(error) throw new Error(error.message);
    }
    const layerRows=(layers.data??[]).map((row:any)=>({organization_id:organization.id,template_id:newTemplateId,construction_id:idMap.get(String(row.construction_id)),layer_position:row.layer_position,role_key:row.role_key,cost_master_item_id:row.cost_master_item_id,is_print_layer:row.is_print_layer,is_sealant_layer:row.is_sealant_layer,created_by:user.id}));
    if(layerRows.some((row:any)=>!row.construction_id)) throw new Error('Revision clone could not map a construction layer.');
    if(layerRows.length){const {error}=await supabase.from('packaging_construction_layers_v5').insert(layerRows);if(error) throw new Error(error.message);}
    if(costRates.data?.length){const {error}=await supabase.from('packaging_pricing_cost_rates_v5').insert(costRates.data.map((row:any)=>({organization_id:organization.id,template_id:newTemplateId,...row,created_by:user.id,updated_by:user.id,created_at:now,updated_at:now})));if(error) throw new Error(error.message);}
    if(chargeRates.data?.length){const {error}=await supabase.from('packaging_pricing_charge_rates_v5').insert(chargeRates.data.map((row:any)=>({organization_id:organization.id,template_id:newTemplateId,...row,created_by:user.id,updated_by:user.id,created_at:now,updated_at:now})));if(error) throw new Error(error.message);}
    if(bands.data?.length){const {error}=await supabase.from('packaging_pricing_commercial_bands_v5').upsert(bands.data.map((row:any)=>({organization_id:organization.id,template_id:newTemplateId,...row,created_by:user.id,updated_by:user.id,created_at:now,updated_at:now})),{onConflict:'organization_id,template_id,pricing_bucket,run_length_max_m'});if(error) throw new Error(error.message);}
  }catch(error){
    await supabase.from('packaging_pricing_templates').delete().eq('organization_id',organization.id).eq('id',newTemplateId);
    throw error;
  }
  revalidatePath(ADMIN_PATH);
}

export async function validatePackagingTemplateV5(templateId:string){
  const {organization,supabase}=await adminDb();
  const {data:template,error:templateError}=await supabase.from('packaging_pricing_templates')
    .select('id,calculation_engine_key,production_rules_json').eq('organization_id',organization.id).eq('id',templateId)
    .eq('calculation_version',5).in('calculation_engine_key',V5_ENGINES).maybeSingle();
  if(templateError||!template?.id) return {ok:false,errors:[templateError?.message??'Pricing v5 template was not found.']};
  const context=await loadPricingContextV5(organization.id,templateId);
  const errors:string[]=[];
  const activeSizes=context.sizeProfiles.filter((item)=>item.is_active);
  const quoteableSizes=activeSizes.filter((item)=>item.is_quoteable);
  const activeConstructions=context.constructions.filter((item)=>item.is_active);
  const quoteableConstructions=activeConstructions.filter((item)=>item.is_quoteable);
  const isFrame=template.calculation_engine_key==='frame_formula_v5';
  if(!isFrame){
    if(activeSizes.length!==20) errors.push('Pricing v5 must retain exactly the 20 approved workbook sizes; found '+activeSizes.length+' active sizes.');
    if(activeConstructions.length<44) errors.push('Pricing v5 must retain at least the 44 approved workbook constructions; found '+activeConstructions.length+'.');
    if(!quoteableSizes.length) errors.push('At least one Pricing v5 size must be quoteable.');
  }else{
    if(activeConstructions.length<48) errors.push('Frame-family Pricing v5 must retain at least 48 approved constructions; found '+activeConstructions.length+'.');
    const supplyForm=String(template.production_rules_json?.supply_form??'');
    if(!['center_seal_roll','center_seal_pouch','three_side_seal_roll','three_side_seal_pouch'].includes(supplyForm)) errors.push('Frame-family supply form is missing or invalid.');
    const defaultBucket=Number(template.production_rules_json?.default_commercial_bucket??0);
    if(!Number.isInteger(defaultBucket)||defaultBucket<1||defaultBucket>99) errors.push('Frame-family default commercial pricing group must be between PG01 and PG99.');
  }
  if(!quoteableConstructions.length) errors.push('At least one Pricing v5 construction must be quoteable.');
  const buckets=[...new Set(context.bands.map((band)=>Number(band.pricing_bucket)))].sort((a,b)=>a-b);
  if(!buckets.length) errors.push('At least one pricing group is required.');
  for(const bucket of buckets){
    const rows=context.bands.filter((band)=>Number(band.pricing_bucket)===bucket).sort((a,b)=>Number(a.run_length_max_m)-Number(b.run_length_max_m));
    let previous=0;
    for(const row of rows){
      const max=Number(row.run_length_max_m), waste=Number(row.wastage_pct), margin=Number(row.margin_per_frame);
      if(!Number.isFinite(max)||max<=previous) errors.push('Pricing group PG'+String(bucket).padStart(2,'0')+' must have strictly increasing run-length limits.');
      if(!Number.isFinite(waste)||waste<0||waste>100) errors.push('Pricing group PG'+String(bucket).padStart(2,'0')+' has an invalid wastage value.');
      if(!Number.isFinite(margin)||margin<0) errors.push('Pricing group PG'+String(bucket).padStart(2,'0')+' has an invalid margin value.');
      previous=max;
    }
  }
  const configuredBuckets=new Set(buckets);
  if(!isFrame){
    for(const size of quoteableSizes) if(!configuredBuckets.has(Number(size.pricing_bucket))) errors.push(size.name+' is assigned to PG'+String(size.pricing_bucket).padStart(2,'0')+', but that pricing group has no bands.');
    for(const size of quoteableSizes){
      if(!size.pricing_bucket) errors.push(`${size.name} does not have a pricing bucket.`);
      if(!size.production_profile_key) errors.push(`${size.name} does not have a production profile.`);
    }
  }else{
    const defaultBucket=Number(template.production_rules_json?.default_commercial_bucket??0);
    if(defaultBucket&&!configuredBuckets.has(defaultBucket)) errors.push('The selected default pricing group has no commercial bands.');
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
  const template=await requireDraftTemplate(supabase,organization.id,templateId);
  const validation=await validatePackagingTemplateV5(templateId);
  if(!validation.ok) throw new Error(validation.errors.join(' '));
  const now=new Date().toISOString();
  const {data,error}=await supabase.from('packaging_pricing_templates').update({status:'published',is_active:true,published_at:now,published_by:user.id,updated_at:now}).eq('organization_id',organization.id).eq('id',templateId).eq('status','draft').eq('calculation_version',5).eq('calculation_engine_key',template.calculation_engine_key).select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Pricing v5 template was not found or is no longer a draft.');
  if(template.supersedes_template_id){
    const {error:archiveError}=await supabase.from('packaging_pricing_templates').update({status:'archived',is_active:false,updated_at:now}).eq('organization_id',organization.id).eq('id',template.supersedes_template_id).eq('calculation_version',5).eq('calculation_engine_key',template.calculation_engine_key);
    if(archiveError) throw new Error(`New revision published, but prior revision could not be archived: ${archiveError.message}`);
  }
  revalidatePath(ADMIN_PATH);
}


export async function savePackagingFrameTemplateSettingsV5(formData:FormData){
  const {organization,supabase}=await adminDb();
  const templateId=text(formData,'template_id');
  const template=await requireDraftTemplate(supabase,organization.id,templateId);
  if(template.calculation_engine_key!=='frame_formula_v5') throw new Error('Frame-family Pricing v5 template is required.');
  const bucket=Math.trunc(numberValue(formData,'default_commercial_bucket','Default pricing group',{min:1,max:99}));
  const {data:current,error:currentError}=await supabase.from('packaging_pricing_templates')
    .select('production_rules_json').eq('organization_id',organization.id).eq('id',templateId).maybeSingle();
  if(currentError||!current) throw new Error(currentError?.message??'Pricing v5 template was not found.');
  const rules={...(current.production_rules_json??{}),default_commercial_bucket:bucket,commercial_bucket_mapping:'owner_configured'};
  const {data,error}=await supabase.from('packaging_pricing_templates')
    .update({production_rules_json:rules,updated_at:new Date().toISOString()})
    .eq('organization_id',organization.id).eq('id',templateId).eq('status','draft').select('id').maybeSingle();
  if(error||!data?.id) throw new Error(error?.message??'Frame-family commercial settings could not be saved.');
  revalidatePath(ADMIN_PATH);
}


export type PackagingKldV5Result={ok:boolean;error?:string;fileName?:string;version?:number};

export async function uploadPackagingKldV5(formData:FormData):Promise<PackagingKldV5Result>{
  try{
    const {organization,user,supabase}=await adminDb();
    const templateId=text(formData,'template_id');
    const sizeProfileId=text(formData,'size_profile_id');
    const file=formData.get('file');
    if(!templateId||!sizeProfileId) return {ok:false,error:'Pricing V5 template and size are required.'};
    if(!(file instanceof File)) return {ok:false,error:'Choose a PDF KLD file.'};
    if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')) return {ok:false,error:'KLD files must be PDF.'};
    if(file.size<=0||file.size>MAX_KLD_BYTES) return {ok:false,error:'KLD PDF must be 10 MB or smaller.'};

    const [{data:template,error:templateError},{data:size,error:sizeError}]=await Promise.all([
      supabase.from('packaging_pricing_templates').select('id,family_id,status,calculation_version').eq('organization_id',organization.id).eq('id',templateId).eq('calculation_version',5).maybeSingle(),
      supabase.from('packaging_size_profiles_v5').select('id,template_id,family_id,size_key,name,metadata').eq('organization_id',organization.id).eq('template_id',templateId).eq('id',sizeProfileId).maybeSingle(),
    ]);
    if(templateError||!template?.id) return {ok:false,error:templateError?.message??'Pricing V5 template was not found.'};
    if(sizeError||!size?.id||size.family_id!==template.family_id) return {ok:false,error:sizeError?.message??'Pricing V5 size was not found in this revision.'};

    const {data:previous,error:previousError}=await supabase.from('packaging_kld_files')
      .select('id,version').eq('organization_id',organization.id).eq('family_id',template.family_id).eq('spec_key',size.size_key)
      .order('version',{ascending:false}).limit(1);
    if(previousError) return {ok:false,error:previousError.message};
    const version=Number(previous?.[0]?.version??0)+1;
    const fileName=safeFileName(file.name);
    const path=`${organization.id}/packaging-kld-v5/${template.family_id}/${size.size_key}/v${version}-${Date.now()}-${fileName}`;
    const {error:uploadError}=await supabase.storage.from(KLD_BUCKET).upload(path,file,{cacheControl:'3600',contentType:'application/pdf',upsert:false});
    if(uploadError) return {ok:false,error:uploadError.message};

    const {data:inserted,error:insertError}=await supabase.from('packaging_kld_files').insert({
      organization_id:organization.id,family_id:template.family_id,template_id:template.id,size_preset_key:size.size_key,
      file_path:path,file_name:file.name,mime_type:'application/pdf',file_size:file.size,version,is_active:true,uploaded_by:user.id,
      product_variation_id:null,spec_key:size.size_key,
    }).select('id').single();
    if(insertError||!inserted?.id){
      await supabase.storage.from(KLD_BUCKET).remove([path]);
      return {ok:false,error:insertError?.message??'KLD metadata could not be saved.'};
    }

    const {error:archiveError}=await supabase.from('packaging_kld_files').update({is_active:false,updated_at:new Date().toISOString()})
      .eq('organization_id',organization.id).eq('family_id',template.family_id).eq('spec_key',size.size_key).neq('id',inserted.id).eq('is_active',true);
    if(archiveError){
      await supabase.from('packaging_kld_files').update({is_active:false,updated_at:new Date().toISOString()}).eq('organization_id',organization.id).eq('id',inserted.id);
      await supabase.storage.from(KLD_BUCKET).remove([path]);
      return {ok:false,error:archiveError.message};
    }

    if(template.status==='draft'){
      const metadata={...(size.metadata??{}),kld_status:'approved',kld_version:version,kld_file_id:inserted.id};
      const {error:sizeUpdateError}=await supabase.from('packaging_size_profiles_v5').update({metadata,updated_by:user.id,updated_at:new Date().toISOString()})
        .eq('organization_id',organization.id).eq('template_id',templateId).eq('id',sizeProfileId);
      if(sizeUpdateError) return {ok:false,error:sizeUpdateError.message};
    }
    revalidatePath(ADMIN_PATH);
    return {ok:true,fileName:file.name,version};
  }catch(error){
    return {ok:false,error:error instanceof Error?error.message:'KLD upload failed.'};
  }
}

export async function activatePackagingKldV5(formData:FormData){
  const {organization,user,supabase}=await adminDb();
  const templateId=text(formData,'template_id');
  const sizeProfileId=text(formData,'size_profile_id');
  const kldId=text(formData,'kld_id');
  if(!templateId||!sizeProfileId||!kldId) throw new Error('Template, size and KLD version are required.');
  const [{data:template,error:templateError},{data:size,error:sizeError},{data:kld,error:kldError}]=await Promise.all([
    supabase.from('packaging_pricing_templates').select('id,family_id,status').eq('organization_id',organization.id).eq('id',templateId).eq('calculation_version',5).maybeSingle(),
    supabase.from('packaging_size_profiles_v5').select('id,family_id,size_key,metadata').eq('organization_id',organization.id).eq('template_id',templateId).eq('id',sizeProfileId).maybeSingle(),
    supabase.from('packaging_kld_files').select('id,family_id,spec_key,version').eq('organization_id',organization.id).eq('id',kldId).maybeSingle(),
  ]);
  if(templateError||!template?.id) throw new Error(templateError?.message??'Pricing V5 template was not found.');
  if(sizeError||!size?.id||size.family_id!==template.family_id) throw new Error(sizeError?.message??'Pricing V5 size was not found.');
  if(kldError||!kld?.id||kld.family_id!==template.family_id||kld.spec_key!==size.size_key) throw new Error(kldError?.message??'KLD version does not match this size.');

  const now=new Date().toISOString();
  const {data:previousActive,error:previousActiveError}=await supabase.from('packaging_kld_files').select('id')
    .eq('organization_id',organization.id).eq('family_id',template.family_id).eq('spec_key',size.size_key).eq('is_active',true);
  if(previousActiveError) throw new Error(previousActiveError.message);
  const {error:archiveError}=await supabase.from('packaging_kld_files').update({is_active:false,updated_at:now})
    .eq('organization_id',organization.id).eq('family_id',template.family_id).eq('spec_key',size.size_key).eq('is_active',true);
  if(archiveError) throw new Error(archiveError.message);
  const {error:activateError}=await supabase.from('packaging_kld_files').update({is_active:true,updated_at:now})
    .eq('organization_id',organization.id).eq('id',kldId);
  if(activateError){
    const restoreIds=(previousActive??[]).map((item:any)=>String(item.id)).filter(Boolean);
    if(restoreIds.length) await supabase.from('packaging_kld_files').update({is_active:true,updated_at:new Date().toISOString()}).eq('organization_id',organization.id).in('id',restoreIds);
    throw new Error(activateError.message);
  }

  if(template.status==='draft'){
    const metadata={...(size.metadata??{}),kld_status:'approved',kld_version:Number(kld.version??1),kld_file_id:kldId};
    const {error:sizeUpdateError}=await supabase.from('packaging_size_profiles_v5').update({metadata,updated_by:user.id,updated_at:now})
      .eq('organization_id',organization.id).eq('template_id',templateId).eq('id',sizeProfileId);
    if(sizeUpdateError) throw new Error(sizeUpdateError.message);
  }
  revalidatePath(ADMIN_PATH);
}
