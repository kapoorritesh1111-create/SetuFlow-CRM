import type { ReactNode } from 'react';
import { BrandedMobileTopBar, MobileBottomTabs } from './mobile-navigation';

export function MobileShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,.35),transparent_34%),linear-gradient(180deg,#eef6ff,#f8fafc)] pb-24 dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.28),transparent_34%),linear-gradient(180deg,#020617,#0f172a)]" data-feature-flag="feature/mobile_app_v1"><BrandedMobileTopBar /><main className="mx-auto w-full max-w-[430px] space-y-4 px-4 py-4">{children}</main><MobileBottomTabs /></div>;
}
