import { getWorkspaceIssues, getSprintList } from '@/lib/queries/workspace';
import { SprintPlanningBoard } from '@/features/workspace/components/sprint-planning-board';
import { filterIssuesForSmc, normalizeSmcFilters, type SmcFilterInput } from '@/features/workspace/filters';

export const dynamic = 'force-dynamic';

export default async function SprintsPage({ searchParams }: { searchParams?: SmcFilterInput }) {
  const [allIssues, sprints] = await Promise.all([getWorkspaceIssues(), getSprintList()]);
  const filters = normalizeSmcFilters(searchParams);
  const currentSprint = filters.sprint ?? (sprints[0]?.sprint_number ?? 23);
  const issues = filterIssuesForSmc(allIssues, { ...filters, sprint: undefined });

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/55">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0c7fff] dark:text-violet-300">Setu Mission Control</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Sprint War Room</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Global SMC filters apply to sprint planning. Use the sprint chips below to switch commitment views.</p>
      </div>
      <SprintPlanningBoard issues={issues} sprints={sprints} currentSprint={currentSprint} />
    </div>
  );
}
