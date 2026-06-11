import { GuruAvatar } from '@/components/ui/guru-avatar';
import { SetuIcon, type SetuIconName } from '@/components/ui/setu-icon';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ReactNode } from 'react';

export type AdminNavKey =
  | 'overview'
  | 'profile'
  | 'client-management'
  | 'modules'
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

type AdminNavStatusDot = 'ok' | 'warn' | 'danger' | 'none';
type AdminNavIcon = SetuIconName | 'guru';

type AdminNavItem = {
  key: AdminNavKey;
  href: string;
  icon: AdminNavIcon;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeTone?: 'success' | 'warning' | 'danger' | 'info';
  statusDot?: AdminNavStatusDot;
  internalOnly?: boolean;
  merged?: boolean;
  aliases?: AdminNavKey[];
};

const internalOnlyAdminKeys: AdminNavKey[] = [
  'ai-analytics',
  'api-keys',
  'client-management',
  'client-onboarding',
  'guru-config',
  'integrations',
  'rate-limits',
  'seo',
];

const nav: Array<{ label: string; items: AdminNavItem[]; internalSection?: boolean }> = [
  {
    label: 'Workspace',
    items: [
      { key: 'overview', href: '/admin/overview', icon: 'building', label: 'Admin Home', statusDot: 'ok' },
      { key: 'profile', href: '/admin/organization', icon: 'user', label: 'Organization profile', statusDot: 'ok' },
      { key: 'users', href: '/admin/users', icon: 'users', label: 'Members & Roles', sublabel: 'Members + invitations', statusDot: 'ok', aliases: ['invitations'] },
    ],
  },
  {
    label: 'Trade Setup',
    items: [
      { key: 'markets', href: '/admin/markets', icon: 'globe', label: 'Markets', statusDot: 'ok' },
      { key: 'pipelines', href: '/admin/pipelines', icon: 'workflow', label: 'Pipelines & Stages', statusDot: 'ok', merged: true, aliases: ['stages'] },
      { key: 'categories', href: '/admin/catalog', icon: 'box', label: 'Catalog', sublabel: 'Categories + pricing rules', statusDot: 'ok', merged: true },
      { key: 'product-management', href: '/admin/catalog-governance', icon: 'clipboard', label: 'Catalog Governance', sublabel: 'Imports, cleanup, audit', statusDot: 'ok' },
      { key: 'trade-events', href: '/admin/trade-events', icon: 'calendar', label: 'Trade Events', statusDot: 'ok' },
    ],
  },
  {
    label: 'Commerce Rules',
    items: [
      { key: 'pricing-engine', href: '/admin/pricing', icon: 'dollar', label: 'Pricing Engine', statusDot: 'ok' },
      { key: 'document-templates', href: '/admin/documents', icon: 'file', label: 'Document Templates', statusDot: 'ok' },
      { key: 'notifications', href: '/admin/notifications', icon: 'bell', label: 'Notifications', statusDot: 'ok' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { key: 'security', href: '/admin/security', icon: 'security', label: 'Security & Roles', statusDot: 'warn' },
      { key: 'audit', href: '/admin/audit', icon: 'audit', label: 'Audit Log', statusDot: 'ok' },
    ],
  },
  {
    label: 'SETU Flow Internal',
    internalSection: true,
    items: [
      { key: 'client-management', href: '/admin/client-management', icon: 'users', label: 'Client Management', sublabel: 'Onboarding & health', statusDot: 'warn', badge: 'HQ', badgeTone: 'info', internalOnly: true },
      { key: 'guru-config', href: '/admin/guru-config', icon: 'guru', label: 'Setu Guru Config', sublabel: 'AI model & controls', statusDot: 'ok', badge: 'HQ', badgeTone: 'success', internalOnly: true },
      { key: 'api-keys', href: '/admin/api-keys', icon: 'key', label: 'API & Webhooks', sublabel: 'Keys & credentials', statusDot: 'ok', badge: 'HQ', badgeTone: 'success', internalOnly: true },
      { key: 'rate-limits', href: '/admin/rate-limits', icon: 'zap', label: 'Rate Limits', sublabel: 'Safety dials', statusDot: 'ok', badge: 'HQ', badgeTone: 'success', internalOnly: true },
      { key: 'ai-analytics', href: '/admin/ai-analytics', icon: 'analytics', label: 'AI Analytics', sublabel: 'Guru performance', statusDot: 'ok', badge: 'HQ', badgeTone: 'info', internalOnly: true },
      { key: 'integrations', href: '/admin/integrations', icon: 'plug', label: 'Integrations', sublabel: 'Provider setup', statusDot: 'warn', internalOnly: true },
      { key: 'client-onboarding', href: '/admin/client-onboarding', icon: 'rocket', label: 'Client onboarding', sublabel: 'Intake workspace', statusDot: 'ok', internalOnly: true },
      { key: 'seo', href: '/admin/seo-intelligence', icon: 'globe', label: 'SEO intelligence', sublabel: 'Marketing intelligence', statusDot: 'ok', internalOnly: true },
    ],
  },
];

export type AdminGapItem = { icon: string; text: string; href: string };

function isInternalOrg(organizationName: string) {
  // S24-ADMUX-26: strict match only. Never leak HQ tools to a client org whose
  // name merely contains "setu" — prefer passing internalTools from the server
  // (isSetuInternalOrganization) instead of relying on this name fallback.
  const normalized = organizationName.trim().toLowerCase();
  return normalized === 'setu flow' || normalized === 'setuflow';
}

function AdminNavIconGlyph({ icon }: { icon: AdminNavIcon }) {
  return icon === 'guru' ? <GuruAvatar size="sm" /> : <SetuIcon name={icon} className="h-4 w-4" />;
}

function AdminNavBadge({ label, tone = 'success' }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'info' }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[8px] font-extrabold leading-none',
        tone === 'success'
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          : tone === 'warning'
            ? 'border border-amber-200 bg-amber-50 text-amber-700'
            : tone === 'danger'
              ? 'border border-rose-200 bg-rose-50 text-rose-700'
              : 'border border-cyan-200 bg-cyan-50 text-cyan-700',
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
        'h-1.5 w-1.5 rounded-full',
        dot === 'ok' ? 'bg-emerald-500' : dot === 'warn' ? 'bg-amber-400' : dot === 'danger' ? 'bg-rose-500' : 'bg-slate-300',
      )}
    />
  );
}

function itemIsActive(item: AdminNavItem, active: AdminNavKey) {
  return item.key === active || Boolean(item.aliases?.includes(active));
}

function getDynamicBadge(
  item: AdminNavItem,
  navCounts?: Partial<Record<'users' | 'invitations' | 'security', number>>,
) {
  if (item.key === 'users' && navCounts?.users !== undefined) return String(navCounts.users);
  if (item.key === 'security' && navCounts?.security !== undefined) return String(navCounts.security);
  return item.badge;
}

function getDynamicTone(item: AdminNavItem, navCounts?: Partial<Record<'users' | 'invitations' | 'security', number>>) {
  if (item.key === 'security' && Number(navCounts?.security ?? 0) > 0) return 'danger';
  if (item.key === 'users') return 'info';
  return item.badgeTone;
}

function getDynamicStatus(item: AdminNavItem, navCounts?: Partial<Record<'users' | 'invitations' | 'security', number>>) {
  if (item.key === 'users' && Number(navCounts?.invitations ?? 0) > 0) return 'warn';
  if (item.key === 'security' && Number(navCounts?.security ?? 0) > 0) return 'warn';
  return item.statusDot;
}

function visibleNavSections(showInternalOnlyTools: boolean) {
  return nav
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => showInternalOnlyTools || (!item.internalOnly && !internalOnlyAdminKeys.includes(item.key))),
    }))
    .filter((section) => section.items.length > 0 && (!section.internalSection || showInternalOnlyTools));
}

export function AdminSettingsShell({
  active,
  organizationName,
  missingCount = 0,
  sectionTitle,
  gapItems = [],
  navCounts,
  internalTools,
  children,
}: {
  active: AdminNavKey;
  organizationName: string;
  missingCount?: number;
  sectionTitle?: string;
  gapItems?: AdminGapItem[];
  navCounts?: Partial<Record<'users' | 'invitations' | 'security', number>>;
  /** S24-ADMUX-26: explicit HQ flag from isSetuInternalOrganization(); overrides the name heuristic. */
  internalTools?: boolean;
  children?: ReactNode;
}) {
  const showInternalOnlyTools = internalTools ?? isInternalOrg(organizationName);
  const sections = visibleNavSections(showInternalOnlyTools);
  const allItems = sections.flatMap((section) => section.items);
  const activeItem = allItems.find((item) => itemIsActive(item, active));
  const orgLabel = showInternalOnlyTools ? 'Owner · Full access' : 'Owner · Managed workspace';

  return (
    <section className="overflow-hidden rounded-none bg-slate-50 text-slate-800 shadow-[0_1px_8px_rgba(15,23,42,0.06)] lg:rounded-[1.5rem]">
      <div className="sticky top-0 z-30 bg-slate-950 text-white shadow-[0_1px_0_rgba(255,255,255,0.07)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2">
          <Link
            href="/admin/overview"
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white"
          >
            <span aria-hidden="true">🏢</span>
            <span>{showInternalOnlyTools ? 'SETU Flow (Main org)' : organizationName}</span>
          </Link>
          {showInternalOnlyTools ? (
            <span className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white/35">
              <span aria-hidden="true">🌱</span>
              Client orgs managed in Client Management
            </span>
          ) : null}
          <span className="ml-auto text-[10px] font-semibold text-white/35">{orgLabel}</span>
        </div>
        <div className="flex gap-0.5 overflow-x-auto px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {allItems.map((item) => {
            const isActive = itemIsActive(item, active);
            return (
              <Link
                key={`${item.key}-top`}
                href={item.href}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition',
                  isActive ? 'bg-teal-500/20 text-teal-100' : 'text-white/40 hover:bg-white/10 hover:text-white/75',
                )}
              >
                <span className="opacity-90"><AdminNavIconGlyph icon={item.icon} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-[204px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white py-2 lg:sticky lg:top-[5.2rem] lg:max-h-[calc(100vh-5.2rem)] lg:self-start lg:overflow-y-auto">
          <nav className="space-y-1">
            {sections.map((section, index) => {
              const isInternalSection = section.internalSection;
              const content = (
                <div className={cn(index > 0 && !isInternalSection ? 'border-t border-slate-100 pt-1' : '')}>
                  {!isInternalSection ? (
                    <p className="px-3 pb-0.5 pt-2 text-[7.5px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                      {section.label}
                    </p>
                  ) : null}
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = itemIsActive(item, active);
                      const badgeLabel = getDynamicBadge(item, navCounts);
                      const badgeTone = getDynamicTone(item, navCounts);
                      const statusDot = getDynamicStatus(item, navCounts);
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className={cn(
                            'mx-0 flex min-h-[34px] items-center gap-2 border-l-[3px] px-3 py-1.5 text-[11.5px] transition',
                            isActive
                              ? 'border-blue-800 bg-blue-50 text-slate-950'
                              : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                          )}
                        >
                          <span className="flex w-4 shrink-0 justify-center" aria-hidden="true"><AdminNavIconGlyph icon={item.icon} /></span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block truncate', isActive ? 'font-extrabold' : 'font-semibold')}>{item.label}</span>
                            {item.sublabel ? <span className="block truncate text-[9px] font-medium text-slate-400">{item.sublabel}</span> : null}
                          </span>
                          {item.merged ? <AdminNavBadge label="merged" tone="info" /> : null}
                          {badgeLabel ? <AdminNavBadge label={badgeLabel} tone={badgeTone} /> : null}
                          <AdminNavStatusDot dot={statusDot} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );

              if (!isInternalSection) return <div key={section.label}>{content}</div>;

              return (
                <details key={section.label} className="mt-1 border-t border-slate-100 pt-2" open={section.items.some((item) => itemIsActive(item, active))}>
                  <summary className="mx-3 flex cursor-pointer list-none items-center gap-1.5 py-1 text-[7.5px] font-extrabold uppercase tracking-[0.2em] text-amber-700">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-amber-100 text-[8px]">🛡</span>
                    {section.label}
                    <span className="ml-auto text-[8px] text-slate-400">▾</span>
                  </summary>
                  {content}
                </details>
              );
            })}
          </nav>
          <div className={cn('mx-2.5 mt-3 rounded-lg border p-2.5 text-[10.5px] leading-5', showInternalOnlyTools ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-violet-200 bg-violet-50 text-violet-800')}>
            <p className="font-extrabold">{sectionTitle ?? 'Workspace control'}</p>
            <p className="mt-0.5 opacity-80">
              {showInternalOnlyTools
                ? 'Admin grouped by identity, trade setup, commerce rules, governance, and HQ-only controls.'
                : `${organizationName} · Managed workspace. Internal SETU controls stay hidden.`}
            </p>
          </div>
        </aside>

        <main className="min-w-0 bg-slate-50">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{activeItem?.sublabel ?? 'Admin Command Center'}</p>
              <h1 className="text-base font-extrabold tracking-[-0.02em] text-slate-950">{activeItem?.label ?? 'Admin'}</h1>
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
              <span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold', missingCount > 0 ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                {missingCount > 0 ? `⚠ ${missingCount} gap${missingCount === 1 ? '' : 's'}` : '✓ Governance clear'}
              </span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{organizationName}</span>
            </div>
          </div>
          <div className="space-y-4 px-5 py-4 lg:px-5 lg:py-4">
            <GovernanceBanner missingCount={missingCount} gapItems={gapItems} />
            {children}
          </div>
        </main>
      </div>
    </section>
  );
}

export function AdminPageHero({
  title,
  description,
  badge,
  cta,
  stats,
}: {
  title: string;
  description: string;
  badge?: string;
  cta?: ReactNode;
  stats?: Array<{ label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }>;
}) {
  return (
    <section className="rounded-[13px] border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[8.5px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Admin & Settings</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-[-0.02em] text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-start gap-1.5 md:justify-end">
          {badge ? <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700">{badge}</span> : null}
          {stats?.map((stat) => (
            <span key={stat.label} className={cn('rounded-full border px-2.5 py-1 text-[10px] font-bold', stat.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : stat.tone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-700' : stat.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700')}>
              {stat.label}: {stat.value}
            </span>
          ))}
          {cta}
        </div>
      </div>
    </section>
  );
}

function GovernanceBanner({ missingCount, gapItems = [] }: { missingCount: number; gapItems?: AdminGapItem[] }) {
  const clear = missingCount === 0;
  return (
    <section className={cn('rounded-xl border p-3', clear ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm" aria-hidden="true">
            {clear ? '✅' : '⚠️'}
          </span>
          <div>
            <p className={cn('text-xs font-extrabold', clear ? 'text-emerald-800' : 'text-amber-800')}>
              {clear ? 'Governance clear' : 'Governance attention needed'}
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-slate-600">
              {clear
                ? 'Markets, stages, pipelines, trade events, and security controls are configured.'
                : `${missingCount} setup area${missingCount === 1 ? '' : 's'} need attention before full workflows are available.`}
            </p>
            {gapItems.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {gapItems.map((item) => (
                  <Link
                    key={`${item.href}-${item.text}`}
                    href={item.href}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2 py-1 text-[10px] font-bold text-amber-800 transition hover:bg-amber-100"
                  >
                    <span>{item.icon === '__guru__' ? <GuruAvatar size="sm" /> : item.icon}</span>
                    <span>{item.text}</span>
                    <span>→</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link href="/admin/markets" className="rounded-lg border border-white bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm hover:bg-slate-50">Markets</Link>
          <Link href="/admin/security" className="rounded-lg border border-white bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm hover:bg-slate-50">Security</Link>
        </div>
      </div>
    </section>
  );
}
