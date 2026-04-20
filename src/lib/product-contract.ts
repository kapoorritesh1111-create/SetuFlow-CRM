import manifest from '@/lib/routes/manifest.json';

export const LOCKED_PRODUCT_FLOW = manifest.lockedProductFlow as readonly string[];

export const INTERNAL_DCC_PATH = manifest.internalDccPath;
export const APPROVED_REWORK_PHASE = manifest.approvedReworkPhase;
export const APPROVED_REWORK_TITLE = manifest.approvedReworkTitle;

export const PRODUCT_ROUTE_LABELS = manifest.routeLabels;
export const PRODUCT_ROUTES = manifest.routes;
export const PRODUCT_SHELL_LABELS = manifest.productShellLabels;

export type ProductNavLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export const primaryAppShellNav: ProductNavLink[] = manifest.primaryNav;
export const adminAppShellTabs: ProductNavLink[] = manifest.adminTabs;
export const hiddenFromPrimaryNav = manifest.hiddenFromPrimaryNav;
export const driftGuardrails = manifest.driftGuardrails;
export const canonicalShellSections = manifest.shellSections;
export const routeManifest = manifest;
