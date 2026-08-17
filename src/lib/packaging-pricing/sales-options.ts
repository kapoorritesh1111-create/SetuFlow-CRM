import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

function service() {
  const client = createServiceRoleClient() as any;
  if (!client) throw new Error('Packaging pricing service is not configured.');
  return client;
}

export async function isPackagingPricingV4EnabledForOrg(organizationId: string) {
  const db = service();
  const { data, error } = await db.from('smc_feature_flags')
    .select('enabled,rollout_percentage,allowed_orgs,blocked_orgs')
    .eq('flag_key', 'packaging_pricing_v4').maybeSingle();
  if (error || !data?.enabled || Number(data.rollout_percentage ?? 0) <= 0) return false;
  if ((data.blocked_orgs ?? []).includes(organizationId)) return false;
  const allowed = data.allowed_orgs ?? [];
  return allowed.length === 0 || allowed.includes(organizationId);
}

/**
 * Sales-safe option payload. Raw material/process/charge rates, wastage,
 * margin and matrix frame rates are deliberately not selected.
 */
export async function listSalesPackagingPricingV4Options(organizationId: string) {
  const db = service();
  const [{ data: families, error: familyError }, { data: templates, error: templateError }, { data: variations, error: variationError }, { data: klds, error: kldError }, { data: rows, error: rowsError }, { data: charges, error: chargeError }] = await Promise.all([
    db.from('packaging_service_families')
      .select('id,slug,name,product_setup_mode,pricing_engine_type,default_uom')
      .eq('organization_id', organizationId).eq('is_active', true).eq('is_quoteable', true).order('sort_order'),
    db.from('packaging_pricing_templates')
      .select('id,family_id,slug,name,calculation_version,calculation_engine_key,quote_config_json')
      .eq('organization_id', organizationId).eq('status', 'published').eq('is_active', true),
    db.from('packaging_product_variations')
      .select('id,family_id,variation_key,name,capacity_label,width_mm,height_mm,bottom_gusset_each_mm,dimension_label')
      .eq('organization_id', organizationId).eq('approval_state', 'approved').eq('is_quoteable', true).eq('is_active', true).order('sort_order'),
    db.from('packaging_kld_files')
      .select('id,family_id,product_variation_id,spec_key,file_name,version_label')
      .eq('organization_id', organizationId).eq('is_active', true),
    db.from('packaging_pricing_matrix_rows')
      .select('id,template_id,supply_form,construction_key,client_product_id,width_mm,height_mm')
      .eq('organization_id', organizationId).eq('is_active', true),
    db.from('packaging_charge_master_items')
      .select('id,code,name,category')
      .eq('organization_id', organizationId).eq('is_active', true)
      .not('current_rate', 'is', null).not('basis', 'is', null).not('application_stage', 'is', null),
  ]);
  const errors = [familyError, templateError, variationError, kldError, rowsError, chargeError].filter(Boolean);
  if (errors.length) throw new Error(errors[0].message);
  return {
    families: families ?? [], templates: templates ?? [], variations: variations ?? [],
    klds: klds ?? [], matrixRows: rows ?? [], charges: charges ?? [],
  };
}
