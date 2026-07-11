'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';

export function LeadGuruTools({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-30 mx-auto mb-4 max-w-[1560px]">
      <div className="relative rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-950">Smart actions for this lead</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">Research, draft outreach, analyze a reply, or review commercial readiness.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800"
          >
            Open smart actions
            <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {open ? (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] w-full rounded-2xl border border-line bg-surface-1 p-3 shadow-hero sm:w-72">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-medium text-content-primary">Lead actions</p>
                <p className="text-xs text-content-muted">Choose the next action for this record</p>
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
