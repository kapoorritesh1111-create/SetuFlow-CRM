'use client';

import { useEffect, useRef, useState } from 'react';
import { InlineCoverageResolverRuntime, openInlineCoverageResolver } from '@/components/shell/InlineCoverageResolverRuntime';

declare global { interface Window { __setuCoverageResolverOpen?: boolean } }

function onLeadsPage() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/leads');
}

function hasCoverageBlocker() {
  const bodyText = document.body?.innerText || '';
  return /link at least one product|no products mapped|product coverage required|add product coverage/i.test(bodyText);
}

function coverageResolverMounted() {
  return Boolean(window.__setuCoverageResolverOpen || document.querySelector('[data-inline-coverage-resolver]'));
}

/**
 * Headless bridge for lead quote blockers.
 *
 * Deprecated and removed from this path:
 * - floating bottom-right coverage card
 * - Quick Edit detour for product/market mapping
 *
 * Product-grade behavior:
 * - when quote creation exposes a missing-coverage blocker, open the inline resolver inside the Coverage panel
 * - keep the operator in the command-center context
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
      window.__setuCoverageResolverOpen = true;
      openInlineCoverageResolver();
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('button, a') : null;
      const label = (target?.textContent || '').replace(/\s+/g, ' ').trim();
      if (/create quote|quote preview|open quote|start quote/i.test(label)) {
        window.setTimeout(openInlineResolverIfBlocked, 350);
        window.setTimeout(openInlineResolverIfBlocked, 1200);
      }
    };

    openInlineResolverIfBlocked();
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
