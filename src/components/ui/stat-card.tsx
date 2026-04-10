import { workspacePanelClass } from '@/components/ui/workspace-surfaces';

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className={`${workspacePanelClass} p-5`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{helper}</p> : null}
    </div>
  );
}
