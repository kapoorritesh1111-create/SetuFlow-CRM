'use client';

import { useEffect, useRef, useState } from 'react';
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

function hasCoverageBlocker() {
  const bodyText = document.body?.innerText || '';
  return /link at least one product|no products mapped|product coverage required|add product coverage|product scope/i.test(bodyText);
}

function coverageResolverMounted() {
  return Boolean(window.__setuCoverageResolverOpen || document.querySelector('[data-inline-coverage-resolver]'));
}

function openResolver() {
  window.__setuCoverageRedirectAt = Date.now();
  window.__setuCoverageResolverOpen = true;
  openInlineCoverageResolver();
}

function findLegacyDrawerCloseButton() {
  const controls = Array.from(document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button, a'));
  const textual = controls.find((button) => /^x$|^×$|close|cancel/i.test(textOf(button)) || button.getAttribute('aria-label')?.toLowerCase().includes('close'));
  if (textual) return textual;

  const viewportWidth = window.innerWidth || 0;
  const topRightControls = controls
    .map((button) => ({ button, rect: button.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < 180 && rect.right > viewportWidth - 180)
    .sort((a, b) => a.rect.top - b.rect.top || b.rect.right - a.rect.right);

  return topRightControls[0]?.button ?? null;
}

function closeLegacyDrawer() {
  const redirectAt = window.__setuCoverageRedirectAt ?? 0;
  if (!redirectAt || Date.now() - redirectAt > 8000) return;
  const bodyText = document.body?.innerText || '';
  if (!/Edit Lead/i.test(bodyText) || !/Lead wizard|Lead basics|Step 1 of 4/i.test(bodyText)) return;
  findLegacyDrawerCloseButton()?.click();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  window.setTimeout(() => openInlineCoverageResolver(), 80);
}

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
      closeLegacyDrawer();
      if (!hasCoverageBlocker() || coverageResolverMounted()) return;
      const now = Date.now();
      if (now - lastOpenAtRef.current < 1200) return;
      lastOpenAtRef.current = now;
      openResolver();
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('button, a') : null;
      const label = textOf(target);
      const isCoverageAction = /open coverage manager|add products|edit products|adjust coverage/i.test(label);

      if (isCoverageAction) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openResolver();
        window.setTimeout(closeLegacyDrawer, 30);
        window.setTimeout(closeLegacyDrawer, 120);
        window.setTimeout(closeLegacyDrawer, 350);
        return;
      }

      if (/create quote|quote preview|open quote|start quote|create\/open draft preview/i.test(label)) {
        window.setTimeout(openInlineResolverIfBlocked, 250);
        window.setTimeout(openInlineResolverIfBlocked, 900);
      }
    };

    window.addEventListener('click', onClick, true);
    document.addEventListener('click', onClick, true);
    const observer = new MutationObserver(openInlineResolverIfBlocked);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('click', onClick, true);
      document.removeEventListener('click', onClick, true);
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;
  return <InlineCoverageResolverRuntime />;
}
