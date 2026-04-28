import Link from 'next/link';
import type { ReactNode } from 'react';
import { WorkspaceHeader, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { cn } from '@/lib/utils';

export type AdminNavKey = 'overview' | 'users' | 'invitations' | 'markets' | 'categories' | 'stages' | 'pipelines' | 'trade-events' | 'product-management' | 'security' | 'audit' | 'ai-analytics';

type AdminNavItem = {
  key: AdminNavKey;
  href: string;
  icon: string;
  label: string;
  badge?: string;
  badgeTone?: 'success' | 'warning' | 'danger';
};

const nav: Array<{ label: string; items: AdminNavItem[] }> = [
  {
    label: 'Workspace',
    items: [
      { key: 'overview', href: '/admin/organization', icon: '🏢', label: 'Organization' },
      { key: 'users', href: '/admin/users', icon: '👥', label: 'Team members', badge: '5', badgeTone: 'success' },
      { key: 'invitations', href: '/admin/invitations', icon: '✉', label: 'Invitations', badge: '2', badgeTone: 'warning' },
    ],
  },
  {
    label: 'Reference lists',
    items: [
      { key: 'markets', href: '/admin/markets', icon: '🌍', label: 'Markets' },
      { key: 'categories', href: '/admin/organization#settings-lists', icon: '📦', label: 'Categories' },
      { key: 'product-management', href: '/admin/product-management', icon: '📚', label: 'Product management' },
      { key: 'stages', href: '/admin/stages', icon: '◎', label: 'Stages & next steps' },
      { key: 'pipelines', href: '/admin/pipelines', icon: '⊕', label: 'Pipelines' },
      { key: 'trade-events', href: '/admin/trade-events', icon: '🏭', label: 'Trade events' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { key: 'audit', href: '/admin/audit', icon: '📋', label: 'Audit log' },
      { key: 'ai-analytics', href: '/admin/ai-analytics', icon: '✦', label: 'AI analytics' },
      { key: 'security', href: '/admin/security', icon: '🔒', label: 'Security & roles', badge: '!', badgeTone: 'danger' },
    ],
  },
] as const;

export type AdminGapItem = { icon: string; text: string; href: string };

function AdminNavBadge({ label, tone = 'success' }: { label: string; tone?: 'success' | 'warning' | 'danger' }) {
  return (
    <span
      className={cn(
        'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
        tone === 'success' ? 'bg-emerald-100 text-emerald-700' : tone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700',
      )}
    >
      {label}
    </span>
  );
}

export function AdminSettingsShell({ active, organizationName, missingCount = 0, sectionTitle, gapItems = [], children }: { active: AdminNavKey; organizationName: string; missingCount?: number; sectionTitle?: string; gapItems?: AdminGapItem[]; children: ReactNode }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[216px_minmax(0,1fr)]">
      <aside className="rounded-none border-r border-slate-200 bg-white px-2 py-5 shadow-[4px_0_18px_rgba(15,23,42,0.04)] xl:sticky xl:top-16 xl:min-h-[calc(100vh-4rem)] xl:self-start">
        <nav className="space-y-8">
          {nav.map((section, index) => (
            <div key={section.label} className={cn(index > 0 && 'border-t border-slate-200 pt-7')}>
              <p className="px-2 text-[9px] font-extrabold uppercase tracking-[0.24em] text-slate-400">{section.label}</p>
              <div className="mt-4 space-y-2">
                {section.items.map((item) => {
                  const isActive = item.key === active;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'relative flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-medium transition',
                        isActive
                          ? 'bg-blue-50 text-slate-950 shadow-[inset_3px_0_0_#0c7fff]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                      )}
                    >
                      <span className="w-5 text-center text-[15px]" aria-hidden="true">{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge ? <AdminNavBadge label={item.badge} tone={item.badgeTone} /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
          <p className="font-bold">{sectionTitle ?? 'Workspace control'}</p>
          <p className="mt-1 text-blue-800/80">Governance, lists, and security controls for {organizationName}.</p>
        </div>
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
