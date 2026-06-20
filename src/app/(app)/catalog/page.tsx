import { WorkspaceState } from '@/components/ui/workspace-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { createClient } from '@/lib/supabase/server';
import { CatalogHub } from './catalog-hub';

export const dynamic = 'force-dynamic';

export default async function CatalogHubPage() {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) {
    return (
      <WorkspaceState
        eyebrow="Catalog"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to Overview"
      />
    );
  }
  const orgId = ws.organization.id;
  const canManage = hasWorkspaceCapability(ws.currentRoles, 'catalog.manage');
  const sb = (await createClient()) as any;

  const [{ count: productCount }, { count: activePriceLists }, { data: shares }] = await Promise.all([
    sb.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
    sb.from('price_lists').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
    sb.from('catalog_shares').select('id, status, quote_id').eq('organization_id', orgId),
  ]);

  const sharesArr = (shares ?? []) as Array<{ status: string; quote_id: string | null }>;
  const sharesSent = sharesArr.filter((s) => s.status !== 'draft').length;
  const converted = sharesArr.filter((s) => s.quote_id).length;
  const conversionPct = sharesSent > 0 ? Math.round((converted / sharesSent) * 100) : 0;

  return (
    <CatalogHub
      canManage={canManage}
      kpis={{ products: productCount ?? 0, activePriceLists: activePriceLists ?? 0, sharesSent, conversionPct }}
    />
  );
}
