'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const FILTER_LANE_HEIGHT_PX = 52;
const ACTIVE_FILTER_LABELS = [
  'Search:',
  'Mode:',
  'Owner:',
  'Stage:',
  'Country:',
  'Market:',
  'Product:',
  'Source event:',
];

function getDirectChildRow(element: Element | null) {
  if (!element) return null;
  let current: Element | null = element;
  while (current?.parentElement && !current.parentElement.classList.contains('mobile-premium-leads')) {
    current = current.parentElement;
  }
  return current instanceof HTMLElement ? current : null;
}

function isActiveFilterChipRow(element: Element | null) {
  if (!(element instanceof HTMLElement)) return false;
  const text = element.textContent ?? '';
  return text.includes('Clear all') && ACTIVE_FILTER_LABELS.some((label) => text.includes(label));
}

function applyLeadsFilterStability() {
  const shell = document.querySelector('.mobile-premium-leads');
  if (!(shell instanceof HTMLElement)) return;

  const searchInput = shell.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
  const filterRow = getDirectChildRow(searchInput);
  if (!filterRow) return;

  filterRow.style.marginBottom = `${FILTER_LANE_HEIGHT_PX}px`;
  filterRow.style.position = 'relative';
  filterRow.style.zIndex = '2';

  const children = Array.from(shell.children);
  const filterRowIndex = children.indexOf(filterRow);
  const nextRow = filterRowIndex >= 0 ? children[filterRowIndex + 1] : null;

  if (isActiveFilterChipRow(nextRow)) {
    const chipRow = nextRow as HTMLElement;
    chipRow.style.marginTop = `-${FILTER_LANE_HEIGHT_PX}px`;
    chipRow.style.minHeight = `${FILTER_LANE_HEIGHT_PX}px`;
    chipRow.style.alignItems = 'center';
    chipRow.style.position = 'relative';
    chipRow.style.zIndex = '3';
  }
}

export function LeadsFilterStability() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith('/leads')) return;

    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(applyLeadsFilterStability);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    window.addEventListener('resize', schedule);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [pathname]);

  return null;
}
