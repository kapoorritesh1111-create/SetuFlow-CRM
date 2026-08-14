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
const COMPLIANCE_DOCS_BUCKET = 'compliance-docs';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function normalizeStatus(value: FormDataEntryValue | null) {
  return String(value ?? '').trim().toLowerCase();
}

function safeReturnPath(value: FormDataEntryValue | null, fallback = '/compliance') {
  const raw = String(value ?? '').trim();
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}

function sanitizeFileName(fileName: string) {
  return fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'evidence-file';
}

function readUploadFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.name && value.size > 0 ? value : null;
}

async function resolveLeadAndQuote(db: any, organizationId: string, leadId: string, quoteId: string) {
  if (quoteId) {
    const { data: quote, error: quoteError } = await db
      .from('quotes')
      .select('id, quote_number, lead_id')
      .eq('organization_id', organizationId)
      .eq('id', quoteId)
      .maybeSingle();
    if (quoteError) return { error: quoteError.message };
    if (!quote?.id) return { error: 'Selected quote is not available in the active organization.' };
    const resolvedLeadId = leadId || quote.lead_id;
    const { data: lead, error: leadError } = await db
      .from('leads')
      .select('id, company_name')
      .eq('organization_id', organizationId)
      .eq('id', resolvedLeadId)
      .maybeSingle();
    if (leadError) return { error: leadError.message };
    if (!lead?.id) return { error: 'Quote lead is not available in the active organization.' };
    return { lead, quote };
  }

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, company_name')
    .eq('organization_id', organizationId)
    .eq('id', leadId)
    .maybeSingle();
  if (leadError) return { error: leadError.message };
  if (!lead?.id) return { error: 'Selected lead is not available in the active organization.' };
  return { lead, quote: null };
}

export async function uploadWorkspaceDocument(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const docType = String(formData.get('doc_type') ?? '').trim() || 'general';
  const requirementCode = String(formData.get('requirement_code') ?? '').trim() || null;
  const reviewNotes = String(formData.get('review_notes') ?? '').trim() || null;
  const expiresAt = String(formData.get('expires_at') ?? '').trim() || null;
  const file = readUploadFile(formData.get('file'));

  if (!leadId && !quoteId) return { error: 'Choose a lead or quote before uploading a document.' };
  if (!file) return { error: 'Choose a real file before attaching evidence.' };
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Evidence file must be 10MB or smaller.' };
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) return { error: 'Evidence file must be a PDF, JPG, PNG, DOC, or DOCX file.' };

  const supabase = await createClient();
  const admin = createAdminSupabaseClient();
  const db = supabase as any;
  const mutationDb = (admin ?? supabase) as any;

  const resolved = await resolveLeadAndQuote(db, workspace.organization.id, leadId, quoteId);
  if ('error' in resolved && resolved.error) return { error: resolved.error };
  const lead = resolved.lead;
  const quote = resolved.quote;
  const relatedEntity = quote?.id ? 'quote' : 'lead';
  const relatedId = quote?.id ?? lead.id;

  const now = new Date().toISOString();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${workspace.organization.id}/${relatedEntity}/${relatedId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const uploadResult = await supabase.storage.from(COMPLIANCE_DOCS_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadResult.error) return { error: uploadResult.error.message };

  const { data: document, error } = await mutationDb
    .from('documents')
    .insert({
      organization_id: workspace.organization.id,
      related_entity: relatedEntity,
      related_id: relatedId,
      linked_quote_id: quote?.id ?? null,
      file_name: file.name,
      file_url: `storage://${COMPLIANCE_DOCS_BUCKET}/${storagePath}`,
      doc_type: docType,
      uploaded_by: workspace.user.id,
      uploaded_at: now,
      version: 1,
      status: 'submitted',
      owner_user_id: workspace.user.id,
      requirement_code: requirementCode,
      review_notes: reviewNotes,
      expires_at: expiresAt,
      version_label: quote?.id ? 'quote-review-upload' : 'global-upload',
    })
    .select('id')
    .single();
  if (error) {
    await supabase.storage.from(COMPLIANCE_DOCS_BUCKET).remove([storagePath]);
    return { error: error.message };
  }

  await mutationDb.from('audit_logs').insert({
    organization_id: workspace.organization.id,
    actor_user_id: workspace.user.id,
    action: 'document_uploaded',
    entity_type: 'document',
    entity_id: document?.id ?? null,
    payload: { previous: null, new: { lead_id: lead.id, quote_id: quote?.id ?? null, file_name: file.name, storage_path: storagePath, status: 'submitted' }, metadata: { source: quote?.id ? 'quote_compliance_fix_panel' : 'documents_workspace' } },
  });

  // Wire up: Trigger Setu Guru RAG Ingestion for the newly uploaded document
  // FIX: previously missing x-webhook-secret header, fileUrl, and mimeType — the
  // ingest route requires all 5 fields and only accepts https:// URLs, so this
  // was silently failing (400/401) every single time.
  try {
    if (document?.id) {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(COMPLIANCE_DOCS_BUCKET)
        .createSignedUrl(storagePath, 60 * 15); // valid 15 minutes — enough time for ingest to fetch it

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('[RAG Ingest Webhook] Could not create signed URL:', signedUrlError?.message);
      } else {
        const ingestRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/setu-guru/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': process.env.WEBHOOK_SECRET_SETU_GURU_INGEST || '',
          },
          body: JSON.stringify({
            organizationId: workspace.organization.id,
            sourceType: 'documents',
            sourceId: document.id,
            fileUrl: signedUrlData.signedUrl,
            mimeType: file.type,
          }),
        });
        if (!ingestRes.ok) {
          console.error('[RAG Ingest Webhook] Failed:', ingestRes.status, await ingestRes.text());
        }
      }
    }
  } catch (err) {
    console.error('[RAG Ingest Webhook Error]:', err);
  }

  revalidatePath('/documents');
  revalidatePath('/compliance');
  revalidatePath('/leads');
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath(safeReturnPath(formData.get('return_path'), quote?.id ? `/compliance/assist?quoteId=${quote.id}` : `/compliance/assist?leadId=${lead.id}`));
  return { success: `Document uploaded for ${quote?.quote_number ? `quote ${quote.quote_number}` : lead.company_name ?? 'lead'}.` };
}

export async function waiveLeadDocumentRequirement(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  if (!hasWorkspaceCapability(workspace.currentRoles, 'compliance.review')) {
    return { error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'compliance.review') ?? 'Your current role cannot waive document requirements.' };
  }

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  const requirementCode = String(formData.get('requirement_code') ?? '').trim();
  const reason = String(formData.get('review_notes') ?? '').trim();
  const docType = String(formData.get('doc_type') ?? '').trim() || 'waiver';
  if (!leadId && !quoteId) return { error: 'Lead or quote id is required.' };
  if (!requirementCode) return { error: 'Requirement code is required.' };
  if (reason.length < 8) return { error: 'Add a short waiver reason before approving this exception.' };

  const supabase = await createClient();
  const admin = createAdminSupabaseClient();
  const db = supabase as any;
  const mutationDb = (admin ?? supabase) as any;

  const resolved = await resolveLeadAndQuote(db, workspace.organization.id, leadId, quoteId);
  if ('error' in resolved && resolved.error) return { error: resolved.error };
  const lead = resolved.lead;
  const quote = resolved.quote;
  const relatedEntity = quote?.id ? 'quote' : 'lead';
  const relatedId = quote?.id ?? lead.id;

  const now = new Date().toISOString();
  const fileName = docType === 'dispatch_defer' ? `Dispatch deferral - ${requirementCode}` : `Waiver - ${requirementCode}`;
  const { data: document, error } = await mutationDb
    .from('documents')
    .insert({
      organization_id: workspace.organization.id,
      related_entity: relatedEntity,
      related_id: relatedId,
      linked_quote_id: quote?.id ?? null,
      file_name: fileName,
      file_url: `workspace-waiver://${relatedEntity}/${relatedId}/${Date.now()}/${encodeURIComponent(requirementCode)}`,
      doc_type: docType,
      uploaded_by: workspace.user.id,
      uploaded_at: now,
      version: 1,
      status: 'approved',
      owner_user_id: workspace.user.id,
      reviewer_user_id: workspace.user.id,
      reviewed_at: now,
      requirement_code: requirementCode,
      review_notes: reason,
      version_label: docType === 'dispatch_defer' ? 'dispatch-deferral' : 'quote-waiver',
    })
    .select('id')
    .single();
  if (error) return { error: error.message };

  await mutationDb.from('audit_logs').insert({
    organization_id: workspace.organization.id,
    actor_user_id: workspace.user.id,
    action: docType === 'dispatch_defer' ? 'document_requirement_deferred_to_dispatch' : 'document_requirement_waived',
    entity_type: 'document',
    entity_id: document?.id ?? null,
    payload: { previous: null, new: { lead_id: lead.id, quote_id: quote?.id ?? null, requirement_code: requirementCode, status: 'approved', reason }, metadata: { source: 'compliance_assist' } },
  });

  revalidatePath('/documents');
  revalidatePath('/compliance');
  revalidatePath('/leads');
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath(safeReturnPath(formData.get('return_path'), quote?.id ? `/compliance/assist?quoteId=${quote.id}` : `/compliance/assist?leadId=${lead.id}`));
  return { success: `${docType === 'dispatch_defer' ? 'Dispatch deferral' : 'Waiver'} recorded for ${quote?.quote_number ? `quote ${quote.quote_number}` : lead.company_name ?? 'lead'}.` };
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
  if (relatedEntity === 'lead' && typeof relatedId === 'string') revalidatePath(`/leads/${relatedId}`);
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
  if (typeof leadId === 'string') revalidatePath(`/leads/${leadId}`);
  return { success: 'Compliance workflow updated.' };
}