import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingFamilies, getPackagingReferenceItems, getPackagingTemplates } from '@/lib/packaging/queries';
import PricingTemplateBuilderGuided from '@/features/packaging/components/pricing-template-builder-guided';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';

export const dynamic = 'force-dynamic';

export default async function PackagingTemplatesAdminPage() {
  if (!hasSupabaseEnv) {
    return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment." tone="warning" />;
  }
  const { missingEnv, organization } = await requireAdminWorkspace();
  if (missingEnv || !organization) return null;

  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(organization.id, supabase);
  if (!verticals.packagingEnabled) {
    return (
      <StateMessage
        title="Packaging vertical is not enabled"
        description="Packaging pricing templates are available for packaging-vertical workspaces. Contact SETU Flow to enable it."
        tone="info"
      />
    );
  }

  const [families, templates, referenceItems] = await Promise.all([
    getPackagingFamilies(organization.id, supabase),
    getPackagingTemplates(organization.id, supabase),
    getPackagingReferenceItems(organization.id, supabase),
  ]);

  return (
    <AdminSettingsShell active="packaging-templates" organizationName={organization.name} sectionTitle="Packaging Pricing Templates" tbarChips={[{ label: `${templates.length} template${templates.length === 1 ? '' : 's'}`, tone: 'info' }]}>
      <PricingTemplateBuilderGuided families={families} templates={templates} referenceItems={referenceItems} />
    </AdminSettingsShell>
  );
}
