import type { CreateQuoteVersionInput, QuoteVersionRecord, QuoteVersionService } from '../types';
import type { AuditRepository, NegotiationRepository, QuotePricingRepository } from '../repositories';
import type { QuoteNegotiationService } from '../types';

export type QuoteVersionServiceDeps = {
  quotePricingRepository: QuotePricingRepository;
  auditRepository?: AuditRepository;
  negotiationRepository?: NegotiationRepository;
  quoteNegotiationService?: QuoteNegotiationService;
};

export class DefaultQuoteVersionService implements QuoteVersionService {
  constructor(private readonly deps: QuoteVersionServiceDeps) {}

  async createDraftFromCompiled(input: CreateQuoteVersionInput): Promise<QuoteVersionRecord> {
    const record = await this.deps.quotePricingRepository.createDraftVersionFromCompile({
      organizationId: input.compiled.quoteContext.organizationId as string,
      compiled: input.compiled,
      actorUserId: input.actorUserId,
      customerMessage: input.customerMessage ?? null,
      internalNotes: input.internalNotes ?? null,
      validUntil: input.validUntil ?? null,
    });

    return record;
  }

  async sendVersion(quoteVersionId: string, actorUserId: string): Promise<void> {
    const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({ quoteVersionId });
    if (!aggregate) throw new Error(`Quote version ${quoteVersionId} not found for send.`);

    await this.deps.quotePricingRepository.sendVersion({ quoteVersionId, actorUserId });

    if (this.deps.negotiationRepository) {
      await this.deps.negotiationRepository.recordEvent({
        quoteId: aggregate.parentQuote.id,
        quoteVersionId,
        eventType: 'sent',
        actorType: 'internal_user',
        actorUserId,
        payload: { quoteVersionId },
      });
    }

    if (this.deps.auditRepository) {
      await this.deps.auditRepository.recordPricingEvent({
        organizationId: aggregate.parentQuote.organizationId,
        actorUserId,
        entityType: 'quote_version',
        entityId: quoteVersionId,
        action: 'pricing_quote_version_sent',
        payload: { quoteId: aggregate.parentQuote.id, quoteVersionId },
      });
    }
  }

  async supersedeVersion(quoteVersionId: string, actorUserId: string): Promise<void> {
    const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({ quoteVersionId });
    if (!aggregate) throw new Error(`Quote version ${quoteVersionId} not found for supersede.`);

    await this.deps.quotePricingRepository.markVersionStatus({ quoteVersionId, status: 'superseded', actorUserId });

    if (this.deps.negotiationRepository) {
      await this.deps.negotiationRepository.recordEvent({
        quoteId: aggregate.parentQuote.id,
        quoteVersionId,
        eventType: 'comment_added',
        actorType: 'internal_user',
        actorUserId,
        message: 'Prior sent version superseded by newer revision.',
        payload: { supersededVersionId: quoteVersionId },
      });
    }

    if (this.deps.auditRepository) {
      await this.deps.auditRepository.recordPricingEvent({
        organizationId: aggregate.parentQuote.organizationId,
        actorUserId,
        entityType: 'quote_version',
        entityId: quoteVersionId,
        action: 'pricing_quote_version_superseded',
        payload: { quoteId: aggregate.parentQuote.id, quoteVersionId },
      });
    }
  }

  async cloneForRevision(quoteVersionId: string, actorUserId: string): Promise<QuoteVersionRecord> {
    const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({ quoteVersionId });
    if (!aggregate) throw new Error(`Quote version ${quoteVersionId} not found for revision.`);

    const cloned = await this.deps.quotePricingRepository.createRevisionFromVersion({ quoteVersionId, actorUserId });

    if (this.deps.quoteNegotiationService) {
      await this.deps.quoteNegotiationService.recordEvent({
        quoteId: aggregate.parentQuote.id,
        quoteVersionId: cloned.id,
        eventType: 'revision_created',
        actorType: 'internal_user',
        actorUserId,
        payload: { parentVersionId: quoteVersionId, preservedCurrentVersionId: quoteVersionId, newVersionId: cloned.id },
      });
    } else if (this.deps.negotiationRepository) {
      await this.deps.negotiationRepository.recordEvent({
        quoteId: aggregate.parentQuote.id,
        quoteVersionId: cloned.id,
        eventType: 'revision_created',
        actorType: 'internal_user',
        actorUserId,
        payload: { parentVersionId: quoteVersionId, preservedCurrentVersionId: quoteVersionId, newVersionId: cloned.id },
      });
    }

    if (this.deps.auditRepository) {
      await this.deps.auditRepository.recordPricingEvent({
        organizationId: aggregate.parentQuote.organizationId,
        actorUserId,
        entityType: 'quote_version',
        entityId: cloned.id,
        action: 'pricing_quote_revision_cloned',
        payload: { quoteId: aggregate.parentQuote.id, parentVersionId: quoteVersionId, newVersionId: cloned.id },
      });
    }

    return cloned;
  }
}
