'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { buildOrderExecutionSnapshot, evaluateOrderExecution, normalizeOrderExecutionState } from '@/lib/order-execution';

function buildRedirect(notice: string) {
  return `/orders?notice=${encodeURIComponent(notice)}`;
}

export async function progressOrderExecution(formData: FormData) {
  if (!hasSupabaseEnv) redirect(buildRedirect('order-config-error'));

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect(buildRedirect('order-auth-error'));
  const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canReviewCompliance = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canManage && !canReviewCompliance) {
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot progress order execution.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }

  const contractId = String(formData.get('contract_id') ?? '').trim();
  const nextState = normalizeOrderExecutionState(String(formData.get('next_state') ?? ''));
  if (!contractId || !nextState) redirect(buildRedirect('order-action-invalid'));

  const db = (await createClient()) as any;
  const { data: contract, error: contractError } = await db
    .from('contracts')
    .select('id, lead_id, quote_id, status, signed_at, commercial_lock_state, execution_state, execution_snapshot')
    .eq('organization_id', workspace.organization.id)
    .eq('id', contractId)
    .maybeSingle();
  if (contractError || !contract?.id) redirect(buildRedirect('order-contract-missing'));

  const quoteId = contract.quote_id as string;
  const leadId = contract.lead_id as string;
  const [{ data: quote }, { data: docs }, { data: compliance }, { data: lines }] = await Promise.all([
    db.from('quotes').select('id, status').eq('organization_id', workspace.organization.id).eq('id', quoteId).maybeSingle(),
    db.from('documents').select('id, status').eq('organization_id', workspace.organization.id).eq('related_entity', 'quote').eq('related_id', quoteId),
    db.from('lead_compliance_items').select('id, status').eq('lead_id', leadId),
    db.from('contract_line_items').select('id').eq('contract_id', contractId),
  ]);

  const evaluation = evaluateOrderExecution({
    quoteAccepted: String(quote?.status ?? '').toLowerCase() === 'accepted',
    hasContract: true,
    contractStatus: contract.status,
    contractSignedAt: contract.signed_at,
    commercialLockState: contract.commercial_lock_state,
    lineCount: Array.isArray(lines) ? lines.length : 0,
    openDocumentBlockers: Array.isArray(docs) ? docs.filter((doc: any) => !['approved', 'complete', 'ready'].includes(String(doc.status ?? '').toLowerCase())).length : 0,
    openComplianceBlockers: Array.isArray(compliance) ? compliance.filter((item: any) => !['approved', 'complete', 'waived', 'completed'].includes(String(item.status ?? '').toLowerCase())).length : 0,
    currentState: contract.execution_state,
  });

  if (evaluation.nextState !== nextState) {
    redirect(buildRedirect('order-state-out-of-sequence'));
  }
  if (!evaluation.canAdvance) {
    redirect(buildRedirect(`order-state-blocked:${evaluation.blockers.join(' | ')}`));
  }

  const now = new Date().toISOString();
  const nextSnapshot = buildOrderExecutionSnapshot({
    quoteAccepted: String(quote?.status ?? '').toLowerCase() === 'accepted',
    hasContract: true,
    contractStatus: contract.status,
    contractSignedAt: contract.signed_at,
    commercialLockState: contract.commercial_lock_state,
    lineCount: Array.isArray(lines) ? lines.length : 0,
    openDocumentBlockers: Array.isArray(docs) ? docs.filter((doc: any) => !['approved', 'complete', 'ready'].includes(String(doc.status ?? '').toLowerCase())).length : 0,
    openComplianceBlockers: Array.isArray(compliance) ? compliance.filter((item: any) => !['approved', 'complete', 'waived', 'completed'].includes(String(item.status ?? '').toLowerCase())).length : 0,
    currentState: nextState,
    releasedAt: nextState === 'released' ? now : null,
    dispatchedAt: nextState === 'dispatched' ? now : null,
    completedAt: nextState === 'completed' ? now : null,
  });

  const updatePayload: Record<string, any> = {
    execution_state: nextState,
    execution_blockers: nextSnapshot.blockers,
    execution_snapshot: nextSnapshot,
    updated_at: now,
  };
  if (nextState === 'ready') updatePayload.ready_at = now;
  if (nextState === 'released') updatePayload.released_at = now;
  if (nextState === 'dispatched') updatePayload.dispatched_at = now;
  if (nextState === 'completed') updatePayload.completed_at = now;

  const { error: updateError } = await db
    .from('contracts')
    .update(updatePayload)
    .eq('organization_id', workspace.organization.id)
    .eq('id', contractId);
  if (updateError) redirect(buildRedirect('order-update-failed'));

  await writeAuditLog({
    organizationId: workspace.organization.id,
    action: 'contract_updated',
    entityType: 'contract',
    entityId: contractId,
    actorUserId: workspace.user.id,
    payload: {
      previous: { execution_state: contract.execution_state ?? 'draft' },
      new: { execution_state: nextState },
      metadata: { source: 'progressOrderExecution', quote_id: quoteId, lead_id: leadId, blockers_cleared: evaluation.blockers.length === 0 },
    },
  });

  revalidatePath('/orders');
  revalidatePath('/contracts');
  revalidatePath('/documents');
  revalidatePath('/compliance');
  revalidatePath('/pipeline');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/quote`);
  redirect(buildRedirect(`order-state-progressed:${nextState}`));
}
