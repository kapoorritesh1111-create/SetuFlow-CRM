import type { ReactNode } from 'react';
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

export function MobileShell({
  children,
  signedIn,
  canonical = false,
}: {
  children: ReactNode;
  signedIn?: MobileSignedInIdentity;
  canonical?: boolean;
}) {
  return (
    <div
      className="sfm-app min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(98,166,255,.55),rgba(124,58,237,.14)_36%,rgba(255,255,255,0)_58%),linear-gradient(180deg,#eaf3ff_0%,#edf3fb_48%,#edf3fb_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.24),transparent_34%),linear-gradient(180deg,#020617,#0f172a)] dark:text-white"
      data-feature-flag="feature/mobile_app_v1"
      data-mobile-shell={canonical ? 'canonical' : 'standalone'}
    >
      <BrandedMobileTopBar signedIn={signedIn} canonical={canonical} />
      <main className="mx-auto w-full max-w-[430px] space-y-4 px-4 py-4 pb-[calc(108px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <a
        href="/leads?quickLead=1"
        aria-label="Quick capture"
        className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-[70] ml-[106px] grid h-16 w-16 -translate-x-1/2 place-items-center rounded-[24px] bg-[linear-gradient(145deg,#ffd27b,#f59e0b)] text-3xl font-black text-amber-950 shadow-[0_20px_60px_rgba(15,23,42,.22)]"
      >
        +
      </a>
      <MobileBottomTabs canonical={canonical} />
    </div>
  );
}
