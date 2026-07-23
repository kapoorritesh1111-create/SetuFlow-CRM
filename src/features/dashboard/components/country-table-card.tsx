import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import type { CountryCoverageDatum } from '@/features/dashboard/types';

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function CountryTableCard({ items }: { items: CountryCoverageDatum[] }) {
  const rows = [...items]
    .sort((a, b) => Number(b.pipelineValue ?? 0) - Number(a.pipelineValue ?? 0) || b.activeLeadCount - a.activeLeadCount)
    .slice(0, 7);
  const totalValue = rows.reduce((sum, item) => sum + Number(item.pipelineValue ?? 0), 0);
  const totalQuotes = rows.reduce((sum, item) => sum + item.openQuoteCount, 0);
  const topCountry = rows[0];

  return (
    <WidgetShell
      title="Country Performance"
      description="Fast market table for comparing activity, quote pressure, and value concentration side by side."
      eyebrow="Markets"
      className="h-full border border-slate-200/85 bg-white/96 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
    >
      {rows.length ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-panel border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Markets shown</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{rows.length}</p>
            </div>
            <div className="rounded-panel border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quotes in motion</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{totalQuotes}</p>
            </div>
            <div className="rounded-panel border border-sky-200 bg-sky-50/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">Visible value</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{formatCompactCurrency(totalValue)}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-panel border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/90">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Country</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Leads</th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quotes</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((item, index) => (
                  <tr key={item.countryCode} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                          {item.countryCode.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{item.countryName}</p>
                          <p className="text-[11px] text-slate-500">{index === 0 ? 'Top value market' : item.topAccounts[0]?.companyName ?? 'Active commercial coverage'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 font-medium text-slate-700">{item.activeLeadCount}</td>
                    <td className="px-3 py-3.5 font-medium text-slate-700">{item.openQuoteCount}</td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="font-semibold text-slate-950">{formatCompactCurrency(Number(item.pipelineValue ?? 0))}</p>
                      <p className="text-[11px] text-slate-500">{item.openRfqCount} RFQs</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {topCountry ? (
            <div className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Market signal</p>
              <p className="mt-1 text-sm leading-5 text-slate-700">
                <span className="font-semibold text-slate-950">{topCountry.countryName}</span> currently carries the strongest visible value in the active market mix.
              </p>
            </div>
          ) : null}
        </div>
      ) : <WidgetEmptyState title="No active countries" description="Country values appear once open leads have market data." />}
    </WidgetShell>
  );
}
