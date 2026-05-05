import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { StatusBadge, getStatusTone } from '@/components/ui/status-badge';
import { workspaceHeroClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

type HeaderAction = {
  label: string;
  href?: string;
  type?: 'primary' | 'secondary';
};

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  status,
  meta,
  actions = [],
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: string;
  status?: string;
  meta?: string[];
  actions?: HeaderAction[];
  className?: string;
}) {
  const actionNodes: ReactNode = actions.length ? (
    <>
      {actions.map((action) => {
        const classes = action.type === 'primary' ? workspacePrimaryButtonClass : workspaceSecondaryButtonClass;
        if (!action.href) return null;
        return (
          <Link
            key={`${action.label}-${action.href}`}
            href={action.href}
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              classes,
            )}
          >
            {action.label}
          </Link>
        );
      })}
    </>
  ) : null;

  return (
    <section className={cn(workspaceHeroClass, 'px-5 py-5 sm:px-6 sm:py-6', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-4xl">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700 dark:text-sky-300">{eyebrow}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[1.9rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[2.15rem]">{title}</h1>
            {badge ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                {badge}
              </span>
            ) : null}
            {status ? <StatusBadge label={status} tone={getStatusTone(status)} /> : null}
          </div>
          {/* Long page education belongs in the Help pop-up, not in the main page header. */}
          {meta?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {meta.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {actionNodes ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end [&>*]:w-full sm:[&>*]:w-auto">{actionNodes}</div>
        ) : null}
      </div>
    </section>
  );
}
