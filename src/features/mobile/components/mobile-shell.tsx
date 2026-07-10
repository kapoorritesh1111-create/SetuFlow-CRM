'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BrandedMobileTopBar, MobileBottomTabs } from './mobile-navigation';

export type MobileSignedInIdentity = {
  name: string;
  initials?: string;
  email?: string | null;
  organizationName?: string | null;
  roleLabel?: string;
  primaryPhone?: string | null;
  secondaryPhone?: string | null;
  website?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  shareHref?: string;
  downloadVcfHref?: string;
};

// Full-width "+ Create" bar, route-aware. Replaces the old floating circular
// FAB, which had two real problems: it visually overlapped whatever content
// happened to sit at bottom-right (KPI tiles, cards), and on Home/Tasks it
// pointed at "create a lead" regardless of context, which was simply wrong
// on the Tasks screen. The bar reserves its own space above the tab bar and
// each route gets its own correct label + destination.
function createBarConfig(pathname: string): { label: string; href: string } | null {
  if (pathname.startsWith('/leads')) return { label: '+ Create lead', href: '/leads?quickLead=1' };
  if (pathname.startsWith('/tasks')) return { label: '+ Add task', href: '/tasks?quickTask=1' };
  // Quotes and Orders don't have a verified quick-create entry point yet —
  // omit the bar rather than guess at a destination.
  return null;
}

export function MobileShell({
  children,
  signedIn,
  canonical = false,
}: {
  children: ReactNode;
  signedIn?: MobileSignedInIdentity;
  canonical?: boolean;
}) {
  const pathname = usePathname();
  const createBar = createBarConfig(pathname);

  return (
    <div
      className="sfm-app min-h-screen overflow-x-hidden bg-surface-2 text-slate-950 dark:bg-slate-950 dark:text-white"
      data-feature-flag="feature/mobile_app_v1"
      data-mobile-shell={canonical ? 'canonical' : 'standalone'}
    >
      <BrandedMobileTopBar signedIn={signedIn} canonical={canonical} />
      <main className="mx-auto w-full max-w-[430px] space-y-4 px-4 py-4 pb-[calc(150px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      {createBar ? (
        <div className="fixed bottom-[78px] left-1/2 z-[70] w-full max-w-[430px] -translate-x-1/2 px-4 pb-2.5 pt-2">
          <a
            href={createBar.href}
            className="block rounded-card bg-brand-800 py-3.5 text-center text-[13.5px] font-semibold text-white shadow-[0_12px_30px_rgba(20,44,84,.35)]"
          >
            {createBar.label}
          </a>
        </div>
      ) : null}
      <MobileBottomTabs canonical={canonical} />
    </div>
  );
}
