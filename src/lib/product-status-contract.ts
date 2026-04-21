import { INTERNAL_DCC_PATH, LOCKED_PRODUCT_FLOW } from '@/lib/product-contract';

export type ChecklistStatus = 'done' | 'current' | 'planned' | 'locked';
export type ReadinessArea = { title: string; summary: string; status: ChecklistStatus };
export type ChecklistItem = { id: string; area: string; label: string; note: string; status: ChecklistStatus };

export const lockedProductFlow = LOCKED_PRODUCT_FLOW;
export const sprintProgress = {
  sprint: 'PR-29 baseline preserved, PR-30 truth reset applied',
  percent: 82,
  percentLabel: 'The repo baseline remains strong, but readiness claims are now corrected against the live demo data rather than assuming full completion.',
};
export const sprintFocus = {
  sprint: 'PR-30 Investor and buyer truth reset',
  title: 'README, DCC, workflow, architecture, readiness, and demo docs now reflect the real data-backed posture of the product.',
  nextAction: 'Reconcile accepted quote truth and surface one clean approval-governed path before claiming stronger investor readiness.',
  flow: LOCKED_PRODUCT_FLOW.join(' -> '),
};
export const readinessSummary = {
  status: 'PR-29 baseline retained, PR-30 truth reset complete',
  buildStatus: 'Repo verification remains governed, but product-proof maturity still trails the technical baseline.',
  driftRisk: 'Low in repo structure, medium in proof surfaces if live data and docs diverge again.',
  blockers: 'Accepted-state reconciliation, approval-proof visibility, execution-proof maturity, and live integration evidence still need work.',
};
export const readinessAreas: ReadinessArea[] = [
  { title: 'Canonical routes', summary: 'Manifest-backed route truth remains intact.', status: 'done' },
  { title: 'Planning source of truth', summary: `The internal DCC at ${INTERNAL_DCC_PATH} remains the internal planning and readiness surface.`, status: 'done' },
  { title: 'Commercial continuity', summary: 'Downstream continuity exists, but is only partially proven cleanly in current live data.', status: 'current' },
  { title: 'Execution controls', summary: 'Execution structures exist, but visible contract examples remain draft-heavy.', status: 'current' },
  { title: 'Dashboard governance', summary: 'Dashboard remains action-first, but demo claims should stay disciplined.', status: 'done' },
  { title: 'AI governance', summary: 'AI should remain bounded, explainable, and operator-reviewed.', status: 'current' },
  { title: 'Integrations governance', summary: 'Integration architecture exists, but live configured proof is not yet present in the current dataset.', status: 'planned' },
  { title: 'Documentation and truth surfaces', summary: 'README, DCC, and core docs now reflect the corrected live-data posture.', status: 'done' },
  { title: 'Verification gate', summary: 'Release-proof and repo checks remain part of the governed baseline.', status: 'done' },
];
export const checklistItems: ChecklistItem[] = [
  { id: 'routes', area: 'Product', label: 'Canonical routes only', note: 'Manifest-backed routes remain the shipped surface.', status: 'done' },
  { id: 'truth', area: 'Program', label: 'DCC remains the internal source of truth', note: `Internal readiness points to ${INTERNAL_DCC_PATH}.`, status: 'done' },
  { id: 'quotes', area: 'Workflow', label: 'Quote acceptance truth needs reconciliation', note: 'Accepted negotiation events and summary-level accepted quote posture should match before stronger claims are made.', status: 'current' },
  { id: 'approval', area: 'Workflow', label: 'Override approval proof must stay explicit', note: 'Do not weaken base price, reason, and approval logic; surface it clearly in demoable records.', status: 'current' },
  { id: 'orders', area: 'Workflow', label: 'Contracts and execution need stronger proof', note: 'Execution structures exist, but visible examples remain draft-heavy.', status: 'current' },
  { id: 'ai', area: 'AI', label: 'AI remains bounded and operator-reviewed', note: 'Keep AI claims honest and workflow-safe.', status: 'current' },
  { id: 'integrations', area: 'Integrations', label: 'Connector claims must remain conservative', note: 'Integration architecture exists, but live configured evidence is still missing.', status: 'planned' },
  { id: 'docs', area: 'Documentation', label: 'Core docs now match the live-data posture', note: 'README, architecture, workflow, readiness, demo, and DCC were reset in PR-30.', status: 'done' },
  { id: 'verify', area: 'Verification', label: 'Governed release proof remains intact', note: 'Keep the release-proof command and repo alignment tests in place.', status: 'done' },
];
