// SF-20-002 fix: Reverted to 5 equal tabs — duplicate center FAB removed.
// The Quick Lead FAB lives in app-shell.tsx at bottom-right z-[300].
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { SetuIcon } from '@/components/ui/setu-icon';
import { canonicalMobileNavItems } from '@/lib/navigation/nav-items';
import { cn } from '@/lib/utils';

const GLOBAL_SCOPE_KEY = 'setuflow-global-workspace-scope';
const MODE_AWARE_PREFIXES = ['/dashboard', '/leads', '/pipeline', '/quotes', '/orders', '/compliance'];

function normalizeScope(value?: string | null) {
  if (value === 'buyer' || value === 'buyers') return 'buyers';
  if (value === 'supplier' || value === 'suppliers') return 'suppliers';
  return 'all';
}

function isModeAwarePath(pathname: string) {
  return MODE_AWARE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function scopedHref(href: string, currentMode: string | null) {
  const [path, query = ''] = href.split('?');
  if (!isModeAwarePath(path)) return href;
  const urlScope = normalizeScope(currentMode);
  const savedScope = typeof window === 'undefined' ? 'all' : normalizeScope(window.localStorage.getItem(GLOBAL_SCOPE_KEY));
  const scope = urlScope !== 'all' ? urlScope : savedScope;
  if (scope === 'all') return href;
  const params = new URLSearchParams(query);
  params.set('mode', scope);
  return `${path}?${params.toString()}`;
}

export function MobileTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
              href={scopedHref(tab.href, searchParams.get('mode'))}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-[3px] border-none bg-transparent text-[10px] font-bold tracking-[0.02em] transition-colors',
                active ? 'text-brand-500' : 'text-slate-400',
              )}
            >
              <span
                className={cn(
                  'absolute inset-x-3 top-0 h-[2px] rounded-b-full transition-colors',
                  active ? 'bg-brand-500' : 'bg-transparent',
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
