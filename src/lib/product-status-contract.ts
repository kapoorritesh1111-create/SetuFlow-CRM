import { INTERNAL_DCC_PATH, LOCKED_PRODUCT_FLOW } from '@/lib/product-contract';

export type ChecklistStatus = 'done' | 'current' | 'planned' | 'locked';
export type ReadinessArea = { title: string; summary: string; status: ChecklistStatus };
export type ChecklistItem = { id: string; area: string; label: string; note: string; status: ChecklistStatus };

export const lockedProductFlow = LOCKED_PRODUCT_FLOW;
export const sprintProgress = {
  sprint: 'PR-10 Documentation + demo readiness',
  percent: 100,
  percentLabel: 'PR-01 through PR-10 are complete. Product-facing docs, demo scripts, diagrams, and the release checklist now exist alongside the manifest-backed product baseline.',
};
export const sprintFocus = {
  sprint: 'PR-10 Documentation + demo readiness',
  title: 'Canonical route truth is stable and the repo now includes product-facing documentation, demo guidance, diagrams, and a release checklist that match the shipped baseline.',
  nextAction: 'Run the final verification and polish pass.',
  flow: LOCKED_PRODUCT_FLOW.join(' -> '),
};
export const readinessSummary = {
  status: 'PR-10 complete',
  buildStatus: 'Route-presence and repo-alignment checks pass. Fresh install, typecheck, and production build proof should still be run in a fully provisioned environment.',
  driftRisk: 'Very low — route truth, product truth, and internal DCC truth are aligned.',
  blockers: 'No product-structure blockers remain. Remaining work is verification and polish.',
};
export const readinessAreas: ReadinessArea[] = [
  { title: 'Canonical routes', summary: 'Development, workspace mirror, preview, and planning surfaces remain removed from the shipped app.', status: 'done' },
  { title: 'Planning source of truth', summary: `The internal DCC at ${INTERNAL_DCC_PATH} replaces fragmented internal planning and readiness surfaces.`, status: 'done' },
  { title: 'Pipeline core route', summary: 'Pipeline remains a primary route and uses dedicated ui, logic, server, and types modules.', status: 'done' },
  { title: 'Quotes workspace route', summary: 'Quotes opens as a true workspace with list, detail, builder access, history, trade workflow posture, and order handoff visibility.', status: 'done' },
  { title: 'Dashboard first viewport', summary: 'Delayed work, blocked work, urgent actions, and quote or order risk appear before broader command surfaces.', status: 'done' },
  { title: 'Trade workflow visibility', summary: 'Quote and order surfaces expose explicit incoterm, freight readiness, compliance blockers, dispatch readiness, and handoff continuity signals.', status: 'done' },
  { title: 'AI intelligence scoring', summary: 'Lead priority, quote risk, order delay posture, and daily insight relevance use workflow-aware scoring instead of generic heuristic wording.', status: 'done' },
  { title: 'Integrations architecture', summary: 'Integrations expose a connector registry, mapping posture, provider-specific webhook pattern, sync logs, retry visibility, and freight/ERP mock runtimes.', status: 'done' },
  { title: 'Documentation and demo readiness', summary: 'Root README, buyer demo script, trade-show script, workflow diagram, architecture diagram, and release checklist now reflect the current baseline.', status: 'done' },
  { title: 'Build verification', summary: 'Fresh install, typecheck, and production build proof remains the final verification gate.', status: 'current' },
];
export const checklistItems: ChecklistItem[] = [
  { id: 'routes', area: 'Product', label: 'Canonical routes only', note: 'Development, workspace mirror, preview, and planning routes are removed from the shipped app.', status: 'done' },
  { id: 'truth', area: 'Program', label: 'DCC is the internal planning source of truth', note: `Internal planning points to ${INTERNAL_DCC_PATH}.`, status: 'done' },
  { id: 'pipeline', area: 'Product', label: 'Pipeline promoted as a core route', note: 'Shell truth, route truth, and the board implementation keep pipeline visible as a primary surface.', status: 'done' },
  { id: 'quotes', area: 'Product', label: 'Quotes opens as a real workspace', note: 'The quotes route shows list, detail, history, builder access, and order handoff visibility in one route.', status: 'done' },
  { id: 'dashboard', area: 'Product', label: 'Dashboard is action-first', note: 'The first viewport emphasizes delayed work, blocked work, urgent actions, and quote or order risk.', status: 'done' },
  { id: 'trade', area: 'Workflow', label: 'Trade workflow signals are explicit', note: 'Quotes and orders surface incoterm posture, freight readiness, compliance blockers, dispatch readiness, and quote-to-order-to-execution continuity.', status: 'done' },
  { id: 'ai', area: 'AI', label: 'AI scoring uses workflow signals', note: 'Lead priority, quote risk, order delay posture, and daily insights use workflow-aware scoring across the most relevant product surfaces.', status: 'done' },
  { id: 'integrations', area: 'Integrations', label: 'Connector architecture is explicit', note: 'The integrations workspace exposes connector registry, mapping layer, webhook handler pattern, sync logs, retry posture, and freight/ERP mocks.', status: 'done' },
  { id: 'docs', area: 'Documentation', label: 'Product-facing docs and demo assets exist', note: 'README, demo scripts, architecture diagram, workflow diagram, and release checklist now match the shipped baseline.', status: 'done' },
  { id: 'verify', area: 'Verification', label: 'Fresh production verification', note: 'Run install, typecheck, tests, and a production build on the refactored baseline in a fully provisioned environment.', status: 'current' },
];
