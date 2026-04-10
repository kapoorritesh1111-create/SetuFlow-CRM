import { checklistItems, type ChecklistStatus } from '@/components/planning/development-status';
import { StatusBadge } from '@/components/ui/status-badge';

const STATUS_META: Record<ChecklistStatus, { label: string; tone: 'success' | 'warning' | 'info' | 'neutral' }> = {
  done: { label: 'Done', tone: 'success' },
  'in-progress': { label: 'In progress', tone: 'info' },
  next: { label: 'Next', tone: 'warning' },
  locked: { label: 'Locked', tone: 'neutral' },
};

export function DevelopmentChecklist() {
  const grouped = checklistItems.reduce<Record<string, typeof checklistItems>>((acc, item) => {
    acc[item.area] = acc[item.area] || [];
    acc[item.area].push(item);
    return acc;
  }, {});

  const completed = checklistItems.filter((item) => item.status === 'done').length;
  const progress = Math.round((completed / checklistItems.length) * 100);

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#359F91]">Master checklist</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Repo-backed Sprint 1 execution tracker</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">This status is now maintained in the repo so the HTML workplace, readiness view, and implementation pages stay aligned every time code changes.</p>
          </div>
          <div className="min-w-[220px] rounded-[1.5rem] border border-[#1F487C]/10 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Progress</p>
            <p className="mt-1 text-3xl font-semibold text-[#1F487C]">{progress}%</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#1F487C_0%,#359F91_100%)]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{completed} of {checklistItems.length} items complete</p>
          </div>
        </div>
      </div>

      {Object.entries(grouped).map(([area, items]) => (
        <section key={area} className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#359F91]">{area}</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">{area}</h3>
            </div>
            <div className="rounded-full bg-[#1F487C]/5 px-3 py-1 text-xs font-semibold text-[#1F487C]">
              {items.filter((item) => item.status === 'done').length}/{items.length} done
            </div>
          </div>
          <div className="space-y-3">
            {items.map((item) => {
              const meta = STATUS_META[item.status];
              return (
                <div key={item.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-sm font-semibold leading-6 text-slate-800">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
                    </div>
                    <StatusBadge label={meta.label} tone={meta.tone} className="shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
