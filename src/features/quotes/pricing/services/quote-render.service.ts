import type { QuoteRenderService, RenderQuotePdfInput, RenderQuotePdfResult } from '../types';
import type { QuotePricingRepository, QuoteTemplateRepository } from '../repositories';
import {
  buildQuoteRenderHtml,
  buildRenderFileName,
  resolveAggregateTemplateType,
  resolveRenderTemplate,
} from './quote-render.helpers';

export type QuoteRenderServiceDeps = {
  quotePricingRepository: QuotePricingRepository;
  quoteTemplateRepository: QuoteTemplateRepository;
};

export class DefaultQuoteRenderService implements QuoteRenderService {
  constructor(private readonly deps: QuoteRenderServiceDeps) {}

  async renderPdf(input: RenderQuotePdfInput): Promise<RenderQuotePdfResult> {
    const aggregate = await this.deps.quotePricingRepository.getVersionAggregate({
      quoteVersionId: input.quoteVersionId,
    });

    if (!aggregate) {
      throw new Error(`Quote version aggregate not found for ${input.quoteVersionId}.`);
    }

    const resolvedTemplateType = input.templateType ?? resolveAggregateTemplateType(aggregate);
    const templateRecord = await this.deps.quoteTemplateRepository.resolveTemplate({
      organizationId: aggregate.parentQuote.organizationId,
      templateType: resolvedTemplateType,
      templateId: input.templateId ?? null,
    });

    const template = resolveRenderTemplate({
      aggregate,
      requestedTemplateType: input.templateType,
      templateRecord,
    });

    const html = buildQuoteRenderHtml({ aggregate, template });

    return {
      fileName: buildRenderFileName(aggregate, template.templateType),
      html,
      pdfBuffer: Buffer.from(html, 'utf-8'),
    };
  }
}
