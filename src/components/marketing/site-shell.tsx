'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { ReactNode } from 'react';

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbfb_0%,#eef6fb_45%,#f8fbff_100%)] text-slate-900">

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 border-b border-[#1F487C]/10 bg-white/82 shadow-[0_10px_30px_rgba(31,72,124,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <Image src="/logos/setu-flow-logo.png" alt="Setu Flow — Trade Execution CRM" width={170} height={52} className="h-10 w-auto" priority />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
            <a href="/#platform" className="text-sm font-medium text-slate-600 transition hover:text-[#1F487C]">Platform</a>
            <a href="/#compare" className="text-sm font-medium text-slate-600 transition hover:text-[#1F487C]">Compare</a>
            <a href="/#pricing" className="text-sm font-medium text-slate-600 transition hover:text-[#1F487C]">Pricing</a>
            <a href="/#book-demo" className="text-sm font-medium text-slate-600 transition hover:text-[#1F487C]">Book demo</a>
            <Link href="/client-login" className="rounded-full bg-[#06263f] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(6,38,63,0.20)] transition hover:-translate-y-0.5 hover:bg-[#0b2e4a]">
              Enter workspace
            </Link>
          </nav>

          {/* Mobile controls */}
          <div className="flex items-center gap-3 md:hidden">
            <Link href="/client-login" className="rounded-full bg-[#06263f] px-4 py-2 text-xs font-semibold text-white shadow-lg">
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

        {/* Mobile drawer */}
        {mobileOpen && (
          <nav className="border-t border-[#1F487C]/10 bg-white/95 px-4 pb-6 pt-4 backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col gap-1">
              {[
                ['/#platform', 'Platform'],
                ['/#compare', 'Compare'],
                ['/#pricing', 'Pricing'],
                ['/#book-demo', 'Book demo'],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#1F487C]"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* ─── Content ─── */}
      {children}

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#1F487C]/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          {/* Top row */}
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">

            {/* Brand */}
            <div>
              <Link href="/">
                <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={140} height={44} className="h-9 w-auto" />
              </Link>
              <p className="mt-4 max-w-[22rem] text-sm leading-7 text-slate-500">
                Trade execution CRM for import-export teams. Manage leads, quotes, approvals, orders and shipment execution in one connected system.
              </p>
              <a href="mailto:help@setugroups.com" className="mt-4 inline-flex text-sm font-medium text-[#1F487C] underline-offset-4 hover:underline">
                help@setugroups.com
              </a>
            </div>

            {/* Platform */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Platform</p>
              <ul className="mt-4 space-y-3">
                {[
                  ['/#platform', 'How it works'],
                  ['/#compare', 'Compare CRMs'],
                  ['/#pricing', 'Pricing'],
                  ['/#book-demo', 'Book a demo'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="text-sm font-medium text-slate-600 transition hover:text-[#1F487C]">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Use cases */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Use cases</p>
              <ul className="mt-4 space-y-3">
                {['Exporters', 'Importers', 'Trading companies', 'Sourcing teams'].map((label) => (
                  <li key={label}>
                    <a href="/#book-demo" className="text-sm font-medium text-slate-600 transition hover:text-[#1F487C]">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Company</p>
              <ul className="mt-4 space-y-3">
                <li>
                  <a href="mailto:help@setugroups.com" className="text-sm font-medium text-slate-600 transition hover:text-[#1F487C]">Contact support</a>
                </li>
                <li>
                  <a href="mailto:admin@setugroups.com" className="text-sm font-medium text-slate-600 transition hover:text-[#1F487C]">Sales &amp; demos</a>
                </li>
                <li>
                  <Link href="/client-login" className="text-sm font-medium text-slate-600 transition hover:text-[#1F487C]">Enter workspace</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom row */}
          <div className="mt-10 flex flex-col items-start gap-4 border-t border-slate-100 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Setu Groups. All rights reserved.
            </p>
            <p className="text-xs text-slate-400">
              Trade execution software for global import-export teams.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
