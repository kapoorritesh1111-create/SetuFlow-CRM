import type { DocumentRepository, PricingSupabaseClient } from './types';
import type { StoreQuoteDocumentInput, StoreQuoteDocumentResult } from '../types';
import {
  buildGeneratedDocumentFileUrl,
  resolveQuoteDocumentDocType,
  resolveVersionLabel,
} from '../services/quote-document.helpers';

type DocumentInsertRow = {
  organization_id: string;
  related_entity: string;
  related_id: string;
  file_name: string;
  file_url: string;
  doc_type: string;
  uploaded_by: string;
  version: number;
  version_label: string;
  status: 'uploaded';
};

type DocumentRow = {
  id: string;
  version: number | null;
};

type DocumentVersionInsertRow = {
  document_id: string;
  version: number;
  file_url: string;
  created_by: string;
};

type DocumentVersionRow = {
  id: string;
  file_url: string;
};

function assertSingle<T>(data: T[] | null, entityName: string): T {
  if (!data || data.length === 0) {
    throw new Error(`${entityName} insert returned no rows.`);
  }

  return data[0]!;
}

export class SupabaseDocumentRepository implements DocumentRepository {
  constructor(private readonly db: PricingSupabaseClient) {}

  async storeGeneratedPdf(input: StoreQuoteDocumentInput): Promise<StoreQuoteDocumentResult> {
    const version = 1;
    const fileName = input.fileName.trim();
    const docType = resolveQuoteDocumentDocType(input.mimeType);

    const { data: insertedDocumentRows, error: insertDocumentError } = await this.db
      .from('documents')
      .insert({
        organization_id: input.organizationId,
        related_entity: 'quote',
        related_id: input.quoteId,
        file_name: fileName,
        file_url: 'pending://quote-document',
        doc_type: docType,
        uploaded_by: input.actorUserId,
        version,
        version_label: resolveVersionLabel(version),
        status: 'uploaded',
      } satisfies DocumentInsertRow)
      .select('id, version');

    if (insertDocumentError) {
      throw new Error(`Failed to create quote document row for quote ${input.quoteId}: ${insertDocumentError.message}`);
    }

    const insertedDocument = assertSingle(insertedDocumentRows as DocumentRow[] | null, 'Document');
    const fileUrl = buildGeneratedDocumentFileUrl({
      documentId: insertedDocument.id,
      version: insertedDocument.version ?? version,
      fileName,
      mimeType: input.mimeType,
    });

    const { error: updateDocumentError } = await this.db
      .from('documents')
      .update({ file_url: fileUrl })
      .eq('id', insertedDocument.id);

    if (updateDocumentError) {
      throw new Error(`Failed to finalize file URL for document ${insertedDocument.id}: ${updateDocumentError.message}`);
    }

    const { data: insertedVersionRows, error: insertVersionError } = await this.db
      .from('document_versions')
      .insert({
        document_id: insertedDocument.id,
        version,
        file_url: fileUrl,
        created_by: input.actorUserId,
      } satisfies DocumentVersionInsertRow)
      .select('id, file_url');

    if (insertVersionError) {
      throw new Error(`Failed to create document version for document ${insertedDocument.id}: ${insertVersionError.message}`);
    }

    const insertedVersion = assertSingle(insertedVersionRows as DocumentVersionRow[] | null, 'Document version');

    return {
      documentId: insertedDocument.id,
      documentVersionId: insertedVersion.id,
      fileUrl: insertedVersion.file_url,
    };
  }
}
