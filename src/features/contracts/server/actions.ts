'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getLeadProgressionGuard } from '@/lib/document-requirements';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

export type ContractActionState = { error?: string; success?: string };

type ContractStatus = 'draft' | 'signed' | 'active' | 'completed' | 'cancelled';

const ALLOWED_STATUSES: ContractStatus[] = ['draft', 'signed', 'active', 'completed', 'cancelled'];

function normalizeContractStatus(value: string | null | undefined): ContractStatus | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ALLOWED_STATUSES.includes(normalized as ContractStatus) ? (normalized as ContractStatus) : null;
}

function nextAllowedStatuses(status: ContractStatus | null | undefined): ContractStatus[] {
  const value = status ?? 'draft';
  if (value === 'draft') return ['signed', 'cancelled'];
  if (value === 'signed') return ['active', 'cancelled'];
  if (value === 'active') return ['completed', 'cancelled'];
  if (value === 'completed' || value === 'cancelled') return ['active'];
  return [];
}



async function writeContractAuditLog(input: {
  organizationId: string;
  actorUserId: string;
  action: 'contract_progressed' | 'contract_updated';
  contractId: string;
  previous?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  await writeAuditLog({
    organizationId: input.organizationId,
    action: input.action,
    entityType: 'contract',
    entityId: input.contractId,
    actorUserId: input.actorUserId,
    payload: {
      previous: input.previous ?? null,
      new: input.next ?? null,
      metadata: input.metadata ?? {},
    },
  });
}

export async function updateContractWorkspaceDetails(
  _: ContractActionState | undefined,
  formData: FormData,
): Promise<ContractActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your current role cannot update contract workspace details.' };
  }

  const contractId = String(formData.get('contract_id') ?? '').trim();
  const startsOn = String(formData.get('starts_on') ?? '').trim();
  const endsOn = String(formData.get('ends_on') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  if (!contractId) return { error: 'Contract is required.' };

  const db = (await createClient()) as any;
  const { data: updateResult, error: updateContractTxError } = await db.rpc('app_update_contract_workspace_details_tx', {
    p_payload: {
      organization_id: workspace.organization.id,
      contract_id: contractId,
      actor_user_id: workspace.user.id,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      notes: notes || null,
      action_source: 'updateContractWorkspaceDetails',
    },
  });
  if (updateContractTxError) return { error: updateContractTxError.message };

  const updatedContract = Array.isArray(updateResult) ? updateResult[0] : updateResult;
  const leadId = typeof updatedContract?.lead_id === 'string' ? updatedContract.lead_id : null;

  revalidatePath('/contracts');
  revalidatePath('/documents');
  revalidatePath('/compliance');
  revalidatePath('/leads');
  if (leadId) revalidatePath(`/leads/${leadId}`);
  return { success: typeof updatedContract?.subject === 'string' ? updatedContract.subject : 'Contract workspace updated.' };
}

export async function progressContract(
  _: ContractActionState | undefined,
  formData: FormData,
): Promise<ContractActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'quote.send')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'quote.send') ?? 'Your current role cannot progress contracts.' };
  }

  const contractId = String(formData.get('contract_id') ?? '').trim();
  const nextStatus = normalizeContractStatus(String(formData.get('next_status') ?? ''));
  const notes = String(formData.get('notes') ?? '').trim();
  if (!contractId) return { error: 'Contract is required.' };
  if (!nextStatus) return { error: 'Contract status is invalid.' };

  const db = (await createClient()) as any;
  const { data: contract, error: contractError } = await db
    .from('contracts')
    .select('id, lead_id, quote_id, status, starts_on, ends_on')
    .eq('organization_id', workspace.organization.id)
    .eq('id', contractId)
    .maybeSingle();
  if (contractError) return { error: contractError.message };
  if (!contract?.id) return { error: 'Contract not found.' };

  const currentStatus = normalizeContractStatus(contract.status) ?? 'draft';
  if (!nextAllowedStatuses(currentStatus).includes(nextStatus)) {
    return { error: `Contract cannot move from ${currentStatus} to ${nextStatus}.` };
  }

  const { data: leadRecord, error: leadError } = await db
    .from('leads')
    .select('id, lead_type')
    .eq('organization_id', workspace.organization.id)
    .eq('id', contract.lead_id)
    .maybeSingle();
  if (leadError) return { error: leadError.message };
  if (!leadRecord) return { error: 'Linked lead context is missing for this contract.' };
  if (!contract.quote_id) return { error: 'Linked quote context is missing for this contract.' };

  if (['signed', 'active', 'completed'].includes(nextStatus)) {
    const guard = await getLeadProgressionGuard(db, {
      organizationId: workspace.organization.id,
      leadId: leadRecord.id,
      leadType: String(leadRecord.lead_type ?? ''),
      scope: 'contract_progression',
    });

    if (guard.blockerCount > 0) {
      await writeContractAuditLog({
        organizationId: workspace.organization.id,
        actorUserId: workspace.user.id,
        action: 'contract_progressed',
        contractId,
        previous: { status: currentStatus },
        next: { status: nextStatus },
        metadata: { source: 'progressContract', blocked: true, reason: guard.blockerReasons.join('; '), blocker_count: guard.blockerCount },
      });
      return { error: `Contract cannot progress yet: ${guard.blockerReasons.join('; ')}` };
    }
  }

  const { data: progressedContractResult, error: progressContractTxError } = await db.rpc('app_progress_contract_with_fanout_tx', {
    p_organization_id: workspace.organization.id,
    p_contract_id: contractId,
    p_actor_user_id: workspace.user.id,
    p_next_status: nextStatus,
    p_notes: notes || null,
    p_action_source: 'progressContract',
  });
  if (progressContractTxError) return { error: progressContractTxError.message };

  const progressedContract = Array.isArray(progressedContractResult) ? progressedContractResult[0] : progressedContractResult;
  const subject = typeof progressedContract?.subject === 'string' ? progressedContract.subject : 'Contract updated';

  if (['signed', 'active', 'completed'].includes(nextStatus) && contract.quote_id) {
    await db.from('quotes').update({ status: 'converted' }).eq('id', contract.quote_id).eq('organization_id', workspace.organization.id);
    revalidatePath('/quotes');
    revalidatePath('/orders');
  }

  revalidatePath('/contracts');
  revalidatePath('/documents');
  revalidatePath('/compliance');
  revalidatePath('/leads');
  revalidatePath(`/leads/${contract.lead_id}`);
  return { success: subject };
}
