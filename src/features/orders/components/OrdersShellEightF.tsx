'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('a, button, input, select, textarea, label, summary, details, form, [role="button"], [data-no-row-open]'),
  );
}

function findOrderOpenHref(target: Element): string | null {
  let node: Element | null = target;
  while (node && node instanceof HTMLElement) {
    const openLink = node.querySelector<HTMLAnchorElement>('a[href*="openOrderId="]');
    if (openLink?.href) return openLink.href;

    const closeLink = node.querySelector<HTMLAnchorElement>('a[href*="mode=buyers"]');
    const hasOrderHeading = /Pacific|Foods|Trading|Company|Order/i.test(node.textContent ?? '');
    if (closeLink?.href && hasOrderHeading) return null;

    node = node.parentElement;
  }
  return null;
}

export function OrdersShellEightF({ children }: { children: ReactNode }) {
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractiveTarget(event.target)) return;
    if (!(event.target instanceof Element)) return;

    const href = findOrderOpenHref(event.target);
    if (!href) return;

    window.location.href = href;
  }, []);

  return (
    <div className="orders-8f-shell" onClick={handleClick}>
      <style jsx global>{`
        /* Sprint 8F: the app header already owns Orders / Execution and Buyer/Supplier mode. */
        .orders-8f-shell .mobile-premium-orders > header {
          display: none !important;
        }

        /* Remove the empty shell gap left by the hidden inner Orders Desk strip. */
        .orders-8f-shell .mobile-premium-orders {
          padding-top: 0 !important;
        }

        /* Make order rows feel clickable without changing server-side links/actions. */
        .orders-8f-shell a[href*="openOrderId="] {
          cursor: pointer;
        }

        .orders-8f-shell .mobile-premium-orders a[href*="openOrderId="]::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        /* Tighten the orders page after the duplicate shell is removed. */
        .orders-8f-shell .mobile-premium-orders > div:first-of-type {
          margin-top: 0 !important;
        }
      `}</style>
      {children}
    </div>
  );
}
