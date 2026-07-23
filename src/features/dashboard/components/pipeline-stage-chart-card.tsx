'use client';

import { useRouter } from 'next/navigation';
import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import type { DashboardStageCount } from '@/features/dashboard/types';

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function PipelineStageChartCard({ items }: { items: DashboardStageCount[] }) {
  const router = useRouter();
  const visible = items.filter((item) => item.count > 0 || (item.valueImpact ?? 0) > 0);
  const max = Math.max(...visible.map((item) => item.count), 1);
  const totalValue = visible.reduce((sum, item) => sum + Number(item.valueImpact ?? 0), 0);
  const totalCount = visible.reduce((sum, item) => sum + item.count, 0);
  const activeStages = visible.length;
  const avgStageValue = activeStages ? totalValue / activeStages : 0;

  return (
    <WidgetShell
      title="Pipeline Stage Distribution"
      description="Read count and value together so each stage shows commercial weight, not just traffic. Click any stage to drill into the buyer pipeline."
      eyebrow="Pipeline"
      className="h-full border border-slate-200/85 bg-white/96 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
    >
      {visible.length ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-panel border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Open stages</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{activeStages}</p>
            </div>
            <div className="rounded-panel border border-slate-200 bg-slate-50/90 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Open deals</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{totalCount.toLocaleString()}</p>
            </div>
            <div className="rounded-panel border border-emerald-200 bg-emerald-50/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Pipeline value</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{formatCompactCurrency(totalValue)}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-panel border border-slate-200/90 bg-white/90 p-4">
            {visible.map((item) => {
              const width = Math.max((item.count / max) * 100, item.count ? 10 : 0);
              return (
                <button
                  key={item.stageId}
                  type="button"
                  onClick={() => router.push(`/pipeline/buyers?stage=${encodeURIComponent(item.stageId)}`)}
                  className="block w-full space-y-2.5 rounded-2xl px-2 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  title={`Open buyer pipeline filtered to ${item.stageName}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.stageName}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{item.count.toLocaleString()} active records flowing through this stage</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-950">{formatCompactCurrency(Number(item.valueImpact ?? 0))}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.count} deals</p>
                    </div>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: item.colorToken ?? '#2563eb' }} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Average stage value</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{formatCompactCurrency(avgStageValue)}</p>
            </div>
            <div className="rounded-panel border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reading guide</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">Stage bars show flow volume while value labels keep commercial priority visible.</p>
            </div>
          </div>
        </div>
      ) : (
        <WidgetEmptyState title="No open leads yet" description="Pipeline stages will populate as leads enter the funnel." />
      )}
    </WidgetShell>
  );
}
