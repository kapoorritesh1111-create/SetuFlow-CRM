import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { loadPricingContextV5 } from './repository';
import { resolveConstructionV5 } from './construction-resolver';

const SUPPLY_LABELS: Record<string,string> = {
  center_seal_roll: 'Center Seal — Roll Form',
  center_seal_pouch: 'Center Seal — Pouch Form',
  three_side_seal_roll: '3 Side Seal — Roll Form',
  three_side_seal_pouch: '3 Side Seal — Pouch Form',
};

export async function listSalesPackagingFramePricingV5Options(organizationId:string){
  const empty={families:[],templates:[]};
  const db:any=createServiceRoleClient();
  if(!db) return empty;

  const {data:templates,error}=await db.from('packaging_pricing_templates')
    .select('id,family_id,slug,name,currency,calculation_version,calculation_engine_key,status,is_active,production_rules_json,quote_config_json')
    .eq('organization_id',organizationId)
    .eq('calculation_version',5)
    .eq('calculation_engine_key','frame_formula_v5')
    .eq('status','published')
    .eq('is_active',true)
    .order('name');
  if(error||!(templates??[]).length) return empty;

  const familyIds=[...new Set((templates??[]).map((item:any)=>String(item.family_id)))];
  const {data:families}=await db.from('packaging_service_families')
    .select('id,name,slug,is_quoteable,is_active')
    .eq('organization_id',organizationId)
    .in('id',familyIds)
    .eq('is_active',true)
    .eq('is_quoteable',true);

  const familyById=new Map((families??[]).map((item:any)=>[String(item.id),item]));
  const resultTemplates:any[]=[];
  for(const template of templates??[]){
    const family=familyById.get(String(template.family_id));
    if(!family) continue;
    const context=await loadPricingContextV5(organizationId,template.id,{publishedOnly:true});
    const constructions=context.constructions
      .filter((item)=>item.is_active&&item.is_quoteable)
      .map((item)=>{
        const resolved=resolveConstructionV5(item.id,context.constructions,context.constructionLayers,context.masters);
        if(!resolved||resolved.validation_errors.length) return null;
        return {
          id:item.id,
          name:item.name,
          construction_key:item.construction_key,
          layer_count:item.layer_count,
          finish_type:item.finish_type,
          barrier_type:item.barrier_type,
          sealant_code:item.sealant_code,
          structure_label:resolved.structure_label,
        };
      })
      .filter(Boolean);
    if(!constructions.length) continue;

    const supplyForm=String(template.production_rules_json?.supply_form??'');
    const suggestedBucket=Number(template.production_rules_json?.default_commercial_bucket??0);
    resultTemplates.push({
      id:template.id,
      family_id:template.family_id,
      family_name:family.name,
      family_slug:family.slug,
      slug:template.slug,
      name:template.name,
      currency:template.currency,
      supply_form:supplyForm,
      supply_label:SUPPLY_LABELS[supplyForm]??template.name,
      suggested_bucket:Number.isFinite(suggestedBucket)&&suggestedBucket>=1&&suggestedBucket<=5?suggestedBucket:null,
      bucket_status:String(template.production_rules_json?.commercial_bucket_mapping??''),
      constructions,
    });
  }

  return {families:families??[],templates:resultTemplates};
}
