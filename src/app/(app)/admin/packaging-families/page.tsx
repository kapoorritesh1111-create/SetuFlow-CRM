import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import PackagingProductsV4Manager from '@/features/packaging/components/packaging-products-v4-manager';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';

export const dynamic = 'force-dynamic';

export default async function PackagingFamiliesAdminPage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, organization } = await requireAdminWorkspace();
  if (missingEnv || !organization) return null;

  const supabase: any = await createClient();
  const verticals = await getOrganizationVerticals(organization.id, supabase);
  if (!verticals.packagingEnabled) {
    return <StateMessage title="Packaging vertical is not enabled" description="Packaging Products are available for packaging-vertical workspaces. Contact SETU Flow to enable it." tone="info" />;
  }

  const [familiesRes, variationsRes, templatesRes, kldsRes] = await Promise.all([
    supabase.from('packaging_service_families')
      .select('id,organization_id,slug,name,description,pricing_mode,quote_time_inputs,default_unit,default_lead_time,sort_order,is_active,icon_key,product_setup_mode,pricing_engine_type,default_uom,is_quoteable')
      .eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_product_variations')
      .select('id,family_id,variation_key,name,capacity_label,width_mm,height_mm,bottom_gusset_each_mm,dimension_label,approval_state,is_quoteable,is_active,sort_order')
      .eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_pricing_templates')
      .select('id,family_id,name,slug,status,is_active,calculation_version,calculation_engine_key,published_at')
      .eq('organization_id', organization.id).eq('calculation_version', 4).order('name'),
    supabase.from('packaging_kld_files')
      .select('id,family_id,template_id,size_preset_key,file_path,file_name,mime_type,file_size,version,is_active,product_variation_id,spec_key,created_at')
      .eq('organization_id', organization.id).order('created_at', { ascending: false }),
  ]);
  const error = familiesRes.error ?? variationsRes.error ?? templatesRes.error ?? kldsRes.error;
  if (error) return <StateMessage title="Packaging Products could not be loaded" description={error.message} tone="warning" />;

  const klds = await Promise.all((kldsRes.data ?? []).map(async (file: any) => {
    if (!file.is_active || !file.file_path) return { ...file, signed_url: null };
    const { data } = await supabase.storage.from('compliance-docs').createSignedUrl(file.file_path, 3600);
    return { ...file, signed_url: data?.signedUrl ?? null };
  }));
  const variations = variationsRes.data ?? [];
  const currentKldCount = klds.filter((file: any) => file.is_active && file.product_variation_id).length;

  return (
    <AdminSettingsShell
      active="packaging-families"
      organizationName={organization.name}
      sectionTitle="Packaging Products"
      tbarChips={[
        { label: `${(familiesRes.data ?? []).length} products`, tone: 'info' },
        { label: `${variations.filter((row: any) => row.approval_state === 'approved' && row.is_active).length} approved sizes`, tone: 'info' },
        { label: `${currentKldCount} current KLDs`, tone: currentKldCount ? 'ok' : 'warn' },
      ]}
    >
      <PackagingProductsV4Manager data={{ families: familiesRes.data ?? [], variations, templates: templatesRes.data ?? [], klds }} />
    </AdminSettingsShell>
  );
}
