'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SetuIcon } from '@/components/ui/setu-icon';
import { canonicalMobileNavItems } from '@/lib/navigation/nav-items';
import { cn } from '@/lib/utils';

export function MobileTabBar() {
  const pathname = usePathname();
  const tabs = canonicalMobileNavItems;
  // Split into left 2 and right 2, with center FAB in the middle
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="setu-mobile-tabbar fixed inset-x-0 bottom-0 z-[250] border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.07)] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-16 max-w-[430px] items-stretch">
        {/* Left 2 tabs */}
        {leftTabs.map((tab) => {
          const active = tab.match.some(
            (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
          );
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-[3px] border-none bg-transparent text-[10px] font-bold tracking-[0.02em] transition-colors',
                active ? 'text-[#0c7fff]' : 'text-slate-400',
              )}
            >
              <span className={cn('absolute inset-x-3 top-0 h-[2px] rounded-b-full transition-colors', active ? 'bg-[#0c7fff]' : 'bg-transparent')} />
              <SetuIcon name={tab.icon} className="h-[22px] w-[22px]" />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* SF-19-014: Center Quick Lead FAB — elevated circle */}
        <div className="relative flex w-16 flex-shrink-0 items-center justify-center">
          <Link
            href="/leads?quickLead=1"
            aria-label="Quick lead capture"
            className="absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0c7fff] to-[#0052cc] shadow-[0_6px_24px_rgba(12,127,255,0.45)] ring-4 ring-white transition hover:shadow-[0_8px_28px_rgba(12,127,255,0.55)] active:scale-95"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
        </div>

        {/* Right tabs */}
        {rightTabs.map((tab) => {
          const active = tab.match.some(
            (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
          );
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-[3px] border-none bg-transparent text-[10px] font-bold tracking-[0.02em] transition-colors',
                active ? 'text-[#0c7fff]' : 'text-slate-400',
              )}
            >
              <span className={cn('absolute inset-x-3 top-0 h-[2px] rounded-b-full transition-colors', active ? 'bg-[#0c7fff]' : 'bg-transparent')} />
              <SetuIcon name={tab.icon} className="h-[22px] w-[22px]" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
