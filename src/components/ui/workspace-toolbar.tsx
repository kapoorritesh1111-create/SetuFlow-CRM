import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import {
  workspaceDangerButtonClass,
  workspaceFieldSurfaceClass,
  workspaceGlassClass,
  workspaceInsetClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  meta,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-hero p-5 ring-1 ring-slate-950/[0.03] backdrop-blur dark:ring-white/[0.04] sm:p-6', workspaceGlassClass, className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-4xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-sky-300">{eyebrow}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">{title}</h1>
            {badge ? (
              <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-[15px]">{description}</p> : null}
          {meta ? <div className="mt-4 flex flex-wrap gap-2 max-sm:[&>*]:flex-1 max-sm:[&>*]:justify-center">{meta}</div> : null}
        </div>

        {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end [&>*]:w-full sm:[&>*]:w-auto">{actions}</div> : null}
      </div>
    </section>
  );
}

export function WorkspaceToolbar({
  searchSlot,
  filterSlot,
  actionSlot,
  metaSlot,
  savedViewsSlot,
  className,
}: {
  searchSlot?: ReactNode;
  filterSlot?: ReactNode;
  actionSlot?: ReactNode;
  metaSlot?: ReactNode;
  savedViewsSlot?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-hero p-4 ring-1 ring-slate-950/[0.03] backdrop-blur dark:ring-white/[0.04]', workspaceGlassClass, className)}>
      <div className="space-y-4">
        {(searchSlot || filterSlot || actionSlot) ? (
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              {searchSlot ? <div className="min-w-0">{searchSlot}</div> : null}
              {filterSlot ? <div className="min-w-0">{filterSlot}</div> : null}
            </div>
            {actionSlot ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end [&>*]:w-full sm:[&>*]:w-auto">{actionSlot}</div> : null}
          </div>
        ) : null}
        {savedViewsSlot ? <div className="min-w-0">{savedViewsSlot}</div> : null}
        {metaSlot ? <div className="min-w-0">{metaSlot}</div> : null}
      </div>
    </section>
  );
}

export function ToolbarField({
  label,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      {label ? (
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300" {...(htmlFor ? { id: `${htmlFor}-label` } : {})}>
          {label}
        </span>
      ) : null}
      {children}
    </label>
  );
}

export function ToolbarSearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-12 w-full rounded-2xl px-4 text-sm outline-none transition',
        workspaceFieldSurfaceClass,
        className,
      )}
    />
  );
}

export function ToolbarSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-12 w-full rounded-2xl px-3 text-sm outline-none transition',
        workspaceFieldSurfaceClass,
        className,
      )}
    />
  );
}

export function ToolbarCheckboxCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex min-h-12 items-center gap-2 rounded-2xl px-3 text-sm text-slate-700 dark:text-slate-200', workspaceInsetClass, className)}>
      {children}
    </div>
  );
}

export function ToolbarActionButton({
  tone = 'secondary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'secondary' | 'danger' }) {
  const toneClass =
    tone === 'primary'
      ? workspacePrimaryButtonClass
      : tone === 'danger'
        ? workspaceDangerButtonClass
        : workspaceSecondaryButtonClass;

  return (
    <button
      {...props}
      className={cn(
        'min-h-12 rounded-2xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60',
        toneClass,
        className,
      )}
    />
  );
}

export function ToolbarStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value?: string;
  tone?: 'default' | 'info' | 'success' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'info'
      ? 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200'
      : tone === 'success'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
        : tone === 'warning'
          ? 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
          : tone === 'danger'
            ? 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
            : 'border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/78 dark:text-slate-200';

  if (value) {
    return (
      <div className={cn('flex min-h-[5rem] flex-col justify-center rounded-panel border px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_12px_24px_rgba(2,6,23,0.22)]', toneClass)}>
        <span className="text-2xl font-semibold tracking-[-0.03em]">{value}</span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
    );
  }

  return <span className={cn('inline-flex min-h-11 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium', toneClass)}>{label}</span>;
}

export function SavedViewsBar({
  items,
  activeId,
  onChange,
  trailing,
}: {
  items: Array<{ id: string; label: string; description?: string }>;
  activeId: string;
  onChange: (id: string) => void;
  trailing?: ReactNode;
}) {
  if (!items.length && !trailing) return null;

  return (
    <div className={cn('flex flex-col gap-3 rounded-panel border p-3 sm:p-4', workspaceInsetClass)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Saved views</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Keep common working sets one tap away without changing the current route structure.</p>
        </div>
        {trailing ? <div className="flex flex-wrap gap-2">{trailing}</div> : null}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'rounded-full border px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                active ? workspacePrimaryButtonClass : workspaceSecondaryButtonClass,
              )}
              title={item.description ?? item.label}
            >
              <span className="font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
