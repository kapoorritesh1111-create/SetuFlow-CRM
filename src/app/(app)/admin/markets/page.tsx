import { StateMessage } from '@/components/ui/state-message';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitNextStep } from '@/features/admin/components/admin-ui-kit';
import { getAdminNavSignals } from '@/features/admin/server/nav-signals';
import { createMarket, updateMarket } from '@/features/admin/server/actions';
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
  country_count?: number;
};

const inputClass = 'min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const buttonClass = 'inline-flex min-h-8 items-center justify-center rounded-ctl bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-800';
const secondaryButtonClass = 'inline-flex min-h-8 items-center justify-center rounded-ctl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50';

function MarketStatus({ active }: { active: boolean | null }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function getErrorDigest(err: unknown) {
  if (!err || typeof err !== 'object' || !('digest' in err)) return '';
  const digest = (err as { digest?: unknown }).digest;
  return typeof digest === 'string' ? digest : '';
}

function MarketsWorkspace({ markets }: { markets: MarketRow[] }) {
  return (
    <div id="markets" className="space-y-6">
      <section className="overflow-hidden rounded-ctl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.15em] text-slate-400">Operational coverage</p>
            <h2 className="text-[13px] font-bold text-slate-950">Markets</h2>
          </div>
          <a href="#add-market" className="inline-flex shrink-0 items-center rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700 transition hover:bg-teal-100">+ Add market</a>
        </div>
        <div className="px-4 py-1.5">
          {markets.map((market) => (
            <div key={market.id} className={`flex items-center gap-2.5 border-b border-slate-50 py-2 last:border-b-0${market.is_active ? '' : ' opacity-60'}`}>
              <span aria-hidden="true" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-[13px]">🌍</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">{market.name}</p>
                <p className="text-[10.5px] text-slate-500">{market.market_code ? `${String(market.market_code).toUpperCase()} · ` : ''}{market.country_count ?? 0} countr{(market.country_count ?? 0) === 1 ? 'y' : 'ies'} · Sort {market.sort_order ?? 0}</p>
              </div>
              <MarketStatus active={market.is_active} />
              <a href={`#market-${market.id}`} className="shrink-0 text-[10px] font-semibold text-slate-500 transition hover:text-teal-600">Edit ›</a>
            </div>
          ))}
        </div>
        {markets.length === 0 ? (
          <div className="mx-4 mb-4 rounded-ctl border border-dashed border-amber-300 bg-amber-50 p-4 text-[11.5px] leading-[1.6] text-amber-900">
            <strong>⚠ No markets configured</strong>
            <p className="mt-2">Markets drive lead routing, pipeline defaults, Setu Guru context, and pricing rules. Add your first market.</p>
            <p className="mt-2 text-[11px] italic">Common starting set: Europe, North America, Middle East &amp; Africa, Asia Pacific</p>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-ctl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.15em] text-slate-400">Add market</p>
            <h2 className="text-[13px] font-bold text-slate-950">Market form</h2>
          </div>
        </div>
        <form action={createMarket} className="px-4 py-3.5">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <label className="block"><span className="mb-1 block text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Market name</span><input className={`${inputClass} w-full`} name="name" placeholder="e.g. North America" required /></label>
            <label className="block"><span className="mb-1 block text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Market code</span><input className={`${inputClass} w-full uppercase`} name="market_code" placeholder="e.g. NA" /></label>
            <label className="block"><span className="mb-1 block text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Sort order</span><input className={`${inputClass} w-full`} name="sort_order" type="number" defaultValue="0" /></label>
          </div>
          <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-2.5">
            <button type="submit" className={buttonClass}>Save market</button>
          </div>
        </form>
      </section>

      {markets.map((market) => (
        <div key={`drawer-${market.id}`} id={`market-${market.id}`} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
          <a href="#markets" className="absolute inset-0" aria-label="Close market drawer" />
          <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Market setup</p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">{market.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Code: {market.market_code ?? 'Not set'}</p>
              </div>
              <a href="#markets" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close market drawer">X</a>
            </div>
            <form action={updateMarket} className="flex flex-1 flex-col overflow-hidden">
              <input type="hidden" name="id" value={market.id} />
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Market name<input className={`${inputClass} mt-1 w-full`} name="name" defaultValue={market.name} required /></label>
                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Market code<input className={`${inputClass} mt-1 w-full uppercase`} name="market_code" defaultValue={market.market_code ?? ''} /></label>
                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sort order<input className={`${inputClass} mt-1 w-full`} name="sort_order" type="number" defaultValue={market.sort_order ?? 0} /></label>
                <label className="flex items-center gap-2 rounded-ctl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-semibold text-slate-700"><input type="checkbox" name="is_active" defaultChecked={market.is_active ?? true} /> Active market</label>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><a href="#markets" className={secondaryButtonClass}>Cancel</a><button type="submit" className={buttonClass}>Save market</button></div>
            </form>
          </aside>
        </div>
      ))}

      <div id="add-market" className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
        <a href="#markets" className="absolute inset-0" aria-label="Close add market drawer" />
        <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Market setup</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Add market</h2>
              <p className="mt-1 text-sm text-slate-500">Create a market used by leads, catalog pricing, quotes, and routing.</p>
            </div>
            <a href="#markets" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close add market drawer">X</a>
          </div>
          <form action={createMarket} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Market name<input className={`${inputClass} mt-1 w-full`} name="name" placeholder="Market name, e.g. GCC" required /></label>
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Market code<input className={`${inputClass} mt-1 w-full uppercase`} name="market_code" placeholder="Code" /></label>
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sort order<input className={`${inputClass} mt-1 w-full`} name="sort_order" type="number" defaultValue="0" /></label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><a href="#markets" className={secondaryButtonClass}>Cancel</a><button type="submit" className={buttonClass}>Add market</button></div>
          </form>
        </aside>
      </div>
    </div>
  );
}

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
    if (marketsResult.error) console.error('[markets page] markets query error:', marketsResult.error);
    if (countriesResult.error) console.error('[markets page] countries query error:', countriesResult.error);
    const rawMarkets = (marketsResult.data ?? []) as MarketRow[];
    const countByMarket: Record<string, number> = {};
    for (const row of (countriesResult.data ?? []) as { market_id: string | null }[]) {
      if (row.market_id) countByMarket[row.market_id] = (countByMarket[row.market_id] ?? 0) + 1;
    }
    const rows = rawMarkets.map((market) => ({ ...market, country_count: countByMarket[market.id] ?? 0 }));
    const totalCountries = Object.values(countByMarket).reduce((total, current) => total + current, 0);
    const threshold = typeof (organization as any).approval_threshold_pct === 'number' ? (organization as any).approval_threshold_pct : null;
    const { dots: navDots } = await getAdminNavSignals(supabase, organization.id, threshold);
    return <AdminSettingsShell active="markets" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0} navDots={navDots} tbarChips={[{ label: `${rows.length} market${rows.length === 1 ? '' : 's'}`, tone: rows.length ? 'ok' : 'warn' }, { label: `${totalCountries} countries`, tone: 'neutral' }]} tbarAction={<a href="#add-market" className={buttonClass}>+ Add market</a>}>
      <MarketsWorkspace markets={rows} />
      {rows.length === 0
        ? <KitNextStep icon="🌍" label="Add a market to unlock pipeline setup" description="Pipeline stages are blocked until at least one market exists" href="#add-market" warn />
        : <KitNextStep icon="📊" label="Markets set — configure pipelines for each market" description="Link pipeline stages to your active markets" href="/admin/pipelines" />}
    </AdminSettingsShell>;
  } catch (err) {
    const digest = getErrorDigest(err);
    const isNextRedirect = err instanceof Error && (err.message?.includes('NEXT_REDIRECT') || digest.startsWith('NEXT_REDIRECT'));
    const isNextNotFound = digest.startsWith('NEXT_NOT_FOUND');
    if (isNextRedirect || isNextNotFound) throw err;
    console.error('[markets page] unhandled error:', err);
    return (
      <AdminSettingsShell active="markets" organizationName="Unknown" missingCount={1}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">Markets workspace could not load</p>
          <p className="mt-1 text-sm text-amber-800">There was a problem loading market data. This is usually temporary — please try again.</p>
          <a href="/admin/markets" className="mt-3 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">Retry</a>
        </div>
      </AdminSettingsShell>
    );
  }
}
