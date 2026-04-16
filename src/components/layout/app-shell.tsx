// UPDATED FILE
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppLogo } from '@/components/branding/app-logo';
import { FaIcon } from '@/components/ui/fa-icon';
import { cn, getInitials } from '@/lib/utils';
import { PRODUCT_ROUTES, PRODUCT_SHELL_LABELS, primaryAppShellNav } from '@/lib/product-contract';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName, normalizeWorkspaceRoles } from '@/lib/workspace/roles';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'] | null;
type Organization = Database['public']['Tables']['organizations']['Row'] | null;
type Membership = Database['public']['Tables']['organization_members']['Row'] | null;

type NavItem = { href: string; label: string; exact?: boolean };
type NavSection = { id: string; label: string; icon: string; items: NavItem[] };
type ContextTab = { href: string; label: string; exact?: boolean };

type RouteMeta = {
  title: string;
  description: string;
  tabs?: ContextTab[];
  backHref?: string;
  backLabel?: string;
};

type CommandItem = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  group: string;
  action: () => void;
};

type ShortcutDefinition = {
  keys: string[];
  description: string;
};

const PRODUCT_SHELL_TABS: ContextTab[] = primaryAppShellNav.map((item) => ({ href: item.href, label: item.label, exact: item.exact }));

const ADMIN_TABS: ContextTab[] = [
  { href: '/admin/organization', label: 'Organization', exact: true },
  { href: '/admin/users', label: 'Users', exact: true },
  { href: '/admin/invitations', label: 'Invitations', exact: true },
  { href: '/admin/audit', label: 'Audit log', exact: true },
  { href: '/admin/ai-analytics', label: 'AI analytics', exact: true },
];

const navSections: NavSection[] = [
  {
    id: 'product-shell',
    label: PRODUCT_SHELL_LABELS.productShell,
    icon: '◫',
    items: primaryAppShellNav.map((item) => ({ href: item.href, label: item.label, exact: item.exact })),
  },
];

const adminSection: NavSection = {
  id: 'admin',
  label: 'Admin',
  icon: 'A',
  items: [
    { href: '/admin/organization', label: 'Organization' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/invitations', label: 'Invitations' },
    { href: '/admin/audit', label: 'Audit log' },
    { href: '/admin/ai-analytics', label: 'AI analytics' },
  ],
};

function isNavItemActive(pathname: string, item: NavItem | ContextTab) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getPrimaryRole(roleNames: string[]) {
  return getPrimaryWorkspaceRole(roleNames) ?? 'member';
}

function toRoleLabel(value: string) {
  return getWorkspaceRoleDisplayName(value);
}

function getSectionIcon(icon: string) {
  const map: Record<string, string> = {
    '◫': 'th-large',
    B: 'briefcase',
    S: 'truck',
    O: 'cogs',
    C: 'address-card-o',
    A: 'building-o',
  };
  return map[icon] ?? 'circle-o';
}

function getNavItemIcon(href: string) {
  if (href.includes(PRODUCT_ROUTES.app.dashboard)) return 'dashboard';
  if (href.includes(PRODUCT_ROUTES.app.leads)) return 'users';
  if (href.includes(PRODUCT_ROUTES.app.quotes)) return 'file-text-o';
  if (href.includes(PRODUCT_ROUTES.app.orders)) return 'shopping-bag';
  if (href.includes('/admin/users')) return 'building-o';
  if (href.includes('/pipeline')) return 'random';
  if (href.includes('/products')) return 'archive';
  if (href.includes('/documents')) return 'file-text-o';
  if (href.includes('/trade-events')) return 'calendar';
  if (href.includes('/tasks')) return 'check-square-o';
  if (href.includes('/contact-exchange/vcard')) return 'address-card-o';
  if (href.includes('/contact-exchange/scan')) return 'camera';
  if (href.includes('/contracts')) return 'file-text';
  if (href.includes('/compliance')) return 'shield';
  if (href.includes('/settings')) return 'sliders';
  if (href.includes('/integrations')) return 'plug';
  if (href.includes('/ai-suggestions')) return 'magic';
  if (href.includes('/admin/organization')) return 'building-o';
  if (href.includes('/admin/users')) return 'user-circle-o';
  if (href.includes('/admin/invitations')) return 'envelope-open-o';
  if (href.includes('/admin/audit')) return 'history';
  if (href.includes('/admin/ai-analytics')) return 'line-chart';
  return 'circle-o';
}

function formatShortcutLabel(keys: string[]) {
  return keys.join(' ');
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.getAttribute('role') === 'textbox'
  );
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function matchesCommand(command: CommandItem, query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const haystack = [
    command.label,
    command.description,
    command.group,
    ...command.keywords,
  ]
    .join(' ')
    .toLowerCase();

  return normalizedQuery.split(/\s+/).every((token) => haystack.includes(token));
}

function getRouteMeta(pathname: string): RouteMeta {
  if (pathname.startsWith('/admin/')) {
    return {
      title: pathname.startsWith('/admin/invitations')
        ? 'Invitations'
        : pathname.startsWith('/admin/audit')
          ? 'Audit log'
          : pathname.startsWith('/admin/ai-analytics')
            ? 'AI analytics'
            : pathname.startsWith('/admin/organization')
            ? 'Organization'
            : 'Users',
      description:
        'Manage organization overview, workspace access, invitations, and audit visibility without leaving the admin area.',
      tabs: ADMIN_TABS,
    };
  }

  if (pathname === '/contracts' || pathname.startsWith('/contracts/')) {
    return {
      title: 'Contracts',
      description: 'Track signed commitments, linked quotes, files, and open blockers from one progression desk.',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.dashboard || pathname.startsWith(`${PRODUCT_ROUTES.app.dashboard}/`)) {
    return {
      title: 'Dashboard',
      description:
        'Get to the most important buyer and supplier metrics first, then move into focused operating lanes.',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.leads || pathname.startsWith(`${PRODUCT_ROUTES.app.leads}/`)) {
    if (/^\/leads\/[^/]+\/quote/.test(pathname)) {
      return {
        title: 'Quotes',
        description:
          'Review commercial output, approvals, and pricing details for this lead.',
        backHref: pathname.replace(/\/quote.*/, ''),
        backLabel: 'Back to lead profile',
      };
    }
    if (/^\/leads\/[^/]+\/rfq/.test(pathname)) {
      return {
        title: 'RFQs',
        description:
          'Create and manage RFQs for the selected lead without leaving the workflow.',
        backHref: pathname.replace(/\/rfq.*/, ''),
        backLabel: 'Back to lead profile',
      };
    }
    if (/^\/leads\/[^/]+$/.test(pathname)) {
      return {
        title: 'Lead profile',
        description:
          'Stay inside one lead context for stage movement, follow-ups, RFQs, quotes, and activity history.',
        tabs: PRODUCT_SHELL_TABS,
        backHref: PRODUCT_ROUTES.app.leads,
        backLabel: 'Back to leads',
      };
    }
    return {
      title: 'Leads',
      description:
        'Find the right lead quickly, act in bulk when needed, and open existing leads in the command center route.',
      tabs: PRODUCT_SHELL_TABS,
    };
  }


  if (pathname === PRODUCT_ROUTES.app.quotes || pathname.startsWith(`${PRODUCT_ROUTES.app.quotes}/`)) {
    return {
      title: 'Quotes',
      description:
        'Review commercial fit, confirm approval state, and move into order creation only when the gate is clear.',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.orders || pathname.startsWith(`${PRODUCT_ROUTES.app.orders}/`)) {
    return {
      title: 'Orders',
      description:
        'Carry accepted commercial truth into operational readiness without hiding blockers or required follow-through.',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === '/pipeline' || pathname.startsWith('/pipeline/')) {
    return {
      title: 'Pipeline',
      description:
        'Keep stage movement visible, actionable, and easy to scan across the full workspace.',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname.startsWith('/products')) {
    return {
      title: 'Products',
      description: 'Manage shared commercial reference data for daily execution.',

    };
  }

  if (pathname.startsWith('/trade-events')) {
    return {
      title: 'Trade events',
      description: 'Maintain trade event records used across lead and pipeline workflows.',

    };
  }

  if (pathname.startsWith('/settings/lists')) {
    return {
      title: 'Settings lists',
      description: 'Update shared option lists that power forms throughout the app.',

    };
  }

  if (pathname.startsWith('/integrations')) {
    return {
      title: 'Integrations',
      description: 'Review external systems connected to this workspace.',

    };
  }

  if (pathname.startsWith('/ai-suggestions')) {
    return {
      title: 'AI assist',
      description: 'Review explainable summaries and next-best-action suggestions anchored to workspace data.',

    };
  }

  if (pathname.startsWith('/contact-exchange/vcard')) {
    return {
      title: 'My Digital vCard',
      description: 'Share your professional contact identity through one review-first surface before QR, link, and VCF automation ships.',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname.startsWith('/contact-exchange/scan')) {
    return {
      title: 'Scan Contact Info',
      description: 'Capture inbound contact details through one AI-assisted review surface without forcing save automation yet.',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname.startsWith('/tasks')) {
    return {
      title: 'Tasks',
      description: 'Track outstanding work tied to the commercial operating flow.',

    };
  }

  if (pathname.startsWith('/documents')) {
    return {
      title: 'Documents',
      description: 'Review deal-linked files, version posture, expiry, and approvals without leaving the operations lane.',

    };
  }

  if (pathname.startsWith('/compliance')) {
    return {
      title: 'Compliance',
      description: 'Keep required compliance tasks, reviews, and lead blockers visible alongside commercial work.',

    };
  }

  return {
    title: 'Workspace',
    description: 'Operate daily work from a cleaner, more consistent application shell.',
  };
}

function getWorkspaceModeFromLocation(_pathname: string, _modeParam: string | null) {
  return 'all' as const;
}

function getWorkspaceBasePath(pathname: string) {
  if (pathname.startsWith(PRODUCT_ROUTES.app.dashboard)) return PRODUCT_ROUTES.app.dashboard;
  if (pathname.startsWith(PRODUCT_ROUTES.app.leads)) return PRODUCT_ROUTES.app.leads;
  return null;
}

function withWorkspaceMode(href: string, _mode: 'all' | 'buyers' | 'suppliers') {
  return href;
}

function withWorkspaceModePreservedParams(
  href: string,
  _mode: 'all' | 'buyers' | 'suppliers',
  _currentParams?: string,
) {
  return href;
}

function ShellNavigation({
  pathname,
  canAccessAdmin,
  workspaceMode,
  compact = false,
  onNavigate,
}: {
  pathname: string;
  canAccessAdmin: boolean;
  workspaceMode: 'all' | 'buyers' | 'suppliers';
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const sections = canAccessAdmin ? [...navSections, adminSection] : navSections;
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      sections.map((section) => [
        section.id,
        compact ? section.items.some((item) => isNavItemActive(pathname, item)) : true,
      ]),
    ),
  );

  useEffect(() => {
    setExpandedSections((current) => {
      const next = { ...current };
      sections.forEach((section) => {
        if (!(section.id in next)) {
          next[section.id] = compact ? section.items.some((item) => isNavItemActive(pathname, item)) : true;
        }
        if (section.items.some((item) => isNavItemActive(pathname, item))) {
          next[section.id] = true;
        }
      });
      return next;
    });
  }, [compact, pathname, sections]);

  return (
    <nav className={cn('mt-6', compact ? 'space-y-3' : 'space-y-4')} aria-label="Primary navigation">
      {sections.map((section) => {
        const isExpanded = expandedSections[section.id] ?? true;
        return (
          <div key={section.id} className="rounded-[1.6rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,252,0.96))] p-2 shadow-[0_18px_38px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.03]">
            <button
              type="button"
              onClick={() => setExpandedSections((current) => ({ ...current, [section.id]: !isExpanded }))}
              className={cn(
                'flex w-full items-center rounded-[1.2rem] px-3 py-2 text-left transition duration-200 hover:bg-white/80',
                compact ? 'justify-center' : 'justify-between gap-3',
              )}
              aria-expanded={isExpanded}
            >
              <div className={cn('flex items-center gap-3', compact ? 'justify-center' : '')}>
                <span className="flex h-9 w-9 items-center justify-center rounded-[1rem] border border-white/90 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.98),rgba(224,231,255,0.98)_42%,rgba(191,219,254,0.92)_78%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(237,242,250,0.95))] text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_14px_28px_rgba(15,23,42,0.12)]">
                  <FaIcon icon={getSectionIcon(section.icon)} fixedWidth className="text-sm" />
                </span>
                {!compact ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section.label}</p>
                  </div>
                ) : null}
              </div>
              {!compact ? <FaIcon icon={isExpanded ? 'minus' : 'plus'} fixedWidth className="text-xs text-slate-400" /> : null}
            </button>

            {isExpanded ? (
              <div className={cn('mt-2 space-y-1.5', compact ? 'px-0' : 'px-1')}>
                {section.items.map((item) => {
                  const active = isNavItemActive(pathname, item);
                  return (
                    <a
                      key={item.href}
                      href={withWorkspaceMode(item.href, workspaceMode)}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      title={compact ? item.label : undefined}
                      className={cn(
                        'group flex items-center rounded-[1.2rem] text-sm font-medium transition focus:outline-none',
                        compact ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3',
                        active
                          ? 'bg-[linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] text-white shadow-[0_18px_38px_rgba(15,23,42,0.22)] ring-1 ring-white/10'
                          : 'text-slate-600 hover:bg-white/85 hover:text-slate-900',
                      )}
                    >
                      {compact ? (
                        <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                      ) : (
                        <>
                          <span className="flex items-center gap-3">
                            <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-xl border transition', active ? 'border-white/15 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),rgba(255,255,255,0.06)_38%,rgba(255,255,255,0.04)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' : 'border-white/90 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.98),rgba(219,234,254,0.98)_44%,rgba(191,219,254,0.92)_82%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_26px_rgba(15,23,42,0.08)] group-hover:border-sky-200 group-hover:text-slate-900') }>
                              <FaIcon icon={getNavItemIcon(item.href)} fixedWidth className="text-sm" />
                            </span>
                            <span>{item.label}</span>
                          </span>
                          <FaIcon
                            icon="angle-right"
                            fixedWidth
                            className={cn('text-xs transition', active ? 'text-white/70' : 'text-slate-300 group-hover:text-slate-500')}
                          />
                        </>
                      )}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

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
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const chordRef = useRef<{ key: string; startedAt: number } | null>(null);
  const normalizedCurrentRoles = useMemo(() => normalizeWorkspaceRoles(currentRoles), [currentRoles]);
  const currentRole = useMemo(() => getPrimaryRole(normalizedCurrentRoles), [normalizedCurrentRoles]);
  const canAccessAdmin = normalizedCurrentRoles.includes('owner') || normalizedCurrentRoles.includes('admin');
  const routeMeta = getRouteMeta(pathname);
  const workspaceMode = getWorkspaceModeFromLocation(pathname, searchParams.get('mode'));
  const workspaceBasePath = getWorkspaceBasePath(pathname);
  const showWorkspaceModeSwitch = false;
  const currentWorkspaceModeHref = (mode: 'all' | 'buyers' | 'suppliers') => {
    if (!workspaceBasePath) return pathname;
    return withWorkspaceModePreservedParams(workspaceBasePath, mode, searchParams.toString());
  };
  const navCommandSections = canAccessAdmin ? [...navSections, adminSection] : navSections;

  const openCommandPalette = () => {
    setMobileNavOpen(false);
    setShortcutsOpen(false);
    setCommandPaletteOpen(true);
  };

  const closeCommandPalette = () => {
    setCommandPaletteOpen(false);
    setCommandQuery('');
  };

  const commandItems = useMemo<CommandItem[]>(() => {
    const seen = new Set<string>();
    const items: CommandItem[] = [];

    navCommandSections.forEach((section) => {
      section.items.forEach((item) => {
        const key = `${section.label}:${item.href}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
          id: key,
          label: item.label,
          description: `Open ${item.label}`,
          keywords: [item.href, section.label, item.label.toLowerCase()],
          group: section.label,
          action: () => router.push(withWorkspaceMode(item.href, workspaceMode)),
        });
      });
    });

    if (routeMeta.backHref) {
      items.push({
        id: `back:${routeMeta.backHref}`,
        label: routeMeta.backLabel ?? 'Back',
        description: 'Return to the previous workspace context',
        keywords: ['back', 'return', routeMeta.backHref],
        group: 'Navigation',
        action: () => router.push(routeMeta.backHref!),
      });
    }

    items.push({
      id: 'action:share-card',
      label: 'Share my card',
      description: 'Open My Card settings, QR share, and public digital vCard actions',
      keywords: ['my card', 'vcard', 'share card', 'qr', 'contact exchange'],
      group: 'Actions',
      action: () => router.push(PRODUCT_ROUTES.workspace.myCard),
    });

    items.push({
      id: 'action:shortcuts',
      label: 'Open keyboard shortcuts',
      description: 'Review available navigation and productivity shortcuts',
      keywords: ['keyboard', 'shortcuts', 'help', 'hotkeys'],
      group: 'Actions',
      action: () => setShortcutsOpen(true),
    });

    return items;
  }, [navCommandSections, routeMeta.backHref, routeMeta.backLabel, router]);

  const filteredCommandItems = useMemo(
    () => commandItems.filter((item) => matchesCommand(item, commandQuery)),
    [commandItems, commandQuery],
  );

  const commandGroups = useMemo(() => {
    const grouped = new Map<string, CommandItem[]>();
    filteredCommandItems.forEach((item) => {
      grouped.set(item.group, [...(grouped.get(item.group) ?? []), item]);
    });
    return Array.from(grouped.entries());
  }, [filteredCommandItems]);

  const shortcutDefinitions = useMemo<ShortcutDefinition[]>(
    () => [
      { keys: ['Ctrl', 'K'], description: 'Open the command palette' },
      { keys: ['Cmd', 'K'], description: 'Open the command palette on macOS' },
      { keys: ['Ctrl', '/'], description: 'Open keyboard shortcuts' },
      { keys: ['Cmd', '/'], description: 'Open keyboard shortcuts on macOS' },
      { keys: ['G', 'D'], description: 'Go to dashboard' },
      { keys: ['G', 'L'], description: 'Go to leads' },
      { keys: ['G', 'P'], description: 'Go to pipeline' },
      { keys: ['G', 'O'], description: 'Go to products' },
      ...(canAccessAdmin
        ? [{ keys: ['G', 'A'], description: 'Go to admin users' }]
        : []),
      { keys: ['Esc'], description: 'Close the palette, shortcuts, or mobile navigation' },
    ],
    [canAccessAdmin],
  );

  useEffect(() => {
    if (!commandPaletteOpen) return;
    commandInputRef.current?.focus();
  }, [commandPaletteOpen]);

  useEffect(() => {
    const runChordNavigation = (key: string) => {
      if (key === 'd') router.push(PRODUCT_ROUTES.app.dashboard);
      if (key === 'l') router.push(PRODUCT_ROUTES.app.leads);
      if (key === 'p') router.push('/pipeline');
      if (key === 'o') router.push('/products');
      if (key === 'a' && canAccessAdmin) router.push('/admin/users');
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const typing = isTypingTarget(event.target);

      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        openCommandPalette();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === '/') {
        event.preventDefault();
        setMobileNavOpen(false);
        setCommandPaletteOpen(false);
        setShortcutsOpen(true);
        return;
      }

      if (event.key === 'Escape') {
        setMobileNavOpen(false);
        setShortcutsOpen(false);
        closeCommandPalette();
        chordRef.current = null;
        return;
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const now = Date.now();
      if (key === 'g') {
        chordRef.current = { key: 'g', startedAt: now };
        return;
      }

      if (chordRef.current?.key === 'g' && now - chordRef.current.startedAt < 1200) {
        if (['d', 'l', 'p', 'o', 'a'].includes(key)) {
          event.preventDefault();
          setMobileNavOpen(false);
          setShortcutsOpen(false);
          closeCommandPalette();
          runChordNavigation(key);
        }
      }

      chordRef.current = null;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canAccessAdmin, router]);

  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,rgba(12,127,255,0.14),transparent_22%),radial-gradient(circle_at_top_right,rgba(11,46,74,0.10),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_48%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.34),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#020617_100%)]">
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 dark:focus:bg-slate-900 dark:focus:text-slate-50"
      >
        Skip to content
      </a>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" aria-hidden="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[90vw] max-w-sm overflow-y-auto border-r border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.96))] px-5 py-6 shadow-2xl backdrop-blur dark:border-slate-700/70 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.95))]">
            <AppLogo />
            <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/50 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_135%)] p-5 text-white shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Current workspace</p>
              <p className="mt-3 text-lg font-semibold">{organization?.name ?? 'SETU Flow'}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/85">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                  {toRoleLabel(currentRole)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Daily workspace</span>
              </div>
            </div>
            <ShellNavigation
              pathname={pathname}
              canAccessAdmin={canAccessAdmin}
              workspaceMode={workspaceMode}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      {commandPaletteOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/50 px-4 py-12 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close command palette"
            onClick={closeCommandPalette}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative z-[81] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 shadow-2xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95"
          >
            <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/70 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Command palette
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Ctrl/Cmd + K
                </span>
              </div>
              <input
                ref={commandInputRef}
                type="text"
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Search pages and actions..."
                className="mt-4 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
              />
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-3 py-3 sm:px-4">
              {commandGroups.length ? (
                <div className="space-y-4">
                  {commandGroups.map(([groupLabel, items]) => (
                    <div key={groupLabel}>
                      <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {groupLabel}
                      </p>
                      <div className="mt-2 space-y-1">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              item.action();
                              closeCommandPalette();
                            }}
                            className="flex w-full items-start justify-between gap-4 rounded-[1.35rem] px-3 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{item.label}</p>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.description}</p>
                            </div>
                            <span className="mt-0.5 text-xs text-slate-400">↵</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">No matching commands</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Try searching for dashboard, leads, products, admin, or shortcuts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {shortcutsOpen ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close keyboard shortcuts"
            onClick={() => setShortcutsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="relative z-[76] w-full max-w-2xl rounded-[2rem] border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Keyboard shortcuts
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  Faster workspace navigation
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Use these shortcuts outside form inputs to move through SETU Flow without
                  leaving the current workspace shell.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="rounded-[1.15rem] border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {shortcutDefinitions.map((shortcut) => (
                <div
                  key={`${shortcut.keys.join('-')}-${shortcut.description}`}
                  className="flex items-center justify-between gap-4 rounded-[1.35rem] border border-slate-200/90 bg-slate-50/60 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-800/70"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-300">{shortcut.description}</p>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {formatShortcutLabel(shortcut.keys)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'mx-auto grid min-h-screen max-w-[1820px] grid-cols-1 gap-0 px-0 lg:px-5 lg:py-5',
          sidebarCollapsed ? 'lg:grid-cols-[96px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]',
        )}
      >
        <aside
          className={cn(
            'hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(244,247,252,0.96))] py-5 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/[0.03] lg:sticky lg:top-5 lg:block lg:h-[calc(100vh-2.5rem)] lg:overflow-y-auto',
            sidebarCollapsed ? 'px-3' : 'px-4',
          )}
          aria-label="Sidebar"
        >
          <div className={cn('flex items-center justify-between gap-3', sidebarCollapsed ? 'flex-col' : '')}>
            <AppLogo />
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="hidden h-10 w-10 items-center justify-center rounded-[1rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:bg-white lg:inline-flex"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '»' : '«'}
            </button>
          </div>

          <div className={cn('mt-6 overflow-hidden rounded-[1.75rem] border border-white/85 bg-[radial-gradient(circle_at_top_right,rgba(12,127,255,0.10),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,252,0.98))] text-slate-900 shadow-[0_18px_36px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.03] dark:border-slate-700/70 dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))] dark:text-slate-50 dark:ring-white/[0.04] dark:shadow-[0_22px_42px_rgba(2,6,23,0.45)]', sidebarCollapsed ? 'px-3 py-4' : 'p-5')}>
            {!sidebarCollapsed ? <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Current workspace</p> : null}
            <p className={cn('font-semibold', sidebarCollapsed ? 'text-center text-sm' : 'mt-3 text-lg')}>
              {organization?.name ?? 'SETU Flow'}
            </p>
            <div className={cn('mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300', sidebarCollapsed ? 'justify-center' : '')}>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                {toRoleLabel(currentRole)}
              </span>
              {!sidebarCollapsed && membership ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Active member</span>
              ) : null}
            </div>
          </div>

          <ShellNavigation pathname={pathname} canAccessAdmin={canAccessAdmin} workspaceMode={workspaceMode} compact={sidebarCollapsed} />
        </aside>
        <main id="app-content" className="relative min-w-0 overflow-x-clip lg:pl-5">
          <div className="min-h-screen lg:rounded-[2rem] lg:border lg:border-white/80 lg:bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,255,0.98))] lg:shadow-[0_24px_70px_rgba(15,23,42,0.10)] lg:ring-1 lg:ring-slate-950/[0.03] dark:lg:border-slate-700/70 dark:lg:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))] dark:lg:ring-white/[0.04] dark:lg:shadow-[0_26px_80px_rgba(2,6,23,0.55)]">
            <header className="sticky top-0 z-40 border-b border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(247,250,255,0.95))] backdrop-blur dark:border-slate-700/70 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(15,23,42,0.94))] lg:rounded-t-[2rem]">
              <div className="px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4 xl:flex-nowrap">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileNavOpen(true)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
                      aria-label="Open navigation"
                      aria-expanded={mobileNavOpen}
                    >
                      <span aria-hidden="true">☰</span>
                    </button>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">SETU Flow workspace</p>
                      <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">{routeMeta.title}</h1>
                      <p className="hidden max-w-2xl text-sm text-slate-500 dark:text-slate-300 lg:block">{routeMeta.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-1 items-center justify-end gap-3 xl:max-w-[920px]">
                    <button
                      type="button"
                      onClick={openCommandPalette}
                      className="hidden h-12 flex-1 items-center justify-between rounded-[1.25rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,246,251,0.96))] px-4 text-left text-sm text-slate-500 shadow-[0_12px_28px_rgba(15,23,42,0.06)] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] dark:text-slate-300 dark:hover:bg-slate-800 lg:flex"
                      aria-label="Open command palette"
                    >
                      <span>Search pages and actions...</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-400 shadow-sm">Ctrl/Cmd + K</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(PRODUCT_ROUTES.workspace.myCard)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-[1rem] border border-brand-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] px-4 py-2 text-sm font-semibold text-brand-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] dark:text-sky-200 dark:hover:bg-slate-800"
                      aria-label="Share my card"
                      title="Share my card"
                    >
                      <FaIcon icon="address-card-o" fixedWidth className="text-sm" />
                      <span className="hidden xl:inline">Share card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortcutsOpen(true)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="Open shortcuts"
                      title="Shortcuts"
                    >
                      <FaIcon icon="sliders" fixedWidth className="text-sm" />
                    </button>
                    <div className="hidden text-right xl:block">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{profile?.full_name ?? profile?.username ?? 'User'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{profile?.email ?? 'Signed in via Supabase'}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] text-sm font-semibold text-white shadow-soft ring-1 ring-white/20">{getInitials(profile?.full_name ?? profile?.username)}</div>
                    <form action="/api/logout" method="post">
                      <button
                        type="submit"
                        aria-label="Sign out"
                        className="rounded-[1rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>

                {routeMeta.tabs?.length || routeMeta.backHref ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      {routeMeta.tabs?.map((tab) => {
                        const active = isNavItemActive(pathname, tab);
                        return (
                          <a
                            key={tab.href}
                            href={withWorkspaceMode(tab.href, workspaceMode)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                              active
                                ? 'border-slate-900/90 bg-[linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] dark:border-sky-400/20 dark:bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#38bdf8_160%)]'
                                : 'border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,246,251,0.96))] text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:border-brand-200 hover:bg-white dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] dark:text-slate-200 dark:hover:bg-slate-800',
                            )}
                          >
                            {tab.label}
                          </a>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {showWorkspaceModeSwitch ? (
                        <div className="inline-flex items-center rounded-[1.1rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,246,251,0.96))] p-1 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))]">
                          {(['all', 'buyers', 'suppliers'] as const).map((value) => {
                            const active = workspaceMode === value;
                            const targetHref = currentWorkspaceModeHref(value);
                            return (
                              <a
                                key={value}
                                href={targetHref}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                  'rounded-[0.9rem] px-3 py-2 text-sm font-medium transition',
                                  active
                                    ? 'bg-[linear-gradient(135deg,#0f172a_0%,#0b2e4a_55%,#0c7fff_130%)] text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50',
                                )}
                              >
                                {value === 'all' ? 'All' : value === 'buyers' ? 'Buyers' : 'Suppliers'}
                              </a>
                            );
                          })}
                        </div>
                      ) : null}
                      {routeMeta.backHref ? (
                        <a
                          href={routeMeta.backHref}
                          className="text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-sky-300 dark:hover:text-sky-200"
                        >
                          {routeMeta.backLabel ?? 'Back'}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </header>
            <div className="relative px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
