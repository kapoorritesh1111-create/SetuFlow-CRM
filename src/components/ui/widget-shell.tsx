import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  workspaceActionClass,
  workspaceFieldSurfaceClass,
  workspaceGlassClass,
  workspaceInsetClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';

export function WidgetShell({
  title,
  description,
  eyebrow,
  actions,
  filters,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn('group relative overflow-hidden rounded-[2rem] ring-1 ring-slate-950/[0.04] backdrop-blur before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.96),transparent)] dark:ring-white/[0.04] dark:before:bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.36),transparent)]', workspaceGlassClass, className)}>
      <div className="border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/70 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-sky-300">{eyebrow}</p> : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">{title}</h3>
              {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
            </div>
            {description ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end [&>*]:w-full sm:[&>*]:w-auto">{actions}</div> : null}
        </div>
      </div>
      <div className={cn('px-5 py-5 sm:px-6 sm:py-6', contentClassName)}>{children}</div>
    </section>
  );
}

export function WidgetToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-[1.5rem] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_16px_32px_rgba(15,23,42,0.05)] ring-1 ring-slate-950/[0.03] dark:ring-white/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-4', workspaceGlassClass, className)}>
      {children}
    </div>
  );
}

export function WidgetFilterChip({
  active = false,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'rounded-full border px-3 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active ? workspacePrimaryButtonClass : workspaceSecondaryButtonClass,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function WidgetEmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[1.5rem] border border-dashed px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]', workspaceInsetClass, className)}>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p> : null}
    </div>
  );
}

export function WidgetLoadingState({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('animate-pulse space-y-3', className)} aria-hidden="true">
      <div className="h-4 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-16 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}

export function WidgetMetric({
  label,
  value,
  helper,
  className,
}: {
  label: string;
  value: string | number;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-[1.75rem] border p-4 ring-1 ring-slate-950/[0.03] before:pointer-events-none before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.98),transparent)] dark:ring-white/[0.04] dark:before:bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.34),transparent)]', workspaceGlassClass, className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{helper}</p> : null}
    </div>
  );
}
