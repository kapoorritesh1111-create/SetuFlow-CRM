'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type GateStatus = {
  clear?: boolean;
  quoteNumber?: string;
  error?: string;
};

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

async function fetchGateStatus() {
  const quoteNumber = findQuoteNumber();
  if (!quoteNumber) return null;
  const params = new URLSearchParams({ quoteNumber });
  const response = await fetch(`/api/compliance/quote-gate-status?${params.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return { error: payload?.error || 'Could not read quote gate status.' } as GateStatus;
  return payload as GateStatus;
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

function clearSendGateActiveBlocker(status: GateStatus | null) {
  if (typeof document === 'undefined') return false;
  const root = document.querySelector<HTMLElement>('#inline-lead-workspace');
  if (!root) return false;
  const quoteNumber = status?.quoteNumber || findQuoteNumber();
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
      button.classList.add('bg-[#0b2e4a]', 'text-white');
      changed = true;
    }
  });

  return changed;
}

export function QuoteReviewInlineComplianceFix() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const gate = await fetchGateStatus();
      if (cancelled || !gate?.clear) return;
      const changed = clearSendGateActiveBlocker(gate);
      if (changed) {
        window.setTimeout(() => {
          if (!cancelled) router.refresh();
        }, 250);
      }
    }

    void run();
    const timers = [300, 900, 1800, 3600].map((delay) => window.setTimeout(() => void run(), delay));
    const onClick = () => window.setTimeout(() => void run(), 50);
    document.addEventListener('click', onClick, true);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('click', onClick, true);
    };
  }, [router]);

  return null;
}
