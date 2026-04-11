export const LOCKED_PRODUCT_FLOW = ['Capture', 'Lead', 'Quote', 'Order'] as const;

export const APPROVED_REWORK_PHASE = 'Phase 1 active';
export const APPROVED_REWORK_TITLE = 'Shell alignment in progress';

export type ProductNavLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export const primaryWorkspacePreviewNav: ProductNavLink[] = [
  { href: '/workspace/leads', label: 'Leads' },
  { href: '/workspace/quotes', label: 'Quotes' },
  { href: '/workspace/orders', label: 'Orders' },
  { href: '/workspace/dashboard', label: 'Dashboard' },
  { href: '/workspace/my-card', label: 'My Card' },
  { href: '/development', label: 'Admin / Plan' },
];

export const primaryAppShellNav: ProductNavLink[] = [
  { href: '/leads', label: 'Leads', exact: true },
  { href: '/workspace/quotes', label: 'Quotes' },
  { href: '/workspace/orders', label: 'Orders' },
  { href: '/dashboard', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Admin' },
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
