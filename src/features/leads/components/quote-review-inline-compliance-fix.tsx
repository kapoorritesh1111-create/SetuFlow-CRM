'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type SendSyncStatus = {
  sendReady?: boolean;
  quoteNumber?: string | null;
  lineCount?: number;
  pricedLineCount?: number;
  pricingComplete?: boolean;
  approvalCleared?: boolean;
  complianceClear?: boolean;
  openComplianceCount?: number;
  error?: string;
};

const SYNC_CACHE_TTL_MS = 15_000;
const syncCache = new Map<string, { at: number; promise: Promise<SendSyncStatus | null> }>();

function textOf(node: Element | null) {
  return String(node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function lowerTextOf(node: Element | null) {
  return textOf(node).toLowerCase();
}

function findQuoteNumber() {
  if (typeof document === 'undefined') return '';
  const match = (document.body.textContent || '').match(/Q-\d{5}/i);
  return match?.[0] ?? '';
}

async function syncSendGate() {
  const quoteNumber = findQuoteNumber();
  if (!quoteNumber) return null;

  const cached = syncCache.get(quoteNumber);
  if (cached && Date.now() - cached.at < SYNC_CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = fetch('/api/compliance/quote-send-sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ quoteNumber }),
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { error: payload?.error || 'Could not sync quote send gate.' } as SendSyncStatus;
      return payload as SendSyncStatus;
    })
    .catch(() => ({ error: 'Could not sync quote send gate.' } as SendSyncStatus));

  syncCache.set(quoteNumber, { at: Date.now(), promise });
  return promise;
}

function makeGreen(node: HTMLElement) {
  node.classList.remove(
    'border-rose-100',
    'border-rose-200',
    'bg-rose-50',
    'text-rose-600',
    'text-rose-700',
    'text-red-600',
    'text-red-700',
  );
  node.classList.add('border-emerald-200', 'bg-emerald-50', 'text-emerald-700');
}

function replaceTextOnly(node: HTMLElement, nextText: string) {
  node.textContent = nextText;
  makeGreen(node);
}

function clearSendGateActiveBlocker(status: SendSyncStatus | null) {
  if (typeof document === 'undefined' || !status?.sendReady) return false;
  const root = document.querySelector<HTMLElement>('#inline-lead-workspace');
  if (!root) return false;
  const quoteNumber = status.quoteNumber || findQuoteNumber();
  if (!quoteNumber) return false;

  const text = lowerTextOf(root);
  const isSendGate = text.includes('approve and send safely') || text.includes('step 5') || text.includes('send gate');
  if (!isSendGate) return false;

  let changed = false;

  Array.from(root.querySelectorAll<HTMLElement>('div, p, span, li, h3, section')).forEach((node) => {
    const value = lowerTextOf(node);

    if (value === 'resolve active blockers') {
      replaceTextOnly(node, 'No active blockers');
      changed = true;
    }

    if (value.includes('send blocked') && value.includes('resolve before sending')) {
      replaceTextOnly(node, 'Send ready — all blockers cleared.');
      changed = true;
    }

    if (value.includes('1 blocker or pricing gap remain')) {
      replaceTextOnly(node, 'No blockers remain. Pricing, approval, compliance, and quote draft are clear.');
      changed = true;
    }

    if (value === '1 blocker') {
      replaceTextOnly(node, 'Clear');
      changed = true;
    }
  });

  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).forEach((button) => {
    const value = lowerTextOf(button);
    if (value === 'send quote') {
      button.disabled = false;
      button.removeAttribute('disabled');
      button.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-slate-200', 'text-slate-400');
      button.classList.add('bg-brand-700', 'text-white');
      changed = true;
    }
  });

  return changed;
}

export function QuoteReviewInlineComplianceFix() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let refreshQueued = false;

    async function run() {
      const status = await syncSendGate();
      if (cancelled || !status?.sendReady) return;
      const changed = clearSendGateActiveBlocker(status);
      if (changed && !refreshQueued) {
        refreshQueued = true;
        window.setTimeout(() => {
          if (!cancelled) router.refresh();
        }, 250);
      }
    }

    void run();
    const timer = window.setTimeout(() => void run(), 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router]);

  return null;
}
