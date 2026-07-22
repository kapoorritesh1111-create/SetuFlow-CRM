import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingReferenceItemsForAdmin } from '@/lib/packaging/queries';
import PackagingReferenceLibraryManager from '@/features/packaging/components/packaging-reference-library-manager';

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

  return <PackagingReferenceLibraryManager items={items} />;
}
