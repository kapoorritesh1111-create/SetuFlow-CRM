'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';

export function LeadGuruTools({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-30 mb-3 flex justify-end">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface-1 px-3.5 text-sm font-medium text-content-secondary shadow-sm transition hover:bg-surface-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Smart actions
          <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>

        {open ? (
          <div className="absolute right-0 top-11 w-64 rounded-2xl border border-line bg-surface-1 p-3 shadow-hero">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-medium text-content-primary">Lead actions</p>
                <p className="text-xs text-content-muted">Research, draft, analyze, or review</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close smart actions"
                className="grid h-8 w-8 place-items-center rounded-ctl text-content-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2">{children}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
