import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { loadPricingContext } from './repository';
import { buildSupConstructionAvailability } from './sup-availability';

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

function percentBase(charge: any) {
  return String(charge?.metadata?.percent_base ?? '').trim();
}

function chargeSupportedByTemplate(charge: any, template: any) {
  const engine = template?.calculation_engine_key;
  if (charge.basis === 'percent' && !percentBase(charge)) return false;
  if (engine === 'sup_formula') {
    if (charge.basis !== 'percent') return true;
    const base = percentBase(charge);
    if (charge.application_stage === 'before_wastage_margin') return base === 'material_process_cogs_total';
    if (charge.application_stage === 'after_core_price') return ['material_process_cogs_total','core_product_total'].includes(base);
    return ['material_process_cogs_total','core_product_total','product_total'].includes(base);
  }
  if (engine === 'matrix_per_frame') {
    if (charge.application_stage === 'before_wastage_margin' || charge.basis === 'per_running_metre') return false;
    if (charge.basis !== 'percent') return true;
    const base = percentBase(charge);
    if (charge.application_stage === 'after_core_price') return base === 'core_product_total';
    return ['core_product_total','product_total'].includes(base);
  }
  return false;
}

/**
 * Sales-safe option payload. Confidential rates, COGS, wastage/margin, recipe
 * Master IDs and charge calculation configuration never leave this server module.
 */
export async function listSalesPackagingPricingV4Options(organizationId: string) {
  const db = service();
  const [familyRes, templateRes, variationRes, kldRes, rowRes, chargeRes, chargeLinkRes] = await Promise.all([
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
      .select('id,family_id,product_variation_id,spec_key,file_name,version')
      .eq('organization_id', organizationId).eq('is_active', true),
    db.from('packaging_pricing_matrix_rows')
      .select('id,template_id,supply_form,construction_key,client_product_id,width_mm,height_mm')
      .eq('organization_id', organizationId).eq('is_active', true),
    db.from('packaging_charge_master_items')
      .select('id,code,name,category,basis,application_stage,metadata')
      .eq('organization_id', organizationId).eq('is_active', true)
      .not('current_rate', 'is', null).not('basis', 'is', null).not('application_stage', 'is', null),
    db.from('packaging_charge_master_family_links')
      .select('charge_master_item_id,family_id').eq('organization_id', organizationId),
  ]);
  const errors = [familyRes.error, templateRes.error, variationRes.error, kldRes.error, rowRes.error, chargeRes.error, chargeLinkRes.error].filter(Boolean);
  if (errors.length) throw new Error((errors[0] as any).message);

  const familyIds = new Set((familyRes.data ?? []).map((family: any) => String(family.id)));
  const families = familyRes.data ?? [];
  const templates = (templateRes.data ?? []).filter((template: any) => familyIds.has(String(template.family_id)));
  const templateIds = new Set(templates.map((template: any) => String(template.id)));
  const variations = (variationRes.data ?? []).filter((variation: any) => familyIds.has(String(variation.family_id)));
  const variationIds = new Set(variations.map((variation: any) => String(variation.id)));
  const klds = (kldRes.data ?? []).filter((file: any) => familyIds.has(String(file.family_id))).map((file: any) => ({
    id: file.id,
    family_id: file.family_id,
    product_variation_id: file.product_variation_id ?? null,
    spec_key: file.spec_key ?? null,
    file_name: file.file_name,
    version_label: `v${Number(file.version ?? 1)}`,
  }));
  const matrixRows = (rowRes.data ?? []).filter((row: any) => templateIds.has(String(row.template_id)));
  const linksByCharge = new Map<string, string[]>();
  for (const link of chargeLinkRes.data ?? []) {
    const chargeId = String((link as any).charge_master_item_id);
    const familyId = String((link as any).family_id);
    if (!familyIds.has(familyId)) continue;
    linksByCharge.set(chargeId, [...(linksByCharge.get(chargeId) ?? []), familyId]);
  }

  const charges = (chargeRes.data ?? []).flatMap((charge: any) => {
    const linkedFamilies = linksByCharge.get(String(charge.id)) ?? [];
    const supportedTemplates = templates.filter((template: any) => linkedFamilies.includes(String(template.family_id)) && chargeSupportedByTemplate(charge, template));
    if (!supportedTemplates.length) return [];
    return [{
      code: charge.code,
      name: charge.name,
      category: charge.category,
      family_ids: [...new Set(supportedTemplates.map((template: any) => String(template.family_id)))],
      template_ids: supportedTemplates.map((template: any) => String(template.id)),
    }];
  });

  const supTemplates = templates.filter((template: any) => template.calculation_engine_key === 'sup_formula');
  const supAvailability = (await Promise.all(supTemplates.map(async (template: any) => {
    const context = await loadPricingContext(organizationId, template.id, { publishedOnly: true });
    return buildSupConstructionAvailability(context).filter((row) => variationIds.has(String(row.variation_id)));
  }))).flat();

  return { families, templates, variations, klds, matrixRows, charges, supAvailability };
}
