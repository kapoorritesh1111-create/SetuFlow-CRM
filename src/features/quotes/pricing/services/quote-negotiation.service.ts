import type { NegotiationEventInput, QuoteNegotiationService } from '../types';
import type { AuditRepository, NegotiationRepository, QuotePricingRepository } from '../repositories';

export type QuoteNegotiationServiceDeps = {
  negotiationRepository: NegotiationRepository;
  quotePricingRepository: QuotePricingRepository;
  auditRepository?: AuditRepository;
};

function asPayloadRecord(
  payload: NegotiationEventInput['payload'],
): Record<string, import('@/types/database').Json> {
  return (payload ?? {}) as Record<string, import('@/types/database').Json>;
}

export class DefaultQuoteNegotiationService implements QuoteNegotiationService {
  constructor(private readonly deps: QuoteNegotiationServiceDeps) {}

  async recordEvent(input: NegotiationEventInput): Promise<void> {
    let organizationId: string | null = null;

    if (input.quoteVersionId) {
      const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({
        quoteVersionId: input.quoteVersionId,
      });

      if (!aggregate) {
        throw new Error(`Quote version aggregate not found for ${input.quoteVersionId}.`);
      }

      if (aggregate.parentQuote.id !== input.quoteId) {
        throw new Error(
          `Quote version ${input.quoteVersionId} does not belong to quote ${input.quoteId}.`,
        );
      }

      organizationId = aggregate.parentQuote.organizationId;
    } else {
      const quoteParent = await this.deps.quotePricingRepository.getQuoteParentById({
        quoteId: input.quoteId,
      });

      if (!quoteParent) {
        throw new Error(`Quote parent not found for ${input.quoteId}.`);
      }

      organizationId = quoteParent.organizationId;
    }

    await this.deps.negotiationRepository.recordEvent(input);

    if (this.deps.auditRepository) {
      await this.deps.auditRepository.recordPricingEvent({
        organizationId,
        actorUserId: input.actorUserId ?? null,
        entityType: 'quote_negotiation_event',
        entityId: input.quoteVersionId ?? input.quoteId,
        action: 'quote_negotiation_event_recorded',
        payload: {
          quoteId: input.quoteId,
          quoteVersionId: input.quoteVersionId ?? null,
          eventType: input.eventType,
          actorType: input.actorType,
          actorName: input.actorName ?? null,
          message: input.message ?? null,
          eventPayload: asPayloadRecord(input.payload),
        },
      });
    }
  }
}
