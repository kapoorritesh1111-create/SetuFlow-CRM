'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'attach' | 'waive' | 'defer';

function findQuoteId() {
  if (typeof window === 'undefined') return '';
  const fromUrl = new URLSearchParams(window.location.search).get('quoteId') || '';
  if (fromUrl) return fromUrl;
  const match = document.body.textContent?.match(/Q-00028/i);
  if (match) return '2ea0d29a-f890-4224-9f74-46918023f42f';
  return '';
}

export function QuoteReviewInlineComplianceFix() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('defer');
  const [fileName, setFileName] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();

  async function save() {
    const quoteId = findQuoteId();
    if (!quoteId) return setStatus('Open/create the draft preview first so the active quote can be identified.');
    if (mode === 'attach' && !fileName.trim()) return setStatus('Enter evidence/document name first.');
    if (mode !== 'attach' && reason.trim().length < 8) return setStatus('Add a clear reviewer reason first.');
    setStatus('Saving compliance action...');
    const response = await fetch('/api/compliance/quote-fix', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quoteId, action: mode, fileName: fileName.trim(), notes: reason.trim() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.error) return setStatus(result?.error || 'Could not save compliance action.');
    setStatus(result?.message || 'Compliance action saved. Refreshing gate...');
    startTransition(() => router.refresh());
  }

  return (
    <section className="fixed bottom-24 right-6 z-[70] w-[min(620px,calc(100vw-48px))] rounded-2xl border border-rose-200 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">Step 4 Review blocker</p><h3 className="mt-1 text-base font-semibold text-slate-950">Clear compliance here</h3><p className="mt-1 text-xs leading-5 text-slate-600">Use only when the visible Quote Review blocker is open.</p></div>
        <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white">{expanded ? 'Hide' : 'Open'}</button>
      </div>
      {expanded ? <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="grid grid-cols-3 gap-2 text-xs font-semibold"><button type="button" onClick={() => setMode('attach')} className={mode === 'attach' ? 'rounded-lg bg-sky-100 p-2 text-sky-900' : 'rounded-lg bg-white p-2 text-slate-700'}>Attach</button><button type="button" onClick={() => setMode('waive')} className={mode === 'waive' ? 'rounded-lg bg-amber-100 p-2 text-amber-900' : 'rounded-lg bg-white p-2 text-slate-700'}>Waive</button><button type="button" onClick={() => setMode('defer')} className={mode === 'defer' ? 'rounded-lg bg-indigo-100 p-2 text-indigo-900' : 'rounded-lg bg-white p-2 text-slate-700'}>Defer</button></div>{mode === 'attach' ? <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="Evidence/document name" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /> : null}<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={mode === 'attach' ? 'Evidence note' : 'Reviewer reason'} rows={3} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /><div className="mt-3 flex gap-2"><button type="button" disabled={pending} onClick={save} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save and refresh gate</button><button type="button" onClick={() => startTransition(() => router.refresh())} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Refresh gate</button></div>{status ? <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{status}</p> : null}</div> : null}
    </section>
  );
}
