import Link from 'next/link';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkspaceHeader, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { cn } from '@/lib/utils';

export type AdminNavKey = 'overview' | 'users' | 'markets' | 'stages' | 'pipelines' | 'trade-events' | 'security' | 'audit';

const nav = [
  { label: 'Governance', items: [
    { key: 'overview', href: '/admin/organization', icon: '🏢', label: 'Organization' },
    { key: 'users', href: '/admin/users', icon: '👥', label: 'Users' },
    { key: 'security', href: '/admin/security', icon: '🛡️', label: 'Security', badge: 'New' },
    { key: 'audit', href: '/admin/audit', icon: '📜', label: 'Audit' },
  ] },
  { label: 'Reference lists', items: [
    { key: 'markets', href: '/admin/markets', icon: '🌍', label: 'Markets', badge: 'New' },
    { key: 'stages', href: '/admin/stages', icon: '🧭', label: 'Stages / Next Steps', badge: 'New' },
    { key: 'pipelines', href: '/admin/pipelines', icon: '🧩', label: 'Pipelines', badge: 'New' },
    { key: 'trade-events', href: '/admin/trade-events', icon: '🎪', label: 'Trade Events', badge: 'New' },
  ] },
] as const;

export type AdminGapItem = { icon: string; text: string; href: string };

export function AdminSettingsShell({ active, organizationName, missingCount = 0, sectionTitle, gapItems = [], children }: { active: AdminNavKey; organizationName: string; missingCount?: number; sectionTitle?: string; gapItems?: AdminGapItem[]; children: ReactNode }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)] xl:sticky xl:top-20 xl:self-start">
        <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-950 to-blue-700 p-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100">Admin</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">{sectionTitle ?? 'Settings command'}</h2>
          <p className="mt-2 text-xs leading-5 text-blue-50/90">Governance, lists, and security controls for {organizationName}.</p>
        </div>
        <nav className="mt-4 space-y-4">
          {nav.map((section) => <div key={section.label}>
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{section.label}</p>
            <div className="mt-2 space-y-1">{section.items.map((item) => {
              const isActive = item.key === active;
              return <Link key={item.href} href={item.href} className={cn('flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-blue-50 text-slate-950 ring-1 ring-blue-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950')}>
                <span className="w-5 text-center text-base" aria-hidden="true">{item.icon}</span><span className="min-w-0 flex-1 truncate">{item.label}</span>{'badge' in item && item.badge ? <StatusBadge label={item.badge} tone="info" dot={false} className="px-1.5 py-0.5 text-[9px] tracking-[0.1em]" /> : null}
              </Link>;
            })}</div>
          </div>)}
        </nav>
      </aside>
      <main className="min-w-0 space-y-6"><GovernanceBanner missingCount={missingCount} gapItems={gapItems} />{children}</main>
    </div>
  );
}

export function AdminPageHero({ title, description, badge, cta, stats }: { title: string; description: string; badge?: string; cta?: ReactNode; stats?: Array<{ label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }> }) {
  return <WorkspaceHeader eyebrow="Admin & Settings" title={title} description={description} badge={badge} actions={cta} meta={stats?.map((stat) => <ToolbarStat key={stat.label} label={stat.label} value={String(stat.value)} tone={stat.tone ?? 'default'} />)} />;
}

function GovernanceBanner({ missingCount, gapItems = [] }: { missingCount: number; gapItems?: AdminGapItem[] }) {
  const clear = missingCount === 0;
  return <section className={cn('rounded-[2rem] border p-4', clear ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <span className="text-2xl" aria-hidden="true">{clear ? '✅' : '⚠️'}</span>
        <div>
          <p className={cn('text-sm font-bold', clear ? 'text-emerald-800' : 'text-amber-800')}>{clear ? 'Governance clear' : 'Governance attention needed'}</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{clear ? 'Markets, stages, pipelines, trade events, and security controls are configured.' : `${missingCount} setup area${missingCount === 1 ? '' : 's'} still need attention before every workflow is fully governed.`}</p>
          {gapItems.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {gapItems.map(item => (
                <Link key={item.href} href={item.href} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200">
                  <span>{item.icon}</span><span>{item.text}</span><span className="text-amber-600">→ Fix</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/markets" className="rounded-2xl border border-white/70 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Markets</Link>
        <Link href="/admin/security" className="rounded-2xl border border-white/70 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Security</Link>
      </div>
    </div>
  </section>;
}
