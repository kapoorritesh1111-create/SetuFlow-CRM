import { INTERNAL_DCC_PATH, LOCKED_PRODUCT_FLOW } from '@/lib/product-contract';

export type ChecklistStatus = 'done' | 'current' | 'planned' | 'locked';
export type ReadinessArea = { title: string; summary: string; status: ChecklistStatus };
export type ChecklistItem = { id: string; area: string; label: string; note: string; status: ChecklistStatus };

export const lockedProductFlow = LOCKED_PRODUCT_FLOW;
export const sprintProgress = {
  sprint: 'PR-UX-01 complete',
  percent: 81,
  percentLabel:
    'Navigation and information architecture now reflect the operator path, but the modules themselves still need compression before the product can honestly claim 96%+ readiness.',
};
export const sprintFocus = {
  sprint: 'PR-UX stack in progress',
  title:
    'The shell now tells the truth. The next work should compress follow-up, quote, send, and execution into fewer and clearer operating decisions without weakening governed commercial controls.',
  nextAction:
    'Keep the DCC as the first truth surface, keep the operator shell stable, and attack module-level friction rather than reopening shell drift.',
  flow: LOCKED_PRODUCT_FLOW.join(' -> '),
};
export const readinessSummary = {
  status: 'Overall readiness 81%, PR-UX stack active',
  buildStatus:
    'Demoable and materially clearer, but still not buyer-finished because approval/send, orders/execution, and contextual next-step guidance remain split across multiple surfaces.',
  driftRisk:
    'Low in shell truth, medium in module cohesion, medium in production operations because infrastructure-scale controls remain outside repo-only proof.',
  blockers:
    'No shell blocker remains from PR-UX-01; the remaining blockers are module compression, stronger next-step guidance, and final 96% polish.',
};
export const readinessAreas: ReadinessArea[] = [
  { title: 'Capture', summary: 'Understandable in the shell, but still needs tighter handoff into follow-up.', status: 'current' },
  { title: 'Follow-up', summary: 'Strong operating spine, but still too cognitively dense.', status: 'current' },
  { title: 'Quote', summary: 'Governed commercial truth remains the strongest differentiator.', status: 'done' },
  { title: 'Approval / Send', summary: 'Now visible, but the route still behaves too much like an integrations surface.', status: 'current' },
  { title: 'Orders / Execution', summary: 'Commercial continuity is strong; execution posture still feels fragmented.', status: 'current' },
  { title: 'Exceptions / Risks', summary: 'Better positioned and easier to understand, but rescue guidance still needs work.', status: 'current' },
  { title: 'Catalog / Settings / Admin', summary: `Governed setup truth is clearer and remains downstream of ${INTERNAL_DCC_PATH}.`, status: 'current' },
  { title: 'AI', summary: 'Bounded correctly, still too sidecar-like to count as mature in-flow guidance.', status: 'planned' },
  { title: 'Documentation', summary: `DCC at ${INTERNAL_DCC_PATH} is the active truth surface for readiness, PR-UX status, and workflow direction.`, status: 'done' },
];
export const checklistItems: ChecklistItem[] = [
  { id: 'dcc', area: 'Documentation', label: 'DCC stays source of truth', note: `All current readiness truth remains centered in ${INTERNAL_DCC_PATH}.`, status: 'done' },
  { id: 'pricing', area: 'Workflow', label: 'Pricing rule stays locked', note: 'Base price, override reason, and approval must not be weakened.', status: 'locked' },
  { id: 'shell', area: 'Navigation', label: 'Operator shell remains task-first', note: 'Capture, Follow-up, Quote, Approval / Send, Orders / Execution, Exceptions / Risks, Catalog, and Settings stay explicit.', status: 'done' },
  { id: 'quotes', area: 'Workflow', label: 'Quote truth and order truth stay reconciled', note: 'Accepted quotes remain the operational handoff into Orders / Execution.', status: 'done' },
  { id: 'communications', area: 'Communications', label: 'Send surfaces stay governed', note: 'Outbound communication cannot outrun approval or accepted commercial truth.', status: 'done' },
  { id: 'risk', area: 'Workflow', label: 'Risk review remains visible', note: 'Exceptions / Risks must continue to expose blockers, aging work, and rescue decisions.', status: 'current' },
  { id: 'ai-provider', area: 'AI', label: 'AI posture stays explicit', note: 'AI remains assistive and bounded, with no autonomous approval or execution authority.', status: 'done' },
  { id: 'module-compression', area: 'UX', label: 'Module compression is the next priority', note: 'The next PR-UX passes must reduce route switching and summary duplication inside live work surfaces.', status: 'current' },
  { id: 'ops-gap', area: 'Operations', label: 'Production controls are still called out honestly', note: 'Secrets rotation, WAF, alerting, and external audits remain outside repo-only proof.', status: 'current' },
];
