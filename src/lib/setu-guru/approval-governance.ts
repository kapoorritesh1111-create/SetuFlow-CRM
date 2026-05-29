import { writeAuditLog } from '@/lib/auditLog';
import { SETU_GURU_RESPONSE_POLICY } from './guru-response-policy';

export type GovernedActionCategory =
  | 'hsn_write_back'
  | 'pricing_default_change'
  | 'compliance_waiver'
  | 'quote_send'
  | 'order_advancement'
  | 'finance_handoff'
  | 'freight_booking'
  | 'dispatch_confirm';

export type GovernanceCheckInput = {
  category: GovernedActionCategory;
  organizationId: string;
  actorUserId: string;
  entityId?: string;
  entityType?: string;
  context?: Record<string, unknown>;
};

export type GovernanceCheckResult = {
  allowed: boolean;
  category: GovernedActionCategory;
  reason: string;
  requiresHumanApproval: true;
  approvalGuidance: string;
  blockedBy?: string;
};

const GOVERNANCE_RULES: Record<GovernedActionCategory, { guidance: string; blocker: string }> = {
  hsn_write_back: {
    guidance: 'Run source-backed HSN research first. Show the candidate code and source to a human. Apply only after explicit approval.',
    blocker: 'HSN write-back requires: source-backed research result + human approval via Approve Catalog HSN Update button.',
  },
  pricing_default_change: {
    guidance: 'Review current pricing defaults in Admin → Pricing Engine. Any change must be approved by an admin user before saving.',
    blocker: 'Pricing default changes require admin role and explicit save confirmation. Setu Guru cannot change defaults without approval.',
  },
  compliance_waiver: {
    guidance: 'Compliance waivers require the waiving user to confirm the business reason. Setu Guru can draft the justification but cannot submit it.',
    blocker: 'Compliance waivers require explicit human confirmation in the Compliance workspace. Setu Guru cannot waive compliance items.',
  },
  quote_send: {
    guidance: 'Quotes must pass the compliance gate before sending. The Send action requires the operator to confirm recipient and version in the Quote Builder.',
    blocker: 'Quote send requires passing compliance checks and explicit operator confirmation. Setu Guru cannot trigger a send.',
  },
  order_advancement: {
    guidance: 'Order stage advancement follows the canonical stage command. Each gate must be previewed and approved by a human before the stage moves.',
    blocker: 'Order advancement requires human gate approval in the Orders workspace. Setu Guru cannot advance order stages.',
  },
  finance_handoff: {
    guidance: 'Finance handoff queues an invoice for the accounting system. This must be reviewed by a finance approver before the sync completes.',
    blocker: 'Finance handoff requires a finance approver to confirm the invoice before sync. Setu Guru can queue but not confirm.',
  },
  freight_booking: {
    guidance: 'Freight booking requires selecting a quoted rate and confirming the booking. This must be done by the operator in the Orders Freight Queue.',
    blocker: 'Freight booking requires operator confirmation in the Freight Queue. Setu Guru cannot book freight.',
  },
  dispatch_confirm: {
    guidance: 'Dispatch confirmation requires all dispatch evidence (packing list, delivery note, COA if required) to be uploaded and gate-approved.',
    blocker: 'Dispatch confirmation requires gate approval and evidence upload. Setu Guru cannot confirm dispatch.',
  },
};

export function checkGovernance(input: GovernanceCheckInput): GovernanceCheckResult {
  const rule = GOVERNANCE_RULES[input.category];
  // All governed actions require human approval — this is unconditional
  return {
    allowed: false,
    category: input.category,
    reason: `${input.category} is a governed action that always requires human approval.`,
    requiresHumanApproval: true,
    approvalGuidance: rule.guidance,
    blockedBy: rule.blocker,
  };
}

export function isGovernedAction(question: string): boolean {
  const q = question.toLowerCase();
  return SETU_GURU_RESPONSE_POLICY.humanApprovalRequiredFor.some((term) => q.includes(term.toLowerCase()));
}

export function getGovernanceCategory(question: string): GovernedActionCategory | null {
  const q = question.toLowerCase();
  if (q.includes('hsn') || q.includes('hs code') || q.includes('update catalog')) return 'hsn_write_back';
  if (q.includes('pricing default') || q.includes('change pricing')) return 'pricing_default_change';
  if (q.includes('waive') || q.includes('compliance')) return 'compliance_waiver';
  if (q.includes('send quote') || q.includes('quote send')) return 'quote_send';
  if (q.includes('advance order') || q.includes('order stage')) return 'order_advancement';
  if (q.includes('finance') || q.includes('invoice sync')) return 'finance_handoff';
  if (q.includes('freight') || q.includes('book freight')) return 'freight_booking';
  if (q.includes('dispatch') || q.includes('mark dispatched')) return 'dispatch_confirm';
  return null;
}

export async function logGovernanceBlock(input: GovernanceCheckInput & { organizationId: string; actorUserId: string }) {
  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: 'setu_guru_governance_block',
    entityType: input.entityType ?? 'governance',
    entityId: input.entityId,
    payload: { category: input.category, context: input.context ?? {} },
  });
}
