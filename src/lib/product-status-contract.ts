import { INTERNAL_DCC_PATH, LOCKED_PRODUCT_FLOW } from '@/lib/product-contract';

export type ChecklistStatus = 'done' | 'current' | 'planned' | 'locked';
export type ReadinessArea = { title: string; summary: string; status: ChecklistStatus };
export type ChecklistItem = { id: string; area: string; label: string; note: string; status: ChecklistStatus };

export const lockedProductFlow = LOCKED_PRODUCT_FLOW;
export const sprintProgress = {
  sprint: 'PR-30 truth reset complete, PR-31 next',
  percent: 74,
  percentLabel: 'The repo is demoable and commercially credible, but still needs proof hardening before stronger investor claims are justified.',
};
export const sprintFocus = {
  sprint: 'PR-31 Golden commercial path and quote truth reconciliation',
  title: 'The next pass should reconcile accepted quote truth, surface an approval-governed quote path, and strengthen order/execution proof.',
  nextAction: 'Update the DCC first, then align product surfaces and docs to the reconciled golden path.',
  flow: LOCKED_PRODUCT_FLOW.join(' -> '),
};
export const readinessSummary = {
  status: 'Overall readiness 74%, 6 PRs remaining',
  buildStatus: 'Engineering is strong, buyer/investor proof is still partial.',
  driftRisk: 'Low in repo structure, medium in product-proof surfaces until PR-31 lands.',
  blockers: 'Accepted quote reconciliation, approval-proof visibility, stronger execution proof, and live integration evidence.',
};
export const readinessAreas: ReadinessArea[] = [
  { title: 'Leads', summary: 'Strong and already commercially useful.', status: 'done' },
  { title: 'Pipeline', summary: 'Strong structure, needs sharper demo curation.', status: 'done' },
  { title: 'Quotes', summary: 'Critical module, still needs proof reconciliation.', status: 'current' },
  { title: 'Orders / Contracts', summary: 'Continuity exists, visible maturity still partial.', status: 'current' },
  { title: 'Dashboard', summary: 'Good guided-view surface.', status: 'done' },
  { title: 'Contact Exchange', summary: 'Differentiated and understandable.', status: 'done' },
  { title: 'Product management', summary: 'Strong catalog and base-price posture.', status: 'done' },
  { title: 'AI', summary: 'Assistive and bounded, not yet a headline proof layer.', status: 'current' },
  { title: 'Integrations', summary: 'Architecture exists, live proof still missing.', status: 'planned' },
  { title: 'Documentation', summary: `DCC at ${INTERNAL_DCC_PATH} is the active truth surface.`, status: 'done' },
];
export const checklistItems: ChecklistItem[] = [
  { id: 'dcc', area: 'Documentation', label: 'DCC is source of truth', note: `All current readiness truth should remain centered in ${INTERNAL_DCC_PATH}.`, status: 'done' },
  { id: 'pricing', area: 'Workflow', label: 'Pricing rule stays locked', note: 'Base price, override reason, and approval must not be weakened.', status: 'locked' },
  { id: 'quotes', area: 'Workflow', label: 'Accepted quote truth needs reconciliation', note: 'Top-level quote truth must match the actual commercial event story.', status: 'current' },
  { id: 'golden', area: 'Demo', label: 'Golden path must be undeniable', note: 'One clean buyer-to-contract path should be surfaced for non-technical reviewers.', status: 'current' },
  { id: 'execution', area: 'Workflow', label: 'Execution proof needs strengthening', note: 'Visible contract examples should move beyond draft-heavy posture.', status: 'current' },
  { id: 'integrations', area: 'Integrations', label: 'Live integration proof is still missing', note: 'Connector architecture exists, but external proof still trails.', status: 'planned' },
];
