'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { ReactNode } from 'react';

const navItems: [string, string][] = [
  ['/platform', 'Platform'],
  ['/solutions', 'Solutions'],
  ['/setu-guru-ai', 'Setu Guru AI'],
  ['/field-mobile', 'Mobile'],
  ['/pricing', 'Pricing'],
  ['/compare', 'Compare'],
];

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-[#1F487C]/10 bg-white/95 shadow-[0_8px_24px_rgba(31,72,124,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center" onClick={() => setMobileOpen(false)}>
            <Image src="/logos/setu-flow-logo.png" alt="Setu Flow — Trade Execution CRM" width={200} height={60} className="h-[52px] w-auto" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
            {navItems.map(([href, label]) => (
              <Link key={href} href={href} className="text-[13px] font-semibold text-slate-600 transition hover:text-[#108477]">
                {label}
              </Link>
            ))}
            <Link href="/book-demo" className="rounded-full border border-[#108477]/25 bg-white px-5 py-2.5 text-[13px] font-semibold text-[#108477] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#eef6fb]">
              Book Demo
            </Link>
            <Link href="/client-login" className="rounded-full bg-[#06263f] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(6,38,63,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0b2e4a]">
              Enter workspace
            </Link>
          </nav>

          <div className="flex items-center gap-3 md:hidden">
            <Link href="/client-login" className="rounded-full bg-[#06263f] px-4 py-2 text-xs font-semibold text-white shadow-md">
              Enter
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-[#1F487C]/10 bg-white/96 px-4 pb-5 pt-3 backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col">
              {[...navItems, ['/book-demo', 'Book Demo']].map(([href, label]) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#108477]">
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {children}

      <footer className="border-t border-[#1F487C]/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Link href="/"><Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={150} height={46} className="h-10 w-auto" /></Link>
              <p className="mt-4 max-w-[22rem] text-sm leading-7 text-slate-500">
                Trade execution software for import-export teams, built around leads, quotes, documents, orders and shipment readiness.
              </p>
              <a href="mailto:help@setugroups.com" className="mt-4 inline-flex text-sm font-semibold text-[#108477] underline-offset-4 hover:underline">help@setugroups.com</a>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-400">Platform</p>
              <ul className="mt-4 space-y-3">
                {navItems.slice(0, 4).map(([href, label]) => <li key={href}><Link href={href} className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">{label}</Link></li>)}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-400">Company</p>
              <ul className="mt-4 space-y-3">
                <li><Link href="/pricing" className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">Pricing</Link></li>
                <li><Link href="/compare" className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">Compare</Link></li>
                <li><Link href="/book-demo" className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">Book a demo</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-400">Access</p>
              <ul className="mt-4 space-y-3">
                <li><a href="mailto:help@setugroups.com" className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">Contact support</a></li>
                <li><a href="mailto:admin@setugroups.com" className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">Sales &amp; demos</a></li>
                <li><Link href="/client-login" className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">Enter workspace</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start gap-4 border-t border-slate-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400" suppressHydrationWarning>&copy; {new Date().getFullYear()} Setu Groups. All rights reserved.</p>
            <p className="text-xs text-slate-400">Trade execution software for global import-export teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
