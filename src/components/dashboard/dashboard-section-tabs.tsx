import Link from 'next/link';
import { cn } from '@/lib/utils';

export type DashboardSectionTab = 'home' | 'analytics' | 'reports';

const DASHBOARD_SECTION_TABS: Array<{
  key: DashboardSectionTab;
  label: string;
  href: string;
  description: string;
}> = [
  {
    key: 'home',
    label: 'Home',
    href: '/dashboard',
    description: 'Map dashboard, KPIs, filters, and Needs Attention.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    href: '/dashboard/analytics',
    description: 'Trends, conversion intelligence, and future-looking signals.',
  },
  {
    key: 'reports',
    label: 'Reports',
    href: '/reports',
    description: 'Exportable snapshots, audit history, and explainable reporting.',
  },
];

export function DashboardSectionTabs({ active }: { active: DashboardSectionTab }) {
  return (
    <nav aria-label="Dashboard workspace tabs" className="mb-5 rounded-[1.6rem] border border-slate-200 bg-white/90 p-2 shadow-[0_16px_42px_rgba(15,23,42,0.07)] backdrop-blur">
      <div className="grid gap-2 lg:grid-cols-3">
        {DASHBOARD_SECTION_TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'rounded-[1.15rem] px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0c7fff] focus-visible:ring-offset-2',
                isActive ? 'bg-[#0b2e4a] text-white shadow-[0_12px_28px_rgba(11,46,74,0.2)]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
              )}
            >
              <span className="block text-sm font-black">{tab.label}</span>
              <span className={cn('mt-1 block text-xs font-semibold leading-5', isActive ? 'text-white/72' : 'text-slate-500')}>{tab.description}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
