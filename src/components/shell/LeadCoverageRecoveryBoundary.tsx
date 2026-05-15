'use client';

import { useEffect, useState } from 'react';
import { InlineCoverageResolverRuntime, openInlineCoverageResolver } from '@/components/shell/InlineCoverageResolverRuntime';

declare global {
  interface Window {
    __setuCoverageResolverOpen?: boolean;
    __setuCoverageRedirectAt?: number;
  }
}

function onLeadsPage() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/leads');
}

function textOf(element?: Element | null) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function openResolver() {
  window.__setuCoverageRedirectAt = Date.now();
  window.__setuCoverageResolverOpen = true;
  openInlineCoverageResolver();
}

export function LeadCoverageRecoveryBoundary() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(onLeadsPage());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('button, a') : null;
      const label = textOf(target);
      const isCoverageAction = /open coverage manager|add products|edit products|adjust coverage/i.test(label);

      if (isCoverageAction) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openResolver();
        return;
      }

      if (/create quote|quote preview|open quote|start quote|create\/open draft preview/i.test(label)) {
        window.setTimeout(openResolver, 250);
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled]);

  if (!enabled) return null;
  return <InlineCoverageResolverRuntime />;
}
