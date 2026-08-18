'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SetuIcon } from '@/components/ui/setu-icon';
import { canonicalMobileNavItems, mobileMoreNavItems, standaloneMobileNavItems } from '@/lib/navigation/nav-items';

function matchesPath(pathname: string, match: readonly string[]) {
  return match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function MobileBottomTabs({ canonical = false }: { canonical?: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const configuredTabs = canonical ? canonicalMobileNavItems : standaloneMobileNavItems;
  const primaryTabs = configuredTabs.filter((tab) => tab.href !== '/tasks').slice(0, 4);
  const moreActive = mobileMoreNavItems.some((tab) => matchesPath(pathname, tab.match));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      {moreOpen ? (
        <div
          className="fixed inset-0 z-[510] bg-slate-950/30 backdrop-blur-[2px] md:hidden"
          onClick={() => setMoreOpen(false)}
          role="presentation"
        >
          <section
            id="mobile-more-menu"
            className="absolute bottom-[86px] left-1/2 w-[calc(100%_-_24px)] max-w-[406px] -translate-x-1/2 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,.28)] dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
            aria-label="More mobile navigation"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">More</p>
                <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">Tasks & Events</h2>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-sm font-black text-slate-500 dark:border-slate-700 dark:text-slate-300"
                aria-label="Close More menu"
              >
                ×
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {mobileMoreNavItems.map((item) => {
                const active = matchesPath(pathname, item.match);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={[
                      'flex min-h-24 flex-col items-start justify-between rounded-2xl border p-4 text-left transition',
                      active
                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-sky-200'
                        : 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white',
                    ].join(' ')}
                  >
                    <SetuIcon name={item.icon} className="h-6 w-6" />
                    <span>
                      <span className="block text-sm font-black">{item.label}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {item.href === '/trade-events' ? 'Trade Event Command Center' : 'Follow-ups and assigned work'}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      <nav
        className="fixed bottom-0 left-1/2 z-[520] grid h-[86px] w-full max-w-[430px] -translate-x-1/2 grid-cols-5 gap-1 rounded-t-panel border border-slate-200/80 border-b-0 bg-white/95 px-2 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_44px_rgba(15,23,42,.16)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/95"
        aria-label="Mobile navigation"
      >
        {primaryTabs.map((tab) => {
          const active = matchesPath(pathname, tab.match);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`relative z-[521] flex flex-col items-center justify-center rounded-2xl text-[10px] font-black ${active ? 'bg-blue-500/10 text-blue-600 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <SetuIcon name={tab.icon} className="mb-0.5 h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((current) => !current)}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
          className={`relative z-[521] flex flex-col items-center justify-center rounded-2xl text-[10px] font-black ${moreActive || moreOpen ? 'bg-blue-500/10 text-blue-600 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <SetuIcon name="more" className="mb-0.5 h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
