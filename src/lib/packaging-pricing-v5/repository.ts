import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type {
  ChargeMasterRateV5,
  CommercialBandV5,
  ConstructionLayerV5,
  ConstructionV5,
  CostMasterRateV5,
  PricingContextV5,
  PricingTemplateV5,
  SizeProfileV5,
} from './types';

export async function loadPricingContextV5(
  organizationId: string,
  templateId: string,
  options: { publishedOnly?: boolean } = {},
): Promise<PricingContextV5> {
  const db: any = createServiceRoleClient();
  if (!db) throw new Error('Pricing v5 repository service is unavailable.');

  let templateQuery = db.from('packaging_pricing_templates')
    .select('id,family_id,name,currency,calculation_version,calculation_engine_key,status,production_rules_json,quote_config_json,is_active')
    .eq('organization_id', organizationId)
    .eq('id', templateId)
    .eq('calculation_version', 5)
    .in('calculation_engine_key', ['sup_formula_v5','frame_formula_v5']);
  if (options.publishedOnly) templateQuery = templateQuery.eq('status','published').eq('is_active',true);
  const { data: template, error: templateError } = await templateQuery.maybeSingle();
  if (templateError) throw new Error(templateError.message);
  if (!template?.id) throw new Error(options.publishedOnly ? 'Published Pricing v5 template was not found.' : 'Pricing v5 template was not found.');

  const [sizes, constructions, layers, masters, costRates, charges, chargeRates, chargeLinks, bands] = await Promise.all([
    db.from('packaging_size_profiles_v5')
      .select('id,organization_id,template_id,family_id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,pricing_bucket,production_profile_key,gusset_production_mode,bottom_registration_mode,is_active,is_quoteable,sort_order,metadata')
      .eq('organization_id',organizationId).eq('template_id',template.id).eq('family_id',template.family_id).eq('is_active',true).order('sort_order'),
    db.from('packaging_constructions_v5')
      .select('id,organization_id,template_id,family_id,construction_key,construction_family_key,name,finish_type,barrier_type,sealant_code,layer_count,is_active,is_quoteable,sort_order,metadata')
      .eq('organization_id',organizationId).eq('template_id',template.id).eq('family_id',template.family_id).eq('is_active',true).order('sort_order'),
    db.from('packaging_construction_layers_v5')
      .select('id,template_id,construction_id,layer_position,role_key,cost_master_item_id,is_print_layer,is_sealant_layer')
      .eq('organization_id',organizationId).eq('template_id',template.id).order('layer_position'),
    db.from('packaging_cost_master_items')
      .select('id,code,name,item_type,rate_basis,rate_uom,currency,micron,gsm,density,metadata')
      .eq('organization_id',organizationId).eq('is_active',true),
    db.from('packaging_pricing_cost_rates_v5')
      .select('cost_master_item_id,current_rate,micron_override,gsm_override,density_override,metadata')
      .eq('organization_id',organizationId).eq('template_id',template.id),
    db.from('packaging_charge_master_items')
      .select('id,code,name,category,basis,application_stage,currency,metadata')
      .eq('organization_id',organizationId).eq('is_active',true),
    db.from('packaging_pricing_charge_rates_v5')
      .select('charge_master_item_id,current_rate,metadata')
      .eq('organization_id',organizationId).eq('template_id',template.id),
    db.from('packaging_charge_master_family_links')
      .select('charge_master_item_id,family_id')
      .eq('organization_id',organizationId).eq('family_id',template.family_id),
    db.from('packaging_pricing_commercial_bands_v5')
      .select('id,pricing_bucket,run_length_max_m,wastage_pct,margin_per_frame,sort_order')
      .eq('organization_id',organizationId).eq('template_id',template.id).order('pricing_bucket').order('run_length_max_m'),
  ]);

  for (const result of [sizes,constructions,layers,masters,costRates,charges,chargeRates,chargeLinks,bands]) {
    if (result.error) throw new Error(result.error.message);
  }

  const constructionIds = new Set((constructions.data ?? []).map((item:any)=>item.id));
  const familyChargeIds = new Set((chargeLinks.data ?? []).map((item:any)=>String(item.charge_master_item_id)));
  const costRateById = new Map((costRates.data ?? []).map((item:any)=>[String(item.cost_master_item_id), item]));
  const chargeRateById = new Map((chargeRates.data ?? []).map((item:any)=>[String(item.charge_master_item_id), item.current_rate]));

  return {
    template: template as PricingTemplateV5,
    sizeProfiles: (sizes.data ?? []).map((item:any)=>({ ...item, width_mm:Number(item.width_mm), height_mm:Number(item.height_mm), bottom_gusset_each_mm:Number(item.bottom_gusset_each_mm), pricing_bucket:Number(item.pricing_bucket) })) as SizeProfileV5[],
    constructions: (constructions.data ?? []).map((item:any)=>({ ...item, layer_count:Number(item.layer_count) })) as ConstructionV5[],
    constructionLayers: (layers.data ?? []).filter((item:any)=>constructionIds.has(item.construction_id)).map((item:any)=>({ ...item, layer_position:Number(item.layer_position) })) as ConstructionLayerV5[],
    masters: (masters.data ?? []).map((item:any)=>{
      const override:any = costRateById.get(String(item.id)) ?? null;
      return {
        ...item,
        current_rate: override
          ? (override.current_rate==null?null:Number(override.current_rate))
          : null,
        micron: override?.micron_override != null ? Number(override.micron_override) : (item.micron==null?null:Number(item.micron)),
        gsm: override?.gsm_override != null ? Number(override.gsm_override) : (item.gsm==null?null:Number(item.gsm)),
        density: override?.density_override != null ? Number(override.density_override) : (item.density==null?null:Number(item.density)),
        metadata: { ...(item.metadata ?? {}), ...(override?.metadata ?? {}) },
      };
    }) as CostMasterRateV5[],
    charges: (charges.data ?? []).filter((item:any)=>familyChargeIds.has(String(item.id))).map((item:any)=>({
      ...item,
      current_rate: chargeRateById.has(String(item.id))
        ? (chargeRateById.get(String(item.id))==null?null:Number(chargeRateById.get(String(item.id))))
        : null,
    })) as ChargeMasterRateV5[],
    bands: (bands.data ?? []).map((item:any)=>({ ...item, pricing_bucket:Number(item.pricing_bucket), run_length_max_m:Number(item.run_length_max_m), wastage_pct:Number(item.wastage_pct), margin_per_frame:Number(item.margin_per_frame), sort_order:Number(item.sort_order) })) as CommercialBandV5[],
  };
}
