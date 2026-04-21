import manifest from '@/lib/routes/manifest.json';

export const LOCKED_PRODUCT_FLOW = manifest.lockedProductFlow as readonly string[];

export const INTERNAL_DCC_PATH = manifest.internalDccPath;
export const APPROVED_REWORK_PHASE = manifest.approvedReworkPhase;
export const APPROVED_REWORK_TITLE = manifest.approvedReworkTitle;
export const RELEASE_GATE_CONTRACT = manifest.releaseGate;

export const PRODUCT_ROUTE_LABELS = manifest.routeLabels;
export const PRODUCT_ROUTES = manifest.routes;
export const PRODUCT_SHELL_LABELS = manifest.productShellLabels;

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

export const primaryAppShellNav = manifest.primaryNav as ProductNavLink[];
export const adminAppShellTabs = manifest.adminTabs as ProductNavLink[];
export const hiddenFromPrimaryNav = manifest.hiddenFromPrimaryNav;
export const driftGuardrails = manifest.driftGuardrails;
export const canonicalShellSections = manifest.shellSections as ProductNavSection[];
export const routeManifest = manifest;
