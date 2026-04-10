import type { QuoteApprovalService } from '../types';
import type { AuditRepository, NegotiationRepository, QuotePricingRepository } from '../repositories';

export type QuoteApprovalServiceDeps = {
  quotePricingRepository: QuotePricingRepository;
  negotiationRepository?: NegotiationRepository;
  auditRepository?: AuditRepository;
};

export class DefaultQuoteApprovalService implements QuoteApprovalService {
  constructor(private readonly deps: QuoteApprovalServiceDeps) {
    void this.deps;
  }

  async requestApproval(quoteVersionId: string, actorUserId: string): Promise<void> {
    const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({ quoteVersionId });
    if (!aggregate) throw new Error(`Quote version ${quoteVersionId} not found for approval request.`);

    await this.deps.quotePricingRepository.markVersionStatus({ quoteVersionId, status: 'approval_pending', actorUserId });
    if (this.deps.negotiationRepository) {
      await this.deps.negotiationRepository.recordEvent({ quoteId: aggregate.parentQuote.id, quoteVersionId, eventType: 'line_override_requested', actorType: 'internal_user', actorUserId, payload: { quoteVersionId } });
    }
    if (this.deps.auditRepository) {
      await this.deps.auditRepository.recordPricingEvent({ organizationId: aggregate.parentQuote.organizationId, actorUserId, entityType: 'quote_version', entityId: quoteVersionId, action: 'pricing_quote_approval_requested', payload: { quoteId: aggregate.parentQuote.id, quoteVersionId } });
    }
  }

  async approve(quoteVersionId: string, actorUserId: string): Promise<void> {
    const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({ quoteVersionId });
    if (!aggregate) throw new Error(`Quote version ${quoteVersionId} not found for approval.`);

    await this.deps.quotePricingRepository.markVersionStatus({ quoteVersionId, status: 'approved', actorUserId });
    if (this.deps.negotiationRepository) {
      await this.deps.negotiationRepository.recordEvent({ quoteId: aggregate.parentQuote.id, quoteVersionId, eventType: 'line_override_approved', actorType: 'internal_user', actorUserId, payload: { quoteVersionId } });
    }
    if (this.deps.auditRepository) {
      await this.deps.auditRepository.recordPricingEvent({ organizationId: aggregate.parentQuote.organizationId, actorUserId, entityType: 'quote_version', entityId: quoteVersionId, action: 'pricing_quote_approved', payload: { quoteId: aggregate.parentQuote.id, quoteVersionId } });
    }
  }

  async reject(quoteVersionId: string, actorUserId: string, reason: string): Promise<void> {
    const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({ quoteVersionId });
    if (!aggregate) throw new Error(`Quote version ${quoteVersionId} not found for rejection.`);

    await this.deps.quotePricingRepository.markVersionStatus({ quoteVersionId, status: 'rejected', actorUserId, reason });
    if (this.deps.negotiationRepository) {
      await this.deps.negotiationRepository.recordEvent({ quoteId: aggregate.parentQuote.id, quoteVersionId, eventType: 'line_override_rejected', actorType: 'internal_user', actorUserId, message: reason, payload: { quoteVersionId, reason } });
    }
    if (this.deps.auditRepository) {
      await this.deps.auditRepository.recordPricingEvent({ organizationId: aggregate.parentQuote.organizationId, actorUserId, entityType: 'quote_version', entityId: quoteVersionId, action: 'pricing_quote_rejected', payload: { quoteId: aggregate.parentQuote.id, quoteVersionId, reason } });
    }
  }
}
