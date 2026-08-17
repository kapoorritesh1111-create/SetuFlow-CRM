'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'setu-support-mode-badge-hidden';

export function SupportModeBadge({ organizationName }: { organizationName: string }) {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setHidden(false);
    }
    setReady(true);
  }, []);

  const hide = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // The badge still hides for this page even when storage is unavailable.
    }
  };

  const restore = () => {
    setHidden(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The badge still restores for this page even when storage is unavailable.
    }
  };

  if (!ready) return null;

  if (hidden) {
    return (
      <button
        type="button"
        onClick={restore}
        aria-label="Show SETU Support Mode controls"
        title="Show SETU Support Mode"
        className="fixed bottom-4 right-4 z-[90] flex h-10 w-10 items-center justify-center rounded-full border border-teal-300/40 bg-slate-950 text-sm font-black text-teal-300 shadow-xl hover:bg-slate-900"
      >
        S
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-3 rounded-2xl border border-teal-300/40 bg-slate-950 px-4 py-3 text-white shadow-2xl">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">SETU Support Mode</p>
        <p className="max-w-48 truncate text-xs font-bold text-white">{organizationName}</p>
      </div>
      <Link href="/support" className="rounded-xl bg-teal-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-teal-300">
        Switch org
      </Link>
      <button
        type="button"
        onClick={hide}
        aria-label="Hide SETU Support Mode controls"
        title="Hide support controls"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-base font-black text-white hover:bg-white/20"
      >
        ×
      </button>
    </div>
  );
}
