import manifest from '@/lib/routes/manifest.json';

type RouteManifest = typeof manifest & {
  internalDccPath?: string;
};

const routeManifest = manifest as RouteManifest;

export const LOCKED_PRODUCT_FLOW = routeManifest.lockedProductFlow as readonly string[];

export const INTERNAL_DCC_PATH = routeManifest.internalDccPath ?? routeManifest.routes.internal.dcc;
export const APPROVED_REWORK_PHASE = routeManifest.approvedReworkPhase;
export const APPROVED_REWORK_TITLE = routeManifest.approvedReworkTitle;
export const RELEASE_GATE_CONTRACT = routeManifest.releaseGate;

export const PRODUCT_ROUTE_LABELS = routeManifest.routeLabels;
export const PRODUCT_ROUTES = routeManifest.routes;
export const PRODUCT_SHELL_LABELS = routeManifest.productShellLabels;

export type ProductNavLink = {
  href: string;
  label: string;
  exact?: boolean;
  description?: string;
  aliases?: string[];
  navKey?: string;
  requiresAdmin?: boolean;
};

export type ProductNavSection = {
  id: string;
  label: string;
  icon: string;
  description?: string;
  tone?: 'primary' | 'support' | 'utility';
  items: ProductNavLink[];
};

export const primaryAppShellNav = routeManifest.primaryNav as ProductNavLink[];
export const adminAppShellTabs = routeManifest.adminTabs as ProductNavLink[];
export const hiddenFromPrimaryNav = routeManifest.hiddenFromPrimaryNav;
export const driftGuardrails = routeManifest.driftGuardrails;
export const canonicalShellSections = routeManifest.shellSections as ProductNavSection[];
export { routeManifest };
