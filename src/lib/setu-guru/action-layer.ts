import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/auditLog';

// Local loosely-typed DB reader — avoids generated-type constraints on new/jsonb columns
type AnyRow = Record<string, unknown>;
type AnyQuery = PromiseLike<{ data: AnyRow | AnyRow[] | null; error?: unknown }> & {
  select: (cols: string) => AnyQuery;
  eq: (col: string, val: unknown) => AnyQuery;
  contains: (col: string, val: unknown) => AnyQuery;
  maybeSingle: () => Promise<{ data: AnyRow | null; error?: unknown }>;
  insert: (row: AnyRow) => AnyQuery;
};
type AnyDB = { from: (table: string) => AnyQuery };

export type SetuGuruActionType =
  | 'apply_hsn'
  | 'queue_payment_request'
  | 'queue_freight_request'
  | 'queue_finance_handoff'
  | 'flag_lead_for_review'
  | 'draft_dispatch_checklist';

export type SetuGuruActionInput = {
  actionType: SetuGuruActionType;
  organizationId: string;
  actorUserId: string;
  entityId: string;
  entityType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

export type SetuGuruActionPreview = {
  actionType: SetuGuruActionType;
  entityId: string;
  entityType: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: true;
  approvalMessage: string;
  idempotencyKey: string;
};

export type SetuGuruActionResult = {
  ok: boolean;
  actionType: SetuGuruActionType;
  entityId: string;
  auditLogId?: string;
  message: string;
};

const RISK_MAP: Record<SetuGuruActionType, 'low' | 'medium' | 'high'> = {
  apply_hsn: 'medium',
  queue_payment_request: 'high',
  queue_freight_request: 'medium',
  queue_finance_handoff: 'high',
  flag_lead_for_review: 'low',
  draft_dispatch_checklist: 'low',
};

const SUMMARY_MAP: Record<SetuGuruActionType, string> = {
  apply_hsn: 'Apply reviewed HSN code to product catalog.',
  queue_payment_request: 'Queue a payment request against this order.',
  queue_freight_request: 'Create a freight rate request for this order.',
  queue_finance_handoff: 'Queue finance/invoice handoff for this order.',
  flag_lead_for_review: 'Flag this lead for operator review.',
  draft_dispatch_checklist: 'Generate a dispatch evidence checklist (read-only draft).',
};

export function buildActionPreview(input: Omit<SetuGuruActionInput, 'actorUserId'>): SetuGuruActionPreview {
  return {
    actionType: input.actionType,
    entityId: input.entityId,
    entityType: input.entityType,
    summary: SUMMARY_MAP[input.actionType] ?? 'Setu Guru action.',
    riskLevel: RISK_MAP[input.actionType] ?? 'high',
    requiresApproval: true,
    approvalMessage: `Human approval required before Setu Guru executes: ${SUMMARY_MAP[input.actionType] ?? input.actionType}`,
    idempotencyKey: input.idempotencyKey,
  };
}

export async function executeApprovedAction(input: SetuGuruActionInput): Promise<SetuGuruActionResult> {
  const db = (await createClient()) as unknown as AnyDB;

  // Idempotency check — read audit_logs for matching key
  const { data: existing } = await db
    .from('audit_logs')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('action', `setu_guru_action_${input.actionType}`)
    .maybeSingle();

  // Check idempotency key in payload manually (contains() on jsonb causes type issues)
  if (existing && typeof existing === 'object') {
    const row = existing as AnyRow;
    const p = row.payload as Record<string, unknown> | null;
    if (p?.idempotency_key === input.idempotencyKey) {
      return {
        ok: false,
        actionType: input.actionType,
        entityId: input.entityId,
        message: 'This action was already executed (idempotency key matched). No changes made.',
      };
    }
  }

  // Write audit log before any mutation
  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: `setu_guru_action_${input.actionType}`,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: { ...input.payload, idempotency_key: input.idempotencyKey, approved_by_human: true },
  });

  // draft_dispatch_checklist is read-only — no DB mutation
  if (input.actionType === 'draft_dispatch_checklist') {
    return { ok: true, actionType: input.actionType, entityId: input.entityId, message: 'Dispatch checklist drafted. No order state was changed.' };
  }

  // flag_lead_for_review — add a lead activity note
  if (input.actionType === 'flag_lead_for_review') {
    await db.from('lead_activities').insert({
      organization_id: input.organizationId,
      lead_id: input.entityId,
      actor_user_id: input.actorUserId,
      activity_type: 'note',
      summary: String(input.payload.note ?? 'Setu Guru flagged this lead for operator review.'),
    });
    return { ok: true, actionType: input.actionType, entityId: input.entityId, message: 'Lead flagged for review. Activity note recorded.' };
  }

  return {
    ok: true,
    actionType: input.actionType,
    entityId: input.entityId,
    message: `Action ${input.actionType} logged and queued. Human must confirm execution in the relevant workspace.`,
  };
}
