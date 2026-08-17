import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { PackagingPricingTemplateV4, PricingContext } from './types';

function service() {
  const client = createServiceRoleClient() as any;
  if (!client) throw new Error('Pricing service is unavailable because the service-role client is not configured.');
  return client;
}

/** Caller must supply an organization id resolved from authenticated workspace membership. */
export async function loadPricingContext(organizationId: string, templateId: string, options?: { publishedOnly?: boolean }): Promise<PricingContext> {
  const db = service();
  let templateQuery = db.from('packaging_pricing_templates')
    .select('id,family_id,name,currency,calculation_version,calculation_engine_key,status,production_rules_json,quote_config_json,is_active')
    .eq('organization_id', organizationId).eq('id', templateId);
  if (options?.publishedOnly) templateQuery = templateQuery.eq('status', 'published').eq('is_active', true);
  const { data: template, error: templateError } = await templateQuery.maybeSingle();
  if (templateError) throw new Error(templateError.message);
  if (!template?.calculation_engine_key) throw new Error('Pricing template is not available for v4 calculation.');

  const [mastersRes, chargesRes, recipesRes, bandsRes, variationsRes, matrixRes] = await Promise.all([
    db.from('packaging_cost_master_items').select('id,code,name,item_type,rate_basis,current_rate,rate_uom,currency,micron,gsm,density,metadata').eq('organization_id', organizationId).eq('is_active', true),
    db.from('packaging_charge_master_items').select('id,code,name,category,basis,application_stage,current_rate,currency').eq('organization_id', organizationId).eq('is_active', true),
    db.from('packaging_pricing_recipe_items').select('id,construction_key,role_key,source_type,cost_master_item_id,charge_master_item_id,consumption_rule_json,condition_json,sort_order,is_required').eq('organization_id', organizationId).eq('template_id', templateId).order('sort_order'),
    db.from('packaging_pricing_commercial_bands').select('run_length_max_m,wastage_pct,margin_per_frame,sort_order').eq('organization_id', organizationId).eq('template_id', templateId).order('sort_order'),
    db.from('packaging_product_variations').select('id,variation_key,name,capacity_label,width_mm,height_mm,bottom_gusset_each_mm,dimension_label').eq('organization_id', organizationId).eq('family_id', template.family_id).eq('approval_state', 'approved').eq('is_active', true).order('sort_order'),
    db.from('packaging_pricing_matrix_rows').select('id,supply_form,construction_key,client_product_id,width_mm,height_mm,q1_rate_per_frame,q2_rate_per_frame,q3_rate_per_frame,q4_rate_per_frame,q5_rate_per_frame,source_worksheet,source_row_number,source_reference,metadata').eq('organization_id', organizationId).eq('template_id', templateId).eq('is_active', true),
  ]);
  for (const result of [mastersRes, chargesRes, recipesRes, bandsRes, variationsRes, matrixRes]) if (result.error) throw new Error(result.error.message);
  return {
    template: template as PackagingPricingTemplateV4,
    masters: mastersRes.data ?? [], charges: chargesRes.data ?? [], recipes: recipesRes.data ?? [], bands: bandsRes.data ?? [],
    variations: variationsRes.data ?? [], matrixRows: matrixRes.data ?? [],
  } as PricingContext;
}

export async function loadKldSnapshot(organizationId: string, kldFileId: string | null | undefined) {
  if (!kldFileId) return null;
  const db = service();
  const { data, error } = await db.from('packaging_kld_files')
    .select('id,family_id,product_variation_id,spec_key,size_preset_key,file_name,file_url,storage_bucket,storage_path,version_label,mime_type,file_size_bytes')
    .eq('organization_id', organizationId).eq('id', kldFileId).eq('is_active', true).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Selected KLD is not available in this workspace.');
  return data;
}

export async function listPublishedPricingOptions(organizationId: string) {
  const db = service();
  const [{ data: families, error: familyError }, { data: templates, error: templateError }, { data: variations, error: variationError }, { data: klds, error: kldError }] = await Promise.all([
    db.from('packaging_service_families').select('id,slug,name,product_setup_mode,pricing_engine_type,default_uom').eq('organization_id', organizationId).eq('is_active', true).eq('is_quoteable', true).order('sort_order'),
    db.from('packaging_pricing_templates').select('id,family_id,name,calculation_version,calculation_engine_key,quote_config_json').eq('organization_id', organizationId).eq('status', 'published').eq('is_active', true),
    db.from('packaging_product_variations').select('id,family_id,variation_key,name,capacity_label,width_mm,height_mm,bottom_gusset_each_mm,dimension_label').eq('organization_id', organizationId).eq('approval_state', 'approved').eq('is_quoteable', true).eq('is_active', true).order('sort_order'),
    db.from('packaging_kld_files').select('id,family_id,product_variation_id,spec_key,file_name,file_url,version_label').eq('organization_id', organizationId).eq('is_active', true),
  ]);
  for (const result of [{ error: familyError }, { error: templateError }, { error: variationError }, { error: kldError }]) if (result.error) throw new Error(result.error.message);
  return { families: families ?? [], templates: templates ?? [], variations: variations ?? [], klds: klds ?? [] };
}
