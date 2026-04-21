import { INTERNAL_DCC_PATH, LOCKED_PRODUCT_FLOW } from '@/lib/product-contract';

export type ChecklistStatus = 'done' | 'current' | 'planned' | 'locked';
export type ReadinessArea = { title: string; summary: string; status: ChecklistStatus };
export type ChecklistItem = { id: string; area: string; label: string; note: string; status: ChecklistStatus };

export const lockedProductFlow = LOCKED_PRODUCT_FLOW;
export const sprintProgress = {
  sprint: 'PR-29 Repo release-gate + hygiene hardening',
  percent: 100,
  percentLabel: 'PR-01 through PR-29 are complete. Release-gate verification, drift control, and governed baseline hygiene now align to the shipped repo truth.',
};
export const sprintFocus = {
  sprint: 'PR-29 Repo release-gate + hygiene hardening',
  title: 'The governed baseline now carries one release-grade verification command plus repo-backed drift checks that keep routes, DCC, docs, and release posture aligned.',
  nextAction: 'No additional tracked PR is required. Preserve the release gate whenever repo truth changes.',
  flow: LOCKED_PRODUCT_FLOW.join(' -> '),
};
export const readinessSummary = {
  status: 'PR-29 complete',
  buildStatus: 'Typecheck, dashboard freeze, and repo consistency checks now pass. The release-proof build command is wired into the governed gate.',
  driftRisk: 'Very low — route truth, docs, DCC, and release posture are now guarded by one repo-backed release gate.',
  blockers: 'No tracked documentation or hygiene blockers remain.',
};
export const readinessAreas: ReadinessArea[] = [
  { title: 'Canonical routes', summary: 'Development, workspace mirror, preview, and planning surfaces remain removed from the shipped app.', status: 'done' },
  { title: 'Planning source of truth', summary: `The internal DCC at ${INTERNAL_DCC_PATH} replaces fragmented internal planning and readiness surfaces.`, status: 'done' },
  { title: 'Commercial continuity', summary: 'Accepted quotes now lock contract-grade commercial snapshots and line continuity into Contracts and downstream Orders.', status: 'done' },
  { title: 'Execution controls', summary: 'Orders now progress through explicit states backed by document, compliance, release, dispatch, and completion evidence.', status: 'done' },
  { title: 'Dashboard governance', summary: 'Dashboard routes operators toward evidence-backed blockers rather than decorative summary cards.', status: 'done' },
  { title: 'AI governance', summary: 'AI decision support is explainable, bounded, and action-safe across Leads, Quotes, Orders, and Dashboard.', status: 'done' },
  { title: 'Integrations governance', summary: 'Integrations validate inbound payloads, preserve continuity-aware retry posture, and queue governed outbound continuity syncs.', status: 'done' },
  { title: 'Documentation and SOPs', summary: 'README, product docs, demo assets, release checklist, DCC, SOPs, runbooks, and release proof reflect the shipped baseline.', status: 'done' },
  { title: 'Verification gate', summary: 'Clean verification, typecheck, dashboard freeze, docs consistency, route contract, and release-proof checks are all wired into one governed command.', status: 'done' },
];
export const checklistItems: ChecklistItem[] = [
  { id: 'routes', area: 'Product', label: 'Canonical routes only', note: 'Development, workspace mirror, preview, and planning routes are removed from the shipped app.', status: 'done' },
  { id: 'truth', area: 'Program', label: 'DCC is the internal planning source of truth', note: `Internal planning points to ${INTERNAL_DCC_PATH}.`, status: 'done' },
  { id: 'contracts', area: 'Workflow', label: 'Accepted quotes lock continuity into Contracts', note: 'Commercial snapshots and line continuity now persist downstream without weakening quote override approval logic.', status: 'done' },
  { id: 'orders', area: 'Workflow', label: 'Orders enforce governed execution evidence', note: 'Orders now expose draft, ready, released, dispatched, and completed posture with explicit blocker/action guidance.', status: 'done' },
  { id: 'dashboard', area: 'Product', label: 'Dashboard is action-first', note: 'The first viewport emphasizes delayed work, blocked work, urgent actions, and governed evidence routing.', status: 'done' },
  { id: 'ai', area: 'AI', label: 'AI decisions stay explainable and action-safe', note: 'Lead priority, quote risk, order delay posture, and governed decisions reuse workflow truth without mutating state automatically.', status: 'done' },
  { id: 'integrations', area: 'Integrations', label: 'Connector validation and bidirectional sync are explicit', note: 'The integrations workspace now exposes provider validation, continuity-aware sync logs, retry posture, and governed continuity payloads.', status: 'done' },
  { id: 'docs', area: 'Documentation', label: 'Customer-safe docs and internal SOPs exist', note: 'README, product docs, demo assets, architecture notes, workflow notes, DCC, SOPs, runbooks, and release proof now match the shipped baseline.', status: 'done' },
  { id: 'verify', area: 'Verification', label: 'Governed release proof command exists', note: 'Use the clean verification step, then run the repo-backed release proof command on the governed baseline.', status: 'done' },
];
