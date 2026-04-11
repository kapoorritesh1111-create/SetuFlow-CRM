import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { PRODUCT_SHELL_LABELS, PRODUCT_ROUTES, primaryWorkspacePreviewNav } from '@/lib/product-contract';

export function WorkspaceShell({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf7fb_0%,#f7fbff_45%,#f9fcfc_100%)] text-slate-900">
      <header className="border-b border-[#1F487C]/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={164} height={48} className="h-10 w-auto" priority />
            </Link>
            <span className="hidden rounded-full border border-[#1F487C]/10 bg-[#1F487C]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1F487C] md:inline-flex">{PRODUCT_SHELL_LABELS.previewBadge}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={PRODUCT_ROUTES.development.home} className="hidden text-sm font-medium text-slate-600 transition hover:text-[#1F487C] md:inline-flex">Development plan</Link>
            <Link href="/client-login" className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(31,72,124,0.18)]">Client login</Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap gap-2">
            {primaryWorkspacePreviewNav.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full border border-[#1F487C]/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#1F487C]/30 hover:text-[#1F487C]">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">{eyebrow}</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 lg:text-base">{description}</p>
            </div>
            <Link href={PRODUCT_ROUTES.development.home} className="inline-flex rounded-full border border-[#1F487C]/15 px-5 py-3 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5">Open full implementation plan</Link>
          </div>
        </section>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
