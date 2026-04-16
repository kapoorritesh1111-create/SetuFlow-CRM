export const LOCKED_PRODUCT_FLOW = ['Capture', 'Lead', 'Quote', 'Order'] as const;

export const APPROVED_REWORK_PHASE = 'Canonical routes only';
export const APPROVED_REWORK_TITLE = 'Operational alignment';

export const PRODUCT_ROUTE_LABELS = {
  leads: 'Leads',
  quotes: 'Quotes',
  orders: 'Orders',
  dashboard: 'Dashboard',
  admin: 'Admin',
  capture: 'Capture',
  myCard: 'My Card',
} as const;

export const PRODUCT_ROUTES = {
  app: {
    leads: '/leads',
    quotes: '/quotes',
    orders: '/orders',
    dashboard: '/dashboard',
    admin: '/admin/users',
    capture: '/contact-exchange/scan',
    myCard: '/contact-exchange/vcard',
  },
} as const;

export const PRODUCT_SHELL_LABELS = {
  productShell: 'Product shell',
  ritualHeading: 'Working rules',
  ritualBeforeCoding: 'Keep canonical routes as the only routes users can navigate to.',
  ritualDuringCoding: 'Update visible navigation in the same change as workflow updates.',
  ritualAfterCoding: 'Refresh tests and readiness notes when user-facing behavior changes.',
} as const;

export type ProductNavLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export const primaryAppShellNav: ProductNavLink[] = [
  { href: PRODUCT_ROUTES.app.leads, label: PRODUCT_ROUTE_LABELS.leads, exact: true },
  { href: PRODUCT_ROUTES.app.quotes, label: PRODUCT_ROUTE_LABELS.quotes },
  { href: PRODUCT_ROUTES.app.orders, label: PRODUCT_ROUTE_LABELS.orders },
  { href: PRODUCT_ROUTES.app.dashboard, label: PRODUCT_ROUTE_LABELS.dashboard, exact: true },
  { href: PRODUCT_ROUTES.app.admin, label: PRODUCT_ROUTE_LABELS.admin },
];

export const hiddenFromPrimaryNav = [
  'Pipeline',
  'Products',
  'Documents',
  'Compliance',
  'Contracts',
  'Trade events',
  'Tasks',
  'Integrations',
  'AI assist',
  'Contact exchange',
] as const;

export const driftGuardrails = [
  'Define product shell links once and import them everywhere.',
    'Treat demoted routes as support surfaces, not primary destinations.',
  'Promote only routes that match the approved Capture → Lead → Quote → Order story.',
] as const;
