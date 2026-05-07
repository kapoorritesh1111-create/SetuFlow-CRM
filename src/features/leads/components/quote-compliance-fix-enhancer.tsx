'use client';

import { useEffect } from 'react';

const BLOCKER_TEXT = 'resolve compliance/document blocker';
const BUTTON_MARKER = 'data-quote-compliance-fix-enhanced';

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findLeadIdFromHref(href: string | null | undefined) {
  const value = String(href ?? '');
  const match = value.match(/\/leads\/([^/?#]+)/);
  return match?.[1] ?? '';
}

function findLeadId(scope: Element) {
  const urlParams = new URLSearchParams(window.location.search);
  const fromQuery = urlParams.get('leadId') || urlParams.get('lead_id');
  if (fromQuery) return fromQuery;

  const fromPath = findLeadIdFromHref(window.location.pathname);
  if (fromPath) return fromPath;

  const scopedAnchor = Array.from(scope.querySelectorAll<HTMLAnchorElement>('a[href]')).find((anchor) => findLeadIdFromHref(anchor.getAttribute('href')));
  const scopedLeadId = findLeadIdFromHref(scopedAnchor?.getAttribute('href'));
  if (scopedLeadId) return scopedLeadId;

  const pageAnchor = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).find((anchor) => findLeadIdFromHref(anchor.getAttribute('href')));
  return findLeadIdFromHref(pageAnchor?.getAttribute('href'));
}

function makeFixLink(leadId: string) {
  const link = document.createElement('a');
  link.href = leadId ? `/compliance/assist?leadId=${encodeURIComponent(leadId)}` : '/compliance/assist';
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
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('section, div'))
    .filter((node) => normalizeText(node.textContent).includes(BLOCKER_TEXT));

  candidates.forEach((candidate) => {
    const panel = candidate.closest<HTMLElement>('section, div') ?? candidate;
    if (panel.querySelector(`[${BUTTON_MARKER}]`)) return;

    const leadId = findLeadId(panel);
    const existingButtons = Array.from(panel.querySelectorAll<HTMLElement>('a, button')).filter((node) => {
      const label = normalizeText(node.textContent);
      return label.includes('back to command center') || label.includes('refresh draft after fix');
    });

    const target = existingButtons[0]?.parentElement ?? panel;
    target.appendChild(makeFixLink(leadId));

    const body = Array.from(panel.querySelectorAll<HTMLElement>('p, div')).find((node) => normalizeText(node.textContent).includes('this quote is blocked')) ?? panel;
    if (!body.parentElement?.querySelector(`[${BUTTON_MARKER}].mt-2`)) {
      body.parentElement?.appendChild(makeExplainer());
    }
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
