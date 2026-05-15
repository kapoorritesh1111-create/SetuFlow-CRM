'use client';

import { useEffect, useState } from 'react';
import { InlineCoverageResolverRuntime, openInlineCoverageResolver } from '@/components/shell/InlineCoverageResolverRuntime';

declare global {
  interface Window {
    __setuCoverageResolverOpen?: boolean;
    __setuCoverageResolverCompany?: string;
    __setuCoverageResolverLeadId?: string;
  }
}

function onLeadsPage() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/leads');
}

function textOf(element?: Element | null) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function cleanCompany(value?: string | null) {
  const candidate = String(value ?? '').trim();
  if (!candidate || candidate.length > 90) return '';
  if (/next move|lead queue|hot list|coverage|commercial|qualification|follow-up|quick edit|create quote|open coverage manager|stage progress|deal value|scheduled actions|product required|quote preview/i.test(candidate)) return '';
  return candidate;
}

function primeCoverageContext(target: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  const workspace = target?.closest('#inline-lead-workspace') ?? document.querySelector('#inline-lead-workspace');
  const scope = workspace ?? document.body;
  const text = textOf(scope);

  window.__setuCoverageResolverLeadId = '';

  const heroMatch = text.match(/(.+?)\s+(buyer|supplier)\s+Owner:/i);
  const heroCompany = cleanCompany(heroMatch?.[1]);
  if (heroCompany) {
    window.__setuCoverageResolverCompany = heroCompany;
    return;
  }

  const quoteGridMatch = text.match(/company\s+lead type\s+market\s+currency\s+(.+?)\s+(buyer|supplier)\s+/i);
  const quoteCompany = cleanCompany(quoteGridMatch?.[1]);
  if (quoteCompany) {
    window.__setuCoverageResolverCompany = quoteCompany;
    return;
  }

  const headingCandidate = Array.from(scope.querySelectorAll<HTMLElement>('h1, h2, h3'))
    .map((node) => cleanCompany(textOf(node)))
    .find(Boolean);
  if (headingCandidate) window.__setuCoverageResolverCompany = headingCandidate;
}

function openResolver(target: HTMLElement | null) {
  primeCoverageContext(target);
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
      const target = event.target instanceof HTMLElement ? event.target.closest('button, a') as HTMLElement | null : null;
      if (!target || !target.closest('#inline-lead-workspace')) return;
      const label = textOf(target).toLowerCase();
      const isCoverageAction = label === 'open coverage manager' || label === 'add products' || label === 'edit products' || label === 'adjust coverage';
      if (!isCoverageAction) return;

      event.preventDefault();
      event.stopPropagation();
      openResolver(target);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled]);

  if (!enabled) return null;
  return <InlineCoverageResolverRuntime />;
}
