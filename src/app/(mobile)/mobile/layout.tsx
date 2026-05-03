import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { MobileShell } from '@/features/mobile/components/mobile-shell';
import { isMobileAppV1Enabled } from '@/features/mobile/lib/mobile-feature-flag';

export const metadata = { title: 'SETU Flow Mobile' };

export default function MobileLayout({ children }: { children: ReactNode }) {
  if (!isMobileAppV1Enabled()) notFound();
  return <MobileShell>{children}</MobileShell>;
}
