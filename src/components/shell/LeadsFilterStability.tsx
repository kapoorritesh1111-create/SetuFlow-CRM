'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const RESTORE_DELAYS_MS = [0, 120, 260, 520];

function isLeadControlTarget(target: EventTarget | null) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLButtonElement
  ) {
    return true;
  }

  if (target instanceof HTMLAnchorElement) {
    try {
      return new URL(target.href).pathname.startsWith('/leads');
    } catch {
      return target.href.includes('/leads');
    }
  }

  return false;
}

function restoreScrollPosition(scrollY: number) {
  window.scrollTo({ top: scrollY, left: window.scrollX, behavior: 'instant' });
}

function scheduleScrollRestore(scrollY: number) {
  let lastTimer = 0;
  window.requestAnimationFrame(() => restoreScrollPosition(scrollY));
  for (const delay of RESTORE_DELAYS_MS) {
    lastTimer = window.setTimeout(() => restoreScrollPosition(scrollY), delay);
  }
  return lastTimer;
}

export function LeadsFilterStability() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith('/leads')) return;

    let restoreTimer = 0;
    let enabled = false;
    const enableTimer = window.setTimeout(() => {
      enabled = true;
    }, 300);

    const holdViewport = (event: Event) => {
      if (!enabled) return;
      if (!isLeadControlTarget(event.target)) return;
      const y = window.scrollY;
      window.clearTimeout(restoreTimer);
      restoreScrollPosition(y);
      restoreTimer = scheduleScrollRestore(y);
    };

    document.addEventListener('input', holdViewport, true);
    document.addEventListener('change', holdViewport, true);
    document.addEventListener('click', holdViewport, true);

    return () => {
      window.clearTimeout(enableTimer);
      window.clearTimeout(restoreTimer);
      document.removeEventListener('input', holdViewport, true);
      document.removeEventListener('change', holdViewport, true);
      document.removeEventListener('click', holdViewport, true);
    };
  }, [pathname]);

  return null;
}
