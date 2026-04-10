import type { Json } from '@/types/database';
import type { QuoteVersionAggregate } from '../repositories';
import type { TemplateType } from '../types';

export type ResolvedRenderTemplate = {
  id: string | null;
  name: string;
  templateType: TemplateType;
  headerConfig: Json;
  footerConfig: Json;
  layoutSchema: Json;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asRecord(value: Json | undefined | null): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, Json>) : {};
}

function asText(value: Json | undefined | null): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: Json | undefined | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return value.toFixed(2);
}

function resolveTemplateName(type: TemplateType): string {
  switch (type) {
    case 'chips':
      return 'Chips Quote';
    case 'powders':
      return 'Powders Quote';
    case 'both':
    default:
      return 'Combined Quote';
  }
}

export function resolveAggregateTemplateType(aggregate: QuoteVersionAggregate): TemplateType {
  const categories = new Set(aggregate.lines.map((line) => line.categoryType));

  if (categories.size === 1 && categories.has('chips')) {
    return 'chips';
  }

  if (categories.size === 1 && categories.has('powders')) {
    return 'powders';
  }

  return 'both';
}

export function resolveRenderTemplate(args: {
  aggregate: QuoteVersionAggregate;
  requestedTemplateType?: TemplateType;
  templateRecord?: {
    id: string;
    templateType: TemplateType;
    name: string;
    headerConfig: Json;
    footerConfig: Json;
    layoutSchema: Json;
  } | null;
}): ResolvedRenderTemplate {
  const templateType = args.requestedTemplateType ?? args.templateRecord?.templateType ?? resolveAggregateTemplateType(args.aggregate);

  return {
    id: args.templateRecord?.id ?? null,
    name: args.templateRecord?.name ?? resolveTemplateName(templateType),
    templateType,
    headerConfig: args.templateRecord?.headerConfig ?? {},
    footerConfig: args.templateRecord?.footerConfig ?? {},
    layoutSchema: args.templateRecord?.layoutSchema ?? {},
  };
}

function renderMetaList(items: Array<{ label: string; value: string | null | undefined }>): string {
  const filtered = items.filter((item) => item.value && item.value.trim().length > 0);

  if (filtered.length === 0) {
    return '';
  }

  return `
    <div class="meta-grid">
      ${filtered.map((item) => `
        <div class="meta-item">
          <div class="meta-label">${escapeHtml(item.label)}</div>
          <div class="meta-value">${escapeHtml(item.value ?? '')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderLinesTable(aggregate: QuoteVersionAggregate, templateType: TemplateType): string {
  const lines = aggregate.lines.filter((line) => {
    if (templateType === 'both') return true;
    return line.categoryType === templateType;
  });

  const columns = templateType === 'powders'
    ? ['SKU', 'Product', 'HSN', 'MOQ', 'Price / KG', 'Currency']
    : templateType === 'chips'
      ? ['SKU', 'Product', 'Pack', 'MOQ', 'Price / Unit', 'Price / Case', 'Currency']
      : ['Category', 'SKU', 'Product', 'Pack', 'MOQ', 'Price', 'Currency'];

  const rows = lines.map((line) => {
    if (templateType === 'powders') {
      return `
        <tr>
          <td>${escapeHtml(line.skuCode)}</td>
          <td>${escapeHtml(line.productName)}</td>
          <td>${escapeHtml(line.hsnCode ?? '-')}</td>
          <td>${escapeHtml(line.moq != null ? String(line.moq) : '-')}</td>
          <td>${escapeHtml(formatNumber(line.finalKgPrice))}</td>
          <td>${escapeHtml(line.displayCurrency)}</td>
        </tr>
      `;
    }

    if (templateType === 'chips') {
      return `
        <tr>
          <td>${escapeHtml(line.skuCode)}</td>
          <td>${escapeHtml(line.productName)}</td>
          <td>${escapeHtml(line.packLabel ?? '-')}</td>
          <td>${escapeHtml(line.moq != null ? String(line.moq) : '-')}</td>
          <td>${escapeHtml(formatNumber(line.finalUnitPrice))}</td>
          <td>${escapeHtml(formatNumber(line.finalCasePrice))}</td>
          <td>${escapeHtml(line.displayCurrency)}</td>
        </tr>
      `;
    }

    const combinedPrice = line.pricingMode === 'kg' || line.pricingMode === 'bulk_kg'
      ? formatNumber(line.finalKgPrice)
      : line.finalCasePrice != null
        ? `${formatNumber(line.finalUnitPrice)} / ${formatNumber(line.finalCasePrice)}`
        : formatNumber(line.finalUnitPrice);

    return `
      <tr>
        <td>${escapeHtml(line.categoryType)}</td>
        <td>${escapeHtml(line.skuCode)}</td>
        <td>${escapeHtml(line.productName)}</td>
        <td>${escapeHtml(line.packLabel ?? '-')}</td>
        <td>${escapeHtml(line.moq != null ? String(line.moq) : '-')}</td>
        <td>${escapeHtml(combinedPrice)}</td>
        <td>${escapeHtml(line.displayCurrency)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table>
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function buildRenderFileName(aggregate: QuoteVersionAggregate, templateType: TemplateType): string {
  const quoteNumber = aggregate.parentQuote.quoteNumber ?? aggregate.parentQuote.id;
  return `${quoteNumber}-v${aggregate.version.versionNo}-${templateType}.html`;
}

export function buildQuoteRenderHtml(args: {
  aggregate: QuoteVersionAggregate;
  template: ResolvedRenderTemplate;
}): string {
  const { aggregate, template } = args;
  const header = asRecord(template.headerConfig);
  const footer = asRecord(template.footerConfig);
  const quoteContext = aggregate.snapshot?.quoteContext ?? {};
  const calculationPayload = aggregate.snapshot?.calculationPayload ?? {};

  const headerTitle = asText(header.title) ?? `${template.name}`;
  const headerSubtitle = asText(header.subtitle) ?? 'SETU Flow Pricing Quote';
  const footerNotes = asStringArray(footer.notes);
  const footerSignature = asText(footer.signature) ?? asText(quoteContext.signatureBlock);
  const customerMessage = asText(quoteContext.customerMessage) ?? asText(calculationPayload.customerMessage);
  const destinationPort = asText(quoteContext.destinationPort) ?? aggregate.parentQuote.destinationPort ?? null;
  const validUntil = asText(quoteContext.validUntil) ?? aggregate.parentQuote.validUntil ?? null;
  const basis = asText(quoteContext.pricingBasis) ?? aggregate.version.status;
  const displayCurrency = aggregate.snapshot?.fx?.displayCurrency ?? aggregate.parentQuote.displayCurrency ?? null;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(buildRenderFileName(aggregate, template.templateType))}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; margin: 32px; color: #111827; }
      h1, h2, h3 { margin: 0; }
      .header { margin-bottom: 24px; }
      .subtitle { color: #4b5563; margin-top: 6px; }
      .meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
      .meta-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
      .meta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
      .meta-value { font-size: 14px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 13px; }
      thead { background: #f9fafb; }
      .section { margin-top: 24px; }
      .muted { color: #6b7280; }
      ul { margin: 8px 0 0 20px; }
    </style>
  </head>
  <body>
    <section class="header">
      <h1>${escapeHtml(headerTitle)}</h1>
      <div class="subtitle">${escapeHtml(headerSubtitle)}</div>
      ${renderMetaList([
        { label: 'Quote Number', value: aggregate.parentQuote.quoteNumber ?? aggregate.parentQuote.id },
        { label: 'Version', value: `V${aggregate.version.versionNo}` },
        { label: 'Template', value: template.templateType },
        { label: 'Pricing Basis', value: basis },
        { label: 'Display Currency', value: displayCurrency },
        { label: 'Destination Port', value: destinationPort },
        { label: 'Valid Until', value: validUntil },
        { label: 'Line Count', value: String(aggregate.lines.length) },
      ])}
    </section>

    ${customerMessage ? `<section class="section"><h2>Customer Message</h2><p>${escapeHtml(customerMessage)}</p></section>` : ''}

    <section class="section">
      <h2>Quoted Items</h2>
      ${renderLinesTable(aggregate, template.templateType)}
    </section>

    <section class="section">
      <h2>Snapshot</h2>
      ${renderMetaList([
        { label: 'FX Base', value: aggregate.snapshot?.fx?.baseCurrency ?? 'USD' },
        { label: 'FX Rate', value: aggregate.snapshot?.fx ? String(aggregate.snapshot.fx.rate) : null },
        { label: 'FX Provider', value: aggregate.snapshot?.fx?.provider ?? null },
        { label: 'Source Hash', value: aggregate.snapshot?.sourceHash ?? null },
      ])}
    </section>

    <section class="section">
      <h2>Notes</h2>
      ${footerNotes.length > 0 ? `<ul>${footerNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : '<p class="muted">No footer notes configured.</p>'}
      ${footerSignature ? `<p><strong>Signature:</strong> ${escapeHtml(footerSignature)}</p>` : ''}
    </section>
  </body>
</html>`;
}
