'use client';

import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { BadgeDollarSign } from 'lucide-react';

const TOP_HOST_ID = 'setu-growth-center-topbar-host';
const SIDE_HOST_ID = 'setu-growth-center-sidebar-host';
const PRICING_HOST_ID = 'setu-growth-center-pricing-host';

function ensureHost(id: string, className: string) {
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement('div');
    host.id = id;
    host.className = className;
  }
  return host;
}

export function GlobalGrowthCenterEntry() {
  const [topHost, setTopHost] = useState<HTMLElement | null>(null);
  const [sideHost, setSideHost] = useState<HTMLElement | null>(null);
  const [pricingHost, setPricingHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const mount = () => {
      const header = document.querySelector<HTMLElement>('header');
      if (header) {
        header.querySelectorAll<HTMLAnchorElement>('a[href="/growth-agent"]').forEach((node) => {
          if (!node.closest(`#${TOP_HOST_ID}`)) node.remove();
        });
        const filter = header.querySelector<HTMLElement>('[aria-label="Global workspace filter"]');
        const actions = filter?.parentElement ?? header.querySelector<HTMLElement>('div.flex.items-center.gap-2') ?? header.lastElementChild;
        if (actions instanceof HTMLElement) {
          const host = ensureHost(TOP_HOST_ID, 'hidden md:flex items-center shrink-0');
          if (!host.isConnected) actions.insertBefore(host, filter ?? actions.firstChild);
          setTopHost(host);
        }
      }

      const nav = document.querySelector<HTMLElement>('aside nav[aria-label="Desktop workflow navigation"]');
      if (nav) {
        nav.querySelectorAll<HTMLAnchorElement>('a[href="/growth-agent"]').forEach((node) => {
          if (!node.closest(`#${SIDE_HOST_ID}`)) node.remove();
        });
        const host = ensureHost(SIDE_HOST_ID, 'px-2 pb-2');
        if (!host.isConnected) nav.insertBefore(host, nav.firstChild);
        setSideHost(host);
      }

      const growthNav = document.querySelector<HTMLElement>('nav[aria-label="Growth Center filters"]');
      if (growthNav) {
        const host = ensureHost(PRICING_HOST_ID, 'mt-1');
        if (!host.isConnected) growthNav.appendChild(host);
        setPricingHost(host);
      } else {
        setPricingHost(null);
      }
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const topEntry = topHost ? createPortal(
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
  ) : null;

  const sideEntry = sideHost ? createPortal(
    <Link
      href="/growth-agent"
      className="group flex items-center justify-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-2 py-2 text-[10px] font-bold text-white transition hover:bg-white/15"
      aria-label="Open Growth Center"
      title="Growth Center"
    >
      <Image src="/setu-guru/guru-avatar-128.png" alt="" width={24} height={24} className="h-6 w-6 rounded-full object-contain" />
      <span className="hidden xl:inline">Growth Center</span>
    </Link>,
    sideHost,
  ) : null;

  const pricingEntry = pricingHost ? createPortal(
    <Link
      href="/products?mode=pricing"
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-normal text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
    >
      <BadgeDollarSign className="h-4 w-4 text-teal-700" aria-hidden="true" />
      <span>Pricing Intelligence</span>
    </Link>,
    pricingHost,
  ) : null;

  return <>{topEntry}{sideEntry}{pricingEntry}</>;
}
