'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThreeDIconOrb } from './icon-3d-orb';
import { MobileVCardShareSheet } from './mobile-vcard-share-sheet';
import type { MobileSignedInIdentity } from './mobile-shell';

const standaloneTabs = [
  { href: '/mobile', label: 'Home', icon: '⌂' },
  { href: '/mobile/leads', label: 'Leads', icon: '◎' },
  { href: '/mobile/quote', label: 'Quote', icon: '◌' },
  { href: '/mobile/capture', label: 'Capture', icon: '+' },
  { href: '/mobile/settings', label: 'Settings', icon: '☼' },
];

const canonicalTabs = [
  { href: '/dashboard', label: 'Home', icon: '⌂' },
  { href: '/leads', label: 'Leads', icon: '◎' },
  { href: '/leads?quickLead=1', label: 'Capture', icon: '◌' },
  { href: '/orders', label: 'Orders', icon: '◇' },
  { href: '/settings/lists', label: 'More', icon: '•••' },
];

function resolveTitle(pathname: string) {
  if (pathname.startsWith('/leads')) return 'Current Leads';
  if (pathname.startsWith('/orders')) return 'Orders';
  if (pathname.includes('capture')) return 'Capture';
  if (pathname.includes('quote')) return 'Quick Quote';
  if (pathname.includes('settings')) return 'Settings';
  if (pathname.includes('notifications')) return 'Notifications';
  return 'Home Dashboard';
}

function initialsFrom(name?: string | null) {
  return (name ?? 'SF')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'SF';
}

export function BrandedMobileTopBar({ signedIn, canonical = false }: { signedIn?: MobileSignedInIdentity; canonical?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dateLabel, setDateLabel] = useState('');
  const title = resolveTitle(pathname);
  const displayName = signedIn?.name ?? 'SETU Flow';
  const initials = signedIn?.initials ?? initialsFrom(displayName);

  useEffect(() => {
    setDateLabel(new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).format(new Date()));
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[linear-gradient(180deg,rgba(8,18,37,.96),rgba(8,18,37,.78))] px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] text-white shadow-[0_16px_40px_rgba(15,23,42,.18)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[430px] items-center gap-3">
          <button onClick={() => setOpen(true)} className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/10 text-xl" aria-label="Open mobile menu">☰</button>
          <img src="/logos/setu-flow-logo.svg" alt="SETU Flow" className="h-10 w-10 rounded-2xl bg-white p-1 shadow-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">SETU Flow Mobile</p>
            <p className="truncate text-base font-black tracking-tight">{title}</p>
            <p className="truncate text-[10px] text-white/55">{dateLabel || 'Today'} · {displayName}</p>
          </div>
          <button type="button" onClick={() => setShareOpen(true)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-lg" aria-label="Share my vCard">📇</button>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_28%),linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] text-xs font-black ring-1 ring-white/20" title={`Signed in as ${displayName}`}>{initials}</span>
        </div>
      </header>
      <MobileActionDrawer open={open} onClose={() => setOpen(false)} canonical={canonical} signedIn={signedIn} onShareVCard={() => setShareOpen(true)} />
      <MobileVCardShareSheet open={shareOpen} onClose={() => setShareOpen(false)} signedIn={signedIn} />
    </>
  );
}

export function MobileActionDrawer({ open, onClose, canonical = false, signedIn, onShareVCard }: { open: boolean; onClose: () => void; canonical?: boolean; signedIn?: MobileSignedInIdentity; onShareVCard?: () => void }) {
  if (!open) return null;
  const tabs = canonical ? canonicalTabs : standaloneTabs;
  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 rounded-t-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-start gap-3">
          <ThreeDIconOrb icon="✦" tone="blue" />
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Fast field workflows for {signedIn?.name ?? 'your workspace'}.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={() => { onClose(); onShareVCard?.(); }} className="flex min-h-12 items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 text-left font-black text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-sky-200"><span>📇</span>Share vCard</button>
          {tabs.map((tab) => <Link key={tab.href} href={tab.href} onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"><span>{tab.icon}</span>{tab.label}</Link>)}
        </div>
      </div>
    </div>
  );
}

export function MobileBottomTabs({ canonical = false }: { canonical?: boolean }) {
  const pathname = usePathname();
  const tabs = canonical ? canonicalTabs : standaloneTabs;
  return (
    <nav className="fixed bottom-0 left-1/2 z-[60] grid h-[86px] w-full max-w-[430px] -translate-x-1/2 grid-cols-5 gap-1 rounded-t-[24px] border border-slate-200/80 border-b-0 bg-white/92 px-2 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_44px_rgba(15,23,42,.16)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/92" aria-label="Mobile navigation">
      {tabs.map((tab) => {
        const baseHref = tab.href.split('?')[0];
        const active = pathname === baseHref || (baseHref !== '/dashboard' && pathname.startsWith(baseHref + '/'));
        return <Link key={tab.href} href={tab.href} className={`flex flex-col items-center justify-center rounded-2xl text-[10px] font-black ${active ? 'bg-blue-500/10 text-blue-600 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}><span className="text-lg">{tab.icon}</span>{tab.label}</Link>;
      })}
    </nav>
  );
}

export function MobileHomeHero() {
  return <section className="rounded-[2rem] bg-[linear-gradient(145deg,#0c172d_0%,#122241_100%)] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,.22)]">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Premium mobile</p><h1 className="mt-2 text-3xl font-black leading-none tracking-tight">Capture faster. Quote smarter. Close from the floor.</h1><p className="mt-3 text-sm text-white/68">One-handed access to leads, capture, quote movement, and trade execution.</p></div><ThreeDIconOrb icon="✦" tone="gold" /></div>
    <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-3xl bg-white/10 p-4"><b className="text-3xl">46</b><p className="text-xs text-slate-300">open leads</p></div><div className="rounded-3xl bg-white/10 p-4"><b className="text-3xl">34</b><p className="text-xs text-slate-300">due now</p></div></div>
  </section>;
}

export function MobileDashboardHome() {
  const actions = [
    { href: '/leads', title: 'Current leads', body: 'Review status, owner, team, next action, and move work forward.', icon: '◎', tone: 'blue' as const },
    { href: '/leads?quickLead=1', title: 'Capture buyer', body: 'Start a fast buyer capture and quote path.', icon: '🛒', tone: 'teal' as const },
    { href: '/leads?quickLead=1&sourceType=supplier', title: 'Capture supplier', body: 'Capture supplier sourcing details and follow-up work.', icon: '🏭', tone: 'violet' as const },
    { href: '/orders', title: 'Orders', body: 'Check active execution and next blockers.', icon: '◇', tone: 'gold' as const },
  ];
  return (
    <div className="space-y-4">
      <MobileHomeHero />
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-sky-300">Fast actions</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.title} href={action.href} className="min-h-[142px] rounded-[1.5rem] border border-white/70 bg-white/86 p-4 shadow-lg shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-950/60">
              <ThreeDIconOrb icon={action.icon} tone={action.tone} />
              <b className="mt-3 block text-sm font-black text-slate-950 dark:text-white">{action.title}</b>
              <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-300">{action.body}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="grid gap-3">
        <a href="/leads?handoff=dashboard-overdue" className="rounded-[1.5rem] border border-rose-200 bg-white/90 p-5 shadow-xl shadow-blue-950/5 dark:border-rose-900/60 dark:bg-slate-900/90"><p className="text-xs font-black uppercase tracking-[0.16em] text-rose-500">Open opportunities</p><b className="mt-2 block text-4xl font-black text-slate-950 dark:text-white">46</b><span className="mt-2 block text-sm text-slate-500 dark:text-slate-300">36 buyers · 10 suppliers in motion</span><span className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-rose-600">Open follow-up queue →</span></a>
        <a href="/leads?handoff=dashboard-open-follow-up" className="rounded-[1.5rem] border border-amber-200 bg-white/90 p-5 shadow-xl shadow-blue-950/5 dark:border-amber-900/60 dark:bg-slate-900/90"><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">Follow-ups due now</p><b className="mt-2 block text-4xl font-black text-slate-950 dark:text-white">34</b><span className="mt-2 block text-sm text-slate-500 dark:text-slate-300">Clear priority items before they cool</span><span className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-amber-700">Review overdue follow-ups →</span></a>
        <a href="/mobile/quote" className="rounded-[1.5rem] border border-sky-200 bg-white/90 p-5 shadow-xl shadow-blue-950/5 dark:border-sky-900/60 dark:bg-slate-900/90"><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Quotes in market</p><b className="mt-2 block text-4xl font-black text-slate-950 dark:text-white">26</b><span className="mt-2 block text-sm text-slate-500 dark:text-slate-300">Track live pricing and buyer response</span><span className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-sky-700">Open quote desk →</span></a>
      </section>
    </div>
  );
}
