import type { ReactNode } from 'react';
import { DashboardSectionTabs } from '@/components/dashboard/dashboard-section-tabs';

export default function ReportsCompatibilityLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardSectionTabs active="reports" />
      {children}
    </>
  );
}
