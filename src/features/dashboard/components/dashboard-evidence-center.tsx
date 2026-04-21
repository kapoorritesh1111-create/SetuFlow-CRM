import Link from 'next/link';
import type { DashboardEvidenceItem, DashboardExecutionReadiness } from '@/features/dashboard/types';
import { WidgetEmptyState, WidgetMetric, WidgetShell } from '@/components/ui/widget-shell';

const laneTone = {
  commercial: 'border-sky-200 bg-sky-50/80 text-sky-700',
  compliance: 'border-amber-200 bg-amber-50/80 text-amber-700',
  release: 'border-indigo-200 bg-indigo-50/80 text-indigo-700',
  dispatch: 'border-rose-200 bg-rose-50/80 text-rose-700',
  completion: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
} as const;

const laneLabel = {
  commercial: 'Commercial lock',
  compliance: 'Compliance docs',
  release: 'Release evidence',
  dispatch: 'Dispatch evidence',
  completion: 'Completion proof',
} as const;

const severityLabel = {
  low: 'Watch',
  medium: 'Action',
  high: 'Urgent',
  critical: 'Critical',
} as const;

export function DashboardEvidenceCenter({
  items,
  readiness,
}: {
  items: DashboardEvidenceItem[];
  readiness: DashboardExecutionReadiness;
}) {
  return (
    <WidgetShell
      eyebrow="Execution truth"
      title="Evidence center"
      description="Commercial lock, compliance, release, dispatch, and completion evidence now drive the next operator action."
    >
      <div className="grid gap-3 lg:grid-cols-4">
        <WidgetMetric label="Tracked orders" value={readiness.trackedOrders} helper="Accepted work now visible with execution truth." />
        <WidgetMetric label="Ready now" value={readiness.readyOrders} helper="Orders with no current execution blockers." />
        <WidgetMetric label="Dispatch ready" value={readiness.dispatchReadyOrders} helper="Orders clear for handoff evidence." />
        <WidgetMetric label="Blocked orders" value={readiness.blockedOrders} helper="Orders still missing governed evidence." />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Commercial gaps</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{readiness.missingCommercialLock}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Accepted work still missing contract or commercial lock posture.</p>
        </div>
        <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Compliance evidence gaps</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{readiness.missingComplianceEvidence}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Document rules or compliance items still stop progression.</p>
        </div>
        <div className="rounded-[1.35rem] border border-indigo-200 bg-indigo-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Release ready</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{readiness.releaseReadyOrders}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Orders can move into release without missing evidence.</p>
        </div>
        <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Dispatch evidence gaps</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{readiness.missingDispatchEvidence}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Transport or export evidence still blocks handoff.</p>
        </div>
        <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Completion proof ready</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{readiness.completionReadyOrders}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Orders can close with proof-of-delivery evidence in place.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-[1.4rem] border border-slate-200 bg-white/95 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${laneTone[item.lane]}`}>{laneLabel[item.lane]}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{severityLabel[item.severity]}</span>
                  {item.executionState ? <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.executionState}</span> : null}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.summary}</p>
                {item.blockerReasons.length ? (
                  <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
                    {item.blockerReasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
                  </ul>
                ) : null}
              </div>
              <div className="min-w-[140px] rounded-[1.1rem] border border-slate-200 bg-slate-50/80 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Blockers</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{item.blockerCount}</p>
                {item.companyName ? <p className="mt-1 text-xs text-slate-500">{item.companyName}</p> : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                {item.stageName ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">{item.stageName}</span> : null}
                {item.productNames?.[0] ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">{item.productNames[0]}</span> : null}
                {item.nextExecutionState ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Next {item.nextExecutionState}</span> : null}
              </div>
              <Link href={item.actionHref} className="rounded-full bg-[#1F487C] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#193769]">
                {item.actionLabel}
              </Link>
            </div>
          </article>
        )) : (
          <WidgetEmptyState
            title="Execution evidence is clear"
            description="No accepted orders currently need commercial lock, compliance, release, dispatch, or completion intervention."
          />
        )}
      </div>
    </WidgetShell>
  );
}
