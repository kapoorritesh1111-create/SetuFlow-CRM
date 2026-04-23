import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import type { CountryCoverageDatum } from '@/features/dashboard/types';

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function CountryTableCard({ items }: { items: CountryCoverageDatum[] }) {
  const rows = [...items].sort((a, b) => Number(b.pipelineValue ?? 0) - Number(a.pipelineValue ?? 0) || b.activeLeadCount - a.activeLeadCount).slice(0, 7);
  return (
    <WidgetShell title="Country Performance" description="Country, lead, quote, and value view for fast map-to-table comparison." eyebrow="Markets">
      {rows.length ? (
        <div className="overflow-hidden rounded-[1rem] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Country</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Leads</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Quotes</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((item) => (
                <tr key={item.countryCode}>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{item.countryName}</td>
                  <td className="px-3 py-2.5 text-slate-600">{item.activeLeadCount}</td>
                  <td className="px-3 py-2.5 text-slate-600">{item.openQuoteCount}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-950">{formatCompactCurrency(Number(item.pipelineValue ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <WidgetEmptyState title="No active countries" description="Country values appear once open leads have market data." />}
    </WidgetShell>
  );
}
