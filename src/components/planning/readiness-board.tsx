import { readinessAreas, readinessSummary, sprintFocus, type ChecklistStatus } from '@/components/planning/development-status';
import { StatusBadge } from '@/components/ui/status-badge';

const STATUS_META: Record<ChecklistStatus, { label: string; tone: 'success' | 'warning' | 'info' | 'neutral' }> = {
  done: { label: 'Ready', tone: 'success' },
  'in-progress': { label: 'In progress', tone: 'info' },
  next: { label: 'Next', tone: 'warning' },
  locked: { label: 'Locked', tone: 'neutral' },
};

export function ReadinessBoard() {
  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#359F91]">Current sprint</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{sprintFocus.sprint}</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">{sprintFocus.title}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <StatusBadge label={readinessSummary.status} tone="success" />
            <StatusBadge label={readinessSummary.driftRisk} tone="warning" />
          </div>
        </div>
        <div className="rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] p-8 text-white shadow-[0_20px_60px_rgba(31,72,124,0.15)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Next action</p>
          <p className="mt-3 text-2xl font-semibold leading-tight">{sprintFocus.nextAction}</p>
          <p className="mt-4 text-sm leading-7 text-white/85">Scope remains locked to {sprintFocus.flow}. Do not skip ahead to later sprints or remove proven build-safe fixes without real evidence.</p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Build status', readinessSummary.buildStatus],
          ['Flow contract', sprintFocus.flow],
          ['Drift risk', readinessSummary.driftRisk],
          ['Blockers', readinessSummary.blockers],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.75rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_18px_40px_rgba(31,72,124,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#359F91]">{label}</p>
            <p className="mt-3 text-base font-semibold leading-7 text-slate-900">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#359F91]">Readiness by area</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">The actual state of the active sprint right now</h2>
          </div>
          <StatusBadge label={readinessSummary.status} tone="success" />
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {readinessAreas.map((area) => {
            const meta = STATUS_META[area.status];
            return (
              <div key={area.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold text-slate-950">{area.title}</p>
                  <StatusBadge label={meta.label} tone={meta.tone} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{area.summary}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
