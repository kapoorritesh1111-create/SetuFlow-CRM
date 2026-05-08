'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

type ActionKind = 'waive' | 'defer';

function isQuoteReviewRoute(pathname: string, quoteId: string | null, quoteStep: string | null) {
  return pathname.startsWith('/leads') && Boolean(quoteId) && String(quoteStep ?? '').toLowerCase() === 'review';
}

export function QuoteReviewComplianceActions() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const quoteStep = searchParams.get('quoteStep');
  const shouldRender = useMemo(() => isQuoteReviewRoute(pathname, quoteId, quoteStep), [pathname, quoteId, quoteStep]);
  const [mode, setMode] = useState<ActionKind>('defer');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!shouldRender || !quoteId) return null;

  async function saveDecision(action: ActionKind) {
    if (!quoteId) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 8) {
      setMessage({ tone: 'error', text: 'Add a clear reviewer reason before saving this compliance decision.' });
      return;
    }
    setMessage({ tone: 'info', text: 'Saving compliance decision on this quote...' });
    try {
      const response = await fetch('/api/compliance/quote-fix', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quoteId, action, notes: cleanReason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.error) throw new Error(result?.error || 'Could not save this compliance decision.');
      setMessage({ tone: 'success', text: result?.message || 'Compliance decision saved. Refreshing quote review...' });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Could not save this compliance decision.' });
    }
  }

  const statusClasses = message?.tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : message?.tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className="fixed bottom-24 left-24 right-24 z-40 rounded-[24px] border border-rose-200 bg-white/95 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur md:left-32 md:right-40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-700">Quote review compliance</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">Resolve the blocker without leaving Review</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
            Use this when the quote can proceed but the compliance document will be waived for this quote or collected before dispatch. The reason is recorded on the quote and the send gate is refreshed.
          </p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">Quote {quoteId.slice(0, 8)}</div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-end">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <button
            type="button"
            onClick={() => setMode('defer')}
            className={`rounded-2xl border px-4 py-3 text-left text-xs font-semibold ${mode === 'defer' ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Defer to dispatch
            <span className="mt-1 block text-[11px] font-medium">Quote may proceed; document remains required before order dispatch.</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('waive')}
            className={`rounded-2xl border px-4 py-3 text-left text-xs font-semibold ${mode === 'waive' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Waive for quote
            <span className="mt-1 block text-[11px] font-medium">Reviewer confirms the missing document is not needed for this quote.</span>
          </button>
        </div>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Reviewer reason</span>
          <textarea
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={mode === 'defer' ? 'Example: Document not needed for quote release; collect COA/packing evidence before dispatch.' : 'Example: Reviewer approved waiver for this quote based on buyer context.'}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <button
          type="button"
          disabled={isPending}
          onClick={() => saveDecision(mode)}
          className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Refreshing...' : mode === 'defer' ? 'Save defer' : 'Save waiver'}
        </button>
      </div>

      {message ? <p className={`mt-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${statusClasses}`}>{message.text}</p> : null}
    </div>
  );
}
