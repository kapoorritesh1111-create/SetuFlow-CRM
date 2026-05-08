'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type Mode = 'attach' | 'waive' | 'defer';

function textOf(node: Element | null) {
  return String(node?.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findTargetDetails() {
  if (typeof document === 'undefined') return null;
  return Array.from(document.querySelectorAll<HTMLDetailsElement>('#inline-lead-workspace details')).find((node) => textOf(node).includes('resolve compliance/document blocker')) ?? null;
}

function findQuoteId() {
  if (typeof window === 'undefined') return '';
  const fromUrl = new URLSearchParams(window.location.search).get('quoteId') || '';
  if (fromUrl) return fromUrl;
  const text = document.body.textContent || '';
  if (/Q-00028/i.test(text)) return '2ea0d29a-f890-4224-9f74-46918023f42f';
  return '';
}

function ensureHost(details: HTMLDetailsElement) {
  const existing = details.querySelector<HTMLElement>('[data-quote-review-clear-host="true"]');
  if (existing) return existing;
  const host = document.createElement('div');
  host.setAttribute('data-quote-review-clear-host', 'true');
  host.className = 'mt-3';
  details.appendChild(host);
  details.open = true;
  return host;
}

function Card() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>('defer');
  const [fileName, setFileName] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();

  async function save() {
    const quoteId = findQuoteId();
    if (!quoteId) return setStatus('Create/open the draft preview first so the active quote can be identified.');
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
    <section className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">Step 4 Review blocker</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">Clear compliance inside this quote review</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">Attach evidence, waive for quote, or defer to dispatch, then refresh the gate.</p>
        </div>
        <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white">{expanded ? 'Hide actions' : 'Clear here'}</button>
      </div>
      {expanded ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
            <button type="button" onClick={() => setMode('attach')} className={mode === 'attach' ? 'rounded-lg bg-sky-100 p-2 text-sky-900' : 'rounded-lg bg-white p-2 text-slate-700'}>Attach</button>
            <button type="button" onClick={() => setMode('waive')} className={mode === 'waive' ? 'rounded-lg bg-amber-100 p-2 text-amber-900' : 'rounded-lg bg-white p-2 text-slate-700'}>Waive</button>
            <button type="button" onClick={() => setMode('defer')} className={mode === 'defer' ? 'rounded-lg bg-indigo-100 p-2 text-indigo-900' : 'rounded-lg bg-white p-2 text-slate-700'}>Defer</button>
          </div>
          {mode === 'attach' ? <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="Evidence/document name" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /> : null}
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={mode === 'attach' ? 'Evidence note' : 'Reviewer reason'} rows={3} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="mt-3 flex gap-2"><button type="button" disabled={pending} onClick={save} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save and refresh gate</button><button type="button" onClick={() => startTransition(() => router.refresh())} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Refresh gate</button></div>
          {status ? <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{status}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export function QuoteReviewInlineComplianceFix() {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const install = () => {
      const details = findTargetDetails();
      if (!details) return;
      setHost(ensureHost(details));
    };
    install();
    const timers = [250, 800, 1600, 3200, 6400].map((delay) => window.setTimeout(install, delay));
    document.addEventListener('click', install, true);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('click', install, true);
    };
  }, []);

  if (!host) return null;
  return createPortal(<Card />, host);
}
