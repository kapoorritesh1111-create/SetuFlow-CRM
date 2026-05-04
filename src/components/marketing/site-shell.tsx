import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbfb_0%,#eef6fb_45%,#f8fbff_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-[#1F487C]/10 bg-white/82 shadow-[0_18px_45px_rgba(31,72,124,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={170} height={52} className="h-11 w-auto" priority />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="/#platform" className="text-sm font-bold text-slate-600 transition hover:text-[#1F487C]">Platform</a>
            <a href="/#compare" className="text-sm font-bold text-slate-600 transition hover:text-[#1F487C]">Compare</a>
            <a href="/#pricing" className="text-sm font-bold text-slate-600 transition hover:text-[#1F487C]">Pricing</a>
            <a href="mailto:hello@setuflowcrm.com" className="text-sm font-bold text-slate-600 transition hover:text-[#1F487C]">Book demo</a>
            <Link href="/client-login" className="rounded-full bg-[#06263f] px-5 py-2.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(6,38,63,0.20)] transition hover:-translate-y-0.5 hover:bg-[#0b2e4a]">Enter workspace</Link>
          </nav>
          <Link href="/client-login" className="rounded-full bg-[#06263f] px-4 py-2 text-xs font-black text-white shadow-lg md:hidden">Enter</Link>
        </div>
      </header>
      {children}
      <footer className="border-t border-[#1F487C]/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div><p className="font-black text-slate-900">Setu Flow CRM</p><p>Trade execution CRM for capture, quotes, approvals and orders.</p></div>
          <div className="flex flex-wrap gap-5 font-semibold"><a href="mailto:hello@setuflowcrm.com">hello@setuflowcrm.com</a><Link href="/client-login">Enter workspace</Link></div>
        </div>
      </footer>
    </div>
  );
}
