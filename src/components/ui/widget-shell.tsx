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

function EmptyMarketMapPreview() {
  return (
    <div className="mb-5 overflow-hidden rounded-[1.35rem] border border-slate-700/80 bg-gradient-to-br from-[#071326] via-[#0b1e38] to-[#020917] p-4 shadow-inner ring-1 ring-white/10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200">All markets · setup mode</span>
        <span className="rounded-full border border-slate-600 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">Map ready</span>
      </div>
      <svg viewBox="0 0 640 260" role="img" aria-label="Empty market map preview" className="h-[230px] w-full rounded-[1rem] bg-[#08182f]">
        <defs>
          <radialGradient id="emptyMapOcean" cx="50%" cy="42%" r="74%">
            <stop offset="0%" stopColor="#16315f" />
            <stop offset="62%" stopColor="#0b2344" />
            <stop offset="100%" stopColor="#061326" />
          </radialGradient>
        </defs>
        <rect width="640" height="260" fill="url(#emptyMapOcean)" />
        {[
          'M72 96c38-24 76-24 118-8 28 11 55 5 80 20 29 18 14 48-18 54-44 8-72-22-111-17-33 4-73-9-79-30-2-8 2-14 10-19Z',
          'M300 78c52-18 112-11 152 17 28 20 28 48-2 66-45 27-130 18-167-15-22-20-12-57 17-68Z',
          'M478 141c32-10 74-3 96 16 20 17 8 42-29 51-47 11-98-11-98-39 0-12 11-22 31-28Z',
          'M210 172c21-9 53-3 64 12 12 16-8 32-39 33-30 1-54-13-48-28 3-7 11-13 23-17Z',
        ].map((path, index) => (
          <path key={path} d={path} fill={index === 1 ? '#253a5d' : '#1f3353'} stroke="#3d5272" strokeWidth="1.2" opacity="0.9" />
        ))}
        <g opacity="0.72">
          <circle cx="178" cy="118" r="3.5" fill="#38bdf8" />
          <circle cx="382" cy="125" r="3.5" fill="#fbbf24" />
          <circle cx="520" cy="170" r="3.5" fill="#22c55e" />
        </g>
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Critical</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Active</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-cyan-600" />Watch</span>
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
      {showMarketPreview ? <EmptyMarketMapPreview /> : null}
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
