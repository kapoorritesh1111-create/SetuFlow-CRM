import type { ReactNode } from 'react';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { createMarket, updateMarket } from '@/features/admin/server/actions';
import { formatDate } from '@/lib/utils';

export type AdminMarket = {
  id: string;
  name: string;
  market_code: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  updated_at: string | null;
};

const inputClass = 'min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800';
const secondaryButtonClass = 'inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50';

function MarketForm({ market }: { market?: AdminMarket }) {
  return (
    <form action={market ? updateMarket : createMarket} className="flex flex-1 flex-col overflow-hidden">
      {market ? <input type="hidden" name="id" value={market.id} /> : null}
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Market name
          <input className={`${inputClass} mt-1 w-full`} name="name" defaultValue={market?.name ?? ''} placeholder="Market name, e.g. GCC" required />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Market code
          <input className={`${inputClass} mt-1 w-full uppercase`} name="market_code" defaultValue={market?.market_code ?? ''} placeholder="Code" />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Sort order
          <input className={`${inputClass} mt-1 w-full`} name="sort_order" type="number" defaultValue={market?.sort_order ?? 0} />
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="is_active" defaultChecked={market?.is_active ?? true} />
          Active market
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <a href="#markets" className={secondaryButtonClass}>Cancel</a>
        <button type="submit" className={primaryButtonClass}>{market ? 'Save market' : 'Add market'}</button>
      </div>
    </form>
  );
}

function DrawerShell({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div id={id} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
      <a href="#markets" className="absolute inset-0" aria-label="Close market drawer" />
      <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Market setup</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <a href="#markets" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close market drawer">X</a>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MarketDrawer({ markets }: { markets: AdminMarket[] }) {
  return (
    <div id="markets" className="space-y-6">
      <SectionCard
        title="Markets"
        eyebrow="Operational coverage"
        description="Review market coverage at a glance. Click Edit to update details in a focused drawer."
        actions={<a href="#add-market" className={primaryButtonClass}>+ Add market</a>}
      >
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Countries</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sort #</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Edit</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => (
                <tr key={market.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{market.name}</td>
                  <td className="px-4 py-3 font-mono text-xs uppercase text-slate-500">{market.market_code || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge label="Linked by countries" tone="neutral" dot={false} /></td>
                  <td className="px-4 py-3"><StatusBadge label={market.is_active ? 'Active' : 'Inactive'} tone={market.is_active ? 'success' : 'neutral'} dot={false} /></td>
                  <td className="px-4 py-3 text-slate-500">#{market.sort_order ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">{market.updated_at ? formatDate(market.updated_at) : '-'}</td>
                  <td className="px-4 py-3"><a href={`#market-${market.id}`} className={secondaryButtonClass}>Edit</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {markets.length === 0 ? <p className="mt-4 text-sm text-slate-500">No markets configured yet. Add the first market to unlock market-aware workflows.</p> : null}
      </SectionCard>

      {markets.map((market) => (
        <DrawerShell key={market.id} id={`market-${market.id}`} title={market.name} subtitle={`Code: ${market.market_code || 'Not set'}`}>
          <MarketForm market={market} />
        </DrawerShell>
      ))}

      <DrawerShell id="add-market" title="Add market" subtitle="Create a market used by leads, catalog pricing, quotes, and routing.">
        <MarketForm />
      </DrawerShell>
    </div>
  );
}
