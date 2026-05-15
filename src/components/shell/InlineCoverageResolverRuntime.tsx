'use client';

import { useEffect, useState } from 'react';
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

  if (!mount) return null;

  return createPortal(
    <LeadCoverageManager
      key={version}
      leadId={window.__setuCoverageResolverLeadId || null}
      companyName={window.__setuCoverageResolverCompany || null}
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
