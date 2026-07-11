'use client';

import { useState, type ReactNode } from 'react';
import { Sparkles, X } from 'lucide-react';

export function LeadGuruTools({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {open ? (
        <div className="mb-3 w-60 rounded-2xl border border-line bg-surface-1 p-3 shadow-hero">
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <p className="text-sm font-medium text-content-primary">Setu Guru tools</p>
              <p className="text-xs text-content-muted">Choose one action</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Setu Guru tools" className="grid h-8 w-8 place-items-center rounded-ctl text-content-muted hover:bg-surface-2">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">{children}</div>
        </div>
      ) : null}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-700 px-4 text-sm font-medium text-white shadow-hero transition hover:bg-brand-800">
        <Sparkles className="h-4 w-4" />
        Setu Guru
      </button>
    </div>
  );
}
