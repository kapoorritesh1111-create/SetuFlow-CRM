'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';

export function LeadGuruTools({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-30 mx-auto mb-2 flex max-w-[1560px] justify-end px-1">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-700 transition group-hover:bg-white">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </span>
          <span>Smart actions</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">4</span>
          <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>

        {open ? (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface-1 p-3 shadow-hero">
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-line px-1 pb-3">
              <div>
                <p className="text-sm font-medium text-content-primary">Smart actions for this lead</p>
                <p className="mt-1 text-xs leading-5 text-content-muted">Research, draft outreach, analyze a reply, or review readiness.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close smart actions"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-ctl text-content-muted hover:bg-surface-2"
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
