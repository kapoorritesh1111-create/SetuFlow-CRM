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
    <section className={cn('group relative overflow-hidden rounded-[1.85rem] ring-1 ring-slate-950/[0.04] backdrop-blur before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.96),transparent)] dark:ring-white/[0.04] dark:before:bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.36),transparent)]', workspaceGlassClass, className)}>
      <div className="border-b border-slate-200/70 px-5 py-4.5 dark:border-slate-700/70 sm:px-6 sm:py-5">
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

function EmptyMarketSetupState() {
  return (
    <div className="mb-5 rounded-[1.35rem] border border-sky-100 bg-[linear-gradient(135deg,#f8fbff,#eef6ff)] p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] ring-1 ring-slate-950/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0c7fff]">Map setup mode</p>
          <h4 className="mt-2 text-lg font-black tracking-tight text-slate-950">No market pins yet</h4>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">The live world map appears after the first buyer or supplier lead has a country. Until then, use the setup checklist above to create catalog, lead, and quote data.</p>
        </div>
        <div className="rounded-full border border-sky-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700 shadow-sm">0 active markets</div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ['1', 'Add catalog', 'Create the commercial baseline.'],
          ['2', 'Create lead', 'Capture buyer or supplier country.'],
          ['3', 'Send quote', 'Activate pipeline and map signals.'],
        ].map(([num, stepTitle, stepDescription]) => (
          <div key={num} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{num}</span>
              <div>
                <p className="text-sm font-black text-slate-950">{stepTitle}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{stepDescription}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const showMarketPreview = title.toLowerCase().includes('no markets match');

  return (
    <div className={cn('rounded-[1.5rem] border border-dashed px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]', workspaceInsetClass, showMarketPreview && 'px-4 py-4 text-left', className)}>
      {showMarketPreview ? <EmptyMarketSetupState /> : null}
      <div className={showMarketPreview ? 'text-center' : undefined}>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
        {description ? <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</p> : null}
      </div>
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
