import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { MarketsAdminWorkspace } from '@/features/admin/components/admin-reference-workspaces';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

type MarketRow = Record<string, unknown> & {
  id: string; name: string; market_code: string | null; sort_order: number | null;
  is_active: boolean | null; updated_at: string | null; country_count?: number;
};

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const [marketsResult, countriesResult] = await Promise.all([
    supabase.from('markets').select('id, name, market_code, sort_order, is_active, updated_at').eq('organization_id', organization.id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('countries').select('market_id').eq('organization_id', organization.id),
  ]);
  const rawMarkets = (marketsResult.data ?? []) as MarketRow[];
  const countByMarket: Record<string, number> = {};
  for (const r of (countriesResult.data ?? []) as { market_id: string | null }[]) {
    if (r.market_id) countByMarket[r.market_id] = (countByMarket[r.market_id] ?? 0) + 1;
  }
  const rows: MarketRow[] = rawMarkets.map((m) => ({ ...m, country_count: countByMarket[m.id] ?? 0 }));
  const totalCountries = Object.values(countByMarket).reduce((a, b) => a + b, 0);
  return <AdminSettingsShell active="markets" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0}>
    <AdminPageHero title="Markets" description="Manage the active market list. Click any row to edit in the drawer — no inline save buttons needed per row." badge={organization.name}
      stats={[{ label: 'Markets', value: rows.length, tone: rows.length ? 'success' : 'warning' }, { label: 'Active', value: rows.filter((r) => r.is_active).length, tone: 'info' }, { label: 'Countries', value: totalCountries, tone: 'info' }] as any} />
    <MarketsAdminWorkspace markets={rows} />
  </AdminSettingsShell>;
}
