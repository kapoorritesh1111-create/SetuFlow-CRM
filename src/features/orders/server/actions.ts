'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { buildOrderExecutionSnapshot, evaluateOrderExecution, normalizeOrderExecutionState } from '@/lib/order-execution';
import { buildOrderOperationalControlState } from '@/lib/order-operations';

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
  const [{ data: quote }, { data: docs }, { data: compliance }, { data: lines }, { data: lead }, { data: leadMarkets }, { data: leadProducts }, { data: requirementRules }] = await Promise.all([
    db.from('quotes').select('id, status').eq('organization_id', workspace.organization.id).eq('id', quoteId).maybeSingle(),
    db.from('documents').select('id, file_name, doc_type, status, uploaded_at, version, related_id, related_entity, requirement_code, expires_at, review_notes').eq('organization_id', workspace.organization.id).in('related_entity', ['quote', 'lead']).in('related_id', [quoteId, leadId]),
    db.from('lead_compliance_items').select('id, status, compliance_item_id, submitted_at, approved_at').eq('organization_id', workspace.organization.id).eq('lead_id', leadId),
    db.from('contract_line_items').select('id').eq('contract_id', contractId),
    db.from('leads').select('id, lead_type').eq('organization_id', workspace.organization.id).eq('id', leadId).maybeSingle(),
    db.from('lead_markets').select('lead_id, market_id').eq('lead_id', leadId),
    db.from('lead_product_interests').select('lead_id, product_id').eq('lead_id', leadId),
    db.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active').eq('organization_id', workspace.organization.id).eq('is_active', true),
  ]);

  const operationalControls = buildOrderOperationalControlState({
    documents: Array.isArray(docs) ? docs : [],
    complianceItems: Array.isArray(compliance) ? compliance : [],
    requirementRules: Array.isArray(requirementRules) ? requirementRules : [],
    leadType: lead?.lead_type ?? null,
    marketIds: Array.isArray(leadMarkets) ? leadMarkets.map((item: any) => item.market_id).filter(Boolean) : [],
    productIds: Array.isArray(leadProducts) ? leadProducts.map((item: any) => item.product_id).filter(Boolean) : [],
  });

  const evaluation = evaluateOrderExecution({
    quoteAccepted: String(quote?.status ?? '').toLowerCase() === 'accepted',
    hasContract: true,
    contractStatus: contract.status,
    contractSignedAt: contract.signed_at,
    commercialLockState: contract.commercial_lock_state,
    lineCount: Array.isArray(lines) ? lines.length : 0,
    openDocumentBlockers: Array.isArray(docs) ? docs.filter((doc: any) => !['approved', 'complete', 'ready', 'completed'].includes(String(doc.status ?? '').toLowerCase())).length : 0,
    openComplianceBlockers: Array.isArray(compliance) ? compliance.filter((item: any) => !['approved', 'complete', 'waived', 'completed'].includes(String(item.status ?? '').toLowerCase())).length : 0,
    documentRequirementReasons: operationalControls.documentRequirementSummary.blockerReasons,
    complianceRequirementReasons: operationalControls.complianceSummary.blockerReasons,
    releaseArtifactReasons: operationalControls.releaseArtifactReasons,
    dispatchArtifactReasons: operationalControls.dispatchArtifactReasons,
    completionArtifactReasons: operationalControls.completionArtifactReasons,
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
    openDocumentBlockers: Array.isArray(docs) ? docs.filter((doc: any) => !['approved', 'complete', 'ready', 'completed'].includes(String(doc.status ?? '').toLowerCase())).length : 0,
    openComplianceBlockers: Array.isArray(compliance) ? compliance.filter((item: any) => !['approved', 'complete', 'waived', 'completed'].includes(String(item.status ?? '').toLowerCase())).length : 0,
    documentRequirementReasons: operationalControls.documentRequirementSummary.blockerReasons,
    complianceRequirementReasons: operationalControls.complianceSummary.blockerReasons,
    releaseArtifactReasons: operationalControls.releaseArtifactReasons,
    dispatchArtifactReasons: operationalControls.dispatchArtifactReasons,
    completionArtifactReasons: operationalControls.completionArtifactReasons,
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
  revalidatePath('/leads');
  redirect(buildRedirect(`order-state-progressed:${nextState}`));
}

export async function uploadOrderDocument(_: { error?: string; success?: string } | undefined, formData: FormData) {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canReviewCompliance = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canManage && !canReviewCompliance) return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'Your role cannot upload order documents.' };

  const contractId = String(formData.get('contract_id') ?? '').trim();
  const docType = String(formData.get('doc_type') ?? '').trim() || 'compliance_doc';
  const requirementCode = String(formData.get('requirement_code') ?? '').trim() || null;
  const fileValue = formData.get('file');
  if (!contractId) return { error: 'Contract ID is required.' };
  if (!(fileValue instanceof File) || fileValue.size <= 0) return { error: 'A document file is required.' };

  const db = (await createClient()) as any;
  const { data: contract, error: contractError } = await db.from('contracts').select('id, lead_id, quote_id, execution_state').eq('organization_id', workspace.organization.id).eq('id', contractId).maybeSingle();
  if (contractError) return { error: 'Could not verify the order before upload. Please refresh and retry.' };
  if (!contract?.id) return { error: 'Order contract not found.' };

  const now = new Date().toISOString();
  const safeName = fileValue.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'order-document';
  const storagePath = `${workspace.organization.id}/orders/${contractId}/${Date.now()}-${safeName}`;
  const upload = await db.storage.from('order-documents').upload(storagePath, fileValue, { upsert: false, contentType: fileValue.type || undefined });
  if (upload.error) return { error: 'Document storage is not ready for order uploads. Check the order-documents bucket/RLS, then retry.' };

  const { data: publicUrlData } = db.storage.from('order-documents').getPublicUrl(storagePath);
  const fileUrl = publicUrlData?.publicUrl ?? `supabase://order-documents/${storagePath}`;
  const { data: documentRow, error: documentError } = await db.from('documents').insert({ organization_id: workspace.organization.id, related_entity: 'contract', related_id: contractId, file_name: safeName, file_url: fileUrl, doc_type: docType, status: 'uploaded', uploaded_by: workspace.user.id, uploaded_at: now, version: 1, ...(requirementCode ? { requirement_code: requirementCode } : {}) }).select('id').single();
  if (documentError) return { error: 'The file uploaded, but the document record could not be linked to this order.' };

  await writeAuditLog({ organizationId: workspace.organization.id, action: 'document_status_changed', entityType: 'contract', entityId: contractId, actorUserId: workspace.user.id, payload: { previous: { execution_state: contract.execution_state ?? null }, new: { document_id: documentRow?.id ?? null, doc_type: docType, file_name: safeName }, metadata: { source: 'uploadOrderDocument', quote_id: contract.quote_id, lead_id: contract.lead_id, storage_bucket: 'order-documents', storage_path: storagePath } } });

  revalidatePath('/orders');
  revalidatePath('/documents');
  revalidatePath('/contracts');
  revalidatePath('/compliance');
  if (contract.lead_id) revalidatePath(`/leads/${contract.lead_id}`);
  return { success: 'Order document uploaded and linked.' };
}

// 1-arg wrapper for direct form action= use in orders/page.tsx
export async function uploadOrderDocumentAction(formData: FormData): Promise<void> {
  const result = await uploadOrderDocument(undefined, formData);
  if (result?.error) redirect(buildRedirect(`order-doc-upload-failed:${result.error}`));
  redirect(buildRedirect('order-doc-uploaded'));
}

/**
 * signContractAction
 *
 * Marks a contract as signed, locks commercial state, and records the audit event.
 * This unblocks order execution from draft → ready state.
 *
 * Requires: lead.manage capability (manager, owner, admin, sales) or
 *           compliance.review capability (manager, owner, admin, operations).
 *
 * Gate: contract must exist, belong to the org, and not already be signed.
 */
export async function signContractAction(formData: FormData) {
  if (!hasSupabaseEnv) redirect(buildRedirect('order-config-error'));

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect(buildRedirect('order-auth-error'));

  const canManage = hasWorkspaceCapability(workspace.currentRoles, 'lead.manage');
  const canReviewCompliance = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  if (!canManage && !canReviewCompliance) {
    const message =
      getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ??
      'Your role cannot sign contracts.';
    redirect(buildRedirect(`order-readonly:${message}`));
  }

  const contractId = String(formData.get('contract_id') ?? '').trim();
  if (!contractId) redirect(buildRedirect('order-action-invalid'));

  const db = (await createClient()) as any;

  const { data: contract, error: contractError } = await db
    .from('contracts')
    .select('id, quote_id, lead_id, status, signed_at, commercial_lock_state, execution_state')
    .eq('organization_id', workspace.organization.id)
    .eq('id', contractId)
    .maybeSingle();

  if (contractError || !contract?.id) redirect(buildRedirect('order-contract-missing'));

  // Idempotent — if already signed, redirect cleanly without error
  if (contract.signed_at || ['signed', 'active', 'completed'].includes(String(contract.status ?? '').toLowerCase())) {
    redirect(buildRedirect('order-state-progressed:ready'));
  }

  const now = new Date().toISOString();
  const { error: updateError } = await db
    .from('contracts')
    .update({
      signed_at: now,
      status: 'signed',
      commercial_lock_state: 'locked',
      updated_at: now,
    })
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
      previous: {
        status: contract.status ?? 'draft',
        signed_at: null,
        commercial_lock_state: contract.commercial_lock_state ?? null,
      },
      new: {
        status: 'signed',
        signed_at: now,
        commercial_lock_state: 'locked',
      },
      metadata: {
        source: 'signContractAction',
        quote_id: contract.quote_id,
        lead_id: contract.lead_id,
      },
    },
  });

  revalidatePath('/orders');
  revalidatePath('/contracts');
  revalidatePath('/quotes');
  if (contract.lead_id) revalidatePath(`/leads/${contract.lead_id}`);

  redirect(buildRedirect('order-state-progressed:ready'));
}
