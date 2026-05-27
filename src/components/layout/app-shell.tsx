'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaIcon } from '@/components/ui/fa-icon';
import { MobileTabBar } from '@/components/shell/MobileTabBar';
import { DesktopRedirect } from '@/components/shell/DesktopRedirect';
import { OfflineIndicator } from '@/components/shell/OfflineIndicator';
import { getRouteMeta } from '@/components/shell/route-meta';
import { cn, getInitials } from '@/lib/utils';
import { MobileShell } from '@/features/mobile/components/mobile-shell';
import { SetuGuruWidget } from '@/features/setu-guru/setu-guru-widget';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName, normalizeWorkspaceRoles } from '@/lib/workspace/roles';
import type { Database } from '@/types/database';
import type { MyCardSettingsInput } from '@/lib/contact-exchange/my-card-settings-shared';

type Profile = Database['public']['Tables']['profiles']['Row'] | null;
type Organization = Database['public']['Tables']['organizations']['Row'] | null;
type Membership = Database['public']['Tables']['organization_members']['Row'] | null;

type AppShellProps = {
  children: ReactNode;
  profile: Profile;
  organization: Organization;
  membership: Membership;
  currentRoles?: string[];
  cardSettings?: MyCardSettingsInput | null;
  cardShareSlug?: string | null;
};

function addShareSafeAssetParam(params: URLSearchParams, key: string, value?: string | null) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed) || trimmed.length > 500) return;
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) return;
  params.set(key, trimmed);
}

function shareLinkFor(profile: Profile, organization: Organization, cardSettings?: MyCardSettingsInput | null, cardShareSlug?: string | null, roleLabel = 'Member') {
  if (cardShareSlug) return `/card?share=${encodeURIComponent(cardShareSlug)}`;
  const params = new URLSearchParams();
  params.set('name', profile?.full_name ?? profile?.username ?? 'SETU Flow user');
  if (profile?.email) params.set('email', profile.email);
  addShareSafeAssetParam(params, 'avatar', profile?.avatar_url);
  params.set('org', organization?.name ?? 'SETU Flow');
  params.set('role', roleLabel);
  if (cardSettings?.primaryPhone) params.set('phone', cardSettings.primaryPhone);
  if (cardSettings?.secondaryPhone) params.set('phone2', cardSettings.secondaryPhone);
  if (cardSettings?.website) params.set('web', cardSettings.website);
  if (cardSettings?.address) params.set('addr', cardSettings.address);
  return `/card?${params.toString()}`;
}

function downloadVcfHrefFor(profile: Profile, organization: Organization, cardSettings?: MyCardSettingsInput | null, cardShareSlug?: string | null, roleLabel = 'Member') {
  if (cardShareSlug) return `/api/public/card-vcf?share=${encodeURIComponent(cardShareSlug)}`;
  const params = new URLSearchParams();
  params.set('name', profile?.full_name ?? profile?.username ?? 'SETU Flow user');
  if (profile?.email) params.set('email', profile.email);
  addShareSafeAssetParam(params, 'avatar', profile?.avatar_url);
  params.set('org', organization?.name ?? 'SETU Flow');
  params.set('role', roleLabel);
  if (cardSettings?.primaryPhone) params.set('phone', cardSettings.primaryPhone);
  if (cardSettings?.secondaryPhone) params.set('phone2', cardSettings.secondaryPhone);
  if (cardSettings?.website) params.set('web', cardSettings.website);
  if (cardSettings?.address) params.set('addr', cardSettings.address);
  return `/api/public/card-vcf?${params.toString()}`;
}

function DesktopNav({ pathname, canAccessAdmin }: { pathname: string; canAccessAdmin: boolean }) {
  const items = [
    { href: '/dashboard', label: 'Dash', icon: 'home' },
    { href: PRODUCT_ROUTES.app.leads, label: 'Leads', icon: 'users' },
    { href: '/quotes', label: 'Quotes', icon: 'comments-o' },
    { href: '/orders', label: 'Orders', icon: 'archive' },
    { href: '/tasks', label: 'Tasks', icon: 'check-square-o' },
    { href: '/pipeline', label: 'Pipeline', icon: 'line-chart' },
    { href: '/products', label: 'Catalog', icon: 'tags' },
    { href: '/trade-events', label: 'Events', icon: 'calendar' },
    ...(canAccessAdmin ? [{ href: '/admin', label: 'Admin', icon: 'lock' }] : []),
  ];
  return (
    <nav className="mt-6 flex flex-1 flex-col gap-1 px-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold transition', active ? 'bg-white/12 text-white' : 'text-white/55 hover:bg-white/8 hover:text-white')}>
            <FaIcon icon={item.icon} fixedWidth />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, profile, organization, membership, currentRoles = [], cardSettings, cardShareSlug }: AppShellProps) {
  const pathname = usePathname();
  const routeMeta = getRouteMeta(pathname);
  const normalizedRoles = useMemo(() => normalizeWorkspaceRoles(currentRoles), [currentRoles]);
  const currentRole = useMemo(() => getPrimaryWorkspaceRole(normalizedRoles) ?? 'member', [normalizedRoles]);
  const roleLabel = getWorkspaceRoleDisplayName(currentRole);
  const profileName = profile?.full_name ?? profile?.username ?? 'SETU Flow user';
  const profileEmail = profile?.email ?? 'Signed in via Supabase';
  const canAccessAdmin = normalizedRoles.includes('owner') || normalizedRoles.includes('admin');
  const shareHref = useMemo(() => shareLinkFor(profile, organization, cardSettings, cardShareSlug, roleLabel), [cardSettings, cardShareSlug, organization, profile, roleLabel]);
  const downloadVcfHref = useMemo(() => downloadVcfHrefFor(profile, organization, cardSettings, cardShareSlug, roleLabel), [cardSettings, cardShareSlug, organization, profile, roleLabel]);
  const signedInForMobile = useMemo(() => ({
    name: profileName,
    initials: getInitials(profileName),
    email: profile?.email,
    organizationName: organization?.name ?? 'SETU Flow',
    roleLabel,
    primaryPhone: cardSettings?.primaryPhone ?? null,
    secondaryPhone: cardSettings?.secondaryPhone ?? null,
    website: cardSettings?.website ?? null,
    address: cardSettings?.address ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    shareHref,
    downloadVcfHref,
  }), [cardSettings?.address, cardSettings?.primaryPhone, cardSettings?.secondaryPhone, cardSettings?.website, downloadVcfHref, organization?.name, profile?.avatar_url, profile?.email, profileName, roleLabel, shareHref]);
  const canonicalMobileRoutes = ['/dashboard', '/leads', '/orders', '/tasks'];
  const shouldUseCanonicalMobileShell = canonicalMobileRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const desktopOnlyRoutes = ['/pipeline', '/quotes', '/products', '/admin', '/approval-send', '/reports'];
  const isDesktopOnlyRoute = desktopOnlyRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  return (
    <>
      {shouldUseCanonicalMobileShell ? (
        <div className="md:hidden">
          <MobileShell signedIn={signedInForMobile} canonical>{children}</MobileShell>
        </div>
      ) : null}
      <div className={cn('min-h-screen bg-[#f0f4f8] md:bg-[radial-gradient(circle_at_top_left,rgba(12,127,255,0.12),transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_48%,#f8fafc_100%)]', shouldUseCanonicalMobileShell ? 'hidden md:block' : undefined)}>
        <a href="#app-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold text-slate-900">Skip to content</a>
        <div className="flex min-h-screen">
          <aside className="hidden w-[88px] shrink-0 flex-col bg-[linear-gradient(180deg,#061c2e_0%,#0b2e4a_100%)] px-2 py-5 text-white md:flex">
            <div className="flex justify-center"><div className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-white/8 ring-1 ring-white/10"><img src="/logos/setu-flow-logo.svg" alt="SETU Flow" className="h-7 w-7 object-contain" /></div></div>
            {organization?.name ? <p className="mt-1 truncate px-1 text-center text-[8px] font-extrabold uppercase tracking-[0.14em] text-white/30">{(organization.name.match(/\b\w/g) ?? []).slice(0, 6).join('').toUpperCase()}</p> : null}
            <DesktopNav pathname={pathname} canAccessAdmin={canAccessAdmin} />
            <div className="mt-6 flex justify-center"><UserAvatar name={profileName} email={profileEmail} avatarUrl={profile?.avatar_url} initials={getInitials(profileName)} size="md" className="ring-1 ring-white/20" /></div>
          </aside>
          <main id="app-content" className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 hidden border-b border-slate-200/70 bg-white/85 px-6 py-4 backdrop-blur-xl md:block">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0c7fff]">Trade command center</p><h1 className="mt-1 text-2xl font-black text-slate-950">{routeMeta.title}</h1></div>
                <div className="flex items-center gap-2"><OfflineIndicator /><a href={shareHref} className="inline-flex h-11 items-center gap-2 rounded-[0.9rem] bg-[linear-gradient(135deg,#0b2e4a_0%,#0c7fff_160%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,127,255,0.3)]"><FaIcon icon="address-card-o" fixedWidth />Share vCard</a><Link href={`${PRODUCT_ROUTES.app.leads}?quickLead=1`} className="inline-flex h-11 items-center gap-2 rounded-[0.9rem] bg-[#0b2e4a] px-4 text-sm font-semibold text-white">＋ Quick Lead</Link><UserAvatar name={profileName} email={profileEmail} avatarUrl={profile?.avatar_url} initials={getInitials(profileName)} size="md" /></div>
              </div>
            </header>
            <div className="px-4 py-5 pb-[calc(80px+env(safe-area-inset-bottom))] sm:px-6 md:px-7 md:pb-8 xl:px-8">
              {isDesktopOnlyRoute ? <DesktopRedirect /> : null}
              <div className={isDesktopOnlyRoute ? 'hidden md:block' : undefined}>{children}</div>
            </div>
          </main>
        </div>
        <Link href={`${PRODUCT_ROUTES.app.leads}?quickLead=1`} aria-label="Quick Lead" className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-[300] flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#0c7fff] to-[#0052cc] text-3xl font-black text-white shadow-[0_6px_22px_rgba(12,127,255,0.5)] ring-2 ring-white/80 md:hidden">+</Link>
        <MobileTabBar />
      </div>
      <SetuGuruWidget pathname={pathname} routeTitle={routeMeta.title} organizationName={organization?.name} roleLabel={roleLabel} />
    </>
  );
}
