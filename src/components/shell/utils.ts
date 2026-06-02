import type { ContextTab, NavItem } from '@/components/shell/types';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export function isNavItemActive(pathname: string, item: NavItem | ContextTab) {
  if (item.exact) return pathname === item.href;
  // Sprint 17: /dashboard must be exact so /dashboard/analytics doesn't highlight Dash
  if (item.href === '/dashboard') return pathname === '/dashboard';
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getSectionIcon(icon: string) {
  const map: Record<string, string> = {
    '◫': 'th-large',
    B: 'briefcase',
    S: 'truck',
    O: 'cogs',
    C: 'address-card-o',
    A: 'building-o',
    exchange: 'exchange',
    shield: 'shield',
    database: 'database',
    wrench: 'wrench',
  };
  return map[icon] ?? icon ?? 'circle-o';
}

export function getNavItemIcon(href: string) {
  if (href.includes('/workspace')) return 'rocket';
  if (href.includes(PRODUCT_ROUTES.app.capture)) return 'camera';
  if (href.includes(PRODUCT_ROUTES.app.leads)) return 'users';
  if (href.includes(PRODUCT_ROUTES.app.quotes)) return 'file-text-o';
  if (href.includes(PRODUCT_ROUTES.app.integrations)) return 'paper-plane-o';
  if (href.includes(PRODUCT_ROUTES.app.orders)) return 'shopping-bag';
  if (href.includes('/pipeline')) return 'warning';
  if (href.includes(PRODUCT_ROUTES.app.products)) return 'archive';
  if (href.includes(PRODUCT_ROUTES.app.settings)) return 'sliders';
  if (href.includes('/dashboard/analytics')) return 'line-chart'; // Sprint 17: before generic /dashboard check
  if (href.includes(PRODUCT_ROUTES.app.dashboard)) return 'dashboard';
  if (href.includes('/trade-events')) return 'calendar';
  if (href.includes('/contact-exchange/vcard')) return 'address-card-o';
  if (href.includes('/admin/organization')) return 'building-o';
  if (href.includes('/admin/users')) return 'user-circle-o';
  if (href.includes('/admin/invitations')) return 'envelope-open-o';
  if (href.includes('/admin/audit')) return 'history';
  if (href.includes('/admin/ai-analytics')) return 'line-chart';
  if (href.includes('/documents')) return 'file-text-o';
  if (href.includes('/compliance')) return 'shield';
  if (href.includes('/contracts')) return 'file-text';
  if (href.includes('/tasks')) return 'check-square-o';
  if (href.includes('/ai-suggestions')) return 'magic';
  return 'circle-o';
}

export function getWorkspaceModeFromLocation(_pathname: string, modeParam: string | null) {
  if (modeParam === 'buyers' || modeParam === 'suppliers') return modeParam;
  return 'all' as const;
}

export function getWorkspaceBasePath(pathname: string) {
  if (!pathname.startsWith('/')) return null;
  const supportedRoots = [
    PRODUCT_ROUTES.app.dashboard,
    PRODUCT_ROUTES.app.capture,
    PRODUCT_ROUTES.app.leads,
    PRODUCT_ROUTES.app.quotes,
    PRODUCT_ROUTES.app.integrations,
    PRODUCT_ROUTES.app.orders,
    PRODUCT_ROUTES.app.pipeline,
    PRODUCT_ROUTES.app.products,
    PRODUCT_ROUTES.app.settings,
    PRODUCT_ROUTES.app.admin,
  ];
  const matched = supportedRoots.find((root) => pathname === root || pathname.startsWith(`${root}/`));
  return matched ?? pathname;
}

export function withWorkspaceMode(href: string, mode: 'all' | 'buyers' | 'suppliers') {
  const [base, hash] = href.split('#');
  const [pathname, query = ''] = base.split('?');
  const params = new URLSearchParams(query);
  if (mode === 'all') params.delete('mode');
  else params.set('mode', mode);
  const nextQuery = params.toString();
  return `${pathname}${nextQuery ? `?${nextQuery}` : ''}${hash ? `#${hash}` : ''}`;
}

export function withWorkspaceModePreservedParams(
  href: string,
  mode: 'all' | 'buyers' | 'suppliers',
  currentParams?: string,
) {
  const params = new URLSearchParams(currentParams ?? '');
  if (mode === 'all') params.delete('mode');
  else params.set('mode', mode);
  const nextQuery = params.toString();
  return `${href}${nextQuery ? `?${nextQuery}` : ''}`;
}

export function formatShortcutLabel(keys: string[]) {
  return keys.join(' ');
}

export function isTypingTarget(target: EventTarget | null) {
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

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}
