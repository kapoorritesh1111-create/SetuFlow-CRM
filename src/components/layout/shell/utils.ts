import type { ContextTab, NavItem } from '@/components/layout/shell/types';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export function isNavItemActive(pathname: string, item: NavItem | ContextTab) {
  if (item.exact) return pathname === item.href;
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
  };
  return map[icon] ?? 'circle-o';
}

export function getNavItemIcon(href: string) {
  if (href.includes(PRODUCT_ROUTES.app.dashboard)) return 'dashboard';
  if (href.includes(PRODUCT_ROUTES.app.leads)) return 'users';
  if (href.includes(PRODUCT_ROUTES.app.quotes)) return 'file-text-o';
  if (href.includes(PRODUCT_ROUTES.app.orders)) return 'shopping-bag';
  if (href.includes('/pipeline')) return 'random';
  if (href.includes('/products')) return 'archive';
  if (href.includes('/trade-events')) return 'calendar';
  if (href.includes('/contact-exchange/vcard')) return 'address-card-o';
  if (href.includes('/contact-exchange/scan')) return 'camera';
  if (href.includes('/admin/organization')) return 'building-o';
  if (href.includes('/admin/users')) return 'user-circle-o';
  if (href.includes('/admin/invitations')) return 'envelope-open-o';
  if (href.includes('/admin/audit')) return 'history';
  if (href.includes('/admin/ai-analytics')) return 'line-chart';
  if (href.includes('/documents')) return 'file-text-o';
  if (href.includes('/compliance')) return 'shield';
  if (href.includes('/contracts')) return 'file-text';
  if (href.includes('/tasks')) return 'check-square-o';
  if (href.includes('/settings')) return 'sliders';
  if (href.includes('/integrations')) return 'plug';
  if (href.includes('/ai-suggestions')) return 'magic';
  return 'circle-o';
}

export function getWorkspaceModeFromLocation(_pathname: string, _modeParam: string | null) {
  return 'all' as const;
}

export function getWorkspaceBasePath(pathname: string) {
  if (pathname.startsWith(PRODUCT_ROUTES.app.dashboard)) return PRODUCT_ROUTES.app.dashboard;
  if (pathname.startsWith(PRODUCT_ROUTES.app.leads)) return PRODUCT_ROUTES.app.leads;
  return null;
}

export function withWorkspaceMode(href: string, _mode: 'all' | 'buyers' | 'suppliers') {
  return href;
}

export function withWorkspaceModePreservedParams(
  href: string,
  _mode: 'all' | 'buyers' | 'suppliers',
  _currentParams?: string,
) {
  return href;
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
