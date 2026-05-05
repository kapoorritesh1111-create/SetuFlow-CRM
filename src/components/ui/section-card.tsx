import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { workspaceHeroClass } from '@/components/ui/workspace-surfaces';

export function SectionCard({
  className,
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  className?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn(workspaceHeroClass, 'p-5 sm:p-6', className)}>
      {title || eyebrow || description || actions ? (
        <div className="mb-5 flex flex-col gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-slate-700/70">
          <div>
            {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-sky-300">{eyebrow}</p> : null}
            {title ? <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2> : null}
            {/* Educational section descriptions are available from the page Help pop-up. */}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
