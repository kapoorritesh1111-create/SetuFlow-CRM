import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { loadPricingContextV5 } from './repository';
import { resolveConstructionV5 } from './construction-resolver';

export async function isPackagingPricingV5EnabledForOrg(organizationId:string){
  const db:any=createServiceRoleClient();
  if(!db) return false;
  const {data,error}=await db.from('smc_feature_flags').select('enabled,rollout_percentage,allowed_orgs,blocked_orgs').eq('flag_key','packaging_pricing_v5').maybeSingle();
  if(error||!data?.enabled||Number(data.rollout_percentage??0)<=0) return false;
  if((data.blocked_orgs??[]).includes(organizationId)) return false;
  const allowed=data.allowed_orgs??[];
  return !allowed.length||allowed.includes(organizationId);
}

function chargeSupportedByPricingV5(item:any){
  if(item.current_rate==null||!item.basis||!item.application_stage||item.application_stage==='separate_quote_line') return false;
  if(item.basis!=='percent') return true;
  return item.application_stage==='after_core_price'&&String(item.metadata?.percent_base??'').trim()==='core_product_total';
}

export async function listSalesPackagingPricingV5Options(organizationId:string){
  const empty={families:[],templates:[],sizes:[],constructions:[],klds:[],charges:[]};
  const db:any=createServiceRoleClient();
  if(!db) return empty;
  const {data:templates,error}=await db.from('packaging_pricing_templates')
    .select('id,family_id,name,currency,calculation_version,calculation_engine_key,status,is_active')
    .eq('organization_id',organizationId).eq('calculation_version',5).eq('calculation_engine_key','sup_formula_v5').eq('status','published').eq('is_active',true);
  if(error||!(templates??[]).length) return empty;
  const template=templates[0];
  const context=await loadPricingContextV5(organizationId,template.id,{publishedOnly:true});
  const [{data:families},{data:klds}]=await Promise.all([
    db.from('packaging_service_families').select('id,name,slug,is_quoteable,is_active').eq('organization_id',organizationId).eq('id',template.family_id).eq('is_active',true).eq('is_quoteable',true),
    db.from('packaging_kld_files').select('id,family_id,file_name,file_path,version,spec_key,size_preset_key,product_variation_id,is_active').eq('organization_id',organizationId).eq('family_id',template.family_id).eq('is_active',true).order('created_at',{ascending:false}),
  ]);
  const sizes=context.sizeProfiles.filter((item)=>item.is_active&&item.is_quoteable).map((item)=>({
    id:item.id,size_key:item.size_key,name:item.name,width_mm:item.width_mm,height_mm:item.height_mm,bottom_gusset_each_mm:item.bottom_gusset_each_mm,
    pricing_bucket:item.pricing_bucket,gusset_production_mode:item.gusset_production_mode,bottom_registration_mode:item.bottom_registration_mode,
    quantity_rules:{
      allowed_quantities:Array.isArray(item.metadata?.allowed_quantities)?item.metadata.allowed_quantities:[],
      blocked_quantities:Array.isArray(item.metadata?.blocked_quantities)?item.metadata.blocked_quantities:[],
    },
  }));
  const constructions=context.constructions.filter((item)=>item.is_active&&item.is_quoteable).map((item)=>{
    const resolved=resolveConstructionV5(item.id,context.constructions,context.constructionLayers,context.masters);
    if(!resolved||resolved.validation_errors.length) return null;
    return {id:item.id,name:item.name,construction_family_key:item.construction_family_key,finish_type:item.finish_type,barrier_type:item.barrier_type,sealant_code:item.sealant_code,layer_count:item.layer_count,structure_label:resolved.structure_label};
  }).filter(Boolean);
  const charges=(context.charges??[])
    .filter(chargeSupportedByPricingV5)
    .map((item)=>({code:item.code,name:item.name,category:item.category,application_stage:item.application_stage}));
  return {families:families??[],templates,sizes,constructions,klds:klds??[],charges};
}
