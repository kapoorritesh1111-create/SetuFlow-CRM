import { createClient } from '@supabase/supabase-js';
import { ingestDocument } from '@/lib/rag/ingest';

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
  /**
   * Optional: the raw bytes of the PDF that was just generated. When
   * provided, this helper ingests the document into the Setu Guru RAG
   * pipeline directly (in-process), instead of relying on the ingest
   * webhook to fetch the file over HTTP.
   *
   * This matters because generated documents (order confirmations, quote
   * PDFs, packing sheets, sample approvals) store fileUrl as an internal
   * app route (e.g. /api/orders/[id]/order-confirmation/pdf) that requires
   * a logged-in session — a server-to-server webhook fetch against that
   * URL would fail with 401. Passing the bytes here avoids that entirely.
   */
  fileBytes?: Uint8Array | Buffer;
  mimeType?: string;
};

let ragAdminClient: ReturnType<typeof createClient> | null = null;
function getRagAdminClient() {
  if (!ragAdminClient) {
    ragAdminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );
  }
  return ragAdminClient;
}

/**
 * Registers a generated PDF in the documents workspace without relying on a
 * database unique constraint that does not exist in production.
 *
 * The documents table only has a primary-key unique index, so using Supabase
 * upsert with organization_id/related_entity/related_id/file_name silently
 * fails. This helper performs an explicit lookup followed by update or insert.
 *
 * If `fileBytes` is provided, it also ingests the document into the Setu
 * Guru RAG pipeline (chunking + embeddings) so it becomes searchable through
 * the chat assistant. This is fire-and-forget — a RAG ingestion failure
 * never blocks or fails the document record itself.
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

  let documentId: string;

  if (existing?.id) {
    const { error: updateError } = await db
      .from('documents')
      .update(payload)
      .eq('organization_id', input.organizationId)
      .eq('id', existing.id);
    if (updateError) throw new Error(`Generated document update failed: ${updateError.message}`);
    documentId = existing.id as string;
  } else {
    const { data: inserted, error: insertError } = await db
      .from('documents')
      .insert(payload)
      .select('id')
      .single();
    if (insertError) throw new Error(`Generated document insert failed: ${insertError.message}`);
    documentId = inserted.id as string;
  }

  // Fire-and-forget RAG ingestion — never blocks or fails the caller.
  if (input.fileBytes && input.fileBytes.length > 0) {
    const buffer = Buffer.isBuffer(input.fileBytes) ? input.fileBytes : Buffer.from(input.fileBytes);
    ingestDocument({
      organizationId: input.organizationId,
      sourceType: 'documents',
      sourceId: documentId,
      fileBuffer: buffer,
      mimeType: input.mimeType ?? 'application/pdf',
      dbClient: getRagAdminClient(),
    }).catch((err) => {
      console.error('[recordGeneratedDocument] RAG ingestion failed:', err instanceof Error ? err.message : err);
    });
  }

  return documentId;
}