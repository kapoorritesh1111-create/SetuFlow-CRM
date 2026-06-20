import { WorkspaceState } from '@/components/ui/workspace-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { createClient } from '@/lib/supabase/server';
import { PriceListManager } from './price-list-manager';
import type { PriceList } from '@/lib/catalog-share/types';

export const dynamic = 'force-dynamic';

export default async function PriceListsPage() {
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
  const canManage = hasWorkspaceCapability(ws.currentRoles, 'catalog.manage');
  const sb = (await createClient()) as any;
  const { data: lists } = await sb.from('price_lists').select('*').eq('organization_id', ws.organization.id).order('created_at', { ascending: false });
  const ids = (lists ?? []).map((l: any) => l.id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: items } = await sb.from('price_list_items').select('price_list_id').in('price_list_id', ids);
    for (const it of (items ?? []) as any[]) counts[it.price_list_id] = (counts[it.price_list_id] ?? 0) + 1;
  }
  const initialLists: (PriceList & { product_count: number })[] = (lists ?? []).map((l: any) => ({ ...l, product_count: counts[l.id] ?? 0 }));

  return <PriceListManager initialLists={initialLists} canManage={canManage} />;
}
