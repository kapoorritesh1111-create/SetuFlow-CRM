'use client';

import { useEffect } from 'react';

const BLOCKER_TEXT = 'resolve compliance/document blocker';
const BUTTON_MARKER = 'data-quote-compliance-fix-enhanced';
const PANEL_MARKER = 'data-quote-compliance-inline-panel';
const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findQuoteIdFromHref(href: string | null | undefined) {
  const value = String(href ?? '');
  const match = value.match(new RegExp(`/api/quotes/(${UUID_PATTERN})(?:/|\\?|#|$)`, 'i'))
    ?? value.match(new RegExp(`/quotes/(${UUID_PATTERN})(?:/|\\?|#|$)`, 'i'))
    ?? value.match(new RegExp(`quoteId=(${UUID_PATTERN})`, 'i'));
  return match?.[1] ?? '';
}

function findQuoteId(scope: Element) {
  const scopedAnchor = Array.from(scope.querySelectorAll<HTMLAnchorElement>('a[href]')).find((anchor) => findQuoteIdFromHref(anchor.getAttribute('href')));
  const scopedQuoteId = findQuoteIdFromHref(scopedAnchor?.getAttribute('href'));
  if (scopedQuoteId) return scopedQuoteId;
  const pageAnchor = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).find((anchor) => findQuoteIdFromHref(anchor.getAttribute('href')));
  const pageQuoteId = findQuoteIdFromHref(pageAnchor?.getAttribute('href'));
  if (pageQuoteId) return pageQuoteId;
  const htmlMatch = document.body.innerHTML.match(new RegExp(`/api/quotes/(${UUID_PATTERN})/`, 'i'))
    ?? document.body.innerHTML.match(new RegExp(`/quotes/(${UUID_PATTERN})`, 'i'));
  return htmlMatch?.[1] ?? '';
}

function makeStatus(message: string, tone: 'info' | 'success' | 'error' = 'info') {
  const status = document.createElement('p');
  status.setAttribute(BUTTON_MARKER, 'true');
  status.className = tone === 'success'
    ? 'mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800'
    : tone === 'error'
      ? 'mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800'
      : 'mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700';
  status.textContent = message;
  return status;
}

async function saveQuoteFix(panel: HTMLElement, quoteId: string, action: string, fileName: string, notes: string) {
  const statusTarget = panel.querySelector<HTMLElement>('[data-inline-fix-status]');
  if (!quoteId) {
    if (statusTarget) statusTarget.replaceChildren(makeStatus('Quote id was not found. Create/open draft preview first, then use inline fix.', 'error'));
    return;
  }
  if ((action === 'waive' || action === 'defer') && notes.trim().length < 8) {
    if (statusTarget) statusTarget.replaceChildren(makeStatus('Add a clear reviewer reason before saving this decision.', 'error'));
    return;
  }
  if (action === 'attach' && !fileName.trim()) {
    if (statusTarget) statusTarget.replaceChildren(makeStatus('Enter a document/evidence name before attaching to this quote.', 'error'));
    return;
  }
  if (statusTarget) statusTarget.replaceChildren(makeStatus('Saving this quote compliance decision...'));
  try {
    const response = await fetch('/api/compliance/quote-fix', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quoteId, action, fileName, notes }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.error) throw new Error(result?.error || 'Could not save this compliance decision.');
    if (statusTarget) statusTarget.replaceChildren(makeStatus(result?.message || 'Saved on this quote. Stay on Review and refresh/create draft preview again.', 'success'));
    panel.setAttribute('data-inline-fix-saved', 'true');
    const title = panel.closest<HTMLElement>('section, div')?.querySelector<HTMLElement>('p, h3, h4');
    if (title) title.textContent = 'Compliance decision saved on this quote — refresh draft preview';
  } catch (error) {
    if (statusTarget) statusTarget.replaceChildren(makeStatus(error instanceof Error ? error.message : 'Could not save this compliance decision.', 'error'));
  }
}

function createInlinePanel(quoteId: string) {
  const panel = document.createElement('div');
  panel.setAttribute(PANEL_MARKER, 'true');
  panel.setAttribute(BUTTON_MARKER, 'true');
  panel.className = 'mt-4 rounded-2xl border border-rose-200 bg-white p-4 shadow-sm';
  panel.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Fix inside quote review</p>
        <h4 class="mt-1 text-sm font-semibold text-slate-950">Latest document: none linked</h4>
        <p class="mt-1 text-xs leading-5 text-slate-600">Save evidence, waiver, or dispatch deferral on this active quote without leaving the quote builder.</p>
      </div>
      <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Stays on Review</span>
    </div>
    <div class="mt-4 grid gap-3 lg:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p class="text-sm font-semibold text-slate-950">Attach evidence</p>
        <input data-fix-file class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900" placeholder="COA.pdf or buyer confirmation" />
        <textarea data-fix-attach-notes class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900" rows="2" placeholder="What this evidence proves"></textarea>
        <button data-fix-action="attach" class="mt-2 rounded-full bg-sky-700 px-3 py-2 text-xs font-semibold text-white">Attach to quote</button>
      </div>
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p class="text-sm font-semibold text-amber-950">Waive for quote</p>
        <textarea data-fix-waive-notes class="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-900" rows="4" placeholder="Required reviewer reason"></textarea>
        <button data-fix-action="waive" class="mt-2 rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white">Record waiver</button>
      </div>
      <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
        <p class="text-sm font-semibold text-indigo-950">Defer to dispatch</p>
        <textarea data-fix-defer-notes class="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-900" rows="4" placeholder="Reason, e.g. not needed for quote; collect before dispatch"></textarea>
        <button data-fix-action="defer" class="mt-2 rounded-full bg-indigo-700 px-3 py-2 text-xs font-semibold text-white">Defer with reason</button>
      </div>
    </div>
    <div data-inline-fix-status></div>
  `;
  panel.querySelectorAll<HTMLButtonElement>('[data-fix-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-fix-action') || '';
      const fileName = (panel.querySelector<HTMLInputElement>('[data-fix-file]')?.value || '').trim();
      const notes = action === 'attach'
        ? (panel.querySelector<HTMLTextAreaElement>('[data-fix-attach-notes]')?.value || '').trim()
        : action === 'waive'
          ? (panel.querySelector<HTMLTextAreaElement>('[data-fix-waive-notes]')?.value || '').trim()
          : (panel.querySelector<HTMLTextAreaElement>('[data-fix-defer-notes]')?.value || '').trim();
      void saveQuoteFix(panel, quoteId, action, fileName, notes);
    });
  });
  return panel;
}

function makeInlineButton(panel: HTMLElement, quoteId: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Fix here';
  button.setAttribute(BUTTON_MARKER, 'true');
  button.className = 'inline-flex h-10 items-center rounded-[10px] bg-rose-700 px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-rose-800';
  button.addEventListener('click', () => {
    if (panel.querySelector(`[${PANEL_MARKER}]`)) return;
    panel.appendChild(createInlinePanel(quoteId));
  });
  return button;
}

function makeExplainer() {
  const helper = document.createElement('p');
  helper.setAttribute(BUTTON_MARKER, 'true');
  helper.className = 'mt-2 text-xs font-medium text-rose-700';
  helper.textContent = 'Fix this inside the quote review panel. Do not leave the quote builder or jump to another workflow.';
  return helper;
}

function enhanceBlockers() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('section, div')).filter((node) => normalizeText(node.textContent).includes(BLOCKER_TEXT));
  candidates.forEach((candidate) => {
    const panel = candidate.closest<HTMLElement>('section, div') ?? candidate;
    if (panel.querySelector(`[${BUTTON_MARKER}]`)) return;
    const quoteId = findQuoteId(panel);
    const existingButtons = Array.from(panel.querySelectorAll<HTMLElement>('a, button')).filter((node) => {
      const label = normalizeText(node.textContent);
      return label.includes('back to command center') || label.includes('refresh draft after fix');
    });
    const target = existingButtons[0]?.parentElement ?? panel;
    target.appendChild(makeInlineButton(panel, quoteId));
    const body = Array.from(panel.querySelectorAll<HTMLElement>('p, div')).find((node) => normalizeText(node.textContent).includes('this quote is blocked')) ?? panel;
    if (!body.parentElement?.querySelector(`[${BUTTON_MARKER}].mt-2`)) body.parentElement?.appendChild(makeExplainer());
  });
}

export function QuoteComplianceFixEnhancer() {
  useEffect(() => {
    if (!window.location.pathname.startsWith('/leads')) return;
    enhanceBlockers();
    const observer = new MutationObserver(() => enhanceBlockers());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
