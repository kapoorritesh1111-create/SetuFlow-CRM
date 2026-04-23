'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { FaIcon } from '@/components/ui/fa-icon';
import { ShellNavigation } from '@/components/layout/shell/navigation';
import { getRouteMeta } from '@/components/layout/shell/route-meta';
import { getWorkspaceBasePath, getWorkspaceModeFromLocation, withWorkspaceMode, withWorkspaceModePreservedParams } from '@/components/layout/shell/utils';
import { cn, getInitials } from '@/lib/utils';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName, normalizeWorkspaceRoles } from '@/lib/workspace/roles';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'] | null;
type Organization = Database['public']['Tables']['organizations']['Row'] | null;
type Membership = Database['public']['Tables']['organization_members']['Row'] | null;

export function AppShell({
  children,
  profile,
  organization,
  membership,
  currentRoles = [],
}: {
  children: ReactNode;
  profile: Profile;
  organization: Organization;
  membership: Membership;
  currentRoles?: string[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [vcardModalOpen, setVcardModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const normalizedRoles = useMemo(() => normalizeWorkspaceRoles(currentRoles), [currentRoles]);
  const currentRole = useMemo(() => getPrimaryWorkspaceRole(normalizedRoles) ?? 'member', [normalizedRoles]);
  const canAccessAdmin = normalizedRoles.includes('owner') || normalizedRoles.includes('admin');
  const routeMeta = getRouteMeta(pathname);
  const workspaceMode = getWorkspaceModeFromLocation(pathname, searchParams.get('mode'));
  const workspaceBasePath = getWorkspaceBasePath(pathname);
  const showWorkspaceModeSwitch = routeMeta.showWorkspaceModeSwitch ?? true;
  const topbarDate = useMemo(
    () => new Intl.DateTimeFormat('en-US', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
    [],
  );

  const currentWorkspaceModeHref = (mode: 'all' | 'buyers' | 'suppliers') => {
    if (!workspaceBasePath) return pathname;
    return withWorkspaceModePreservedParams(workspaceBasePath, mode, searchParams.toString());
  };

  const shareLink = useMemo(() => {
    const params = new URLSearchParams();
    params.set('fullName', profile?.full_name ?? profile?.username ?? 'SETU Flow user');
    if (profile?.email) params.set('email', profile.email);
    params.set('organizationName', organization?.name ?? 'SETU Flow');
    params.set('roleLabel', getWorkspaceRoleDisplayName(currentRole));
    return `/card?${params.toString()}`;
  }, [currentRole, organization?.name, profile?.email, profile?.full_name, profile?.username]);

  const downloadVcfHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('fullName', profile?.full_name ?? profile?.username ?? 'SETU Flow user');
    if (profile?.email) params.set('email', profile.email);
    params.set('organizationName', organization?.name ?? 'SETU Flow');
    params.set('roleLabel', getWorkspaceRoleDisplayName(currentRole));
    return `/api/public/card-vcf?${params.toString()}`;
  }, [currentRole, organization?.name, profile?.email, profile?.full_name, profile?.username]);


  useEffect(() => {
    let active = true;

    async function generateQr() {
      if (!vcardModalOpen) return;
      const absoluteShareLink = typeof window === 'undefined' ? shareLink : `${window.location.origin}${shareLink}`;
      try {
        const dataUrl = await QRCode.toDataURL(absoluteShareLink, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 220,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        if (active) setQrCodeDataUrl(dataUrl);
      } catch {
        if (active) setQrCodeDataUrl(null);
      }
    }

    void generateQr();
    return () => {
      active = false;
    };
  }, [shareLink, vcardModalOpen]);

  const handleCopyShareLink = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    const absolute = `${window.location.origin}${shareLink}`;
    await navigator.clipboard.writeText(absolute);
  };

  const sidebar = (
    <>
      <div className="flex justify-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-white/8 ring-1 ring-white/10">
          <img src="/logos/setu-flow-logo.svg" alt="SETU Flow" className="h-7 w-7 object-contain" />
        </div>
      </div>
      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <ShellNavigation
          pathname={pathname}
          canAccessAdmin={canAccessAdmin}
          workspaceMode={workspaceMode}
          compact
          onNavigate={() => setMobileNavOpen(false)}
        />
      </div>
      <div className="mt-6 flex justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] text-xs font-semibold text-white ring-1 ring-white/20">
          {getInitials(profile?.full_name ?? profile?.username)}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,rgba(12,127,255,0.12),transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_48%,#f8fafc_100%)]">
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900"
      >
        Skip to content
      </a>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative z-[61] flex h-full w-[84px] flex-col border-r border-white/10 bg-[linear-gradient(180deg,#061c2e_0%,#0b2e4a_100%)] px-2 py-5 text-white shadow-2xl">
            {sidebar}
          </aside>
        </div>
      ) : null}

      {vcardModalOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 px-4 py-8 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setVcardModalOpen(false);
          }}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-[1.6rem] bg-white shadow-[0_32px_80px_rgba(0,0,0,0.32)]">
            <div className="relative bg-[linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_140%)] px-7 pb-6 pt-7 text-white">
              <button type="button" onClick={() => setVcardModalOpen(false)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white">
                ✕
              </button>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-[linear-gradient(135deg,#0c7fff,#38bdf8)] text-lg font-bold">
                {getInitials(profile?.full_name ?? profile?.username)}
              </div>
              <p className="text-xl font-semibold tracking-tight">{profile?.full_name ?? profile?.username ?? 'SETU Flow user'}</p>
              <p className="mt-1 text-sm text-white/70">{getWorkspaceRoleDisplayName(currentRole)} · {organization?.name ?? 'SETU Flow'}</p>
              <p className="mt-2 text-xs text-white/55">{profile?.email ?? 'Signed in via Supabase'}</p>
            </div>
            <div className="px-7 py-6">
              <div className="mb-5 flex flex-col items-center">
                <div className="flex h-[124px] w-[124px] items-center justify-center rounded-[1rem] border border-slate-200 bg-slate-50 p-2 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR code for digital vCard share" className="h-full w-full rounded-[0.75rem] bg-white p-1" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-[0.75rem] border border-dashed border-slate-300 bg-white text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Preparing QR
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Scan to save contact</p>
              </div>
              <div className="space-y-2.5">
                <a href={downloadVcfHref} className="flex items-center gap-3 rounded-[0.9rem] bg-[#0b2e4a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#061c2e]">
                  <span>⬇</span>
                  <span>Download .vcf</span>
                </a>
                <button type="button" onClick={handleCopyShareLink} className="flex w-full items-center gap-3 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <span>🔗</span>
                  <span>Copy link</span>
                </button>
                <a href={`mailto:?subject=${encodeURIComponent('My SETU Flow vCard')}&body=${encodeURIComponent(typeof window === 'undefined' ? shareLink : `${window.location.origin}${shareLink}`)}`} className="flex items-center gap-3 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <span>✉</span>
                  <span>Send email</span>
                </a>
                <a href={PRODUCT_ROUTES.app.myCard} className="flex items-center justify-center gap-2 rounded-[0.9rem] px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">
                  <span>⚙</span>
                  <span>Edit settings</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid min-h-screen grid-cols-1 gap-0 px-0 lg:grid-cols-[72px_minmax(0,1fr)] lg:px-4 lg:py-4 xl:px-5">
        <aside className="hidden flex-col rounded-[2rem] border border-[#d9e2ec] bg-[linear-gradient(180deg,#061c2e_0%,#0b2e4a_100%)] px-2 py-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {sidebar}
        </aside>

        <main id="app-content" className="relative min-w-0 overflow-x-clip lg:pl-5 xl:pl-6">
          <div className="min-h-screen lg:rounded-[2rem] lg:border lg:border-white/80 lg:bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,255,0.98))] lg:shadow-[0_24px_70px_rgba(15,23,42,0.10)] lg:ring-1 lg:ring-slate-950/[0.03]">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur lg:rounded-t-[2rem]">
              <div className="px-4 py-3.5 sm:px-6 lg:px-7 xl:px-9">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileNavOpen(true)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-slate-200 bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-slate-50 lg:hidden"
                      aria-label="Open navigation"
                      aria-expanded={mobileNavOpen}
                    >
                      <span aria-hidden="true">☰</span>
                    </button>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0c7fff]">Trade Command Center</p>
                      <h1 className="truncate text-xl font-semibold text-slate-950 sm:text-2xl">{routeMeta.title}</h1>
                      <p className="mt-1 text-xs text-slate-500">{topbarDate}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setVcardModalOpen(true)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-[0.9rem] bg-[linear-gradient(135deg,#0b2e4a_0%,#0c7fff_160%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,127,255,0.3)] hover:opacity-95"
                    >
                      <FaIcon icon="address-card-o" fixedWidth className="text-sm" />
                      <span>Share my vCard</span>
                    </button>

                    {showWorkspaceModeSwitch ? (
                      <div className="inline-flex items-center rounded-[0.9rem] border border-slate-200 bg-slate-100 p-1">
                        {(['all', 'buyers', 'suppliers'] as const).map((value) => {
                          const active = workspaceMode === value;
                          return (
                            <a
                              key={value}
                              href={currentWorkspaceModeHref(value)}
                              aria-current={active ? 'page' : undefined}
                              className={cn(
                                'rounded-[0.7rem] px-3 py-2 text-sm font-medium transition',
                                active ? 'bg-[#0b2e4a] text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)]' : 'text-slate-600 hover:bg-white hover:text-slate-900',
                              )}
                            >
                              {value === 'all' ? 'All' : value === 'buyers' ? 'Buyers' : 'Suppliers'}
                            </a>
                          );
                        })}
                      </div>
                    ) : null}

                    <button type="button" className="inline-flex h-11 items-center gap-2 rounded-[0.9rem] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <FaIcon icon="sliders" fixedWidth className="text-sm" />
                      <span>Filters</span>
                    </button>

                    <a href={withWorkspaceMode(PRODUCT_ROUTES.app.leads, workspaceMode)} className="inline-flex h-11 items-center gap-2 rounded-[0.9rem] border border-[#0b2e4a] bg-[#0b2e4a] px-4 text-sm font-semibold text-white hover:bg-[#061c2e]">
                      <span>＋</span>
                      <span>Quick Lead</span>
                    </a>

                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] text-sm font-semibold text-white shadow-soft ring-1 ring-white/20">
                      {getInitials(profile?.full_name ?? profile?.username)}
                    </div>
                  </div>
                </div>
              </div>
            </header>
            <div className="relative px-4 py-4 sm:px-6 lg:px-7 xl:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
