'use client';

import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

const TOP_HOST_ID = 'setu-growth-center-topbar-host';

function ensureHost() {
  let host = document.getElementById(TOP_HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = TOP_HOST_ID;
    host.className = 'hidden md:flex items-center shrink-0';
  }
  return host;
}

export function GlobalGrowthCenterEntry() {
  const [topHost, setTopHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const mount = () => {
      const header = document.querySelector<HTMLElement>('main#app-content > header')
        ?? document.querySelector<HTMLElement>('header.sticky')
        ?? document.querySelector<HTMLElement>('header');
      if (!header) return;

      header.querySelectorAll<HTMLAnchorElement>('a[href="/growth-agent"]').forEach((node) => {
        if (!node.closest(`#${TOP_HOST_ID}`)) node.remove();
      });

      const filter = header.querySelector<HTMLElement>('[aria-label="Global workspace filter"]');
      const actionRow = filter?.parentElement
        ?? header.querySelector<HTMLElement>(':scope > div > div:last-child')
        ?? header.lastElementChild;
      if (!(actionRow instanceof HTMLElement)) return;

      const host = ensureHost();
      if (!host.isConnected) actionRow.insertBefore(host, filter ?? actionRow.firstChild);
      setTopHost(host);
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', mount);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', mount);
    };
  }, []);

  if (!topHost) return null;

  return createPortal(
    <Link
      href="/growth-agent"
      className="mr-2 inline-flex h-10 items-center gap-2 rounded-2xl border border-teal-300/50 bg-gradient-to-r from-[#0B2E4A] to-[#0F766E] px-4 text-xs font-black text-white shadow-[0_10px_24px_rgba(15,118,110,0.18)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      aria-label="Open Setu Guru Growth Center"
      title="Open Setu Guru Growth Center"
    >
      <Image src="/setu-guru/guru-avatar-128.png" alt="" width={22} height={22} className="h-5 w-5 rounded-full object-contain" />
      <span>Growth Center</span>
    </Link>,
    topHost,
  );
}
