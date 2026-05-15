'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LeadCoverageManager } from '@/components/shell/LeadCoverageManager';

declare global {
  interface Window {
    __setuCoverageResolverOpen?: boolean;
    __setuCoverageResolverLeadId?: string;
    __setuCoverageResolverCompany?: string;
  }
}

function textOf(element?: Element | null) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function area(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return rect.width * rect.height;
}

function cleanCompany(value?: string | null) {
  const candidate = String(value ?? '')
    .replace(/^[\s:.-]+|[\s:.-]+$/g, '')
    .trim();
  if (!candidate || candidate.length > 90) return '';
  if (/next move|lead queue|hot list|coverage|commercial|qualification|follow-up|quick edit|create quote|open coverage manager|stage progress|deal value|scheduled actions|product required|quote preview|trade command center|command center|buyer context|product scope/i.test(candidate)) return '';
  return candidate;
}

function findResolverPanel() {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('section, article, div')).filter(visible);
  const productScope = blocks
    .filter((block) => /product scope/i.test(textOf(block)) && /no products mapped|open coverage manager|add products|product required|product & buyer lock/i.test(textOf(block)))
    .sort((a, b) => area(a) - area(b))[0];
  if (productScope) return productScope;

  const coverage = blocks
    .filter((block) => /coverage\s+[-—]\s+product and market mapping|products and markets define the commercial scope/i.test(textOf(block)))
    .sort((a, b) => area(a) - area(b))[0];
  return coverage ?? null;
}

function findCompanyAfterBuyerContext(text: string) {
  const marker = 'buyer context company lead type market currency ';
  const lower = text.toLowerCase();
  const start = lower.indexOf(marker);
  if (start >= 0) {
    const rest = text.slice(start + marker.length);
    const match = rest.match(/^(.+?)\s+(buyer|supplier)\s+/i);
    const candidate = cleanCompany(match?.[1]);
    if (candidate) return candidate;
  }

  const inlineMarker = 'buyer context company ';
  const inlineStart = lower.indexOf(inlineMarker);
  if (inlineStart >= 0) {
    const rest = text.slice(inlineStart + inlineMarker.length);
    const match = rest.match(/^(.+?)\s+lead type\s+(buyer|supplier)\s+market\s+/i);
    const candidate = cleanCompany(match?.[1]);
    if (candidate) return candidate;
  }

  return '';
}

function inferCompanyFromWorkspace(mount?: HTMLElement | null) {
  const workspace = mount?.closest('#inline-lead-workspace') ?? document.querySelector('#inline-lead-workspace') ?? document.body;
  const text = textOf(workspace);

  const buyerContextCompany = findCompanyAfterBuyerContext(text);
  if (buyerContextCompany) return buyerContextCompany;

  const linearCompany = text.match(/company\s+(.+?)\s+(lead type|market|currency)\b/i);
  const linearCompanyValue = cleanCompany(linearCompany?.[1]);
  if (linearCompanyValue) return linearCompanyValue;

  const heroPatterns = [
    /([A-Za-z0-9][A-Za-z0-9 &'.,/&()\-]{1,90}?)\s+(buyer|supplier)\s+·\s+Owner:/i,
    /([A-Za-z0-9][A-Za-z0-9 &'.,/&()\-]{1,90}?)\s+(buyer|supplier)\s+·\s+[^·]{2,60}\s+·\s+[^·]{2,60}/i,
    /([A-Za-z0-9][A-Za-z0-9 &'.,/&()\-]{1,90}?)\s+(buyer|supplier)\s+Owner:/i,
  ];
  for (const pattern of heroPatterns) {
    const company = cleanCompany(text.match(pattern)?.[1]);
    if (company) return company;
  }

  const headings = Array.from(workspace.querySelectorAll<HTMLElement>('h1, h2, h3, [class*="company-name"]'))
    .map((node) => cleanCompany(textOf(node)))
    .filter(Boolean);
  return headings.find((heading) => !/follow-up|quote preview|product|required/i.test(heading)) ?? '';
}

function ensureResolverMount() {
  const panel = findResolverPanel();
  if (!panel) return null;
  panel.querySelectorAll('[data-inline-coverage-resolver]').forEach((node) => node.remove());
  const mount = document.createElement('div');
  mount.setAttribute('data-inline-coverage-resolver', 'true');
  mount.setAttribute('data-testid', 'quote-product-scope-inline-product-picker');
  mount.className = 'my-3 rounded-[24px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm';

  const children = Array.from(panel.children);
  const anchor = children.find((child) => /no products mapped|product scope|product & buyer lock/i.test(textOf(child))) ?? children[0] ?? null;
  if (anchor?.nextSibling) panel.insertBefore(mount, anchor.nextSibling);
  else if (anchor) panel.appendChild(mount);
  else panel.appendChild(mount);

  const inferredCompany = inferCompanyFromWorkspace(mount);
  if (!window.__setuCoverageResolverLeadId && inferredCompany) {
    window.__setuCoverageResolverCompany = inferredCompany;
  }

  mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return mount;
}

export function InlineCoverageResolverRuntime() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const open = () => {
      const nextMount = ensureResolverMount();
      if (nextMount) {
        window.__setuCoverageResolverOpen = true;
        setMount(nextMount);
        setVersion((value) => value + 1);
      }
    };
    window.addEventListener('setu:open-inline-coverage-resolver', open);
    return () => window.removeEventListener('setu:open-inline-coverage-resolver', open);
  }, []);

  const resolvedCompany = useMemo(() => {
    if (!mount) return '';
    return window.__setuCoverageResolverCompany || inferCompanyFromWorkspace(mount);
  }, [mount, version]);

  if (!mount) return null;

  return createPortal(
    <LeadCoverageManager
      key={version}
      leadId={window.__setuCoverageResolverLeadId || null}
      companyName={resolvedCompany || null}
      onClose={() => {
        window.__setuCoverageResolverOpen = false;
        mount.remove();
        setMount(null);
      }}
    />,
    mount,
  );
}

export function openInlineCoverageResolver() {
  window.dispatchEvent(new Event('setu:open-inline-coverage-resolver'));
}
