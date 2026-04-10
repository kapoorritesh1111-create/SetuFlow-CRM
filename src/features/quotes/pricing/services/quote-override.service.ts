import type { LineOverrideInput, QuoteOverrideResult, QuoteOverrideService } from '../types';
import type { AuditRepository, NegotiationRepository, QuotePricingRepository } from '../repositories';
import { DefaultQuoteApprovalService } from './quote-approval.service';

export type QuoteOverrideServiceDeps = {
  quotePricingRepository: QuotePricingRepository;
  negotiationRepository?: NegotiationRepository;
  auditRepository?: AuditRepository;
};

export class DefaultQuoteOverrideService implements QuoteOverrideService {
  constructor(private readonly deps: QuoteOverrideServiceDeps) {}

  async applyLineOverride(input: LineOverrideInput): Promise<QuoteOverrideResult> {
    const lineItem = await this.deps.quotePricingRepository.getVersionLineItem({ quoteVersionLineItemId: input.quoteVersionLineItemId });
    if (!lineItem) throw new Error(`Quote version line item ${input.quoteVersionLineItemId} not found.`);
    if (lineItem.quoteVersionId !== input.quoteVersionId) throw new Error(`Line item ${input.quoteVersionLineItemId} does not belong to quote version ${input.quoteVersionId}.`);

    const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({ quoteVersionId: input.quoteVersionId });
    if (!aggregate) throw new Error(`Quote version ${input.quoteVersionId} not found for override.`);

    const currentPrice = input.finalUnitPrice ?? input.finalCasePrice ?? input.finalKgPrice;
    const baselinePrice = lineItem.finalUnitPrice ?? lineItem.finalCasePrice ?? lineItem.finalKgPrice;
    if (currentPrice == null || baselinePrice == null || baselinePrice <= 0) throw new Error('Override requires existing baseline price and a replacement final price.');

    const settings = await this.deps.quotePricingRepository.getPricingEngineSettings({ organizationId: aggregate.parentQuote.organizationId });
    const percentDelta = Math.abs(((Number(currentPrice) - Number(baselinePrice)) / Number(baselinePrice)) * 100);
    const requiresApproval = Boolean(settings?.requireApprovalForOverride) && settings?.approvalThresholdPercent != null && percentDelta >= Number(settings.approvalThresholdPercent);

    await this.deps.quotePricingRepository.updateVersionLineItemOverride({
      quoteVersionLineItemId: input.quoteVersionLineItemId,
      actorUserId: input.actorUserId,
      reason: input.reason,
      finalUnitPrice: input.finalUnitPrice ?? null,
      finalCasePrice: input.finalCasePrice ?? null,
      finalKgPrice: input.finalKgPrice ?? null,
      calculationMeta: {
        ...(lineItem.calculationMeta ?? {}),
        override_baseline_price: baselinePrice,
        override_price: currentPrice,
        override_percent_delta: percentDelta,
        override_requires_approval: requiresApproval,
      },
    });

    let status: import('../types').QuoteVersionStatus = aggregate.version.status;
    if (requiresApproval) {
      const approvalService = new DefaultQuoteApprovalService(this.deps);
      await approvalService.requestApproval(input.quoteVersionId, input.actorUserId);
      status = 'approval_pending';
    }

    if (this.deps.negotiationRepository) {
      await this.deps.negotiationRepository.recordEvent({
        quoteId: aggregate.parentQuote.id,
        quoteVersionId: input.quoteVersionId,
        eventType: requiresApproval ? 'line_override_requested' : 'comment_added',
        actorType: 'internal_user',
        actorUserId: input.actorUserId,
        message: input.reason,
        payload: { quoteVersionLineItemId: input.quoteVersionLineItemId, baselinePrice, overridePrice: currentPrice, percentDelta, requiresApproval },
      });
    }

    if (this.deps.auditRepository) {
      await this.deps.auditRepository.recordPricingEvent({
        organizationId: aggregate.parentQuote.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'quote_version_line_item',
        entityId: input.quoteVersionLineItemId,
        action: requiresApproval ? 'pricing_quote_override_requested' : 'pricing_quote_override_applied',
        payload: { quoteId: aggregate.parentQuote.id, quoteVersionId: input.quoteVersionId, baselinePrice, overridePrice: currentPrice, percentDelta, requiresApproval },
      });
    }

    return { requiresApproval, status };
  }
}
