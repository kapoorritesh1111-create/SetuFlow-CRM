import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingReferenceItemsForAdmin } from '@/lib/packaging/queries';
import PricingComponentsV4Manager from '@/features/packaging/components/pricing-components-v4-manager';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';

export const dynamic = 'force-dynamic';

export default async function PackagingReferenceLibraryAdminPage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  const { missingEnv, organization } = await requireAdminWorkspace();
  if (missingEnv || !organization) return null;

  const supabase: any = await createClient();
  const verticals = await getOrganizationVerticals(organization.id, supabase);
  if (!verticals.packagingEnabled) return <StateMessage title="Packaging vertical is not enabled" description="Pricing Components are available for packaging-vertical workspaces. Contact SETU Flow to enable it." tone="info" />;

  const [referenceItems, familiesRes, costsRes, chargesRes, costLinksRes, chargeLinksRes] = await Promise.all([
    getPackagingReferenceItemsForAdmin(organization.id, supabase),
    supabase.from('packaging_service_families').select('id,name,slug,is_active,sort_order').eq('organization_id', organization.id).order('sort_order'),
    supabase.from('packaging_cost_master_items').select('id,code,name,item_type,specification,rate_basis,current_rate,rate_uom,currency,micron,gsm,density,is_active').eq('organization_id', organization.id).order('item_type').order('name'),
    supabase.from('packaging_charge_master_items').select('id,code,name,category,basis,application_stage,current_rate,currency,metadata,is_active').eq('organization_id', organization.id).order('category').order('name'),
    supabase.from('packaging_cost_master_family_links').select('cost_master_item_id,family_id').eq('organization_id', organization.id),
    supabase.from('packaging_charge_master_family_links').select('charge_master_item_id,family_id').eq('organization_id', organization.id),
  ]);
  const error = familiesRes.error ?? costsRes.error ?? chargesRes.error ?? costLinksRes.error ?? chargeLinksRes.error;
  if (error) return <StateMessage title="Pricing Components could not be loaded" description={error.message} tone="warning" />;
  const costs = costsRes.data ?? [];
  const charges = chargesRes.data ?? [];
  const needsRate = [...costs, ...charges].filter((row: any) => row.current_rate == null).length;

  return (
    <AdminSettingsShell active="packaging-reference-library" organizationName={organization.name} sectionTitle="Pricing Components" tbarChips={[
      { label: `${costs.length} cost components`, tone: 'info' },
      { label: `${charges.length} charge components`, tone: 'info' },
      { label: `${needsRate} need rate`, tone: needsRate ? 'warn' : 'ok' },
    ]}>
      <PricingComponentsV4Manager data={{
        referenceItems,
        families: familiesRes.data ?? [],
        costs,
        charges,
        costLinks: costLinksRes.data ?? [],
        chargeLinks: chargeLinksRes.data ?? [],
      }} />
    </AdminSettingsShell>
  );
}
