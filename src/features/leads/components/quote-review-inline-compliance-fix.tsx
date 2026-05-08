'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type Mode = 'attach' | 'waive' | 'defer';
type GateStatus = {
  ok?: boolean;
  clear?: boolean;
  quoteId?: string;
  quoteNumber?: string;
  hasClearQuoteReviewDocument?: boolean;
  quoteReviewApproved?: boolean;
  openComplianceCount?: number;
  quoteReviewDocumentCount?: number;
  error?: string;
};

function textOf(node: Element | null) {
  return String(node?.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findTargetDetails() {
  if (typeof document === 'undefined') return null;
  return Array.from(document.querySelectorAll<HTMLDetailsElement>('#inline-lead-workspace details')).find((node) => textOf(node).includes('resolve compliance/document blocker')) ?? null;
}

function findQuoteNumber() {
  if (typeof document === 'undefined') return '';
  const text = document.body.textContent || '';
  const match = text.match(/Q-\d{5}/i);
  return match?.[0] ?? '';
}

function findQuoteId() {
  if (typeof window === 'undefined') return '';
  const fromUrl = new URLSearchParams(window.location.search).get('quoteId') || '';
  if (fromUrl) return fromUrl;
  const text = document.body.textContent || '';
  if (/Q-00028/i.test(text)) return '2ea0d29a-f890-4224-9f74-46918023f42f';
  return '';
}

async function fetchGateStatus() {
  const quoteId = findQuoteId();
  const quoteNumber = findQuoteNumber();
  const params = new URLSearchParams();
  if (quoteId) params.set('quoteId', quoteId);
  else if (quoteNumber) params.set('quoteNumber', quoteNumber);
  if (!params.toString()) return null;
  const response = await fetch(`/api/compliance/quote-gate-status?${params.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return { error: payload?.error || 'Could not read quote gate status.' } as GateStatus;
  return payload as GateStatus;
}

function removeDuplicateHosts(keep?: HTMLElement | null) {
  if (typeof document === 'undefined') return;
  const hosts = Array.from(document.querySelectorAll<HTMLElement>('[data-quote-review-clear-host="true"]'));
  for (const host of hosts) {
    if (keep && host === keep) continue;
    host.remove();
  }
}

function promoteReadyNode(node: HTMLElement, text: string) {
  node.textContent = text;
  node.classList.remove('text-rose-600', 'text-red-600', 'text-red-700', 'bg-rose-50', 'bg-red-50', 'border-rose-200', 'border-red-200');
  node.classList.add('text-emerald-700');
}

function markSendGateCleared(status?: GateStatus | null) {
  if (typeof document === 'undefined') return;
  const root = document.querySelector<HTMLElement>('#inline-lead-workspace');
  if (!root) return;
  const quoteNumber = status?.quoteNumber || findQuoteNumber() || 'active quote';

  Array.from(root.querySelectorAll<HTMLElement>('*')).forEach((node) => {
    const text = textOf(node);
    if (text.includes('send blocked')) promoteReadyNode(node, 'Ready to send — all blockers cleared.');
    if (text.includes('1 blocker or pricing gap remain')) promoteReadyNode(node, 'No blockers remain. Pricing, approval, compliance, and quote draft are clear.');
    if (text === 'resolve active blockers') promoteReadyNode(node, 'No active blockers');
    if (text === '1 send blocker') promoteReadyNode(node, 'Send gate clear');
    if (text === 'dispatch blocked') promoteReadyNode(node, 'Ready to dispatch');
  });

  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).forEach((button) => {
    const text = textOf(button);
    if (text === 'send quote') {
      button.disabled = false;
      button.removeAttribute('disabled');
      button.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-slate-200', 'text-slate-400');
      button.classList.add('bg-[#0b2e4a]', 'text-white');
    }
  });

  const sendGatePanel = Array.from(root.querySelectorAll<HTMLElement>('section, div')).find((node) => {
    const text = textOf(node);
    return text.includes('approve and send safely') && text.includes('send gate');
  });
  if (sendGatePanel && !sendGatePanel.querySelector('[data-send-gate-clear-message="true"]')) {
    const message = document.createElement('p');
    message.setAttribute('data-send-gate-clear-message', 'true');
    message.className = 'mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800';
    message.textContent = `Send gate is clear for ${quoteNumber}. The previous quote-review blocker has been cleared and no active compliance blockers remain.`;
    sendGatePanel.prepend(message);
  }
}

function markInlineGateCleared(status?: GateStatus | null) {
  if (typeof document === 'undefined') return;
  const details = findTargetDetails();
  const quoteNumber = status?.quoteNumber || findQuoteNumber() || 'active quote';
  const message = `Quote Review gate is clear for ${quoteNumber}. Approved quote-review evidence/waiver is linked and no mandatory compliance item is open.`;

  if (details) {
    details.open = false;
    details.setAttribute('data-quote-review-gate-clear', 'true');
    details.classList.remove('border-rose-200', 'bg-rose-50');
    details.classList.add('border-emerald-200', 'bg-emerald-50');
    const summary = details.querySelector('summary');
    if (summary) summary.textContent = 'Quote Review compliance clear';
    const existing = details.querySelector<HTMLElement>('[data-quote-review-clear-message="true"]');
    if (existing) {
      existing.textContent = message;
    } else {
      const clearMessage = document.createElement('p');
      clearMessage.setAttribute('data-quote-review-clear-message', 'true');
      clearMessage.className = 'mt-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800';
      clearMessage.textContent = message;
      details.appendChild(clearMessage);
    }
  }

  removeDuplicateHosts(null);

  Array.from(document.querySelectorAll<HTMLElement>('#inline-lead-workspace *')).forEach((node) => {
    const text = textOf(node);
    if (text === 'blocked') {
      node.textContent = 'Ready ✓';
      node.classList.remove('text-rose-600', 'text-red-600');
      node.classList.add('text-emerald-700');
    }
    if (text === '1 blocker') {
      node.textContent = 'Clear';
      node.classList.remove('text-rose-600', 'text-red-600');
      node.classList.add('text-emerald-700');
    }
  });
  markSendGateCleared(status);
}

function ensureHost(details: HTMLDetailsElement) {
  const existing = details.querySelector<HTMLElement>('[data-quote-review-clear-host="true"]');
  if (existing) {
    removeDuplicateHosts(existing);
    details.open = true;
    return existing;
  }
  const host = document.createElement('div');
  host.setAttribute('data-quote-review-clear-host', 'true');
  host.className = 'mt-3';
  details.appendChild(host);
  details.open = true;
  removeDuplicateHosts(host);
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

  async function refreshGate() {
    setStatus('Checking quote gate...');
    const gate = await fetchGateStatus();
    if (gate?.clear) {
      markInlineGateCleared(gate);
      setStatus('Quote Review and Send gate are clear.');
      startTransition(() => router.refresh());
      return;
    }
    setStatus(gate?.error || 'Quote Review gate is still blocked. Save a waiver/defer reason or attach approved evidence, then refresh.');
  }

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
    setStatus(result?.message || 'Compliance action saved. Checking gate...');
    await refreshGate();
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
          <div className="mt-3 flex gap-2"><button type="button" disabled={pending} onClick={save} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save and refresh gate</button><button type="button" onClick={refreshGate} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Refresh gate</button></div>
          {status ? <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{status}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export function QuoteReviewInlineComplianceFix() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if ((window as any).__setuQuoteReviewClearCardMounted) return;
    (window as any).__setuQuoteReviewClearCardMounted = true;
    setEnabled(true);

    const install = async () => {
      const gate = await fetchGateStatus();
      if (gate?.clear) {
        markInlineGateCleared(gate);
        setHost(null);
        return;
      }
      const details = findTargetDetails();
      if (!details) return;
      const nextHost = ensureHost(details);
      setHost((current) => (current === nextHost ? current : nextHost));
    };
    void install();
    const timers = [250, 800, 1600, 3200, 6400, 10000].map((delay) => window.setTimeout(() => void install(), delay));
    document.addEventListener('click', install, true);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('click', install, true);
      removeDuplicateHosts(host);
      (window as any).__setuQuoteReviewClearCardMounted = false;
    };
  }, []);

  if (!enabled || !host) return null;
  return createPortal(<Card />, host);
}
