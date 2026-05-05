'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type NoticeTone = 'neutral' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<NoticeTone, string> = {
  neutral: 'border-slate-200 bg-white text-slate-800 shadow-slate-900/10',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-900/10',
  warning: 'border-amber-200 bg-amber-50 text-amber-950 shadow-amber-900/10',
  danger: 'border-rose-200 bg-rose-50 text-rose-900 shadow-rose-900/10',
};

const DOT_CLASSES: Record<NoticeTone, string> = {
  neutral: 'bg-slate-500',
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-rose-600',
};

export function NoticeToast({
  title,
  description,
  tone = 'neutral',
  autoHideMs = 7000,
}: {
  title: string;
  description?: string;
  tone?: NoticeTone;
  autoHideMs?: number;
}) {
  const [visible, setVisible] = useState(true);
  const toastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisible(true);
  }, [title, description, tone]);

  useEffect(() => {
    if (!autoHideMs || !visible) return undefined;
    const timer = window.setTimeout(() => setVisible(false), autoHideMs);
    return () => window.clearTimeout(timer);
  }, [autoHideMs, visible, title, description]);

  useEffect(() => {
    if (!visible) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (toastRef.current && target && !toastRef.current.contains(target)) {
        setVisible(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed right-5 top-24 z-[120] w-[min(420px,calc(100vw-2.5rem))]">
      <div
        ref={toastRef}
        className={cn(
          'pointer-events-auto rounded-3xl border px-4 py-3.5 shadow-2xl ring-1 ring-slate-950/[0.03] backdrop-blur',
          TONE_CLASSES[tone],
        )}
        role={tone === 'danger' ? 'alert' : 'status'}
        aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      >
        <div className="flex items-start gap-3">
          <span className={cn('mt-1.5 h-2.5 w-2.5 rounded-full', DOT_CLASSES[tone])} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5">{title}</p>
            {description ? <p className="mt-1 text-sm leading-5 opacity-85">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-full px-2 py-1 text-xs font-bold opacity-70 transition hover:bg-white/70 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
