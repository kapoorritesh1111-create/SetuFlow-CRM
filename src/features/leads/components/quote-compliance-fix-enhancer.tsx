'use client';

import { useEffect } from 'react';

const BLOCKER_TEXT = 'resolve compliance/document blocker';
const BUTTON_MARKER = 'data-quote-compliance-fix-enhanced';
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

function findLeadIdFromCurrentUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('leadId') || urlParams.get('lead_id') || '';
}

function makeFixHref(scope: Element) {
  const quoteId = findQuoteId(scope);
  if (quoteId) return `/compliance/assist?quoteId=${encodeURIComponent(quoteId)}`;
  const leadId = findLeadIdFromCurrentUrl();
  if (leadId) return `/compliance/assist?leadId=${encodeURIComponent(leadId)}`;
  return '/compliance/assist';
}

function makeFixLink(scope: Element) {
  const link = document.createElement('a');
  link.href = makeFixHref(scope);
  link.textContent = 'Fix compliance';
  link.setAttribute(BUTTON_MARKER, 'true');
  link.className = 'inline-flex h-10 items-center rounded-[10px] bg-rose-700 px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-rose-800';
  return link;
}

function makeExplainer() {
  const helper = document.createElement('p');
  helper.setAttribute(BUTTON_MARKER, 'true');
  helper.className = 'mt-2 text-xs font-medium text-rose-700';
  helper.textContent = 'Open the fix panel to see the exact reason, attach evidence, waive for quote, or defer the document to dispatch with a reviewer reason.';
  return helper;
}

function enhanceBlockers() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('section, div')).filter((node) => normalizeText(node.textContent).includes(BLOCKER_TEXT));
  candidates.forEach((candidate) => {
    const panel = candidate.closest<HTMLElement>('section, div') ?? candidate;
    if (panel.querySelector(`[${BUTTON_MARKER}]`)) return;
    const existingButtons = Array.from(panel.querySelectorAll<HTMLElement>('a, button')).filter((node) => {
      const label = normalizeText(node.textContent);
      return label.includes('back to command center') || label.includes('refresh draft after fix');
    });
    const target = existingButtons[0]?.parentElement ?? panel;
    target.appendChild(makeFixLink(panel));
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
