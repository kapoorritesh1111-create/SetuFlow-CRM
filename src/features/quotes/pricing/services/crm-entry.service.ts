import type { CrmQuoteEntryService } from '../types/services';
import type { LeadQuoteLaunchInput, QuoteThreadLaunchResult, RfqQuoteLaunchInput } from '../types/contracts';
import type { PricingBasis } from '../types/enums';
import type { AuditRepository, NegotiationRepository, QuotePricingRepository } from '../repositories/types';

const DEFAULT_PRICING_BASIS: PricingBasis = 'ex_factory';

export class DefaultCrmQuoteEntryService implements CrmQuoteEntryService {
  constructor(
    private readonly deps: {
      quotePricingRepository: QuotePricingRepository;
      negotiationRepository?: NegotiationRepository;
      auditRepository?: AuditRepository;
    },
  ) {}

  async launchFromLead(input: LeadQuoteLaunchInput): Promise<QuoteThreadLaunchResult> {
    const lead = await this.deps.quotePricingRepository.getLeadContext({
      organizationId: input.organizationId,
      leadId: input.leadId,
    });

    if (!lead) {
      throw new Error(`Lead ${input.leadId} was not found for CRM quote launch.`);
    }

    const quote = await this.deps.quotePricingRepository.createQuoteThread({
      organizationId: input.organizationId,
      leadId: lead.id,
      actorUserId: input.actorUserId,
      sourceEntity: 'lead',
      pricingBasis: input.pricingBasis ?? DEFAULT_PRICING_BASIS,
      displayCurrency: input.displayCurrency ?? 'USD',
      marketId: lead.marketId ?? null,
      countryId: lead.countryId ?? null,
      destinationPort: input.destinationPort ?? null,
      validUntil: input.validUntil ?? null,
      freightProfileId: input.freightProfileId ?? null,
      customerMessage: input.customerMessage ?? null,
      internalNotes: input.internalNotes ?? null,
    });

    await this.recordCreationSideEffects({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      quoteId: quote.id,
      sourceEntity: 'lead',
      payload: {
        leadId: lead.id,
        marketId: lead.marketId ?? null,
        countryId: lead.countryId ?? null,
        pricingBasis: quote.pricingBasis ?? DEFAULT_PRICING_BASIS,
        displayCurrency: quote.displayCurrency ?? 'USD',
      },
    });

    return {
      quote,
      sourceEntity: 'lead',
      prefilled: {
        pricingBasis: quote.pricingBasis ?? DEFAULT_PRICING_BASIS,
        displayCurrency: quote.displayCurrency ?? 'USD',
        marketId: lead.marketId ?? null,
        countryId: lead.countryId ?? null,
        destinationPort: quote.destinationPort ?? null,
        validUntil: quote.validUntil ?? null,
      },
    };
  }

  async launchFromRfq(input: RfqQuoteLaunchInput): Promise<QuoteThreadLaunchResult> {
    const rfq = await this.deps.quotePricingRepository.getRfqContext({
      organizationId: input.organizationId,
      rfqId: input.rfqId,
    });

    if (!rfq) {
      throw new Error(`RFQ ${input.rfqId} was not found for CRM quote launch.`);
    }

    const lead = await this.deps.quotePricingRepository.getLeadContext({
      organizationId: input.organizationId,
      leadId: rfq.leadId,
    });

    if (!lead) {
      throw new Error(`Lead ${rfq.leadId} linked to RFQ ${input.rfqId} was not found.`);
    }

    const quote = await this.deps.quotePricingRepository.createQuoteThread({
      organizationId: input.organizationId,
      leadId: lead.id,
      rfqId: rfq.id,
      actorUserId: input.actorUserId,
      sourceEntity: 'rfq',
      pricingBasis: input.pricingBasis ?? DEFAULT_PRICING_BASIS,
      displayCurrency: input.displayCurrency ?? rfq.currency ?? 'USD',
      marketId: lead.marketId ?? null,
      countryId: lead.countryId ?? null,
      destinationPort: input.destinationPort ?? null,
      validUntil: input.validUntil ?? rfq.validityDate ?? null,
      freightProfileId: input.freightProfileId ?? null,
      customerMessage: input.customerMessage ?? null,
      internalNotes: input.internalNotes ?? null,
    });

    await this.recordCreationSideEffects({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      quoteId: quote.id,
      sourceEntity: 'rfq',
      payload: {
        rfqId: rfq.id,
        leadId: lead.id,
        marketId: lead.marketId ?? null,
        countryId: lead.countryId ?? null,
        pricingBasis: quote.pricingBasis ?? DEFAULT_PRICING_BASIS,
        displayCurrency: quote.displayCurrency ?? (rfq.currency ?? 'USD'),
        validUntil: quote.validUntil ?? rfq.validityDate ?? null,
      },
    });

    return {
      quote,
      sourceEntity: 'rfq',
      prefilled: {
        pricingBasis: quote.pricingBasis ?? DEFAULT_PRICING_BASIS,
        displayCurrency: quote.displayCurrency ?? (rfq.currency ?? 'USD'),
        marketId: lead.marketId ?? null,
        countryId: lead.countryId ?? null,
        destinationPort: quote.destinationPort ?? null,
        validUntil: quote.validUntil ?? rfq.validityDate ?? null,
      },
    };
  }

  private async recordCreationSideEffects(args: {
    organizationId: string;
    actorUserId: string;
    quoteId: string;
    sourceEntity: 'lead' | 'rfq';
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.deps.negotiationRepository?.recordEvent({
      quoteId: args.quoteId,
      eventType: 'comment_added',
      actorType: 'internal_user',
      actorUserId: args.actorUserId,
      message: args.sourceEntity === 'lead'
        ? 'Quote thread created from lead context.'
        : 'Quote thread created from RFQ context.',
      payload: {
        sourceEntity: args.sourceEntity,
        ...(args.payload as Record<string, never>),
      },
    });

    await this.deps.auditRepository?.recordPricingEvent({
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      entityType: 'quote',
      entityId: args.quoteId,
      action: args.sourceEntity === 'lead' ? 'pricing_quote_thread_created_from_lead' : 'pricing_quote_thread_created_from_rfq',
      payload: args.payload as Record<string, never>,
    });
  }
}
