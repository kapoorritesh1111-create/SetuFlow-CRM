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
import type { Database } from '@/types/database';

type ContractUpdate = Database['public']['Tables']['contracts']['Update'];
type OperationalControlInput = Parameters<typeof buildOrderOperationalControlState>[0];
type OrderActionError = { message?: string; code?: string; details?: string; hint?: string } | null;
type QueryResult<T> = { data: T; error: OrderActionError };
type QueryChain<T = unknown> = PromiseLike<QueryResult<T>> & {
  select(columns: string): QueryChain<T>;
  eq(column: string, value: unknown): QueryChain<T>;
  in(column: string, values: readonly unknown[]): QueryChain<T>;
  order(column: string, options?: { ascending?: boolean }): QueryChain<T>;
  limit(count: number): QueryChain<T>;
  maybeSingle(): Promise<QueryResult<T | null>>;
  single(): Promise<QueryResult<T>>;
  insert(payload: unknown): QueryChain<T>;
  update(payload: unknown): QueryChain<T>;
  delete(): QueryChain<T>;
};
type StorageBucket = {
  upload(path: string, file: File, options?: { upsert?: boolean; contentType?: string }): Promise<{ error: OrderActionError }>;
  getPublicUrl(path: string): { data: { publicUrl?: string | null } | null };
};
type OrderActionDb = {
  from<T = unknown>(table: string): QueryChain<T>;
  storage: { from(bucket: string): StorageBucket };
};
type ProgressContractRow = {
  id: string;
  lead_id: string | null;
  quote_id: string | null;
  status: string | null;
  signed_at: string | null;
  commercial_lock_state: string | null;
  execution_state: string | null;
  execution_snapshot?: unknown;
};
type QuoteStatusRow = { id: string; status: string | null };
type LeadTypeRow = { id: string; lead_type: string | null };
type MarketInterestRow = { lead_id: string | null; market_id: string | null };
type ProductInterestRow = { lead_id: string | null; product_id: string | null };
type StatusRow = { status?: string | null };
type UploadContractRow = { id: string; lead_id: string | null; quote_id: string | null; execution_state: string | null };
type DocumentInsertRow = { id: string };
type SignContractRow = {
  id: string;
  quote_id: string | null;
  lead_id: string | null;
  status: string | null;
  signed_at: string | null;
  commercial_lock_state: string | null;
  execution_state: string | null;
};

function buildRedirect(notice: string) {
  return `/orders?notice=${encodeURIComponent(notice)}`;
}

async function createOrderActionDb(): Promise<OrderActionDb> {
  return (await createClient()) as unknown as OrderActionDb;
}

function toStatusRows(value: unknown): StatusRow[] {
  return Array.isArray(value) ? (value as StatusRow[]) : [];
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

  const db = await createOrderActionDb();
  const { data: contractData, error: contractError } = await db
    .from('contracts')
    .select('id, lead_id, quote_id, status, signed_at, commercial_lock_state, execution_state, execution_snapshot')
    .eq('organization_id', workspace.organization.id)
    .eq('id', contractId)
    .maybeSingle();
  const contract = contractData as ProgressContractRow | null;
  if (contractError || !contract?.id) redirect(buildRedirect('order-contract-missing'));

  const quoteId = String(contract.quote_id ?? '');
  const leadId = String(contract.lead_id ?? '');
  const [quoteResult, docsResult, complianceResult, linesResult, leadResult, leadMarketsResult, leadProductsResult, requirementRulesResult] = await Promise.all([
    db.from('quotes').select('id, status').eq('organization_id', workspace.organization.id).eq('id', quoteId).maybeSingle(),
    db.from('documents').select('id, file_name, doc_type, status, uploaded_at, version, related_id, related_entity, requirement_code, expires_at, review_notes').eq('organization_id', workspace.organization.id).in('related_entity', ['quote', 'lead']).in('related_id', [quoteId, leadId]),
    db.from('lead_compliance_items').select('id, status, compliance_item_id, submitted_at, approved_at').eq('organization_id', workspace.organization.id).eq('lead_id', leadId),
    db.from('contract_line_items').select('id').eq('contract_id', contractId),
    db.from('leads').select('id, lead_type').eq('organization_id', workspace.organization.id).eq('id', leadId).maybeSingle(),
    db.from('lead_markets').select('lead_id, market_id').eq('lead_id', leadId),
    db.from('lead_product_interests').select('lead_id, product_id').eq('lead_id', leadId),
    db.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active').eq('organization_id', workspace.organization.id).eq('is_active', true),
  ]);

  const quote = quoteResult.data as QuoteStatusRow | null;
  const docs = Array.isArray(docsResult.data) ? (docsResult.data as OperationalControlInput['documents']) : [];
  const compliance = Array.isArray(complianceResult.data) ? (complianceResult.data as OperationalControlInput['complianceItems']) : [];
  const lines = Array.isArray(linesResult.data) ? linesResult.data : [];
  const lead = leadResult.data as LeadTypeRow | null;
  const leadMarkets = Array.isArray(leadMarketsResult.data) ? (leadMarketsResult.data as MarketInterestRow[]) : [];
  const leadProducts = Array.isArray(leadProductsResult.data) ? (leadProductsResult.data as ProductInterestRow[]) : [];
  const requirementRules = Array.isArray(requirementRulesResult.data) ? (requirementRulesResult.data as OperationalControlInput['requirementRules']) : [];
  const documentRows = toStatusRows(docs);
  const complianceRows = toStatusRows(compliance);

  const operationalControls = buildOrderOperationalControlState({
    documents: docs,
    complianceItems: compliance,
    requirementRules,
    leadType: lead?.lead_type ?? null,
    marketIds: leadMarkets.map((item) => item.market_id).filter((id): id is string => Boolean(id)),
    productIds: leadProducts.map((item) => item.product_id).filter((id): id is string => Boolean(id)),
  });

  const evaluation = evaluateOrderExecution({
    quoteAccepted: String(quote?.status ?? '').toLowerCase() === 'accepted',
    hasContract: true,
    contractStatus: contract.status,
    contractSignedAt: contract.signed_at,
    commercialLockState: contract.commercial_lock_state,
    lineCount: lines.length,
    openDocumentBlockers: documentRows.filter((doc) => !['approved', 'complete', 'ready', 'completed'].includes(String(doc.status ?? '').toLowerCase())).length,
    openComplianceBlockers: complianceRows.filter((item) => !['approved', 'complete', 'waived', 'completed'].includes(String(item.status ?? '').toLowerCase())).length,
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
    lineCount: lines.length,
    openDocumentBlockers: documentRows.filter((doc) => !['approved', 'complete', 'ready', 'completed'].includes(String(doc.status ?? '').toLowerCase())).length,
    openComplianceBlockers: complianceRows.filter((item) => !['approved', 'complete', 'waived', 'completed'].includes(String(item.status ?? '').toLowerCase())).length,
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

  const updatePayload: ContractUpdate = {
    execution_state: nextState,
    execution_blockers: nextSnapshot.blockers,
    execution_snapshot: nextSnapshot as ContractUpdate['execution_snapshot'],
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

  const db = await createOrderActionDb();
  const { data: uploadContractData, error: contractError } = await db.from('contracts').select('id, lead_id, quote_id, execution_state').eq('organization_id', workspace.organization.id).eq('id', contractId).maybeSingle();
  const contract = uploadContractData as UploadContractRow | null;
  if (contractError) return { error: 'Could not verify the order before upload. Please refresh and retry.' };
  if (!contract?.id) return { error: 'Order contract not found.' };

  const now = new Date().toISOString();
  const safeName = fileValue.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'order-document';
  const storagePath = `${workspace.organization.id}/orders/${contractId}/${Date.now()}-${safeName}`;
  const upload = await db.storage.from('order-documents').upload(storagePath, fileValue, { upsert: false, contentType: fileValue.type || undefined });
  if (upload.error) return { error: 'Document storage is not ready for order uploads. Check the order-documents bucket/RLS, then retry.' };

  const { data: publicUrlData } = db.storage.from('order-documents').getPublicUrl(storagePath);
  const fileUrl = publicUrlData?.publicUrl ?? `supabase://order-documents/${storagePath}`;
  const { data: documentData, error: documentError } = await db.from('documents').insert({ organization_id: workspace.organization.id, related_entity: 'contract', related_id: contractId, file_name: safeName, file_url: fileUrl, doc_type: docType, status: 'uploaded', uploaded_by: workspace.user.id, uploaded_at: now, version: 1, ...(requirementCode ? { requirement_code: requirementCode } : {}) }).select('id').single();
  const documentRow = documentData as DocumentInsertRow | null;
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

  const db = await createOrderActionDb();

  const { data: signContractData, error: contractError } = await db
    .from('contracts')
    .select('id, quote_id, lead_id, status, signed_at, commercial_lock_state, execution_state')
    .eq('organization_id', workspace.organization.id)
    .eq('id', contractId)
    .maybeSingle();
  const contract = signContractData as SignContractRow | null;

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
