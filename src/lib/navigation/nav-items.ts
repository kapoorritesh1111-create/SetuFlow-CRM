import type { SetuIconName } from '@/components/ui/setu-icon';
import { canonicalShellSections } from '@/lib/product-contract';
import type { ProductNavLink, ProductNavSection } from '@/lib/product-contract';

export type SharedNavItem = ProductNavLink & {
  compactLabel: string;
  mobileHref: string | null;
  mobileLabel: string;
  mobileIcon: SetuIconName;
  mobileMatch: readonly string[];
};

export type MobileNavItem = {
  href: string;
  label: string;
  icon: SetuIconName;
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
  '/catalog',
  '/products',
  '/price-lists',
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
  '/catalog': 'Catalog',
  '/products': 'Products',
  '/price-lists': 'Price Lists',
  '/trade-events': 'Events',
};

export const UTILITY_NAV_LABELS: Record<string, string> = {
  '/smc': 'SMC',
  '/admin/organization': 'Admin',
};

const MOBILE_NAV_META: Record<string, Pick<SharedNavItem, 'mobileHref' | 'mobileLabel' | 'mobileIcon' | 'mobileMatch'>> = {
  '/dashboard': { mobileHref: '/dashboard', mobileLabel: 'Home', mobileIcon: 'home', mobileMatch: ['/dashboard', '/mobile'] },
  '/leads': { mobileHref: '/leads', mobileLabel: 'Leads', mobileIcon: 'lead', mobileMatch: ['/leads', '/mobile/leads'] },
  '/quotes': { mobileHref: '/quotes', mobileLabel: 'Quotes', mobileIcon: 'quote', mobileMatch: ['/quotes'] },
  '/orders': { mobileHref: '/orders', mobileLabel: 'Orders', mobileIcon: 'orders', mobileMatch: ['/orders', '/mobile/orders'] },
  '/tasks': { mobileHref: '/tasks', mobileLabel: 'Tasks', mobileIcon: 'clipboard', mobileMatch: ['/tasks'] },
  '/pipeline': { mobileHref: null, mobileLabel: 'Pipeline', mobileIcon: 'workflow', mobileMatch: ['/mobile/pipeline', '/pipeline'] },
  '/catalog': { mobileHref: null, mobileLabel: 'Catalog', mobileIcon: 'box', mobileMatch: ['/catalog'] },
  '/products': { mobileHref: null, mobileLabel: 'Products', mobileIcon: 'box', mobileMatch: ['/products'] },
  '/price-lists': { mobileHref: null, mobileLabel: 'Price Lists', mobileIcon: 'box', mobileMatch: ['/price-lists'] },
  '/trade-events': { mobileHref: null, mobileLabel: 'Events', mobileIcon: 'calendar', mobileMatch: ['/trade-events'] },
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

function toMobileNavItem(item: ProductNavLink): MobileNavItem | null {
  const meta = MOBILE_NAV_META[item.href];
  if (!meta?.mobileHref) return null;
  return {
    href: meta.mobileHref,
    label: meta.mobileLabel,
    icon: meta.mobileIcon,
    match: meta.mobileMatch,
  };
}

export function getCanonicalMobileNavItems(): MobileNavItem[] {
  return getPrimaryShellNavItems(canonicalShellSections as ProductNavSection[]).flatMap((item) => {
    const mobileItem = toMobileNavItem(item);
    return mobileItem ? [mobileItem] : [];
  });
}

export const standaloneMobileNavItems: MobileNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home', match: ['/dashboard', '/mobile'] },
  { href: '/leads', label: 'Leads', icon: 'lead', match: ['/leads', '/mobile/leads'] },
  { href: '/quotes', label: 'Quotes', icon: 'quote', match: ['/quotes', '/mobile/quote'] },
  { href: '/orders', label: 'Orders', icon: 'orders', match: ['/orders', '/mobile/orders'] },
  { href: '/tasks', label: 'Tasks', icon: 'clipboard', match: ['/tasks'] },
];

/**
 * Secondary mobile destinations intentionally live behind the right-most More
 * tab so the primary bar stays focused on the four daily commercial surfaces.
 */
export const mobileMoreNavItems: MobileNavItem[] = [
  { href: '/tasks', label: 'Tasks', icon: 'clipboard', match: ['/tasks'] },
  { href: '/trade-events', label: 'Events', icon: 'calendar', match: ['/trade-events'] },
];

export const canonicalMobileNavItems = getCanonicalMobileNavItems();
