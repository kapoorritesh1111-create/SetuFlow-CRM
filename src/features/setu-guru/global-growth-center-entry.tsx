'use client';

import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

function growthLinks(root: ParentNode) {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href="/growth-agent"]'));
}

export function GlobalGrowthCenterEntry() {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const cleanupNodes: HTMLElement[] = [];

    const install = () => {
      const header = document.querySelector<HTMLElement>('header');
      if (!header) return;

      const existingHeaderLinks = growthLinks(header);
      if (existingHeaderLinks.length) {
        existingHeaderLinks.slice(1).forEach((link) => link.remove());
        setHost(null);
      } else {
        let node = document.querySelector<HTMLElement>('[data-growth-center-topbar-host="true"]');
        if (!node) {
          node = document.createElement('div');
          node.dataset.growthCenterTopbarHost = 'true';
          node.className = 'hidden md:flex items-center shrink-0';
          const workspaceFilter = header.querySelector<HTMLElement>('[aria-label="Global workspace filter"]');
          const shareCard = header.querySelector<HTMLAnchorElement>('a[href^="/card"]');
          const anchor = workspaceFilter ?? shareCard;
          if (anchor?.parentElement) anchor.parentElement.insertBefore(node, anchor);
          else header.appendChild(node);
          cleanupNodes.push(node);
        }
        setHost(node);
      }

      const nav = document.querySelector<HTMLElement>('nav[aria-label="Desktop workflow navigation"]');
      if (nav && !nav.querySelector('a[href="/growth-agent"]')) {
        const link = document.createElement('a');
        link.href = '/growth-agent';
        link.dataset.growthCenterNav = 'true';
        link.title = 'Setu Guru Growth Center';
        link.className = 'group mx-1 mb-3 flex items-center rounded-2xl border border-teal-300/30 bg-teal-400/10 px-2 py-2 text-white transition hover:bg-teal-300/20';
        link.innerHTML = '<span class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-slate-950"><img src="/setu-guru/guru-avatar-128.png" alt="" class="h-7 w-7 object-contain" /></span><span class="ml-2 hidden truncate text-xs font-black xl:block">Growth Center</span>';
        nav.prepend(link);
        cleanupNodes.push(link);
      }
    };

    install();
    const observer = new MutationObserver(() => install());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanupNodes.forEach((node) => node.remove());
    };
  }, []);

  if (!host) return null;

  return createPortal(
    <Link
      href="/growth-agent"
      className="mr-2 inline-flex h-10 items-center gap-2 rounded-2xl border border-teal-200 bg-gradient-to-r from-slate-950 to-teal-800 px-3.5 text-xs font-black text-white shadow-[0_10px_24px_rgba(15,118,110,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,118,110,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      aria-label="Open Setu Guru Growth Center"
      title="Open Setu Guru Growth Center"
    >
      <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-slate-950">
        <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={28} height={28} className="h-6 w-6 object-contain" />
      </span>
      <span>Growth Center</span>
    </Link>,
    host,
  );
}
