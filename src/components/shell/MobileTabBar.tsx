'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaIcon } from '@/components/ui/fa-icon';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Home', href: '/dashboard', icon: 'home', match: ['/dashboard'] },
  { label: 'Leads', href: '/leads', icon: 'users', match: ['/leads'] },
  { label: 'Capture', href: '/contact-exchange/scan', icon: 'camera', match: ['/contact-exchange/scan', '/trade-events'] },
  { label: 'Orders', href: '/orders', icon: 'truck', match: ['/orders'] },
  { label: 'More', href: '/tasks', icon: 'ellipsis-h', match: ['/tasks', '/contact-exchange/vcard'] },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="setu-mobile-tabbar fixed inset-x-0 bottom-0 z-[250] border-t border-slate-200 bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur md:hidden"
      style={{ height: 'calc(64px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid h-16 max-w-[430px] grid-cols-5 px-2">
        {tabs.map((tab) => {
          const active = tab.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-[1.1rem] text-[10px] font-semibold transition',
                active ? 'bg-[#eef6ff] text-[#0c7fff]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <span className={cn('absolute inset-x-5 top-0 h-[3px] rounded-b-full', active ? 'bg-[#0c7fff]' : 'bg-transparent')} />
              <FaIcon icon={tab.icon} fixedWidth className="text-base" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
