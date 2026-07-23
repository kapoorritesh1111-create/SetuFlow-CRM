import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingReferenceItemsForAdmin } from '@/lib/packaging/queries';
import PackagingReferenceLibraryManager from '@/features/packaging/components/packaging-reference-library-manager';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';

export const dynamic = 'force-dynamic';

export default async function PackagingReferenceLibraryAdminPage() {
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
        description="The reference library is available for packaging-vertical workspaces. Contact SETU Flow to enable it."
        tone="info"
      />
    );
  }

  const items = await getPackagingReferenceItemsForAdmin(organization.id, supabase);

  return (
    <AdminSettingsShell active="packaging-reference-library" organizationName={organization.name} sectionTitle="Packaging Reference Library" tbarChips={[{ label: `${items.filter((item) => item.is_active).length} active items`, tone: 'info' }]}>
      <PackagingReferenceLibraryManager items={items} />
    </AdminSettingsShell>
  );
}
