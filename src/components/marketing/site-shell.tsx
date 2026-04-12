import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import Image from 'next/image';
import type { ReactNode } from 'react';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbfb_0%,#eef6fb_45%,#f8fbff_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#1F487C]/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={170} height={52} className="h-11 w-auto" priority />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm font-medium text-slate-700 transition hover:text-[#1F487C]">Home</Link>
            <Link href={PRODUCT_ROUTES.development.home} className="text-sm font-medium text-slate-700 transition hover:text-[#1F487C]">Development work</Link>
            <Link href="/client-login" className="rounded-full border border-[#1F487C]/15 px-4 py-2 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Client login</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-[#1F487C]/10 bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-semibold text-slate-800">Setu Flow</p>
            <p>Trade execution system for import-export sales teams.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/">Home</Link>
            <Link href={PRODUCT_ROUTES.development.home}>Development work</Link>
            <Link href="/client-login">Client login</Link>
            <Link href="/login">Workspace sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
