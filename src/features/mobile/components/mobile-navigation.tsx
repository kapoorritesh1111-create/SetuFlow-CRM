'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThreeDIconOrb } from './icon-3d-orb';

const tabs = [
  { href: '/mobile', label: 'Home', icon: '⌂' },
  { href: '/mobile/leads', label: 'Leads', icon: '◎' },
  { href: '/mobile/quote', label: 'Quote', icon: '◌' },
  { href: '/mobile/capture', label: 'Capture', icon: '+' },
  { href: '/mobile/settings', label: 'Settings', icon: '☼' }
];

export function BrandedMobileTopBar() {
  const [open, setOpen] = useState(false);
  return <>
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 px-4 py-3 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-[430px] items-center gap-3">
        <button onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10" aria-label="Open mobile menu">☰</button>
        <img src="/logos/setu-flow-logo.svg" alt="SETU Flow" className="h-9 w-9 rounded-xl bg-white p-1" />
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">Premium mobile</p><p className="truncate text-base font-black tracking-tight">SETU Flow</p></div>
        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-black text-emerald-200">Synced</span>
      </div>
    </header>
    <MobileActionDrawer open={open} onClose={() => setOpen(false)} />
  </>;
}

export function MobileActionDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-slate-950/55" onClick={onClose}>
    <div className="absolute bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 rounded-t-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
      <h2 className="text-lg font-black text-slate-950 dark:text-white">Quick actions</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Open the fastest field workflows.</p>
      <div className="mt-4 grid gap-2">
        {tabs.map((tab) => <Link key={tab.href} href={tab.href} onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><span>{tab.icon}</span>{tab.label}</Link>)}
      </div>
    </div>
  </div>;
}

export function MobileBottomTabs() {
  const pathname = usePathname();
  return <nav className="fixed bottom-0 left-1/2 z-40 grid h-[82px] w-full max-w-[430px] -translate-x-1/2 grid-cols-5 gap-1 border-t border-slate-200/60 bg-white/90 px-2 pb-4 pt-2 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90" aria-label="Mobile navigation">
    {tabs.map((tab) => {
      const active = pathname === tab.href;
      return <Link key={tab.href} href={tab.href} className={`flex flex-col items-center justify-center rounded-2xl text-[10px] font-black ${active ? 'bg-blue-500/10 text-blue-600 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}><span className="text-lg">{tab.icon}</span>{tab.label}</Link>;
    })}
  </nav>;
}

export function MobileHomeHero() {
  return <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-5 text-white shadow-2xl shadow-blue-950/20">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Today</p><h1 className="mt-2 text-3xl font-black leading-none tracking-tight">Manage trade work from your phone.</h1></div><ThreeDIconOrb icon="✦" tone="gold" /></div>
    <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-3xl bg-white/10 p-4"><b className="text-3xl">9</b><p className="text-xs text-slate-300">captures</p></div><div className="rounded-3xl bg-white/10 p-4"><b className="text-3xl">73s</b><p className="text-xs text-slate-300">avg quote start</p></div></div>
  </section>;
}
