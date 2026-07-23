'use client';

import { useEffect } from 'react';

const ENTRY_ID = 'setu-global-growth-center-entry';
const ENTRY_MARKER = 'data-setu-growth-center-entry';

function buildEntry() {
  const link = document.createElement('a');
  link.id = ENTRY_ID;
  link.setAttribute(ENTRY_MARKER, 'true');
  link.href = '/growth-agent';
  link.setAttribute('aria-label', 'Open Setu Guru Growth Center');
  link.setAttribute('title', 'Open Setu Guru Growth Center');
  link.className = 'hidden md:inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-teal-300/50 bg-gradient-to-r from-[#0B2E4A] to-[#0F766E] px-4 text-xs font-black text-white shadow-[0_10px_24px_rgba(15,118,110,0.18)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2';

  const avatar = document.createElement('img');
  avatar.src = '/setu-guru/guru-avatar-128.png';
  avatar.alt = '';
  avatar.width = 20;
  avatar.height = 20;
  avatar.className = 'h-5 w-5 rounded-full object-contain';

  const label = document.createElement('span');
  label.textContent = 'Growth Center';

  link.append(avatar, label);
  return link;
}

function findActionRow() {
  const headers = Array.from(document.querySelectorAll<HTMLElement>('header'));
  for (const header of headers) {
    const workspaceFilter = header.querySelector<HTMLElement>('[aria-label="Global workspace filter"]');
    const shareCard = Array.from(header.querySelectorAll<HTMLElement>('a,button')).find((node) => /share\s*v?card/i.test(node.textContent ?? ''));
    const quickLead = Array.from(header.querySelectorAll<HTMLElement>('a,button')).find((node) => /quick\s*lead/i.test(node.textContent ?? ''));
    const anchor = workspaceFilter ?? shareCard ?? quickLead;
    if (anchor?.parentElement) return { row: anchor.parentElement, anchor };
  }
  return null;
}

function mountSingleEntry() {
  const target = findActionRow();
  if (!target) return;

  const matches = Array.from(document.querySelectorAll<HTMLElement>(`[${ENTRY_MARKER}]`));
  let entry = document.getElementById(ENTRY_ID) as HTMLAnchorElement | null;

  for (const match of matches) {
    if (match.id !== ENTRY_ID || match !== entry) match.remove();
  }

  const duplicateLinks = Array.from(target.row.querySelectorAll<HTMLAnchorElement>('a[href="/growth-agent"]'));
  for (const link of duplicateLinks) {
    if (link.id !== ENTRY_ID) link.remove();
  }

  if (!entry) entry = buildEntry();
  if (entry.parentElement !== target.row) {
    target.row.insertBefore(entry, target.anchor);
  }
}

export function GlobalGrowthCenterEntry() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(mountSingleEntry);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('popstate', schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('popstate', schedule);
    };
  }, []);

  return null;
}
