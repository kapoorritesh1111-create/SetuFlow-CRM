export const LOCKED_PRODUCT_FLOW = ['Capture', 'Lead', 'Quote', 'Order'] as const;

export const APPROVED_REWORK_PHASE = 'Phase 1 active';
export const APPROVED_REWORK_TITLE = 'Shell alignment in progress';

export const PRODUCT_ROUTE_LABELS = {
  leads: 'Leads',
  quotes: 'Quotes',
  orders: 'Orders',
  dashboard: 'Dashboard',
  admin: 'Admin',
  capture: 'Capture',
  myCard: 'My Card',
  development: 'Admin / Plan',
} as const;

export const PRODUCT_ROUTES = {
  app: {
    leads: '/leads',
    quotes: '/quotes',
    orders: '/orders',
    dashboard: '/dashboard',
    admin: '/admin/users',
  },
  workspace: {
    home: '/workspace',
    leads: '/workspace/leads',
    capture: '/workspace/capture',
    quotes: '/workspace/quotes',
    orders: '/workspace/orders',
    dashboard: '/workspace/dashboard',
    myCard: '/workspace/my-card',
  },
  development: {
    home: '/development',
    readiness: '/development/readiness',
    backlog: '/development/backlog',
    masterPlan: '/development/master-plan',
    product: '/development/product',
    architecture: '/development/architecture',
    uxRules: '/development/ux-rules',
    screens: '/development/screens/leads-capture',
  },
} as const;

export const PRODUCT_SHELL_LABELS = {
  previewBadge: 'Approved workspace preview',
  productShell: 'Product shell',
  ritualHeading: 'Non-negotiable ritual',
  ritualBeforeCoding: 'Before coding: check /development and confirm the visible shell still matches the approved rework contract before touching deeper features.',
  ritualDuringCoding: 'During coding: update the shared shell contract in the same PR as any visible navigation or workflow change.',
  ritualAfterCoding: 'After coding: update readiness and workspace previews inside the repo so the next session starts from what the product actually shows.',
} as const;

export type ProductNavLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export const primaryWorkspacePreviewNav: ProductNavLink[] = [
  { href: PRODUCT_ROUTES.workspace.leads, label: PRODUCT_ROUTE_LABELS.leads },
  { href: PRODUCT_ROUTES.workspace.quotes, label: PRODUCT_ROUTE_LABELS.quotes },
  { href: PRODUCT_ROUTES.workspace.orders, label: PRODUCT_ROUTE_LABELS.orders },
  { href: PRODUCT_ROUTES.workspace.dashboard, label: PRODUCT_ROUTE_LABELS.dashboard },
  { href: PRODUCT_ROUTES.workspace.myCard, label: PRODUCT_ROUTE_LABELS.myCard },
  { href: PRODUCT_ROUTES.development.home, label: PRODUCT_ROUTE_LABELS.development },
];

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
  'Contact exchange as a standalone area',
] as const;

export const driftGuardrails = [
  'Define product shell links once and import them everywhere.',
  'Update /development status in the same PR as visible workflow changes.',
  'Treat demoted routes as support surfaces, not primary destinations.',
  'Promote only routes that match the approved Capture → Lead → Quote → Order story.',
] as const;
