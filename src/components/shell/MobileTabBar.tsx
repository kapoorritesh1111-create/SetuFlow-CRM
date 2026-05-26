'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SetuIcon } from '@/components/ui/setu-icon';
import { canonicalMobileNavItems } from '@/lib/navigation/nav-items';
import { cn } from '@/lib/utils';

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="setu-mobile-tabbar fixed inset-x-0 bottom-0 z-[250] border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.07)] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-16 max-w-[430px] items-stretch">
        {canonicalMobileNavItems.map((tab) => {
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
              <span
                className={cn(
                  'absolute inset-x-3 top-0 h-[2px] rounded-b-full transition-colors',
                  active ? 'bg-[#0c7fff]' : 'bg-transparent',
                )}
              />
              <SetuIcon name={tab.icon} className="h-[22px] w-[22px]" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
