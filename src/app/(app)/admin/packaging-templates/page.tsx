import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import PricingBuilderV4CompactWorkspace from '@/features/packaging/components/pricing-builder-v4-compact-workspace';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';

export const dynamic = 'force-dynamic';

// Pricing Builder intentionally exposes only the v4 guided recipe workspace. Legacy v3 data remains untouched for compatibility but is no longer rendered in Admin.
export default async function PackagingTemplatesAdminPage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, organization } = await requireAdminWorkspace();
  if (missingEnv || !organization) return null;

  const supabase: any = await createClient();
  const verticals = await getOrganizationVerticals(organization.id, supabase);
  if (!verticals.packagingEnabled) return <StateMessage title="Packaging vertical is not enabled" description="Pricing Builder is available for packaging-vertical workspaces. Contact SETU Flow to enable it." tone="info" />;

  const [families, variations, costs, charges, templates, bands, matrixRows, recipes, chargeLinks, flag] = await Promise.all([
    supabase.from('packaging_service_families').select('id,slug,name,description,pricing_mode,product_setup_mode,pricing_engine_type,default_uom,is_quoteable,is_active,sort_order').eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_product_variations').select('id,family_id,variation_key,name,capacity_label,width_mm,height_mm,bottom_gusset_each_mm,dimension_label,approval_state,is_quoteable,is_active,sort_order').eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_cost_master_items').select('id,code,name,item_type,specification,rate_basis,current_rate,rate_uom,currency,micron,gsm,density,is_active').eq('organization_id', organization.id).order('item_type').order('name'),
    supabase.from('packaging_charge_master_items').select('id,code,name,category,basis,application_stage,current_rate,currency,metadata,is_active').eq('organization_id', organization.id).order('category').order('name'),
    supabase.from('packaging_pricing_templates').select('id,family_id,slug,name,description,currency,is_active,calculation_version,calculation_engine_key,status,quote_config_json,published_at').eq('organization_id', organization.id).eq('calculation_version', 4).order('name'),
    supabase.from('packaging_pricing_commercial_bands').select('id,template_id,run_length_max_m,wastage_pct,margin_per_frame,sort_order').eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_pricing_matrix_rows').select('id,template_id,supply_form,construction_key,client_product_id,width_mm,height_mm,q1_rate_per_frame,q2_rate_per_frame,q3_rate_per_frame,q4_rate_per_frame,q5_rate_per_frame,source_worksheet,source_row_number,source_reference,is_active,metadata').eq('organization_id', organization.id).eq('is_active', true).order('source_worksheet').order('source_row_number'),
    supabase.from('packaging_pricing_recipe_items').select('id,template_id,construction_key,role_key,source_type,cost_master_item_id,charge_master_item_id,consumption_rule_json,condition_json,sort_order,is_required').eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_charge_master_family_links').select('charge_master_item_id,family_id').eq('organization_id', organization.id),
    supabase.from('smc_feature_flags').select('enabled,rollout_percentage,allowed_orgs').eq('flag_key','packaging_pricing_v4').maybeSingle(),
  ]);
  const queryErrors = [families, variations, costs, charges, templates, bands, matrixRows, recipes, chargeLinks].map((x:any)=>x.error).filter(Boolean);
  if (queryErrors.length) return <StateMessage title="Pricing Builder could not be loaded" description={(queryErrors[0] as any).message} tone="warning" />;
  const flagEnabled = Boolean(flag?.data?.enabled && Number(flag?.data?.rollout_percentage ?? 0) > 0 && (flag?.data?.allowed_orgs ?? []).includes(organization.id));
  const data = {
    families: families.data ?? [],
    variations: variations.data ?? [],
    costs: costs.data ?? [],
    charges: charges.data ?? [],
    templates: templates.data ?? [],
    bands: bands.data ?? [],
    matrixRows: matrixRows.data ?? [],
    recipes: recipes.data ?? [],
    chargeLinks: chargeLinks.data ?? [],
    flagEnabled,
  };
  const published = data.templates.filter((template:any)=>template.status==='published'&&template.is_active).length;

  return (
    <AdminSettingsShell active="packaging-templates" organizationName={organization.name} sectionTitle="Pricing Builder" tbarChips={[
      { label: `${data.templates.length} pricing recipes`, tone: 'info' },
      { label: `${published} published`, tone: published ? 'ok' : 'warn' },
      { label: `${data.matrixRows.length} matrix source rows`, tone: data.matrixRows.length === 192 ? 'ok' : 'warn' },
    ]}>
      <PricingBuilderV4CompactWorkspace data={data} />
    </AdminSettingsShell>
  );
}
