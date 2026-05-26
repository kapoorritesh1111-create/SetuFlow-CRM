import { canonicalShellSections } from '@/lib/product-contract';
import type { ProductNavLink, ProductNavSection } from '@/lib/product-contract';

export type SharedNavItem = ProductNavLink & {
  compactLabel: string;
  mobileHref: string | null;
  mobileLabel: string;
  mobileIcon: string;
  mobileMatch: readonly string[];
};

export type MobileNavItem = {
  href: string;
  label: string;
  icon: string;
  match: readonly string[];
};

export const PRIMARY_NAV_ORDER = [
  '/dashboard',
  '/dashboard/analytics',
  '/leads',
  '/quotes',
  '/orders',
  '/tasks',
  '/pipeline',
  '/products',
  '/trade-events',
] as const;

export const PRIMARY_NAV_LABELS: Record<string, string> = {
  '/dashboard': 'Dash',
  '/dashboard/analytics': 'Analytics',
  '/leads': 'Leads',
  '/quotes': 'Quotes',
  '/orders': 'Orders',
  '/tasks': 'Tasks',
  '/pipeline': 'Pipeline',
  '/products': 'Catalog',
  '/trade-events': 'Events',
};

export const UTILITY_NAV_LABELS: Record<string, string> = {
  '/admin/organization': 'Admin',
};

const MOBILE_NAV_META: Record<string, Pick<SharedNavItem, 'mobileHref' | 'mobileLabel' | 'mobileIcon' | 'mobileMatch'>> = {
  '/dashboard': { mobileHref: '/dashboard', mobileLabel: 'Home', mobileIcon: '⌂', mobileMatch: ['/dashboard'] },
  '/leads': { mobileHref: '/leads', mobileLabel: 'Leads', mobileIcon: '◎', mobileMatch: ['/leads'] },
  '/quotes': { mobileHref: '/quotes', mobileLabel: 'Quotes', mobileIcon: '□', mobileMatch: ['/quotes'] },
  '/orders': { mobileHref: '/orders', mobileLabel: 'Orders', mobileIcon: '◇', mobileMatch: ['/orders'] },
  '/tasks': { mobileHref: '/tasks', mobileLabel: 'More', mobileIcon: '•••', mobileMatch: ['/tasks', '/contact-exchange/vcard', '/ai-suggestions', '/documents', '/compliance'] },
  '/pipeline': { mobileHref: '/mobile/pipeline', mobileLabel: 'Pipeline', mobileIcon: '⊞', mobileMatch: ['/mobile/pipeline', '/pipeline'] },
  '/trade-events': { mobileHref: '/contact-exchange/scan', mobileLabel: 'Capture', mobileIcon: '◌', mobileMatch: ['/contact-exchange/scan', '/trade-events'] },
};

function uniqueByHref(items: ProductNavLink[]) {
  return items.filter((item, index, arr) => arr.findIndex((entry) => entry.href === item.href) === index);
}

function orderByPrimaryNav(items: ProductNavLink[]) {
  return [...items].sort((a, b) => PRIMARY_NAV_ORDER.indexOf(a.href as (typeof PRIMARY_NAV_ORDER)[number]) - PRIMARY_NAV_ORDER.indexOf(b.href as (typeof PRIMARY_NAV_ORDER)[number]));
}

export function filterShellSections(canAccessAdmin: boolean): ProductNavSection[] {
  return canonicalShellSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessAdmin || !item.requiresAdmin) }))
    .filter((section) => section.items.length > 0) as ProductNavSection[];
}

export function getPrimaryShellNavItems(sections: ProductNavSection[]) {
  return orderByPrimaryNav(uniqueByHref(sections.flatMap((section) => section.items)).filter((item) => item.href in PRIMARY_NAV_LABELS));
}

export function getUtilityShellNavItems(sections: ProductNavSection[]) {
  return uniqueByHref(sections.flatMap((section) => section.items))
    .filter((item) => item.href in UTILITY_NAV_LABELS)
    .sort((a, b) => Object.keys(UTILITY_NAV_LABELS).indexOf(a.href) - Object.keys(UTILITY_NAV_LABELS).indexOf(b.href));
}

export function getCanonicalMobileNavItems(): MobileNavItem[] {
  return getPrimaryShellNavItems(canonicalShellSections as ProductNavSection[])
    .map((item) => ({ ...item, compactLabel: PRIMARY_NAV_LABELS[item.href], ...MOBILE_NAV_META[item.href] }))
    .filter((item): item is SharedNavItem => Boolean(item.mobileHref))
    .map((item) => ({ href: item.mobileHref, label: item.mobileLabel, icon: item.mobileIcon, match: item.mobileMatch }));
}

export const standaloneMobileNavItems: MobileNavItem[] = [
  { href: '/mobile', label: 'Home', icon: '⌂', match: ['/mobile'] },
  { href: '/mobile/leads', label: 'Leads', icon: '◎', match: ['/mobile/leads'] },
  { href: '/mobile/pipeline', label: 'Pipeline', icon: '⊞', match: ['/mobile/pipeline'] },
  { href: '/mobile/guru', label: 'Guru', icon: '🧠', match: ['/mobile/guru'] },
  { href: '/mobile/settings', label: 'More', icon: '≡', match: ['/mobile/settings'] },
];

export const canonicalMobileNavItems = getCanonicalMobileNavItems();
