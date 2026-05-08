'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type ActionKind = 'attach' | 'waive' | 'defer';
type Tone = 'info' | 'success' | 'error';

const BLOCKER_MARKERS = [
  'resolve compliance/document blocker',
  'compliance/document blocker',
  'this quote is blocked',
  'quote review is blocked',
];
const BUTTON_MARKERS = ['open guided fix panel', 'refresh draft after fix', 'send gate', 'review'];
const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const HOST_ATTR = 'data-quote-review-inline-compliance-fix-host';

function normalize(value: string | null | undefined) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function statusClasses(tone: Tone) {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (tone === 'error') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function findQuoteIdFromText(value: string | null | undefined) {
  const text = String(value ?? '');
  const match = text.match(new RegExp(`/api/quotes/(${UUID_PATTERN})(?:/|\\?|#|$)`, 'i'))
    ?? text.match(new RegExp(`/quotes/(${UUID_PATTERN})(?:/|\\?|#|$)`, 'i'))
    ?? text.match(new RegExp(`quoteId=(${UUID_PATTERN})`, 'i'))
    ?? text.match(new RegExp(`quote_id[=:\\"']+(${UUID_PATTERN})`, 'i'));
  return match?.[1] ?? '';
}

function findQuoteId(scope: HTMLElement | null) {
  const scopedInputs = scope ? Array.from(scope.querySelectorAll<HTMLInputElement>('input[name="quoteId"], input[name="quote_id"], input[data-quote-id]')) : [];
  const scopedInputId = scopedInputs.map((input) => input.value || input.getAttribute('data-quote-id') || '').find(Boolean);
  if (scopedInputId) return scopedInputId;

  const anchors = Array.from((scope ?? document).querySelectorAll<HTMLAnchorElement>('a[href]'));
  const anchorId = anchors.map((anchor) => findQuoteIdFromText(anchor.getAttribute('href'))).find(Boolean);
  if (anchorId) return anchorId;

  return findQuoteIdFromText(window.location.href) || findQuoteIdFromText(document.body.innerHTML);
}

function getSmallestTargetPanel() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('section, div'))
    .filter((node) => {
      const text = normalize(node.textContent);
      return BLOCKER_MARKERS.some((marker) => text.includes(marker));
    })
    .filter((node) => {
      const text = normalize(node.textContent);
      return BUTTON_MARKERS.some((marker) => text.includes(marker));
    })
    .filter((node) => !node.closest(`[${HOST_ATTR}]`));

  candidates.sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0));
  return candidates[0] ?? null;
}

function createOrFindHost(panel: HTMLElement) {
  const existing = panel.querySelector<HTMLElement>(`[${HOST_ATTR}]`);
  if (existing) return existing;
  const host = document.createElement('div');
  host.setAttribute(HOST_ATTR, 'true');
  host.className = 'mt-4';
  panel.appendChild(host);
  return host;
}

export function QuoteReviewInlineComplianceFix() {
  const router = useRouter();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ActionKind>('defer');
  const [fileName, setFileName] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ tone: Tone; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const install = () => {
      if (cancelled || !window.location.pathname.startsWith('/leads')) return;
      const target = getSmallestTargetPanel();
      if (!target) return;
      setPanel(target);
      setHost(createOrFindHost(target));
    };
    const timers = [0, 250, 700, 1500, 3000, 5000].map((delay) => window.setTimeout(install, delay));
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  if (!host) return null;

  const quoteId = findQuoteId(panel);
  const modeCopy = mode === 'attach'
    ? { title: 'Attach evidence', helper: 'Use this when evidence is available now. It creates a quote-linked document for review.' }
    : mode === 'waive'
      ? { title: 'Waive for quote', helper: 'Use this when a reviewer decides this quote can proceed without this document.' }
      : { title: 'Defer to dispatch', helper: 'Use this when quote send can proceed now, but the document must be collected before dispatch.' };

  async function saveDecision(action: ActionKind) {
    const cleanFileName = fileName.trim();
    const cleanReason = reason.trim();
    const activeQuoteId = findQuoteId(panel);
    if (!activeQuoteId) {
      setMessage({ tone: 'error', text: 'Create/open the draft preview first so this quote can be identified.' });
      return;
    }
    if (action === 'attach' && !cleanFileName) {
      setMessage({ tone: 'error', text: 'Enter a document/evidence name before attaching it to this quote.' });
      return;
    }
    if ((action === 'waive' || action === 'defer') && cleanReason.length < 8) {
      setMessage({ tone: 'error', text: 'Add a clear reviewer reason before saving this compliance decision.' });
      return;
    }

    setMessage({ tone: 'info', text: 'Saving this action to the active quote and refreshing the Send Gate...' });
    try {
      const response = await fetch('/api/compliance/quote-fix', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quoteId: activeQuoteId, action, fileName: cleanFileName, notes: cleanReason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.error) throw new Error(result?.error || 'Could not save this compliance action.');
      setMessage({ tone: 'success', text: result?.message || 'Compliance action saved. Refreshing quote review...' });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Could not save this compliance action.' });
    }
  }

  return createPortal(
    <div className="rounded-[18px] border border-rose-200 bg-white p-4 shadow-[0_14px_34px_rgba(190,18,60,0.12)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-700">Quote Review compliance clear</p>
          <h4 className="mt-1 text-base font-semibold text-rose-950">Clear the active Step 4 blocker here</h4>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-rose-800">
            This action stays inside Quote Review, saves against the active quote, and refreshes the gate source of truth.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700">{quoteId ? `Quote ${quoteId.slice(0, 8)}` : 'Quote id needed'}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">No separate compliance page</span>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="h-10 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-rose-800">
          {open ? 'Hide clear actions' : 'Clear compliance here'}
        </button>
      </div>

      {open ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => setMode('attach')} className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold ${mode === 'attach' ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-600'}`}>Attach evidence<span className="mt-1 block text-[11px] font-medium">Quote-linked document</span></button>
            <button type="button" onClick={() => setMode('waive')} className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold ${mode === 'waive' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'}`}>Waive for quote<span className="mt-1 block text-[11px] font-medium">Reviewer reason required</span></button>
            <button type="button" onClick={() => setMode('defer')} className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold ${mode === 'defer' ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-600'}`}>Defer to dispatch<span className="mt-1 block text-[11px] font-medium">Collect before dispatch</span></button>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
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
              <button type="button" onClick={() => startTransition(() => router.refresh())} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Refresh gate</button>
            </div>
            {message ? <p className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${statusClasses(message.tone)}`}>{message.text}</p> : null}
          </div>
        </div>
      ) : null}
    </div>,
    host,
  );
}
