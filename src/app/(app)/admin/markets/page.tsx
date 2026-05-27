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
  try {
    const { missingEnv, membership, organization } = await requireAdminWorkspace();
    if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
    if (!membership || !organization) return null;
    const supabase = await createClient();
    const [marketsResult, countriesResult] = await Promise.all([
      supabase.from('markets').select('id, name, market_code, sort_order, is_active, updated_at').eq('organization_id', organization.id).order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabase.from('countries').select('market_id').eq('organization_id', organization.id),
    ]);
    // SF-20-001 fix: handle query errors gracefully instead of crashing
    if (marketsResult.error) {
      console.error('[markets page] markets query error:', marketsResult.error);
    }
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
  } catch (err) {
    // SF-20-001: Prevent unhandled exceptions from triggering the error boundary
    const isNextRedirect = err instanceof Error && (err.message?.includes('NEXT_REDIRECT') || (err as any).digest?.startsWith('NEXT_REDIRECT'));
    const isNextNotFound = err instanceof Error && (err as any).digest?.startsWith('NEXT_NOT_FOUND');
    if (isNextRedirect || isNextNotFound) throw err; // re-throw Next.js navigation errors
    console.error('[markets page] unhandled error:', err);
    return (
      <AdminSettingsShell active="markets" organizationName="Unknown" missingCount={1}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">Markets workspace could not load</p>
          <p className="mt-1 text-sm text-amber-800">There was a problem loading market data. This is usually temporary — please try again.</p>
          <a href="/admin/markets" className="mt-3 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">↺ Retry</a>
        </div>
      </AdminSettingsShell>
    );
  }
}
