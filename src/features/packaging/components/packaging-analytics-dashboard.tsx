import { PRODUCTION_STAGES } from '@/lib/packaging/types';
import type { PackagingProductionAnalytics } from '@/lib/packaging/queries';
import { PageHeader } from '@/components/ui/page-header';
import { workspacePanelClass } from '@/components/ui/workspace-surfaces';

/**
 * S27-STARK-E1 — Packaging analytics dashboard (Phase E, second half).
 * Server component — all figures come pre-computed from
 * getPackagingProductionAnalytics(). Revenue is INR-only (see note on that
 * query) since Stark is a domestic-only packaging org.
 */

function money(value: number) {
  return `INR ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pct(part: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

export default function PackagingAnalyticsDashboard({ data }: { data: PackagingProductionAnalytics }) {
  const { stageCounts, jobsInProduction, dispatchedLast30Days, avgCycleDays, revenueInProduction, familyMix, digitalVsFlexo, cylinderStats } = data;

  const maxStageCount = Math.max(1, ...PRODUCTION_STAGES.map((stage) => stageCounts[stage.key] ?? 0));
  const maxFamilyRevenue = Math.max(1, ...familyMix.map((row) => row.revenue));
  const printProcessTotal = digitalVsFlexo.digital.count + digitalVsFlexo.flexo.count;
  const cylinderTotal = cylinderStats.reused + cylinderStats.fresh;

  return (
    <div className="space-y-4 pb-16">
      <PageHeader
        eyebrow="Packaging Insights"
        title="Packaging Analytics"
        description="Production throughput, revenue mix, and flexo cylinder economics for the packaging vertical — computed from accepted quotes and the live production-stage log."
        meta={[`${jobsInProduction} jobs in production`, `${dispatchedLast30Days} dispatched (30d)`]}
      />

      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Jobs in production</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{jobsInProduction}</p>
          <p className="text-xs text-content-muted">Not yet dispatched</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Dispatched, last 30 days</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{dispatchedLast30Days}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Avg. pre-press → dispatch</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{avgCycleDays != null ? `${avgCycleDays}d` : '—'}</p>
          <p className="text-xs text-content-muted">{avgCycleDays == null ? 'No completed cycles logged yet' : 'Across jobs with both stages logged'}</p>
        </div>
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Value in production</p>
          <p className="mt-1 text-2xl font-bold text-content-primary">{money(revenueInProduction)}</p>
          <p className="text-xs text-content-muted">Accepted, not yet dispatched</p>
        </div>
      </section>

      <section className={`${workspacePanelClass} p-4`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Production stage funnel</p>
        <p className="mt-1 text-xs text-content-muted">How many jobs currently sit at each stage, across every job that has ever entered tracking.</p>
        <div className="mt-3 space-y-2">
          {PRODUCTION_STAGES.map((stage) => {
            const count = stageCounts[stage.key] ?? 0;
            const widthPct = Math.max(4, Math.round((count / maxStageCount) * 100));
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-xs font-semibold text-content-secondary">{stage.label}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-ctl bg-surface-2">
                  <div className="h-full rounded-ctl bg-accent-500" style={{ width: `${widthPct}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-bold text-content-primary">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={`${workspacePanelClass} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Revenue by service family</p>
          <p className="mt-1 text-xs text-content-muted">Accepted quotes, all-time.</p>
          {familyMix.length ? (
            <ul className="mt-3 space-y-2">
              {familyMix.map((row) => (
                <li key={row.familyName}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-content-primary">{row.familyName}</span>
                    <span className="text-content-secondary">{money(row.revenue)} · {row.jobCount} job{row.jobCount === 1 ? '' : 's'}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(3, Math.round((row.revenue / maxFamilyRevenue) * 100))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-content-muted">No accepted packaging quotes yet.</p>
          )}
        </section>

        <section className={`${workspacePanelClass} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Digital vs. flexo</p>
          <p className="mt-1 text-xs text-content-muted">By job count and revenue, accepted quotes.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-ctl border border-line bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Digital</p>
              <p className="mt-1 text-xl font-bold text-content-primary">{digitalVsFlexo.digital.count} jobs</p>
              <p className="text-xs text-content-muted">{money(digitalVsFlexo.digital.revenue)} · {pct(digitalVsFlexo.digital.count, printProcessTotal)}</p>
            </div>
            <div className="rounded-ctl border border-line bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Flexo</p>
              <p className="mt-1 text-xl font-bold text-content-primary">{digitalVsFlexo.flexo.count} jobs</p>
              <p className="text-xs text-content-muted">{money(digitalVsFlexo.flexo.revenue)} · {pct(digitalVsFlexo.flexo.count, printProcessTotal)}</p>
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-content-muted">Flexo cylinder usage</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-ctl border border-line bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Cylinder reused</p>
              <p className="mt-1 text-xl font-bold text-content-primary">{cylinderStats.reused}</p>
              <p className="text-xs text-content-muted">{pct(cylinderStats.reused, cylinderTotal)} of flexo jobs with a cylinder charge decision</p>
            </div>
            <div className="rounded-ctl border border-line bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Fresh cylinder</p>
              <p className="mt-1 text-xl font-bold text-content-primary">{cylinderStats.fresh}</p>
              <p className="text-xs text-content-muted">{money(cylinderStats.cylinderChargesCollected)} total cylinder charges collected</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-content-muted">
            This counts reuse decisions, not hypothetical savings — recomputing what a reused cylinder "would have cost" needs a full pricing-engine re-run per job, which is out of scope for this dashboard pass.
          </p>
        </section>
      </div>
    </div>
  );
}
