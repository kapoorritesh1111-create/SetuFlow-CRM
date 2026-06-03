import type { ReactNode } from 'react';
import { DashboardSectionTabs } from '@/components/dashboard/dashboard-section-tabs';

export default function DashboardAnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardSectionTabs active="analytics" />
      {children}
    </>
  );
}
