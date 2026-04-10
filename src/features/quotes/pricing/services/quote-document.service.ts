import type { QuoteDocumentService, StoreQuoteDocumentInput, StoreQuoteDocumentResult } from '../types';
import type { AuditRepository, DocumentRepository, QuotePricingRepository } from '../repositories';

export type QuoteDocumentServiceDeps = {
  documentRepository: DocumentRepository;
  quotePricingRepository: QuotePricingRepository;
  auditRepository?: AuditRepository;
};

export class DefaultQuoteDocumentService implements QuoteDocumentService {
  constructor(private readonly deps: QuoteDocumentServiceDeps) {}

  async storeGeneratedPdf(input: StoreQuoteDocumentInput): Promise<StoreQuoteDocumentResult> {
    const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({
      quoteVersionId: input.quoteVersionId,
    });

    if (!aggregate) {
      throw new Error(`Quote version aggregate not found for ${input.quoteVersionId}.`);
    }

    if (aggregate.parentQuote.organizationId !== input.organizationId) {
      throw new Error(`Quote version ${input.quoteVersionId} does not belong to organization ${input.organizationId}.`);
    }

    if (aggregate.parentQuote.id !== input.quoteId) {
      throw new Error(`Quote version ${input.quoteVersionId} does not belong to quote ${input.quoteId}.`);
    }

    const storedDocument = await this.deps.documentRepository.storeGeneratedPdf(input);

    await this.deps.quotePricingRepository.saveRenderedPdfReference({
      quoteVersionId: input.quoteVersionId,
      documentId: storedDocument.documentId,
    });

    if (this.deps.auditRepository) {
      await this.deps.auditRepository.recordPricingEvent({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'quote_version_document',
        entityId: input.quoteVersionId,
        action: 'quote_document_stored',
        payload: {
          quoteId: input.quoteId,
          quoteVersionId: input.quoteVersionId,
          documentId: storedDocument.documentId,
          documentVersionId: storedDocument.documentVersionId,
          mimeType: input.mimeType,
          fileName: input.fileName,
          fileUrl: storedDocument.fileUrl,
        },
      });
    }

    return storedDocument;
  }
}
