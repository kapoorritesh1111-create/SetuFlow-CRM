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

export async function listSalesPackagingPricingV5Options(organizationId:string){
  const db:any=createServiceRoleClient();
  if(!db) return {families:[],templates:[],sizes:[],constructions:[]};
  const {data:templates,error}=await db.from('packaging_pricing_templates')
    .select('id,family_id,name,currency,calculation_version,calculation_engine_key,status,is_active')
    .eq('organization_id',organizationId).eq('calculation_version',5).eq('calculation_engine_key','sup_formula_v5').eq('status','published').eq('is_active',true);
  if(error||!(templates??[]).length) return {families:[],templates:[],sizes:[],constructions:[]};
  const template=templates[0];
  const context=await loadPricingContextV5(organizationId,template.id,{publishedOnly:true});
  const {data:families}=await db.from('packaging_service_families').select('id,name,slug,is_quoteable,is_active').eq('organization_id',organizationId).eq('id',template.family_id).eq('is_active',true).eq('is_quoteable',true);
  const sizes=context.sizeProfiles.filter((item)=>item.is_active&&item.is_quoteable).map((item)=>({
    id:item.id,name:item.name,width_mm:item.width_mm,height_mm:item.height_mm,bottom_gusset_each_mm:item.bottom_gusset_each_mm,
    pricing_bucket:item.pricing_bucket,gusset_production_mode:item.gusset_production_mode,bottom_registration_mode:item.bottom_registration_mode,
  }));
  const constructions=context.constructions.filter((item)=>item.is_active&&item.is_quoteable).map((item)=>{
    const resolved=resolveConstructionV5(item.id,context.constructions,context.constructionLayers,context.masters);
    if(!resolved||resolved.validation_errors.length) return null;
    return {id:item.id,name:item.name,construction_family_key:item.construction_family_key,finish_type:item.finish_type,barrier_type:item.barrier_type,sealant_code:item.sealant_code,layer_count:item.layer_count,structure_label:resolved.structure_label};
  }).filter(Boolean);
  return {families:families??[],templates, sizes, constructions};
}
