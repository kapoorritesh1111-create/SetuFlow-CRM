'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

type ActionKind = 'attach' | 'waive' | 'defer';

type QuoteReviewComplianceActionsProps = {
  quoteId?: string | null;
  leadId?: string | null;
  quoteLabel?: string | null;
  blockerReasons?: string[];
};

function isQuoteReviewRoute(pathname: string, quoteStep: string | null) {
  return pathname.startsWith('/leads') && String(quoteStep ?? '').toLowerCase() === 'review';
}

function statusClasses(tone: 'success' | 'error' | 'info') {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (tone === 'error') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function QuoteReviewComplianceActions({ quoteId: quoteIdProp, leadId, quoteLabel, blockerReasons = [] }: QuoteReviewComplianceActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const quoteStep = searchParams.get('quoteStep');
  const quoteIdFromUrl = searchParams.get('quoteId');
  const quoteId = (quoteIdFromUrl || quoteIdProp || '').trim();
  const shouldRender = useMemo(() => isQuoteReviewRoute(pathname, quoteStep), [pathname, quoteStep]);
  const [mode, setMode] = useState<ActionKind>('defer');
  const [fileName, setFileName] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!shouldRender) return null;

  async function saveDecision(action: ActionKind) {
    if (!quoteId) {
      setMessage({ tone: 'error', text: 'Create/open the draft preview first so this quote can be identified.' });
      return;
    }
    const cleanReason = reason.trim();
    const cleanFileName = fileName.trim();
    if (action === 'attach' && !cleanFileName) {
      setMessage({ tone: 'error', text: 'Enter a document or evidence name before attaching it to this quote.' });
      return;
    }
    if ((action === 'waive' || action === 'defer') && cleanReason.length < 8) {
      setMessage({ tone: 'error', text: 'Add a clear reviewer reason before saving this compliance decision.' });
      return;
    }
    setMessage({ tone: 'info', text: 'Saving this blocker action on the active quote...' });
    try {
      const response = await fetch('/api/compliance/quote-fix', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quoteId, action, fileName: cleanFileName, notes: cleanReason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.error) throw new Error(result?.error || 'Could not save this compliance action.');
      setMessage({ tone: 'success', text: result?.message || 'Compliance action saved. Refreshing quote review...' });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Could not save this compliance action.' });
    }
  }

  const modeCopy = mode === 'attach'
    ? { title: 'Attach evidence', helper: 'Use when you have evidence now. This creates a quote-linked document for review.' }
    : mode === 'waive'
      ? { title: 'Waive for quote', helper: 'Use when a reviewer decides this quote can proceed without this document.' }
      : { title: 'Defer to dispatch', helper: 'Use when the quote can proceed now, but the document must be collected before dispatch.' };

  return (
    <section className="rounded-card border border-rose-200 bg-rose-50 p-4 shadow-[0_12px_34px_rgba(190,18,60,0.12)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-700">Quote Review compliance blocker</p>
          <h3 className="mt-1 text-lg font-semibold text-rose-950">Clear this blocker here before Send Gate</h3>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-rose-800">
            Choose one clear action below. The action is saved to the active quote, then the quote Review workflow refreshes so the gate can re-check the source of truth.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            {quoteId ? <span className="rounded-full bg-white px-3 py-1.5 text-rose-700">{quoteLabel || `Quote ${quoteId.slice(0, 8)}`}</span> : <span className="rounded-full bg-white px-3 py-1.5 text-rose-700">Quote id needed</span>}
            {leadId ? <span className="rounded-full bg-white px-3 py-1.5 text-slate-600">Lead linked</span> : null}
            <span className="rounded-full bg-white px-3 py-1.5 text-slate-600">No separate page required</span>
          </div>
          {blockerReasons.length ? (
            <div className="mt-3 grid gap-1 rounded-2xl border border-rose-100 bg-white/70 px-3 py-2 text-xs leading-5 text-rose-700">
              {blockerReasons.slice(0, 3).map((reason) => <span key={reason}>• {reason}</span>)}
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-3xl rounded-2xl border border-rose-100 bg-white p-3 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => setMode('attach')} className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold ${mode === 'attach' ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-600'}`}>
              Attach evidence
              <span className="mt-1 block text-[11px] font-medium">Quote-linked document</span>
            </button>
            <button type="button" onClick={() => setMode('waive')} className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold ${mode === 'waive' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'}`}>
              Waive for quote
              <span className="mt-1 block text-[11px] font-medium">Reviewer reason required</span>
            </button>
            <button type="button" onClick={() => setMode('defer')} className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold ${mode === 'defer' ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-600'}`}>
              Defer to dispatch
              <span className="mt-1 block text-[11px] font-medium">Collect before dispatch</span>
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">{modeCopy.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{modeCopy.helper}</p>
            {mode === 'attach' ? (
              <label className="mt-3 block">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Evidence/document name</span>
                <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="COA.pdf, buyer confirmation, waiver memo" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
              </label>
            ) : null}
            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{mode === 'attach' ? 'Evidence note' : 'Reviewer reason'}</span>
              <textarea rows={mode === 'attach' ? 2 : 3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={mode === 'attach' ? 'What this evidence proves' : mode === 'defer' ? 'Example: Not needed for quote release; collect evidence before dispatch.' : 'Example: Reviewer approved waiver for this quote based on buyer context.'} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" disabled={isPending || !quoteId} onClick={() => saveDecision(mode)} className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {isPending ? 'Refreshing...' : mode === 'attach' ? 'Attach and refresh gate' : mode === 'waive' ? 'Save waiver and refresh' : 'Save defer and refresh'}
              </button>
              <button type="button" onClick={() => router.refresh()} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Refresh gate</button>
            </div>
            {message ? <p className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${statusClasses(message.tone)}`}>{message.text}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
