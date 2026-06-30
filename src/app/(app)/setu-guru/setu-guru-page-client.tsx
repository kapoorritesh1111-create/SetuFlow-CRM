'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function contextCopy(context: string | null) {
  if (context === 'trade-events') {
    return {
      eyebrow: 'Trade Events Assistant',
      title: 'Opening Setu Guru for Trade Events',
      body: 'Use Setu Guru to review event readiness, booth prep, event enrichment, and follow-up work. Humans still approve event changes, external source use, and CRM write-backs.',
      backHref: '/trade-events',
      backLabel: 'Back to Trade Events',
    };
  }
  return {
    eyebrow: 'Setu Guru',
    title: 'Opening Setu Guru',
    body: 'Ask Setu Guru about this workspace, missing data, pricing defaults, compliance, or what to do next. Humans approve prices, sends, compliance, and write-backs.',
    backHref: '/dashboard',
    backLabel: 'Back to Dashboard',
  };
}

export function SetuGuruPageClient() {
  const searchParams = useSearchParams();
  const copy = useMemo(() => contextCopy(searchParams.get('context')), [searchParams]);

  useEffect(() => {
    const timers = [150, 450, 900].map((delay) => window.setTimeout(() => {
      const launcher = document.querySelector<HTMLButtonElement>('button[aria-label="Toggle Setu Guru"]');
      launcher?.click();
    }, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center p-4">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-blue-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <div className="bg-[radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.24),transparent_25%),linear-gradient(135deg,#07172f_0%,#0b2e63_64%,#0e7490_150%)] p-7 text-white">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white p-1.5 shadow-xl">
              <img src="/setu-guru/guru-avatar-128.png" alt="Setu Guru avatar" className="h-full w-full rounded-full object-contain" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">{copy.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">{copy.title}</h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-blue-50/90">{copy.body}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <p className="text-sm font-semibold leading-6 text-slate-600">The drawer should open automatically. If your browser blocks it, use the Setu Guru button in the lower-right corner.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={copy.backHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white">{copy.backLabel}</Link>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700">Dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
