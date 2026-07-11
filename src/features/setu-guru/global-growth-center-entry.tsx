'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export function GlobalGrowthCenterEntry() {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const existing = document.querySelector<HTMLElement>('[data-growth-center-topbar-host="true"]');
    if (existing) {
      setHost(existing);
      return;
    }

    const target = document.querySelector<HTMLElement>('[aria-label="Global workspace filter"]');
    const header = target?.closest('header') ?? document.querySelector<HTMLElement>('header');
    if (!header) return;

    const node = document.createElement('div');
    node.dataset.growthCenterTopbarHost = 'true';
    node.className = 'hidden md:flex items-center shrink-0';

    if (target?.parentElement) target.parentElement.insertBefore(node, target);
    else header.appendChild(node);

    setHost(node);
    return () => node.remove();
  }, []);

  if (!host) return null;

  return createPortal(
    <Link
      href="/growth-agent"
      className="mr-2 inline-flex h-10 items-center gap-2 rounded-2xl border border-teal-200 bg-gradient-to-r from-slate-950 to-teal-800 px-4 text-xs font-black text-white shadow-[0_10px_24px_rgba(15,118,110,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,118,110,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      aria-label="Open Setu Guru Growth Center"
      title="Open Setu Guru Growth Center"
    >
      <Sparkles className="h-4 w-4 text-teal-200" aria-hidden="true" />
      <span>Growth Center</span>
    </Link>,
    host,
  );
}
