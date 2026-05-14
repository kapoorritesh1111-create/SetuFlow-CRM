'use client';

import { useEffect, useRef, useState } from 'react';
import { InlineCoverageResolverRuntime, openInlineCoverageResolver } from '@/components/shell/InlineCoverageResolverRuntime';

declare global { interface Window { __setuCoverageResolverOpen?: boolean } }

function onLeadsPage() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/leads');
}

function textOf(element?: Element | null) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function hasCoverageBlocker() {
  const bodyText = document.body?.innerText || '';
  return /link at least one product|no products mapped|product coverage required|add product coverage|product scope/i.test(bodyText);
}

function coverageResolverMounted() {
  return Boolean(window.__setuCoverageResolverOpen || document.querySelector('[data-inline-coverage-resolver]'));
}

function openResolver() {
  window.__setuCoverageResolverOpen = true;
  openInlineCoverageResolver();
}

/**
 * Headless bridge for lead quote blockers.
 *
 * Deprecated and removed from this path:
 * - floating bottom-right coverage card
 * - Quick Edit / full lead drawer detour for product mapping
 *
 * Product-grade behavior:
 * - intercept quote Product Scope / Coverage buttons before their old drawer handlers run
 * - open the product-only inline resolver in the current card
 */
export function LeadCoverageRecoveryBoundary() {
  const [enabled, setEnabled] = useState(false);
  const lastOpenAtRef = useRef(0);

  useEffect(() => {
    const sync = () => setEnabled(onLeadsPage());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const openInlineResolverIfBlocked = () => {
      if (!hasCoverageBlocker() || coverageResolverMounted()) return;
      const now = Date.now();
      if (now - lastOpenAtRef.current < 1200) return;
      lastOpenAtRef.current = now;
      openResolver();
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('button, a') : null;
      const label = textOf(target);
      const parentText = textOf(target?.closest('section, article, div'));

      if (/open coverage manager|add products|edit products/i.test(label) && /product scope|no products mapped|coverage|quote preview/i.test(parentText)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openResolver();
        return;
      }

      if (/create quote|quote preview|open quote|start quote|create\/open draft preview/i.test(label)) {
        window.setTimeout(openInlineResolverIfBlocked, 250);
        window.setTimeout(openInlineResolverIfBlocked, 900);
      }
    };

    document.addEventListener('click', onClick, true);
    const observer = new MutationObserver(openInlineResolverIfBlocked);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('click', onClick, true);
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;
  return <InlineCoverageResolverRuntime />;
}
