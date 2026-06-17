'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LanguageSelector } from './language-selector';
import { GlobalTranslator } from './global-translator';
import { SetuGuruLiteWidget } from '@/features/setu-guru/setu-guru-lite-widget';

const navItems: [string, string][] = [
  ['/platform', 'Platform'],
  ['/solutions', 'Solutions'],
  ['/setu-guru-ai', 'Setu Guru AI'],
  ['/field-mobile', 'Mobile'],
  ['/pricing', 'Pricing'],
  ['/compare', 'Compare'],
];

function MenuIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>;
}
function CloseIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>;
}
function HomeIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>;
}

function SharedMarketingHeroBackground({ strong = false }: { strong?: boolean }) {
  return (
    <div className="setu-shared-hero-background" aria-hidden="true">
      <iframe
        className="setu-shared-hero-background__frame"
        src="/marketing/setuflow-bg-video.html"
        title=""
        tabIndex={-1}
        loading="eager"
      />
      <div className={strong ? 'setu-shared-hero-background__overlay setu-shared-hero-background__overlay--strong' : 'setu-shared-hero-background__overlay'} />
      <div className="setu-shared-hero-background__glow" />
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  const isHome = pathname === '/';
  const isVideoHeroPage = pathname === '/trade-show-trial';
  const hasSharedHeroBackground = isHome || isVideoHeroPage;
  const headerClassName = isVideoHeroPage
    ? 'sticky top-0 z-40 border-b border-white/10 bg-[#061e34]/78 shadow-[0_12px_38px_rgba(0,0,0,0.14)] backdrop-blur-2xl'
    : 'sticky top-0 z-40 border-b border-[#1F487C]/10 bg-white/95 shadow-[0_8px_24px_rgba(31,72,124,0.06)] backdrop-blur-xl';
  const navLinkClassName = (active: boolean) =>
    isVideoHeroPage
      ? `relative rounded-lg px-3 py-2 text-[13px] font-semibold transition ${active ? 'bg-white/12 text-white' : 'text-white/78 hover:bg-white/10 hover:text-white'}`
      : `relative rounded-lg px-3 py-2 text-[13px] font-semibold transition ${active ? 'bg-teal-50 text-[#108477]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <GlobalTranslator />
      <header className={headerClassName}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <Image src="/logos/setu-flow-logo.png" alt="Setu Flow — Trade Execution CRM" width={200} height={60} className="h-[48px] w-auto" />
            {!isHome && <span className={`hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:inline-flex ${isVideoHeroPage ? 'border-white/15 bg-white/10 text-white/72 hover:bg-white/15 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700'}`}><HomeIcon />Home</span>}
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navItems.map(([href, label]) => {
              const active = isActive(href);
              return <Link key={href} href={href} className={navLinkClassName(active)}>{label}{active && <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 translate-y-[1px] rounded-full bg-[#108477]" />}</Link>;
            })}
            <div className="ml-3 flex items-center gap-2">
              <LanguageSelector />
              <Link href="/roi-calculator" className={`rounded-full border px-5 py-2 text-[13px] font-semibold transition hover:-translate-y-0.5 ${isVideoHeroPage ? 'border-white/20 bg-white/92 text-[#108477] hover:bg-white' : isActive('/roi-calculator') ? 'border-[#108477] bg-teal-50 text-[#108477]' : 'border-[#108477]/25 bg-white text-[#108477] hover:bg-[#eef6fb]'}`}>ROI Calculator</Link>
              <Link href="/book-demo" className={`rounded-full border px-5 py-2 text-[13px] font-semibold transition hover:-translate-y-0.5 ${isVideoHeroPage ? 'border-white/20 bg-white/92 text-[#108477] hover:bg-white' : isActive('/book-demo') ? 'border-[#108477] bg-teal-50 text-[#108477]' : 'border-[#108477]/25 bg-white text-[#108477] hover:bg-[#eef6fb]'}`}>Book Demo</Link>
              <Link href="/client-login" className="rounded-full bg-[#06263f] px-5 py-2 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(6,38,63,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0b2e4a]">Enter workspace</Link>
            </div>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            {!isHome && <Link href="/" className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${isVideoHeroPage ? 'border-white/15 text-white/80' : 'border-slate-200 text-slate-500'}`}><HomeIcon />Home</Link>}
            <LanguageSelector compact />
            <Link href="/client-login" className="rounded-full bg-[#06263f] px-3 py-1.5 text-xs font-semibold text-white shadow-md">Enter</Link>
            <button onClick={() => setMobileOpen(!mobileOpen)} className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm ${isVideoHeroPage ? 'border-white/15 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-700'}`} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>{mobileOpen ? <CloseIcon /> : <MenuIcon />}</button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-[#1F487C]/10 bg-white/96 px-4 pb-5 pt-3 backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col gap-0.5">
              <Link href="/" onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${isHome ? 'bg-teal-50 text-[#108477]' : 'text-slate-700 hover:bg-slate-50'}`}><HomeIcon />Home{isHome && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#108477]" />}</Link>
              {[...navItems, ['/roi-calculator', 'ROI Calculator'] as [string, string], ['/book-demo', 'Book Demo'] as [string, string]].map(([href, label]) => {
                const active = isActive(href);
                return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-teal-50 text-[#108477]' : 'text-slate-700 hover:bg-slate-50 hover:text-[#108477]'}`}>{label}{active && <span className="h-1.5 w-1.5 rounded-full bg-[#108477]" />}</Link>;
              })}
            </div>
          </nav>
        )}
      </header>

      <div className={hasSharedHeroBackground ? `setu-shared-hero-shell ${isVideoHeroPage ? 'setu-shared-hero-shell--trial' : 'setu-shared-hero-shell--home'}` : undefined}>
        {hasSharedHeroBackground && <SharedMarketingHeroBackground strong={isVideoHeroPage} />}
        {children}
      </div>
      <SetuGuruLiteWidget />

      <footer className="border-t border-[#1F487C]/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Link href="/"><Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={150} height={46} className="h-10 w-auto" /></Link>
              <p className="mt-4 max-w-[22rem] text-sm leading-7 text-slate-500">Trade execution software for import-export teams, built around leads, quotes, documents, orders and shipment readiness.</p>
              <a href="mailto:help@setugroups.com" className="mt-4 inline-flex text-sm font-semibold text-[#108477] underline-offset-4 hover:underline">help@setugroups.com</a>
            </div>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-400">Platform</p><ul className="mt-4 space-y-3">{navItems.slice(0, 4).map(([href, label]) => <li key={href}><Link href={href} className={`text-sm font-medium transition hover:text-[#108477] ${isActive(href) ? 'text-[#108477] font-semibold' : 'text-slate-600'}`}>{label}</Link></li>)}</ul></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-400">Company</p><ul className="mt-4 space-y-3"><li><Link href="/training" className={`text-sm font-medium transition hover:text-[#108477] ${isActive('/training') ? 'text-[#108477] font-semibold' : 'text-slate-600'}`}>Product Overview</Link></li><li><Link href="/pricing" className={`text-sm font-medium transition hover:text-[#108477] ${isActive('/pricing') ? 'text-[#108477] font-semibold' : 'text-slate-600'}`}>Pricing</Link></li><li><Link href="/compare" className={`text-sm font-medium transition hover:text-[#108477] ${isActive('/compare') ? 'text-[#108477] font-semibold' : 'text-slate-600'}`}>Compare</Link></li><li><Link href="/roi-calculator" className={`text-sm font-medium transition hover:text-[#108477] ${isActive('/roi-calculator') ? 'text-[#108477] font-semibold' : 'text-slate-600'}`}>ROI Calculator</Link></li><li><Link href="/book-demo" className={`text-sm font-medium transition hover:text-[#108477] ${isActive('/book-demo') ? 'text-[#108477] font-semibold' : 'text-slate-600'}`}>Book a demo</Link></li></ul></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-slate-400">Access</p><ul className="mt-4 space-y-3"><li><a href="mailto:help@setugroups.com" className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">Contact support</a></li><li><a href="mailto:admin@setugroups.com" className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">Sales &amp; demos</a></li><li><Link href="/client-login" className="text-sm font-medium text-slate-600 transition hover:text-[#108477]">Enter workspace</Link></li></ul></div>
          </div>
          <div className="mt-10 flex flex-col items-start gap-4 border-t border-slate-100 pt-8 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-400" suppressHydrationWarning>&copy; {new Date().getFullYear()} Setu Groups. All rights reserved.</p><p className="text-xs text-slate-400">Trade execution software for global import-export teams.</p></div>
        </div>
      </footer>

      <style jsx global>{`
        .setu-shared-hero-shell {
          position: relative;
          isolation: isolate;
          background: #061e34;
        }

        .setu-shared-hero-shell > main {
          position: relative;
          z-index: 1;
          background: transparent;
        }

        .setu-shared-hero-shell > main > section:first-child {
          position: relative;
          overflow: hidden;
          background: transparent !important;
        }

        .setu-shared-hero-background {
          position: absolute;
          inset: 0 auto auto 0;
          z-index: 0;
          width: 100%;
          height: min(760px, calc(100vh - 88px));
          min-height: 560px;
          overflow: hidden;
          pointer-events: none;
          background: #061426;
        }

        .setu-shared-hero-background__frame {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
          transform: scale(1.04);
          transform-origin: center;
          opacity: 0.44;
          filter: saturate(0.9) contrast(1.05) brightness(0.72);
        }

        .setu-shared-hero-background__overlay,
        .setu-shared-hero-background__glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .setu-shared-hero-background__overlay {
          background:
            linear-gradient(90deg, rgba(4, 16, 31, 0.96) 0%, rgba(4, 16, 31, 0.88) 34%, rgba(4, 16, 31, 0.58) 62%, rgba(4, 16, 31, 0.78) 100%),
            linear-gradient(180deg, rgba(4, 16, 31, 0.10) 0%, rgba(4, 16, 31, 0.22) 100%);
        }

        .setu-shared-hero-background__overlay--strong {
          background:
            linear-gradient(90deg, rgba(6, 30, 52, 0.96) 0%, rgba(6, 30, 52, 0.90) 44%, rgba(6, 30, 52, 0.66) 100%),
            linear-gradient(180deg, rgba(6, 30, 52, 0.16) 0%, rgba(6, 30, 52, 0.34) 100%);
        }

        .setu-shared-hero-background__glow {
          background:
            radial-gradient(circle at 22% 18%, rgba(32, 217, 150, 0.20), transparent 34%),
            radial-gradient(circle at 76% 34%, rgba(52, 179, 168, 0.18), transparent 42%);
        }

        .setu-shared-hero-shell--home > main > section:first-child h1,
        .setu-shared-hero-shell--home > main > section:first-child h2 {
          color: #ffffff !important;
        }

        .setu-shared-hero-shell--home > main > section:first-child p {
          color: rgba(255, 255, 255, 0.76) !important;
        }

        .setu-shared-hero-shell--home > main > section:first-child span {
          color: rgba(255, 255, 255, 0.82);
        }

        .setu-shared-hero-shell--home > main > section:first-child a:first-of-type {
          box-shadow: 0 18px 46px rgba(13, 148, 136, 0.30);
        }

        .setu-shared-hero-shell--trial > main > section:first-child > video {
          display: none;
        }

        .setu-shared-hero-shell--trial .setu-shared-hero-background__frame {
          opacity: 0.36;
          filter: saturate(0.85) contrast(1.05) brightness(0.62);
        }

        @media (max-width: 767px) {
          .setu-shared-hero-background {
            height: 100vh;
            min-height: 720px;
          }

          .setu-shared-hero-background__frame {
            transform: scale(1.12);
          }

          .setu-shared-hero-background__overlay {
            background:
              linear-gradient(180deg, rgba(4, 16, 31, 0.96) 0%, rgba(4, 16, 31, 0.86) 52%, rgba(4, 16, 31, 0.78) 100%),
              radial-gradient(circle at 60% 16%, rgba(52, 179, 168, 0.18), transparent 40%);
          }
        }
      `}</style>
    </div>
  );
}
