import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingProductionAnalytics } from '@/lib/packaging/queries';
import PackagingAnalyticsDashboard from '@/features/packaging/components/packaging-analytics-dashboard';

export const dynamic = 'force-dynamic';

export default async function PackagingAnalyticsAdminPage() {
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
        description="Packaging analytics are available for packaging-vertical workspaces. Contact SETU Flow to enable it."
        tone="info"
      />
    );
  }

  const analytics = await getPackagingProductionAnalytics(organization.id, supabase);

  return <PackagingAnalyticsDashboard data={analytics} />;
}
