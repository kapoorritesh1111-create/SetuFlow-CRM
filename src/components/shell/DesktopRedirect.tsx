'use client';

import { useMemo, useState } from 'react';
import { FaIcon } from '@/components/ui/fa-icon';

const mobileWorks = ['Dashboard', 'Leads', 'Capture', 'My Card', 'Tasks', 'Order Status'];

export function DesktopRedirect({ title = 'Open on desktop', description = 'This workspace has dense tables, builders, or admin tools that are best used on a desktop screen.' }: { title?: string; description?: string }) {
  const [copied, setCopied] = useState(false);
  const href = useMemo(() => (typeof window === 'undefined' ? '' : window.location.href), []);

  const copyLink = async () => {
    if (!href || !navigator.clipboard) return;
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="md:hidden rounded-[1.6rem] border border-slate-200 bg-white p-5 text-center shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b2e4a] text-white shadow-[0_10px_24px_rgba(12,127,255,0.26)]">
        <FaIcon icon="desktop" fixedWidth className="text-xl" />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0c7fff]">Desktop workspace</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 grid gap-2">
        <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[0.9rem] bg-[#0b2e4a] px-4 text-sm font-semibold text-white hover:bg-[#061c2e]">
          <FaIcon icon="link" fixedWidth />
          {copied ? 'Copied link' : 'Copy desktop link'}
        </button>
        <a href={`mailto:?subject=${encodeURIComponent('Open this SETU Flow workspace on desktop')}&body=${encodeURIComponent(href)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          <FaIcon icon="envelope-o" fixedWidth />
          Email link to myself
        </a>
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Works on mobile</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mobileWorks.map((item) => <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{item}</span>)}
        </div>
      </div>
    </section>
  );
}
