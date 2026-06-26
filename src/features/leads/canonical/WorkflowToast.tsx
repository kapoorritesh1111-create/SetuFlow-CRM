"use client";

import { useEffect, useState } from 'react';

type Props = {
  kind?: 'success' | 'warning' | 'error';
  message: string;
};

export default function WorkflowToast({ kind = 'success', message }: Props) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!visible || !message) return null;

  const tone = kind === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : kind === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';

  const icon = kind === 'success' ? '✓' : '!';

  return (
    <div className="fixed right-5 top-24 z-50 max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${tone}`}>
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-semibold">{icon}</span>
        <p className="text-sm font-semibold leading-5">{message}</p>
        <button type="button" onClick={() => setVisible(false)} className="ml-2 rounded-full px-2 text-sm font-semibold opacity-70 hover:bg-white/70 hover:opacity-100" aria-label="Dismiss notification">×</button>
      </div>
    </div>
  );
}
