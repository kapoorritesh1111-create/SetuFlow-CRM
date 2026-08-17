import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingFamilies, getPackagingReferenceItems, getPackagingTemplates } from '@/lib/packaging/queries';
import PricingTemplateBuilderGuided from '@/features/packaging/components/pricing-template-builder-guided';
import PricingV4AdminWorkspace from '@/features/packaging/components/pricing-v4-admin-workspace';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';

export const dynamic = 'force-dynamic';

export default async function PackagingTemplatesAdminPage() {
  if (!hasSupabaseEnv) {
    return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  }
  const { missingEnv, organization } = await requireAdminWorkspace();
  if (missingEnv || !organization) return null;

  const supabase: any = await createClient();
  const verticals = await getOrganizationVerticals(organization.id, supabase);
  if (!verticals.packagingEnabled) {
    return <StateMessage title="Packaging vertical is not enabled" description="Packaging pricing templates are available for packaging-vertical workspaces. Contact SETU Flow to enable it." tone="info" />;
  }

  const [families, templates, referenceItems, v4Families, variations, costs, charges, v4Templates, bands, matrixRows, recipes, costLinks, chargeLinks, flag] = await Promise.all([
    getPackagingFamilies(organization.id, supabase),
    getPackagingTemplates(organization.id, supabase),
    getPackagingReferenceItems(organization.id, supabase),
    supabase.from('packaging_service_families').select('id,slug,name,description,pricing_mode,product_setup_mode,pricing_engine_type,default_uom,is_quoteable,is_active,sort_order').eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_product_variations').select('id,family_id,variation_key,name,capacity_label,width_mm,height_mm,bottom_gusset_each_mm,dimension_label,approval_state,is_quoteable,is_active,sort_order').eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_cost_master_items').select('id,code,name,item_type,specification,rate_basis,current_rate,rate_uom,currency,micron,gsm,density,is_active').eq('organization_id', organization.id).order('item_type').order('name'),
    supabase.from('packaging_charge_master_items').select('id,code,name,category,basis,application_stage,current_rate,currency,is_active').eq('organization_id', organization.id).order('category').order('name'),
    supabase.from('packaging_pricing_templates').select('id,family_id,slug,name,description,currency,is_active,calculation_version,calculation_engine_key,status,quote_config_json,published_at').eq('organization_id', organization.id).eq('calculation_version', 4).order('name'),
    supabase.from('packaging_pricing_commercial_bands').select('id,template_id,run_length_max_m,wastage_pct,margin_per_frame,sort_order').eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_pricing_matrix_rows').select('id,template_id,supply_form,construction_key,client_product_id,width_mm,height_mm,q1_rate_per_frame,q2_rate_per_frame,q3_rate_per_frame,q4_rate_per_frame,q5_rate_per_frame,source_worksheet,source_row_number,source_reference,is_active,metadata').eq('organization_id', organization.id).eq('is_active', true).order('source_worksheet').order('source_row_number'),
    supabase.from('packaging_pricing_recipe_items').select('id,template_id,construction_key,role_key,source_type,cost_master_item_id,charge_master_item_id,consumption_rule_json,condition_json,sort_order,is_required').eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_cost_master_family_links').select('cost_master_item_id,family_id').eq('organization_id', organization.id),
    supabase.from('packaging_charge_master_family_links').select('charge_master_item_id,family_id').eq('organization_id', organization.id),
    supabase.from('smc_feature_flags').select('enabled,rollout_percentage,allowed_orgs').eq('flag_key','packaging_pricing_v4').maybeSingle(),
  ]);

  const queryErrors = [v4Families, variations, costs, charges, v4Templates, bands, matrixRows, recipes, costLinks, chargeLinks].map((x:any)=>x.error).filter(Boolean);
  const v4SchemaReady = queryErrors.length === 0;
  const flagEnabled = Boolean(flag?.data?.enabled && Number(flag?.data?.rollout_percentage ?? 0) > 0 && (flag?.data?.allowed_orgs ?? []).includes(organization.id));
  const v4Data = {
    families: v4Families?.data ?? [], variations: variations?.data ?? [], costs: costs?.data ?? [], charges: charges?.data ?? [],
    templates: v4Templates?.data ?? [], bands: bands?.data ?? [], matrixRows: matrixRows?.data ?? [], recipes: recipes?.data ?? [],
    costLinks: costLinks?.data ?? [], chargeLinks: chargeLinks?.data ?? [], flagEnabled,
  };

  return (
    <AdminSettingsShell active="packaging-templates" organizationName={organization.name} sectionTitle="Packaging Pricing" tbarChips={[{ label: `${templates.length} legacy template${templates.length === 1 ? '' : 's'}`, tone: 'info' }, { label: `${v4Data.templates.length} v4`, tone: 'info' }]}>
      {v4SchemaReady ? <PricingV4AdminWorkspace data={v4Data} /> : (
        <StateMessage title="Pricing v4 is waiting for its database migration" description="The new control center is in this preview branch, but its additive schema has not been applied to production yet. Legacy pricing below remains unchanged." tone="info" />
      )}
      <div className="my-8 border-t border-slate-200 pt-6">
        <div className="mb-4"><h2 className="text-lg font-bold text-slate-900">Legacy pricing builder</h2><p className="text-sm text-slate-500">Kept available during v4 dual-run. It will not be removed until the new engine passes Stark UAT.</p></div>
        <PricingTemplateBuilderGuided families={families} templates={templates} referenceItems={referenceItems} />
      </div>
    </AdminSettingsShell>
  );
}
