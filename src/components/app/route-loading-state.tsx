import { WidgetShell } from '@/components/ui/widget-shell';
import { workspacePanelClass } from '@/components/ui/workspace-surfaces';

export function RouteLoadingState({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <WidgetShell eyebrow={eyebrow} title={title} description={description}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={`${workspacePanelClass} p-5`}>
              <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 h-8 w-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
              <div className="mt-6 space-y-2">
                <div className="h-3 w-full animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </WidgetShell>
    </div>
  );
}
