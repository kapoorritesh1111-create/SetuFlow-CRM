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
  const candidate = String(value ?? '')
    .replace(/^[\s:·\-/—]+|[\s:·\-/—]+$/g, '')
    .trim();
  if (!candidate || candidate.length > 90) return '';
  if (/next move|lead queue|hot list|coverage|commercial|qualification|follow-up|quick edit|create quote|open coverage manager|stage progress|deal value|scheduled actions|product required|quote preview|trade command center|command center/i.test(candidate)) return '';
  return candidate;
}

function extractCompanyFromSelectedHero(scope: ParentNode) {
  const headings = Array.from(scope.querySelectorAll<HTMLElement>('h1, h2, h3, [class*="company-name"]'))
    .map((node) => cleanCompany(textOf(node)))
    .filter(Boolean);
  const heading = headings.find((value) => !/follow-up|quote preview|product|required/i.test(value));
  if (heading) return heading;

  const text = textOf(scope as Element);

  // Lead hero DOM usually reads like:
  // "Setu Groups buyer · Owner: Ritesh Kapoor · Source: ..."
  // or "Setu Groups buyer · Ritesh Kapoor · North America · New Lead".
  const heroPatterns = [
    /([A-Za-z0-9][A-Za-z0-9 &'.,/&()\-]{1,90}?)\s+(buyer|supplier)\s+·\s+Owner:/i,
    /([A-Za-z0-9][A-Za-z0-9 &'.,/&()\-]{1,90}?)\s+(buyer|supplier)\s+·\s+[^·]{2,60}\s+·\s+[^·]{2,60}/i,
    /([A-Za-z0-9][A-Za-z0-9 &'.,/&()\-]{1,90}?)\s+(buyer|supplier)\s+Owner:/i,
  ];

  for (const pattern of heroPatterns) {
    const candidate = cleanCompany(text.match(pattern)?.[1]);
    if (candidate) return candidate;
  }

  return '';
}

function extractCompanyFromQuoteContext(scope: ParentNode) {
  const text = textOf(scope as Element);
  const quoteGridMatch = text.match(/company\s+lead type\s+market\s+currency\s+(.+?)\s+(buyer|supplier)\s+/i);
  const quoteCompany = cleanCompany(quoteGridMatch?.[1]);
  if (quoteCompany) return quoteCompany;

  const linearMatch = text.match(/company\s+(.+?)\s+(lead type|market|currency)\b/i);
  return cleanCompany(linearMatch?.[1]);
}

function primeCoverageContext(target: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  const workspace = target?.closest('#inline-lead-workspace') ?? document.querySelector('#inline-lead-workspace');
  const scope = workspace ?? document.body;

  // This fallback is only for old inline workspace coverage buttons. The new
  // direct manager path should pass leadId. Clear stale lead IDs but provide a
  // reliable company fallback so legacy buttons can still load product/market data.
  window.__setuCoverageResolverLeadId = '';

  const company = extractCompanyFromSelectedHero(scope) || extractCompanyFromQuoteContext(scope);
  if (company) window.__setuCoverageResolverCompany = company;
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
