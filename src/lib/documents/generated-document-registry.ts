type GeneratedDocumentInput = {
  organizationId: string;
  relatedEntity: string;
  relatedId: string;
  fileName: string;
  fileUrl: string;
  docType: string;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
  status: 'uploaded' | 'submitted' | 'approved' | 'rejected' | 'archived';
  version?: number;
  linkedQuoteId?: string | null;
};

/**
 * Registers a generated PDF in the documents workspace without relying on a
 * database unique constraint that does not exist in production.
 *
 * The documents table only has a primary-key unique index, so using Supabase
 * upsert with organization_id/related_entity/related_id/file_name silently
 * fails. This helper performs an explicit lookup followed by update or insert.
 */
export async function recordGeneratedDocument(db: any, input: GeneratedDocumentInput) {
  const uploadedAt = input.uploadedAt ?? new Date().toISOString();
  const payload = {
    organization_id: input.organizationId,
    related_entity: input.relatedEntity,
    related_id: input.relatedId,
    file_name: input.fileName,
    file_url: input.fileUrl,
    doc_type: input.docType,
    uploaded_by: input.uploadedBy ?? null,
    uploaded_at: uploadedAt,
    version: input.version ?? 1,
    status: input.status,
    linked_quote_id: input.linkedQuoteId ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: lookupError } = await db
    .from('documents')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('related_entity', input.relatedEntity)
    .eq('related_id', input.relatedId)
    .eq('doc_type', input.docType)
    .maybeSingle();

  if (lookupError) throw new Error(`Generated document lookup failed: ${lookupError.message}`);

  if (existing?.id) {
    const { error: updateError } = await db
      .from('documents')
      .update(payload)
      .eq('organization_id', input.organizationId)
      .eq('id', existing.id);
    if (updateError) throw new Error(`Generated document update failed: ${updateError.message}`);
    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await db
    .from('documents')
    .insert(payload)
    .select('id')
    .single();
  if (insertError) throw new Error(`Generated document insert failed: ${insertError.message}`);
  return inserted.id as string;
}
