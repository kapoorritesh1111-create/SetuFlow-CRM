'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { FaIcon } from '@/components/ui/fa-icon';
import { NoticeToast } from '@/components/ui/notice-toast';
import { ShellNavigation } from '@/components/shell/navigation';
import { MobileTabBar } from '@/components/shell/MobileTabBar';
import { DesktopRedirect } from '@/components/shell/DesktopRedirect';
import { OfflineIndicator } from '@/components/shell/OfflineIndicator';
import { getRouteMeta } from '@/components/shell/route-meta';
import { getWorkspaceBasePath, getWorkspaceModeFromLocation, withWorkspaceMode, withWorkspaceModePreservedParams } from '@/components/shell/utils';
import { cn, getInitials } from '@/lib/utils';
import { MobileShell } from '@/features/mobile/components/mobile-shell';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName, normalizeWorkspaceRoles } from '@/lib/workspace/roles';
import type { Database } from '@/types/database';
import type { MyCardSettingsInput } from '@/lib/contact-exchange/my-card-settings-shared';


type ShellNotice = { title: string; description?: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' };
type ShellHelpSection = { title: string; body: string };

const NOTICE_COPY: Record<string, ShellNotice> = {
  'category-created': { title: 'Category created', description: 'The new category is available for products and imports.', tone: 'success' },
  'category-updated': { title: 'Category saved', description: 'Category name, parent, sort order, and active state were saved.', tone: 'success' },
  'category-error': { title: 'Category was not saved', description: 'Check the category fields and try again.', tone: 'danger' },
  'pricing-rule-saved': { title: 'Pricing rule saved', description: 'Default pricing calculator assumptions were saved.', tone: 'success' },
  'pricing-rule-error': { title: 'Pricing rule was not saved', description: 'Check required fields and try again.', tone: 'danger' },
  'pricing-rule-category-required': { title: 'Choose a category', description: 'Select a category before saving category pricing defaults.', tone: 'warning' },
  'invitation-sent': { title: 'Invitation sent', description: 'The invitation is ready for the teammate to accept.', tone: 'success' },
  'invitation-revoked': { title: 'Invitation revoked', description: 'The invitation can no longer be accepted.', tone: 'success' },
  'invite-error': { title: 'Invitation was not saved', description: 'Review the email, role, and workspace access.', tone: 'danger' },
  'role-updated': { title: 'Role saved', description: 'The user access level was updated.', tone: 'success' },
  'user-deactivated': { title: 'User deactivated', description: 'The user no longer has active workspace access.', tone: 'success' },
  'user-reactivated': { title: 'User reactivated', description: 'The user has active workspace access again.', tone: 'success' },
  'status-updated': { title: 'Status saved', description: 'The workflow status was updated.', tone: 'success' },
  'request-not-found': { title: 'Request not found', description: 'The selected onboarding request could not be loaded.', tone: 'warning' },
  'workspace-provisioned': { title: 'Workspace provisioned', description: 'The client workspace is ready for the next setup step.', tone: 'success' },
  'workspace-create-failed': { title: 'Workspace was not created', description: 'Check setup fields and Supabase permissions.', tone: 'danger' },
  'notification-sent': { title: 'Notification sent', description: 'The client onboarding notification was sent.', tone: 'success' },
  'notification-failed': { title: 'Notification failed', description: 'The record was saved, but email delivery needs attention.', tone: 'warning' },
  'first-admin-invite-sent': { title: 'First admin invite sent', description: 'The client admin can now accept access.', tone: 'success' },
  'first-admin-invite-failed': { title: 'First admin invite failed', description: 'The workspace exists, but invite delivery needs attention.', tone: 'warning' },
  'quote-accepted': { title: 'Quote accepted', description: 'The accepted quote is ready for order execution review.', tone: 'success' },
  'quote-sent': { title: 'Quote sent', description: 'The quote handoff was recorded.', tone: 'success' },
  'order-doc-uploaded': { title: 'Order document uploaded', description: 'The document is now attached to the order.', tone: 'success' },
  'capture-converted': { title: 'Trade event lead converted', description: 'The captured entry is now available in the lead workflow.', tone: 'success' },
  'missing-required': { title: 'Missing required fields', description: 'Complete the required fields before submitting.', tone: 'warning' },
  'submitted': { title: 'Request submitted', description: 'The onboarding request was received.', tone: 'success' },
  'handoff-dashboard-overdue': { title: 'Overview sent you into Follow-up', description: 'Your active mode and next working lane were preserved. Open one priority lead and clear the real blocker.', tone: 'success' },
  'handoff-dashboard-open-follow-up': { title: 'Overview sent you into Follow-up', description: 'Your active mode and next working lane were preserved. Open one priority lead and clear the real blocker.', tone: 'success' },
  'handoff-capture-converted': { title: 'Capture converted into Follow-up', description: 'The lead is live now. Stay in Follow-up to qualify it, then move into Quote only when the commercial path is ready.', tone: 'success' },
  'handoff-quote-to-orders': { title: 'Quote handoff continues here', description: 'The commercial decision is finished. Stay in Orders to confirm documents, compliance, and release readiness on the accepted record.', tone: 'success' },
  'handoff-dashboard-execution': { title: 'Dashboard routed you into execution', description: 'Your active mode and next working lane were preserved.', tone: 'success' },
  'handoff-approval-send-open-orders': { title: 'Sending hands off to execution here', description: 'Use Orders for fulfilment readiness, release evidence, and dispatch posture.', tone: 'success' },
  'handoff-dashboard-open-orders': { title: 'Order queue opened from Overview', description: 'The next working route is now in focus.', tone: 'success' },
};

function titleCaseNotice(value: string) {
  return value
    .replace(/[:_]/g, '-')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function decodeShellNotice(rawNotice: string | null): ShellNotice | null {
  if (!rawNotice) return null;
  const notice = decodeURIComponent(rawNotice);
  if (NOTICE_COPY[notice]) return NOTICE_COPY[notice];
  if (notice.startsWith('order-state-progressed:')) return { title: 'Order updated', description: `Order state changed to ${titleCaseNotice(notice.split(':')[1] ?? 'updated')}.`, tone: 'success' };
  if (notice.startsWith('order-state-blocked:')) return { title: 'Order execution is blocked', description: notice.slice('order-state-blocked:'.length).split(' | ').join(' '), tone: 'warning' };
  if (notice.startsWith('order-readonly:')) return { title: 'Order is read-only', description: notice.slice('order-readonly:'.length), tone: 'warning' };
  if (notice.startsWith('order-doc-upload-failed:')) return { title: 'Order document upload failed', description: notice.slice('order-doc-upload-failed:'.length), tone: 'danger' };
  if (notice.includes('failed') || notice.includes('error') || notice.includes('blocked')) return { title: titleCaseNotice(notice), description: 'The action needs attention. Review the page fields and try again.', tone: 'danger' };
  if (notice.includes('missing') || notice.includes('required') || notice.includes('readonly')) return { title: titleCaseNotice(notice), description: 'Additional information is required before this action can finish.', tone: 'warning' };
  if (notice.includes('created') || notice.includes('updated') || notice.includes('saved') || notice.includes('sent') || notice.includes('uploaded') || notice.includes('converted') || notice.includes('submitted')) return { title: titleCaseNotice(notice), description: 'The action completed successfully.', tone: 'success' };
  return { title: titleCaseNotice(notice), description: 'The workspace recorded this update.', tone: 'neutral' };
}

function getShellHelp(pathname: string, fallbackDescription: string): { title: string; intro: string; sections: ShellHelpSection[] } {
  if (pathname.startsWith('/products')) return {
    title: 'Products help',
    intro: 'Use Products for product rows, variants, pricing snapshots, quote-ready checks, and product-specific pricing overrides.',
    sections: [
      { title: 'Primary workflow', body: 'Find, add, and edit product rows. Each row represents the product/variant context used by quoting.' },
      { title: 'Pricing calculator', body: 'Use the calculator for product-specific pricing. Product rows inherit category or organization defaults unless an override is edited.' },
      { title: 'CTAs', body: 'Add Product creates a new catalog record. Edit Product updates the selected row. Quick Quote starts a quote without changing default product pricing.' },
    ],
  };
  if (pathname.startsWith('/admin/product-management')) return {
    title: 'Product Management help',
    intro: 'Use this Admin page to monitor catalog governance, default pricing rules, import health, and setup gaps. Daily product edits belong in Products.',
    sections: [
      { title: 'Pricing rules', body: 'Organization defaults apply first. Category rules override organization defaults. Product overrides apply only when a product row is edited.' },
      { title: 'Review CTAs', body: 'Review buttons open the Products workspace with the matching filter so the operator can fix the exact gap.' },
      { title: 'Imports', body: 'Product imports carry product setup and starting prices only. Shared freight, duty, and margin assumptions belong in pricing rules.' },
    ],
  };
  if (pathname.startsWith('/admin/categories')) return {
    title: 'Categories help',
    intro: 'Use Categories to govern taxonomy, parent structure, active status, and category-level pricing defaults.',
    sections: [
      { title: 'Category defaults', body: 'A category can have its own pricing calculator defaults. Products inherit those defaults unless product pricing is edited.' },
      { title: 'Active state', body: 'Inactive categories are hidden from new setup but historical product records stay traceable.' },
      { title: 'Open Products', body: 'Use Open Products in this category to jump to the operational product list with the category filter applied.' },
    ],
  };
  if (pathname.startsWith('/leads')) return {
    title: 'Follow-up and Quote Builder help',
    intro: 'Use Follow-up to qualify the buyer or supplier, map product interest, and build a governed quote preview without changing product defaults.',
    sections: [
      { title: 'Quote Builder order', body: 'Lock terms first: currency, incoterm, validity days, payment terms, and FX reference. Then price each line using the product UOM, pack size, and MOQ.' },
      { title: 'Pricing basis and incoterms', body: 'EXW, FOB/FCA, CFR, CIF, and DDP describe where cost and risk transfer. The pricing row shows whether the quote is per unit, per case, or per kg/bulk, and quantity follows the variant MOQ.' },
      { title: 'Quote-only adjustments', body: 'Discounts or markups entered in Quote Builder apply only to this quote. They do not update product, category, or organization pricing rules. Changes beyond the approval threshold go to owner approval before send.' },
      { title: 'Currency and FX', body: 'The quote currency can use the lead country currency when mapped. Weekly average FX should be treated as a quote reference for the selected validity period.' },
      { title: 'Quick Lead', body: 'Quick Lead stays fast and should not require extra help clicks or confirmation steps.' },
    ],
  };
  if (pathname.startsWith('/quotes')) return {
    title: 'Quotes help',
    intro: 'Use Quotes to assemble commercial lines, check approvals, and send quote versions without changing product defaults.',
    sections: [
      { title: 'Quote-only adjustments', body: 'Price increases or reductions inside a quote affect that quote only. They do not update category or product defaults.' },
      { title: 'Approvals', body: 'Approval checks protect deviations from governed product pricing.' },
    ],
  };
  if (pathname.startsWith('/orders')) return {
    title: 'Orders help',
    intro: 'Use Orders after quote acceptance to manage execution readiness, blockers, documents, and dispatch progress.',
    sections: [
      { title: 'Execution state', body: 'Order state changes should show a pop-up notification and keep the page layout stable.' },
      { title: 'Documents', body: 'Upload documents as execution evidence without changing the accepted quote.' },
    ],
  };
  if (pathname.startsWith('/pipeline')) return { title: 'Pipeline help', intro: 'Use Pipeline to identify stalled work, active risks, and the next intervention.', sections: [{ title: 'Board actions', body: 'Move work only when the next stage is valid for the selected buyer or supplier workflow.' }] };
  if (pathname.startsWith('/trade-events')) return { title: 'Trade events help', intro: 'Use Trade Events to manage event setup, floor capture, and conversion into leads.', sections: [{ title: 'Capture flow', body: 'Capture entries quickly, then convert only cleaned records into leads.' }] };
  if (pathname.startsWith('/admin')) return { title: 'Admin help', intro: 'Use Admin for organization setup, reference lists, access, governance, and audit controls.', sections: [{ title: 'Admin actions', body: 'Save and error feedback appears as a pop-up notification so forms do not shift down after every action.' }] };
  return { title: `${titleCaseNotice(pathname.replace(/^\//, '') || 'Workspace')} help`, intro: fallbackDescription, sections: [{ title: 'How to use this page', body: fallbackDescription || 'Use the page actions to continue the workflow. Save and error messages appear as pop-up notifications.' }] };
}

type Profile = Database['public']['Tables']['profiles']['Row'] | null;
type Organization = Database['public']['Tables']['organizations']['Row'] | null;
type Membership = Database['public']['Tables']['organization_members']['Row'] | null;

function addShareSafeAssetParam(params: URLSearchParams, key: string, value?: string | null) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed) || trimmed.length > 500) return;
  params.set(key, trimmed);
}

export function AppShell({
  children,
  profile,
  organization,
  membership,
  currentRoles = [],
  cardSettings,
  cardShareSlug,
}: {
  children: ReactNode;
  profile: Profile;
  organization: Organization;
  membership: Membership;
  currentRoles?: string[];
  cardSettings?: MyCardSettingsInput | null;
  cardShareSlug?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [vcardModalOpen, setVcardModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [topbarDate, setTopbarDate] = useState('');
  const [absoluteShareUrl, setAbsoluteShareUrl] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  const normalizedRoles = useMemo(() => normalizeWorkspaceRoles(currentRoles), [currentRoles]);
  const currentRole = useMemo(() => getPrimaryWorkspaceRole(normalizedRoles) ?? 'member', [normalizedRoles]);
  const canAccessAdmin = normalizedRoles.includes('owner') || normalizedRoles.includes('admin');
  const routeMeta = getRouteMeta(pathname);
  const noticeParam = searchParams.get('notice');
  const handoffParam = searchParams.get('handoff');
  const shellNotice = useMemo(() => decodeShellNotice(noticeParam ?? (handoffParam ? `handoff-${handoffParam}` : null)), [noticeParam, handoffParam]);
  const shellHelp = useMemo(() => getShellHelp(pathname, routeMeta.description), [pathname, routeMeta.description]);
  const workspaceMode = getWorkspaceModeFromLocation(pathname, searchParams.get('mode'));
  const workspaceBasePath = getWorkspaceBasePath(pathname);
  const showWorkspaceModeSwitch = routeMeta.showWorkspaceModeSwitch ?? true;
  const desktopOnlyRoutes = ['/pipeline', '/quotes', '/products', '/admin', '/approval-send', '/reports'];
  const isDesktopOnlyRoute = desktopOnlyRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

  const currentWorkspaceModeHref = (mode: 'all' | 'buyers' | 'suppliers') => {
    if (!workspaceBasePath) return pathname;
    return withWorkspaceModePreservedParams(workspaceBasePath, mode, searchParams.toString());
  };

  const shareLink = useMemo(() => {
    if (cardShareSlug) return `/card?share=${encodeURIComponent(cardShareSlug)}`;
    const params = new URLSearchParams();
    params.set('name', profile?.full_name ?? profile?.username ?? 'SETU Flow user');
    if (profile?.email) params.set('email', profile.email);
    addShareSafeAssetParam(params, 'avatar', profile?.avatar_url);
    params.set('org', organization?.name ?? 'SETU Flow');
    params.set('role', getWorkspaceRoleDisplayName(currentRole));
    if (cardSettings?.primaryPhone) params.set('phone', cardSettings.primaryPhone);
    if (cardSettings?.secondaryPhone) params.set('phone2', cardSettings.secondaryPhone);
    if (cardSettings?.website) params.set('web', cardSettings.website);
    if (cardSettings?.address) params.set('addr', cardSettings.address);
    return `/card?${params.toString()}`;
  }, [cardSettings?.address, cardSettings?.primaryPhone, cardSettings?.secondaryPhone, cardSettings?.website, cardShareSlug, currentRole, organization?.name, profile?.avatar_url, profile?.email, profile?.full_name, profile?.username]);


  const downloadVcfHref = useMemo(() => {
    if (cardShareSlug) return `/api/public/card-vcf?share=${encodeURIComponent(cardShareSlug)}`;
    const params = new URLSearchParams();
    params.set('name', profile?.full_name ?? profile?.username ?? 'SETU Flow user');
    if (profile?.email) params.set('email', profile.email);
    addShareSafeAssetParam(params, 'avatar', profile?.avatar_url);
    params.set('org', organization?.name ?? 'SETU Flow');
    params.set('role', getWorkspaceRoleDisplayName(currentRole));
    if (cardSettings?.primaryPhone) params.set('phone', cardSettings.primaryPhone);
    if (cardSettings?.secondaryPhone) params.set('phone2', cardSettings.secondaryPhone);
    if (cardSettings?.website) params.set('web', cardSettings.website);
    if (cardSettings?.address) params.set('addr', cardSettings.address);
    return `/api/public/card-vcf?${params.toString()}`;
  }, [cardSettings?.address, cardSettings?.primaryPhone, cardSettings?.secondaryPhone, cardSettings?.website, cardShareSlug, currentRole, organization?.name, profile?.avatar_url, profile?.email, profile?.full_name, profile?.username]);

  const signedInForMobile = useMemo(() => ({
    name: profile?.full_name ?? profile?.username ?? 'SETU Flow user',
    initials: getInitials(profile?.full_name ?? profile?.username),
    email: profile?.email,
    organizationName: organization?.name ?? 'SETU Flow',
    roleLabel: getWorkspaceRoleDisplayName(currentRole),
    primaryPhone: cardSettings?.primaryPhone ?? null,
    secondaryPhone: cardSettings?.secondaryPhone ?? null,
    website: cardSettings?.website ?? null,
    address: cardSettings?.address ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    shareHref: shareLink,
    downloadVcfHref,
  }), [cardSettings?.address, cardSettings?.primaryPhone, cardSettings?.secondaryPhone, cardSettings?.website, currentRole, organization?.name, profile?.avatar_url, profile?.email, profile?.full_name, profile?.username, shareLink, downloadVcfHref]);

  const canonicalMobileRoutes = ['/dashboard', '/leads', '/orders'];
  const shouldUseCanonicalMobileShell = canonicalMobileRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

  useEffect(() => {
    setTopbarDate(new Intl.DateTimeFormat('en-US', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') setAbsoluteShareUrl(`${window.location.origin}${shareLink}`);
  }, [shareLink]);

  const qrShareUrl = useMemo(() => {
    const base = absoluteShareUrl || shareLink;
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}src=qr`;
  }, [absoluteShareUrl, shareLink]);

  const qrImageSrc = useMemo(() => `/api/contact-exchange/qr?data=${encodeURIComponent(qrShareUrl)}`, [qrShareUrl]);

  const handleCopyShareLink = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(absoluteShareUrl || shareLink);
  };

  const handleNativeVCardShare = async () => {
    const url = absoluteShareUrl || shareLink;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${profileDisplayName} · SETU Flow`,
          text: `${profileDisplayName} · ${organization?.name ?? 'SETU Flow'}`,
          url,
        });
        return;
      } catch {
        // User cancelled or the platform rejected the share. Fall back to copy.
      }
    }
    await handleCopyShareLink();
  };


  const profileDisplayName = profile?.full_name ?? profile?.username ?? 'SETU Flow user';
  const profileEmail = profile?.email ?? 'Signed in via Supabase';
  const profileInitials = getInitials(profileDisplayName);

  const ProfileMenu = ({ compact = false }: { compact?: boolean }) => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setProfileMenuOpen((value) => !value)}
        className={cn(
          "flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] font-semibold text-white ring-1 ring-white/20 transition hover:scale-[1.02]",
          compact ? "h-10 w-10 text-xs" : "h-11 w-11 text-sm shadow-soft",
        )}
        aria-label="Open profile menu"
        aria-expanded={profileMenuOpen}
      >
        {profileInitials}
      </button>
      {profileMenuOpen ? (
        <div className={cn("absolute right-0 z-[90] mt-2 w-72 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white text-left shadow-[0_28px_70px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/5", compact && "right-[-4px]")}>
          <div className="bg-[linear-gradient(135deg,#061c2e_0%,#0b2e4a_70%,#0c7fff_150%)] px-4 py-4 text-white">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-bold ring-1 ring-white/20">{profileInitials}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{profileDisplayName}</p><p className="mt-0.5 truncate text-xs text-white/65">{profileEmail}</p></div></div>
            <div className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">{getWorkspaceRoleDisplayName(currentRole)} · {organization?.name ?? 'SETU Flow'}</div>
          </div>
          <div className="p-2">
            <a href={PRODUCT_ROUTES.app.myCard} onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><FaIcon icon="user-o" fixedWidth className="text-[#1F487C]" /><span>Profile</span></a>
            <a href={PRODUCT_ROUTES.app.myCard} onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><FaIcon icon="cog" fixedWidth className="text-[#1F487C]" /><span>Settings</span></a>
            <button type="button" onClick={() => { setProfileMenuOpen(false); setVcardModalOpen(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><FaIcon icon="address-card-o" fixedWidth className="text-[#1F487C]" /><span>Share my vCard</span></button>
            <div className="my-2 border-t border-slate-100" />
            <form action="/api/logout" method="post"><button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50"><FaIcon icon="sign-out" fixedWidth /><span>Sign out</span></button></form>
          </div>
        </div>
      ) : null}
    </div>
  );

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
          {profileInitials}
        </div>
      </div>
    </>
  );

  return (
    <>
      {shouldUseCanonicalMobileShell ? (
        <div className="md:hidden">
          <MobileShell signedIn={signedInForMobile} canonical>
            {children}
          </MobileShell>
        </div>
      ) : null}
      <div className={cn(
        "setu-mobile-shell min-h-screen overflow-x-clip bg-[#f0f4f8] md:bg-[radial-gradient(circle_at_top_left,rgba(12,127,255,0.12),transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_48%,#f8fafc_100%)]",
        shouldUseCanonicalMobileShell ? "hidden md:block" : undefined,
      )}>
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900"
      >
        Skip to content
      </a>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
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

      {shellNotice ? <NoticeToast key={noticeParam ?? shellNotice.title} title={shellNotice.title} description={shellNotice.description} tone={shellNotice.tone ?? 'neutral'} /> : null}

      {helpOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setHelpOpen(false);
          }}
        >
          <section className="w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">SETU Flow help</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{shellHelp.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{shellHelp.intro}</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Close help">×</button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 py-5">
              {shellHelp.sections.map((section) => (
                <div key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="text-sm font-bold text-slate-950">{section.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{section.body}</p>
                </div>
              ))}
            </div>
          </section>
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
              <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-[linear-gradient(135deg,#0c7fff,#38bdf8)] text-lg font-bold shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt={profileDisplayName} className="h-full w-full object-cover" /> : profileInitials}
              </div>
              <p className="text-xl font-semibold tracking-tight">{profile?.full_name ?? profile?.username ?? 'SETU Flow user'}</p>
              <p className="mt-1 text-sm text-white/70">{getWorkspaceRoleDisplayName(currentRole)} · {organization?.name ?? 'SETU Flow'}</p>
              <p className="mt-2 text-xs text-white/55">{profile?.email ?? 'Signed in via Supabase'}</p>
              {cardSettings?.primaryPhone ? <p className="mt-1 text-xs font-medium text-white/72">{cardSettings.primaryPhone}</p> : null}
            </div>
            <div className="px-7 py-6">
              <div className="mb-5 flex flex-col items-center">
                <div className="flex h-[124px] w-[124px] items-center justify-center rounded-[1rem] border border-slate-200 bg-slate-50 p-2 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
                  <img
                    src={qrImageSrc}
                    alt="QR code for digital vCard share"
                    className="h-full w-full rounded-[0.75rem] bg-white p-1"
                    loading="eager"
                  />
                </div>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Scan to open card</p>
              </div>
              <div className="space-y-2.5">
                {cardSettings?.primaryPhone ? (
                  <a href={`tel:${cardSettings.primaryPhone}`} className="flex items-center gap-3 rounded-[0.9rem] border border-[#359F91]/20 bg-[#eefaf7] px-4 py-3 text-sm font-semibold text-[#0f766e] hover:bg-[#ddf7f1]">
                    <span>☏</span>
                    <span>{cardSettings.primaryPhone}</span>
                  </a>
                ) : null}
                <a href={downloadVcfHref} download className="flex items-center gap-3 rounded-[0.9rem] bg-[#0b2e4a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#061c2e]">
                  <span>⬇</span>
                  <span>Save contact</span>
                </a>
                <button type="button" onClick={handleCopyShareLink} className="flex w-full items-center gap-3 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <span>🔗</span>
                  <span>Copy link</span>
                </button>
                <button type="button" onClick={handleNativeVCardShare} className="flex w-full items-center gap-3 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <span>↗</span>
                  <span>Share card</span>
                </button>
                <a href={`mailto:?subject=${encodeURIComponent('My SETU Flow vCard')}&body=${encodeURIComponent(absoluteShareUrl || shareLink)}`} className="flex items-center gap-3 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <span>✉</span>
                  <span>Send email</span>
                </a>
                <div className="grid grid-cols-2 gap-2" aria-label="Wallet actions">
                  <a href={`/api/public/apple-wallet?url=${encodeURIComponent(absoluteShareUrl || shareLink)}&name=${encodeURIComponent(profileDisplayName)}`} className="flex h-12 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white p-2 hover:bg-slate-50" aria-label="Add to Apple Wallet" title="Add to Apple Wallet"><img src="/marketing/apple-wallet-icon.png" alt="Apple Wallet" className="h-8 w-8 object-contain" /></a>
                  <a href={`/api/public/google-wallet?url=${encodeURIComponent(absoluteShareUrl || shareLink)}&name=${encodeURIComponent(profileDisplayName)}`} className="flex h-12 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white p-2 hover:bg-slate-50" aria-label="Add to Google Wallet" title="Add to Google Wallet"><img src="/marketing/google-wallet-icon.png" alt="Google Wallet" className="h-8 w-8 object-contain" /></a>
                </div>
                <a href={PRODUCT_ROUTES.app.myCard} className="flex items-center justify-center gap-2 rounded-[0.9rem] px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">
                  <span>⚙</span>
                  <span>Edit settings</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid min-h-screen grid-cols-1 gap-0 px-0 md:grid-cols-[72px_minmax(0,1fr)] md:px-4 md:py-4 xl:px-5">
        <aside className="hidden flex-col rounded-[2rem] border border-[#d9e2ec] bg-[linear-gradient(180deg,#061c2e_0%,#0b2e4a_100%)] px-2 py-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:sticky md:top-4 md:flex md:h-[calc(100vh-2rem)] md:overflow-y-auto">
          {sidebar}
        </aside>

        <main id="app-content" className="relative mx-auto min-w-0 max-w-[430px] overflow-x-clip md:mx-0 md:max-w-none md:pl-5 xl:pl-6">
          <div className="min-h-screen md:rounded-[2rem] md:border md:border-white/80 md:bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,255,0.98))] md:shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:ring-1 lg:ring-slate-950/[0.03]">
            <header className="setu-mobile-header sticky top-0 z-40">
              {/* ── MOBILE TOP BAR (navy, reference-HTML style) ── */}
              <div className="flex h-14 items-center justify-between bg-[#0b2e4a] px-4 shadow-[0_1px_8px_rgba(0,0,0,0.2)] md:hidden">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-white/85 text-lg"
                    aria-label="Open navigation"
                    aria-expanded={mobileNavOpen}
                  >
                    ☰
                  </button>
                  <div className="min-w-0">
                    <h1 className="truncate text-[15px] font-extrabold leading-tight tracking-[-0.3px] text-white">
                      {routeMeta.title}
                    </h1>
                    {topbarDate ? (
                      <p className="text-[10px] text-white/60 leading-none mt-0.5">{topbarDate}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <OfflineIndicator />
                  <button
                    type="button"
                    onClick={() => setVcardModalOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/10 text-white/85 text-[18px]"
                    aria-label="Share my vCard"
                    title="Share my vCard"
                  >
                    📇
                  </button>
                  <button
                    type="button"
                    onClick={() => setHelpOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/10 text-white/85 text-sm font-black"
                    aria-label={`Open help for ${routeMeta.title}`}
                    title="Help"
                  >
                    ?
                  </button>
                  <ProfileMenu compact />
                </div>
              </div>

              {/* ── DESKTOP HEADER (white, all controls) ── */}
              <div className="hidden border-b border-slate-200 bg-white/95 backdrop-blur md:block md:rounded-t-[2rem]">
                <div className="px-7 py-3.5 xl:px-9">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0c7fff]">Trade Command Center</p>
                      <h1 className="truncate text-2xl font-semibold text-slate-950">
                        {routeMeta.title}
                        {routeMeta.title === 'Dashboard' && topbarDate ? (
                          <span className="ml-2 text-sm font-normal text-slate-400">— {topbarDate}</span>
                        ) : null}
                      </h1>
                      {routeMeta.title !== 'Dashboard' && topbarDate ? (
                        <p className="mt-1 text-xs text-slate-500">{topbarDate}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <OfflineIndicator />
                      <button
                        type="button"
                        onClick={() => setVcardModalOpen(true)}
                        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[0.9rem] bg-[linear-gradient(135deg,#0b2e4a_0%,#0c7fff_160%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,127,255,0.3)] hover:opacity-95"
                      >
                        <FaIcon icon="address-card-o" fixedWidth className="text-sm" />
                        <span>Share my vCard</span>
                      </button>

                      {showWorkspaceModeSwitch ? (
                        <div className="inline-flex shrink-0 items-center rounded-[0.9rem] border border-slate-200 bg-slate-100 p-1">
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

                      <button type="button" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[0.9rem] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <FaIcon icon="sliders" fixedWidth className="text-sm" />
                        <span>Filters</span>
                      </button>

                      <a href={(() => { const base = withWorkspaceMode(PRODUCT_ROUTES.app.leads, workspaceMode); return base.includes('?') ? `${base}&quickLead=1` : `${base}?quickLead=1`; })()} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[0.9rem] border border-[#0b2e4a] bg-[#0b2e4a] px-4 text-sm font-semibold text-white hover:bg-[#061c2e]">
                        <span>＋</span>
                        <span>Quick Lead</span>
                      </a>

                      <a href={pathname.startsWith('/trade-events') ? '/admin/trade-events' : '/trade-events'} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[0.9rem] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" title={pathname.startsWith('/trade-events') ? 'Add event' : 'Trade events'}>
                        <FaIcon icon="calendar" fixedWidth className="text-sm" />
                        <span>{pathname.startsWith('/trade-events') ? 'Add Event' : 'Events'}</span>
                      </a>

                      <button type="button" onClick={() => setHelpOpen(true)} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[0.9rem] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label={`Open help for ${routeMeta.title}`}>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[11px] font-black text-white">?</span>
                        <span>Help</span>
                      </button>

                      <ProfileMenu />
                    </div>
                  </div>
                </div>
              </div>
            </header>
            <div className="setu-mobile-content relative px-4 py-5 pb-[calc(80px+env(safe-area-inset-bottom))] sm:px-6 md:px-7 md:pb-8 xl:px-8">
              {isDesktopOnlyRoute ? <DesktopRedirect /> : null}
              <div className={isDesktopOnlyRoute ? 'hidden md:block' : undefined}>{children}</div>
            </div>
          </div>
        </main>
      </div>
      <a href={(() => { const base = withWorkspaceMode(PRODUCT_ROUTES.app.leads, workspaceMode); return base.includes('?') ? `${base}&quickLead=1` : `${base}?quickLead=1`; })()} aria-label="Quick Lead" className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-[300] flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#0c7fff] text-2xl font-semibold text-white shadow-[0_4px_16px_rgba(12,127,255,0.42)] md:hidden">＋</a>
      <MobileTabBar />
      </div>
    </>
  );
}
