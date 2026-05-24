import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { MarketsAdminWorkspace } from '@/features/admin/components/admin-reference-workspaces';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

type MarketRow = Record<string, unknown> & {
  id: string;
  name: string;
  market_code: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  updated_at: string | null;
};

type HeroStat = {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const { data: rowsData } = await supabase.from('markets').select('id, name, market_code, sort_order, is_active, updated_at').eq('organization_id', organization.id).order('sort_order', { ascending: true }).order('name', { ascending: true });
  const rows = (rowsData ?? []) as MarketRow[];
  const stats: HeroStat[] = [
    { label: 'Markets', value: rows.length, tone: rows.length ? 'success' : 'warning' },
    { label: 'Active', value: rows.filter((item) => item.is_active).length, tone: 'info' },
  ];
  return <AdminSettingsShell active="markets" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0}><AdminPageHero title="Markets" description="Manage the active market list that powers leads, catalog pricing, quote routing, and country coverage." badge={organization.name} stats={stats} /><MarketsAdminWorkspace markets={rows} /></AdminSettingsShell>;
}
