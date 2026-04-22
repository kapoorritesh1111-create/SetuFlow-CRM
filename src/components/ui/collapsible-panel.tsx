'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CollapsiblePanelProps = {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
};

export function CollapsiblePanel({
  title,
  summary,
  children,
  defaultOpen = false,
  className,
  bodyClassName,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {summary ? <p className="mt-1 text-xs text-slate-500">{summary}</p> : null}
        </div>
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>
      {open ? <div className={cn('border-t border-slate-200 px-4 py-4', bodyClassName)}>{children}</div> : null}
    </div>
  );
}
