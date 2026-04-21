import { INTERNAL_DCC_PATH, LOCKED_PRODUCT_FLOW } from '@/lib/product-contract';

export type ChecklistStatus = 'done' | 'current' | 'planned' | 'locked';
export type ReadinessArea = { title: string; summary: string; status: ChecklistStatus };
export type ChecklistItem = { id: string; area: string; label: string; note: string; status: ChecklistStatus };

export const lockedProductFlow = LOCKED_PRODUCT_FLOW;
export const sprintProgress = {
  sprint: 'PR-36 complete, planned readiness stack closed',
  percent: 93,
  percentLabel: 'The repo now combines a verified buyer journey, bounded AI, governed communications, explicit hardening, and an investor-ready proof package that stays inside honest repo-level claims.',
};
export const sprintFocus = {
  sprint: 'Post-PR maintenance and diligence support',
  title: 'The planned readiness passes are complete. The next work should focus on live operations maturity, scale proof, and external validation without weakening the governed commercial contract.',
  nextAction: 'Keep the DCC as the first truth surface, preserve the locked commercial rule, and treat future work as post-PR evidence expansion rather than another readiness rewrite.',
  flow: LOCKED_PRODUCT_FLOW.join(' -> '),
};
export const readinessSummary = {
  status: 'Overall readiness 93%, planned PR stack closed',
  buildStatus: 'Demoable, handoff-ready, and materially more defensible for buyer and investor diligence because product proof, doc proof, and deferred operating work are now separated cleanly.',
  driftRisk: 'Low in workflow truth and documentation alignment, medium in production operations because infrastructure-scale controls remain outside repo scope.',
  blockers: 'No remaining planned PR blockers inside the current readiness stack; remaining work is production-operations maturity and external validation.',
};
export const readinessAreas: ReadinessArea[] = [
  { title: 'Leads', summary: 'Strong and still part of the verified buyer-entry gate.', status: 'done' },
  { title: 'Pipeline', summary: 'Strong guided-view sequence for demos.', status: 'done' },
  { title: 'Quotes', summary: 'Governed commercial truth remains strong and protected.', status: 'done' },
  { title: 'Orders / Contracts', summary: 'Continuity remains anchored to accepted quote truth.', status: 'done' },
  { title: 'Dashboard', summary: 'Good guided-view surface with stronger investor-facing clarity.', status: 'done' },
  { title: 'Contact Exchange', summary: 'Differentiated and understandable, though not the primary diligence driver.', status: 'done' },
  { title: 'Product management', summary: 'Strong catalog and base-price posture.', status: 'done' },
  { title: 'AI', summary: 'Provider-backed, assistive, and clearly bounded. Strong for demonstration, intentionally non-autonomous.', status: 'done' },
  { title: 'Integrations', summary: 'Control plane and communication evidence are aligned, but provider operations remain partial.', status: 'current' },
  { title: 'Documentation', summary: `DCC at ${INTERNAL_DCC_PATH} is the active truth surface and investor-facing docs are now aligned to it.`, status: 'done' },
];
export const checklistItems: ChecklistItem[] = [
  { id: 'dcc', area: 'Documentation', label: 'DCC is source of truth', note: `All current readiness truth should remain centered in ${INTERNAL_DCC_PATH}.`, status: 'done' },
  { id: 'pricing', area: 'Workflow', label: 'Pricing rule stays locked', note: 'Base price, override reason, and approval must not be weakened.', status: 'locked' },
  { id: 'lead', area: 'Workflow', label: 'Lead readiness remains upstream of quote progress', note: 'Qualification, product linkage, and market readiness stay visibly upstream of quote progression.', status: 'done' },
  { id: 'quotes', area: 'Workflow', label: 'Quote truth and order truth stay reconciled', note: 'Accepted quotes remain the operational handoff into Orders and Contracts.', status: 'done' },
  { id: 'communications', area: 'Communications', label: 'Email and WhatsApp stay governed', note: 'Quote-share communication can queue provider delivery events and cannot outrun quote approval truth.', status: 'done' },
  { id: 'buyer-journey', area: 'Demo', label: 'One buyer journey remains verified', note: 'The repo keeps one coherent walkthrough from qualified lead to order continuity and sync evidence.', status: 'done' },
  { id: 'ai-provider', area: 'AI', label: 'AI provider posture stays explicit', note: 'Anthropic-backed assistive workflows are supported, safe fallback exists, and unsupported providers are called out honestly.', status: 'done' },
  { id: 'ai-guardrails', area: 'AI', label: 'AI guardrails stay explicit', note: 'AI cannot approve pricing, change record state, clear blockers, or execute orders autonomously.', status: 'done' },
  { id: 'security-headers', area: 'Security', label: 'Baseline response-security headers are centralized', note: 'Middleware applies CSP, frame denial, referrer policy, nosniff, permissions policy, and cross-origin protections.', status: 'done' },
  { id: 'setup', area: 'Setup', label: 'Runtime and verification expectations are explicit', note: 'README explains install, run, and verify expectations for cleaner handoff.', status: 'done' },
  { id: 'cleanup', area: 'Repo hygiene', label: 'Repo cleanup posture is explicit', note: 'Active truth surfaces are separated from archive candidates and generated artifacts.', status: 'done' },
  { id: 'investor-package', area: 'Investor readiness', label: 'Investor proof is now packaged cleanly', note: 'Investor-facing docs now separate repo proof, aligned-readiness proof, and deferred operating proof.', status: 'done' },
  { id: 'ops-gap', area: 'Operations', label: 'Production controls are still called out honestly', note: 'Secrets rotation, WAF, alerting, and external audits remain outside repo-only proof.', status: 'current' },
];
