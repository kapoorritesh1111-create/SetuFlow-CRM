export const LOCKED_PRODUCT_FLOW = ['Capture', 'Lead', 'Quote', 'Order'] as const;

export const INTERNAL_DCC_PATH = '/internal-dcc/';
export const APPROVED_REWORK_PHASE = 'Canonical cleanup complete';
export const APPROVED_REWORK_TITLE = 'Single-source route truth';

export const PRODUCT_ROUTE_LABELS = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  pipeline: 'Pipeline',
  quotes: 'Quotes',
  orders: 'Orders',
  admin: 'Admin',
  capture: 'Capture',
  myCard: 'My Card',
} as const;

export const PRODUCT_ROUTES = {
  app: {
    dashboard: '/dashboard',
    leads: '/leads',
    pipeline: '/pipeline',
    quotes: '/quotes',
    orders: '/orders',
    admin: '/admin/users',
    capture: '/contact-exchange/scan',
    myCard: '/contact-exchange/vcard',
  },
  internal: {
    dcc: INTERNAL_DCC_PATH,
  },
} as const;

export const PRODUCT_SHELL_LABELS = {
  productShell: 'Product shell',
  ritualHeading: 'Working rules',
  ritualBeforeCoding: 'Preserve canonical product routes and keep internal planning surfaces out of the shipped app.',
  ritualDuringCoding: 'Update navigation and route tests in the same change as any route-level product work.',
  ritualAfterCoding: 'Refresh the internal DCC when readiness, drift, or route truth changes.',
} as const;

export type ProductNavLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export const primaryAppShellNav: ProductNavLink[] = [
  { href: PRODUCT_ROUTES.app.dashboard, label: PRODUCT_ROUTE_LABELS.dashboard, exact: true },
  { href: PRODUCT_ROUTES.app.leads, label: PRODUCT_ROUTE_LABELS.leads, exact: true },
  { href: PRODUCT_ROUTES.app.pipeline, label: PRODUCT_ROUTE_LABELS.pipeline, exact: true },
  { href: PRODUCT_ROUTES.app.quotes, label: PRODUCT_ROUTE_LABELS.quotes },
  { href: PRODUCT_ROUTES.app.orders, label: PRODUCT_ROUTE_LABELS.orders },
  { href: PRODUCT_ROUTES.app.admin, label: PRODUCT_ROUTE_LABELS.admin },
];

export const hiddenFromPrimaryNav = [
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
  'Do not reintroduce development, workspace mirror, or preview routes into the shipped app.',
  'Treat the internal DCC as the planning and readiness source of truth.',
] as const;
