import { INTERNAL_DCC_PATH, LOCKED_PRODUCT_FLOW } from '@/lib/product-contract';

export type ChecklistStatus = 'done' | 'current' | 'planned' | 'locked';
export type ReadinessArea = { title: string; summary: string; status: ChecklistStatus };
export type ChecklistItem = { id: string; area: string; label: string; note: string; status: ChecklistStatus };

export const lockedProductFlow = LOCKED_PRODUCT_FLOW;
export const sprintProgress = {
  sprint: 'PR-01 Canonical cleanup',
  percent: 100,
  percentLabel: 'Development, workspace, preview, and artifact cleanup completed. Route truth updated to point at the internal DCC.',
};
export const sprintFocus = {
  sprint: 'PR-01 Canonical cleanup',
  title: 'The shipped app now carries only product routes; internal planning truth lives in the DCC.',
  nextAction: 'Start PR-02 route manifest and shell hardening.',
  flow: LOCKED_PRODUCT_FLOW.join(' → '),
};
export const readinessSummary = {
  status: 'PR-01 complete',
  buildStatus: 'Baseline cleaned and internal command center refreshed; run full install, typecheck, tests, and build as the next verification pass.',
  driftRisk: 'Moderate — canonical internal route cleanup is done, but architecture and product-surface refactors still remain.',
  blockers: 'Quotes workspace, shell decomposition, and dashboard action hierarchy remain unresolved.',
};
export const readinessAreas: ReadinessArea[] = [
  { title: 'Canonical routes', summary: 'Development, workspace mirror, and preview surfaces are removed from the shipped app.', status: 'done' },
  { title: 'Planning source of truth', summary: `The internal DCC at ${INTERNAL_DCC_PATH} replaces fragmented planning and readiness surfaces.`, status: 'done' },
  { title: 'Build verification', summary: 'Fresh typecheck, test, and production build proof is the next gate.', status: 'current' },
];
export const checklistItems: ChecklistItem[] = [
  { id: 'routes', area: 'Product', label: 'Canonical routes only', note: 'Development and workspace mirror routes are removed from the shipped app.', status: 'done' },
  { id: 'truth', area: 'Program', label: 'DCC is the planning source of truth', note: `Internal planning points to ${INTERNAL_DCC_PATH}.`, status: 'done' },
  { id: 'verify', area: 'Verification', label: 'Fresh production verification', note: 'Run install, typecheck, tests, and a production build on the cleaned baseline.', status: 'current' },
];
