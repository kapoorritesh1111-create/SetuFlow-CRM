import Link from 'next/link';
import type { ReactNode } from 'react';
import { WorkspaceHeader, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { cn } from '@/lib/utils';

export type AdminNavKey =
  | 'overview'
  | 'profile'
  | 'client-onboarding'
  | 'users'
  | 'invitations'
  | 'notifications'
  | 'markets'
  | 'categories'
  | 'stages'
  | 'pipelines'
  | 'trade-events'
  | 'product-management'
  | 'pricing-engine'
  | 'document-templates'
  | 'integrations'
  | 'rate-limits'
  | 'guru-config'
  | 'api-keys'
  | 'security'
  | 'audit'
  | 'ai-analytics'
  | 'seo';

type AdminNavStatusDot = 'ok' | 'warn' | 'none';

type AdminNavItem = {
  key: AdminNavKey;
  href: string;
  icon: string;
  label: string;
  badge?: string;
  badgeTone?: 'success' | 'warning' | 'danger' | 'info';
  statusDot?: AdminNavStatusDot;
  internalOnly?: boolean;
};

const internalOnlyAdminKeys: AdminNavKey[] = [
  'ai-analytics',
  'api-keys',
  'client-onboarding',
  'guru-config',
  'integrations',
  'rate-limits',
  'seo',
];

const nav: Array<{ label: string; items: AdminNavItem[] }> = [
  {
    label: 'Organisation',
    items: [
      { key: 'overview', href: '/admin/organization', icon: '🏢', label: 'Overview', statusDot: 'ok' },
      { key: 'profile', href: '/admin/organization', icon: '👤', label: 'Organization profile', statusDot: 'ok' },
      { key: 'users', href: '/admin/users', icon: '👥', label: 'Team members', statusDot: 'ok' },
      { key: 'invitations', href: '/admin/invitations', icon: '✉', label: 'Invitations', statusDot: 'warn' },
      { key: 'notifications', href: '/admin/notifications', icon: '🔔', label: 'Notifications', statusDot: 'ok', badge: 'NEW', badgeTone: 'info' as const },
      { key: 'client-onboarding', href: '/admin/client-onboarding', icon: '🚀', label: 'Client onboarding', statusDot: 'warn', internalOnly: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'markets', href: '/admin/markets', icon: '🌍', label: 'Markets', statusDot: 'ok' },
      { key: 'categories', href: '/admin/categories', icon: '📦', label: 'Categories', statusDot: 'ok' },
      { key: 'stages', href: '/admin/stages', icon: '◎', label: 'Pipelines & stages', statusDot: 'ok' },
      { key: 'product-management', href: '/admin/product-management', icon: '📚', label: 'Products', statusDot: 'ok' },
      { key: 'trade-events', href: '/admin/trade-events', icon: '🏭', label: 'Trade events', statusDot: 'ok' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { key: 'pricing-engine', href: '/admin/product-management', icon: '💱', label: 'Pricing engine', statusDot: 'ok' },
      { key: 'document-templates', href: '/admin/document-templates', icon: '📄', label: 'Templates & terms', statusDot: 'ok' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { key: 'integrations', href: '/admin/integrations', icon: '🔌', label: 'Integrations', statusDot: 'warn', internalOnly: true },
      { key: 'rate-limits', href: '/admin/rate-limits', icon: '⚡', label: 'Rate limits', statusDot: 'ok', badge: 'NEW', badgeTone: 'success' as const, internalOnly: true },
      { key: 'guru-config', href: '/admin/guru-config', icon: '🤖', label: 'Setu Guru config', statusDot: 'ok', badge: 'NEW', badgeTone: 'success' as const, internalOnly: true },
      { key: 'api-keys', href: '/admin/api-keys', icon: '🔑', label: 'API & webhooks', statusDot: 'ok', badge: 'NEW', badgeTone: 'success' as const, internalOnly: true },
    ],
  },
  {
    label: 'Governance',
    items: [
      { key: 'security', href: '/admin/security', icon: '🔒', label: 'Security & roles', statusDot: 'warn' },
      { key: 'audit', href: '/admin/audit', icon: '📋', label: 'Audit log', statusDot: 'ok' },
      { key: 'ai-analytics', href: '/admin/ai-analytics', icon: '✦', label: 'AI analytics', badge: 'Internal', badgeTone: 'info', statusDot: 'ok', internalOnly: true },
    ],
  },
] as const;

export type AdminGapItem = { icon: string; text: string; href: string };

function AdminNavBadge({ label, tone = 'success' }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'info' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
        tone === 'success'
          ? 'bg-emerald-100 text-emerald-700'
          : tone === 'warning'
            ? 'bg-amber-100 text-amber-700'
            : tone === 'danger'
              ? 'bg-rose-100 text-rose-700'
              : 'bg-sky-100 text-sky-700',
      )}
    >
      {label}
    </span>
  );
}

function AdminNavStatusDot({ dot = 'none' }: { dot?: AdminNavStatusDot }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'h-2 w-2 rounded-full',
        dot === 'ok' ? 'bg-emerald-500' : dot === 'warn' ? 'bg-amber-400' : 'bg-slate-300',
      )}
    />
  );
}

export function AdminSettingsShell({ active, organizationName, missingCount = 0, sectionTitle, gapItems = [], navCounts, children }: { active: AdminNavKey; organizationName: string; missingCount?: number; sectionTitle?: string; gapItems?: AdminGapItem[]; navCounts?: Partial<Record<'users' | 'invitations' | 'security', number>>; children?: ReactNode }) {
  const normalizedOrgName = organizationName.trim().toLowerCase();
  const showInternalOnlyTools = normalizedOrgName === 'setu flow' || normalizedOrgName === 'setuflow' || normalizedOrgName.includes('setu');
  return (
    <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-none border-r border-slate-200 bg-white px-3 py-4 shadow-[4px_0_18px_rgba(15,23,42,0.04)] xl:sticky xl:top-14 xl:min-h-[calc(100vh-3.5rem)] xl:self-start">
        <nav className="space-y-4">
          {nav.map((section, index) => {
            const visibleItems = section.items.filter((item) => showInternalOnlyTools || !item.internalOnly && !internalOnlyAdminKeys.includes(item.key));
            if (!visibleItems.length) return null;
            return (
              <div key={section.label} className={cn(index > 0 && 'border-t border-slate-200 pt-4')}>
                <p className="px-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{section.label}</p>
                <div className="mt-2 space-y-1">
                  {visibleItems.map((item) => {
                    const isActive = item.key === active;
                    const dynamicCount = item.key === 'users' ? navCounts?.users : item.key === 'invitations' ? navCounts?.invitations : item.key === 'security' ? navCounts?.security : undefined;
                    const badgeLabel = dynamicCount === undefined ? item.badge : String(dynamicCount);
                    const badgeTone = item.key === 'invitations' ? (Number(dynamicCount ?? 0) > 0 ? 'warning' : 'success') : item.key === 'security' ? (Number(dynamicCount ?? 0) > 0 ? 'danger' : 'success') : item.key === 'users' ? 'info' : item.badgeTone;
                    const statusDot = item.key === 'invitations' ? (Number(dynamicCount ?? 0) > 0 ? 'warn' : 'ok') : item.key === 'security' ? (Number(dynamicCount ?? 0) > 0 ? 'warn' : 'ok') : item.statusDot;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={cn(
                          'relative flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition',
                          isActive
                            ? 'bg-blue-50 text-slate-950 shadow-[inset_3px_0_0_#0c7fff]'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                        )}
                      >
                        <span className="w-5 text-center text-[15px]" aria-hidden="true">{item.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {badgeLabel ? <AdminNavBadge label={badgeLabel} tone={badgeTone} /> : null}
                        <AdminNavStatusDot dot={statusDot} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
          <p className="font-bold">{sectionTitle ?? 'Workspace control'}</p>
          <p className="mt-1 text-blue-800/75">Admin is grouped by organisation, operations, commerce, platform, and governance.</p>
        </div>
      </aside>
      <main className="min-w-0 space-y-6"><GovernanceBanner missingCount={missingCount} gapItems={gapItems} />{children}</main>
    </div>
  );
}

export function AdminPageHero({ title, description, badge, cta, stats }: { title: string; description: string; badge?: string; cta?: ReactNode; stats?: Array<{ label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }> }) {
  return <WorkspaceHeader eyebrow="Admin & Settings" title={title} description={description} badge={badge} actions={cta} meta={stats?.map((stat) => <span key={stat.label}><ToolbarStat label={stat.label} value={String(stat.value)} tone={stat.tone ?? 'default'} /></span>)} />;
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
