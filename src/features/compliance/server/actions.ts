"use server";

import { revalidatePath } from 'next/cache';
import { hasSupabaseEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

type ActionState = { error?: string; success?: string };

const DOCUMENT_STATUSES = new Set(['pending', 'submitted', 'approved', 'revision_requested', 'rejected', 'expired']);
const COMPLIANCE_STATUSES = new Set(['pending', 'submitted', 'approved', 'revision_requested', 'blocked', 'rejected', 'waived']);

function normalizeStatus(value: FormDataEntryValue | null) {
  return String(value ?? '').trim().toLowerCase();
}


export async function uploadWorkspaceDocument(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const docType = String(formData.get('doc_type') ?? '').trim() || 'general';
  const requirementCode = String(formData.get('requirement_code') ?? '').trim() || null;
  const reviewNotes = String(formData.get('review_notes') ?? '').trim() || null;
  const expiresAt = String(formData.get('expires_at') ?? '').trim() || null;
  const fileEntry = formData.get('file');
  const typedName = String(formData.get('file_name') ?? '').trim();
  const fileName = fileEntry instanceof File && fileEntry.name ? fileEntry.name : typedName;

  if (!leadId) return { error: 'Choose a lead before uploading a document.' };
  if (!fileName) return { error: 'Choose a file or enter a document name.' };

  const supabase = await createClient();
  const admin = createAdminSupabaseClient();
  const db = supabase as any;
  const mutationDb = (admin ?? supabase) as any;

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, company_name')
    .eq('organization_id', workspace.organization.id)
    .eq('id', leadId)
    .maybeSingle();
  if (leadError) return { error: leadError.message };
  if (!lead?.id) return { error: 'Selected lead is not available in the active organization.' };

  const now = new Date().toISOString();
  const { data: document, error } = await mutationDb
    .from('documents')
    .insert({
      organization_id: workspace.organization.id,
      related_entity: 'lead',
      related_id: leadId,
      file_name: fileName,
      file_url: `workspace-upload://${leadId}/${Date.now()}/${encodeURIComponent(fileName)}`,
      doc_type: docType,
      uploaded_by: workspace.user.id,
      uploaded_at: now,
      version: 1,
      status: 'submitted',
      owner_user_id: workspace.user.id,
      requirement_code: requirementCode,
      review_notes: reviewNotes,
      expires_at: expiresAt,
      version_label: 'global-upload',
    })
    .select('id')
    .single();
  if (error) return { error: error.message };

  await mutationDb.from('audit_logs').insert({
    organization_id: workspace.organization.id,
    actor_user_id: workspace.user.id,
    action: 'document_uploaded',
    entity_type: 'document',
    entity_id: document?.id ?? null,
    payload: { previous: null, new: { lead_id: leadId, file_name: fileName, status: 'submitted' }, metadata: { source: 'documents_workspace' } },
  });

  revalidatePath('/documents');
  revalidatePath('/compliance');
  revalidatePath(`/leads/${leadId}`);
  return { success: `Document uploaded for ${lead.company_name ?? 'lead'}.` };
}

export async function updateDocumentWorkflow(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'compliance.review')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'compliance.review') ?? 'Your current role cannot update document review status.' };
  }

  const documentId = String(formData.get('document_id') ?? '').trim();
  const status = normalizeStatus(formData.get('status'));
  const reviewNotes = String(formData.get('review_notes') ?? '').trim() || null;
  if (!documentId) return { error: 'Document id is required.' };
  if (!status) return { error: 'Status is required.' };
  if (!DOCUMENT_STATUSES.has(status)) return { error: 'Document status is invalid for this workflow.' };

  const supabase = await createClient();
  const db = supabase as any;
  const { data: existing, error: existingError } = await db
    .from('documents')
    .select('id, related_entity, related_id')
    .eq('organization_id', workspace.organization.id)
    .eq('id', documentId)
    .maybeSingle();
  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Document not found in the active organization.' };

  const { data: updatedDocumentResult, error: updateDocumentTxError } = await db.rpc('app_update_document_workflow_tx', {
    p_organization_id: workspace.organization.id,
    p_document_id: documentId,
    p_actor_user_id: workspace.user.id,
    p_status: status,
    p_review_notes: reviewNotes,
    p_action_source: 'updateDocumentWorkflow',
  });
  if (updateDocumentTxError) return { error: updateDocumentTxError.message };

  const updatedDocument = Array.isArray(updatedDocumentResult) ? updatedDocumentResult[0] : updatedDocumentResult;
  const relatedEntity = typeof updatedDocument?.related_entity === 'string' ? updatedDocument.related_entity : existing.related_entity;
  const relatedId = typeof updatedDocument?.related_id === 'string' ? updatedDocument.related_id : existing.related_id;

  revalidatePath('/documents');
  revalidatePath('/compliance');
  revalidatePath('/pipeline');
  if (relatedEntity === 'lead' && typeof relatedId === 'string') {
    revalidatePath(`/leads/${relatedId}`);
  }
  return { success: 'Document workflow updated.' };
}

export async function updateComplianceWorkflow(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'compliance.review')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'compliance.review') ?? 'Your current role cannot update compliance review status.' };
  }

  const complianceId = String(formData.get('compliance_id') ?? '').trim();
  const status = normalizeStatus(formData.get('status'));
  const reviewNotes = String(formData.get('review_notes') ?? '').trim() || null;
  if (!complianceId) return { error: 'Compliance item id is required.' };
  if (!status) return { error: 'Status is required.' };
  if (!COMPLIANCE_STATUSES.has(status)) return { error: 'Compliance status is invalid for this workflow.' };

  const supabase = await createClient();
  const db = supabase as any;
  const { data: existing, error: existingError } = await db
    .from('lead_compliance_items')
    .select('id, lead_id')
    .eq('id', complianceId)
    .eq('organization_id', workspace.organization.id)
    .maybeSingle();
  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Compliance item not found in the active organization.' };

  const { data: updatedComplianceResult, error: updateComplianceTxError } = await db.rpc('app_update_compliance_workflow_tx', {
    p_organization_id: workspace.organization.id,
    p_compliance_id: complianceId,
    p_actor_user_id: workspace.user.id,
    p_status: status,
    p_review_notes: reviewNotes,
    p_action_source: 'updateComplianceWorkflow',
  });
  if (updateComplianceTxError) return { error: updateComplianceTxError.message };

  const updatedCompliance = Array.isArray(updatedComplianceResult) ? updatedComplianceResult[0] : updatedComplianceResult;
  const leadId = typeof updatedCompliance?.lead_id === 'string' ? updatedCompliance.lead_id : existing.lead_id;

  revalidatePath('/documents');
  revalidatePath('/compliance');
  revalidatePath('/pipeline');
  if (typeof leadId === 'string') {
    revalidatePath(`/leads/${leadId}`);
  }
  return { success: 'Compliance workflow updated.' };
}
