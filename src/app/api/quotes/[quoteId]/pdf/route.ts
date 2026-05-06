import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function money(value: unknown, currency = 'USD'): string {
  const n = toNumber(value, 0);
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyCompact(value: unknown, currency = 'USD'): string {
  const n = toNumber(value, 0);
  const prefix = currency === 'USD' ? '$' : `${currency} `;
  return `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pdfEscape(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

function rgb(hex: string): string {
  const clean = hex.replace('#', '');
  const n = Number.parseInt(clean, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function cleanText(value: unknown, fallback = '-'): string {
  const s = String(value ?? '').trim();
  return s || fallback;
}

function wrapText(value: string, maxChars: number): string[] {
  const words = cleanText(value, '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

type ProductLookup = {
  id: string;
  name?: string | null;
  sku?: string | null;
  sku_code?: string | null;
  category_id?: string | null;
};

type VariantLookup = {
  id: string;
  product_id?: string | null;
  name?: string | null;
  sku_code?: string | null;
  pack_size_value?: number | string | null;
  pack_size_unit?: string | null;
  pack_label?: string | null;
  units_per_case?: number | string | null;
  moq_cases?: number | string | null;
  moq_kg?: number | string | null;
  pricing_mode_default?: string | null;
};

type CategoryLookup = {
  id: string;
  name?: string | null;
  sort_order?: number | null;
};

type QuoteLineSource = {
  id: string;
  product_id?: string | null;
  product_variant_id?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  currency?: string | null;
  catalog_price_amount?: number | string | null;
  catalog_price_currency?: string | null;
  is_price_overridden?: boolean | null;
  override_reason?: string | null;
  notes?: string | null;
};

type QuotePdfLineRow = {
  sku: string;
  productName: string;
  categoryName: string;
  categorySort: number;
  pack: string;
  unitsPerCase: string;
  moq: string;
  basis: string;
  qty: number;
  quoteUnit: number;
  catalogUnit: number | null;
  total: number;
  quoteCase: number | null;
  catalogCase: number | null;
  isAdjusted: boolean;
  adjustmentLabel: string;
};

type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'right';
};

type PdfBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
};

function asProductLookup(value: unknown): ProductLookup | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ProductLookup>;
  return typeof candidate.id === 'string' ? candidate as ProductLookup : null;
}

function asVariantLookup(value: unknown): VariantLookup | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<VariantLookup>;
  return typeof candidate.id === 'string' ? candidate as VariantLookup : null;
}

function asCategoryLookup(value: unknown): CategoryLookup | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CategoryLookup>;
  return typeof candidate.id === 'string' ? candidate as CategoryLookup : null;
}

function formatPack(variant: VariantLookup | undefined): string {
  if (!variant) return '-';
  const value = cleanText(variant.pack_size_value, '');
  const unit = cleanText(variant.pack_size_unit, '');
  const label = cleanText(variant.pack_label, '');
  if (label && label !== '-') return label;
  if (value && unit) return `${value} ${unit}`;
  if (value) return value;
  return '-';
}

function normalizeBasis(value: unknown): string {
  const basis = cleanText(value, 'unit').toLowerCase();
  if (basis.includes('case')) return 'CASE';
  if (basis.includes('kg') || basis.includes('bulk')) return 'KG';
  return 'UNIT';
}

function buildAdjustmentLabel(line: QuoteLineSource, catalogUnit: number | null, quoteUnit: number): string {
  if (!line.is_price_overridden || catalogUnit === null || catalogUnit <= 0) return '';
  const diff = quoteUnit - catalogUnit;
  const pct = Math.abs((diff / catalogUnit) * 100);
  const mode = diff < 0 ? 'Discount' : 'Markup';
  const reason = cleanText(line.override_reason ?? line.notes, 'quote-only adjustment');
  return `${mode} applied: ${pct.toFixed(1)}% (${reason})`;
}

function buildQuotePdf(input: {
  quoteTitle: string;
  organizationName: string;
  customerName: string;
  preparedFor: string;
  preparedDate: string;
  marketName: string;
  destination: string;
  basis: string;
  validUntil: string;
  currency: string;
  rows: QuotePdfLineRow[];
  subtotal: number;
  quoteTerms: string;
}) {
  const objects: string[] = [];
  const add = (body: string): number => {
    objects.push(body);
    return objects.length;
  };
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const boxes: PdfBox[] = [];
  const text: PdfTextItem[] = [];
  const pageW = 612;
  const margin = 36;
  const addText = (item: PdfTextItem) => text.push(item);
  const addBox = (box: PdfBox) => boxes.push(box);
  const rightText = (value: string, x: number, y: number, size = 9, bold = false) => addText({ text: value, x, y, size, bold, align: 'right' });

  addText({ text: `${input.organizationName} - Client Price List`, x: margin, y: 752, size: 16, bold: true, color: '#0b2e4a' });
  addBox({ x: margin, y: 726, w: pageW - margin * 2, h: 18, fill: '#0b2e4a' });
  addText({ text: input.quoteTitle, x: margin + 8, y: 731, size: 10, bold: true, color: '#ffffff' });

  const metaY = 704;
  addText({ text: 'Prepared For:', x: margin, y: metaY, size: 8, bold: true });
  addText({ text: input.preparedFor, x: 116, y: metaY, size: 8 });
  addText({ text: 'Market:', x: 246, y: metaY, size: 8, bold: true });
  addText({ text: input.marketName, x: 310, y: metaY, size: 8 });
  addText({ text: 'Basis:', x: 446, y: metaY, size: 8, bold: true });
  addText({ text: input.basis, x: 506, y: metaY, size: 8 });

  addText({ text: 'Prepared:', x: margin, y: metaY - 16, size: 8, bold: true });
  addText({ text: input.preparedDate, x: 116, y: metaY - 16, size: 8 });
  addText({ text: 'Valid Until:', x: 246, y: metaY - 16, size: 8, bold: true });
  addText({ text: input.validUntil, x: 310, y: metaY - 16, size: 8 });
  addText({ text: 'Currency:', x: 446, y: metaY - 16, size: 8, bold: true });
  addText({ text: input.currency, x: 506, y: metaY - 16, size: 8 });

  addText({ text: 'Destination:', x: margin, y: metaY - 32, size: 8, bold: true });
  addText({ text: input.destination, x: 116, y: metaY - 32, size: 8 });

  let y = 642;
  const header = () => {
    addBox({ x: margin, y: y - 12, w: 540, h: 18, fill: '#eaf0f6', stroke: '#b8c3cf' });
    addText({ text: 'SKU', x: margin + 4, y: y - 6, size: 8, bold: true });
    addText({ text: 'Product', x: 108, y: y - 6, size: 8, bold: true });
    addText({ text: 'Pack', x: 210, y: y - 6, size: 8, bold: true });
    addText({ text: 'Units/Case', x: 260, y: y - 6, size: 8, bold: true });
    addText({ text: 'MOQ', x: 322, y: y - 6, size: 8, bold: true });
    addText({ text: 'Basis', x: 374, y: y - 6, size: 8, bold: true });
    addText({ text: `${input.currency}/Unit`, x: 424, y: y - 6, size: 8, bold: true });
    addText({ text: `${input.currency}/Case`, x: 502, y: y - 6, size: 8, bold: true });
    y -= 21;
  };

  const groups = Array.from(input.rows.reduce((map: Map<string, QuotePdfLineRow[]>, row: QuotePdfLineRow) => {
    const key = row.categoryName || 'Catalog';
    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);
    return map;
  }, new Map<string, QuotePdfLineRow[]>()).entries())
    .sort((a, b) => (a[1][0]?.categorySort ?? 9999) - (b[1][0]?.categorySort ?? 9999) || a[0].localeCompare(b[0]));
  const showCategorySubtotal = groups.length > 1;

  header();
  for (const [categoryName, rows] of groups) {
    addBox({ x: margin, y: y - 10, w: 540, h: 16, fill: '#f7fafc' });
    addText({ text: categoryName.toUpperCase(), x: margin + 4, y: y - 5, size: 8, bold: true, color: '#0b2e4a' });
    y -= 18;
    rows.forEach((row: QuotePdfLineRow, index: number) => {
      const rowHeight = row.isAdjusted ? 28 : 18;
      addBox({ x: margin, y: y - rowHeight + 6, w: 540, h: rowHeight, fill: index % 2 ? '#ffffff' : '#f4f7fb', stroke: '#c7d0da' });
      addText({ text: row.sku, x: margin + 4, y, size: 7 });
      addText({ text: row.productName.slice(0, 25), x: 108, y, size: 7 });
      addText({ text: row.pack.slice(0, 10), x: 210, y, size: 7 });
      rightText(row.unitsPerCase, 310, y, 7);
      rightText(row.moq, 360, y, 7);
      addText({ text: row.basis, x: 374, y, size: 7 });
      rightText(moneyCompact(row.quoteUnit, input.currency), 490, y, 7);
      rightText(row.quoteCase === null ? '-' : moneyCompact(row.quoteCase, input.currency), 570, y, 7);
      if (row.isAdjusted) {
        addText({ text: row.adjustmentLabel.slice(0, 84), x: 108, y: y - 12, size: 6, color: '#92400e' });
        const original = row.catalogUnit === null ? '' : `List: ${moneyCompact(row.catalogUnit, input.currency)}`;
        const caseOriginal = row.catalogCase === null ? '' : ` / ${moneyCompact(row.catalogCase, input.currency)} case`;
        addText({ text: `${original}${caseOriginal}`.slice(0, 42), x: 424, y: y - 12, size: 6, color: '#64748b' });
      }
      y -= rowHeight;
    });
    if (showCategorySubtotal) {
      const categorySubtotal = rows.reduce((sum: number, row: QuotePdfLineRow) => sum + row.total, 0);
      addBox({ x: 356, y: y - 12, w: 220, h: 18, fill: '#ffffff', stroke: '#c7d0da' });
      addText({ text: `${categoryName} subtotal`, x: 364, y: y - 6, size: 7, bold: true });
      rightText(money(categorySubtotal, input.currency), 570, y - 6, 7, true);
      y -= 24;
    } else {
      y -= 8;
    }
  }

  y -= 6;
  addBox({ x: 356, y: y - 16, w: 220, h: 24, fill: '#0b2e4a' });
  addText({ text: 'Quote total', x: 366, y: y - 6, size: 9, bold: true, color: '#ffffff' });
  rightText(money(input.subtotal, input.currency), 566, y - 6, 9, true);

  y -= 44;
  addText({ text: 'Notes', x: margin, y, size: 9, bold: true });
  y -= 13;
  const shortTerms = input.quoteTerms || 'Prices are subject to the validity date shown on this quote. Delivery basis is as per the stated Incoterm. Duties, taxes, and destination charges are excluded unless specifically included. This quote is subject to final order confirmation and agreed payment terms.';
  wrapText(shortTerms, 126).slice(0, 4).forEach((line: string) => {
    addText({ text: line, x: margin, y, size: 7 });
    y -= 10;
  });
  addText({ text: 'Generated by SETU Flow. Review commercial terms, validity, pricing basis, and delivery method before sending.', x: margin, y: 36, size: 7 });

  const ops: string[] = [];
  boxes.forEach((box: PdfBox) => {
    if (box.fill) ops.push(`${rgb(box.fill)} rg ${box.x} ${box.y} ${box.w} ${box.h} re f`);
    if (box.stroke) ops.push(`${rgb(box.stroke)} RG ${box.x} ${box.y} ${box.w} ${box.h} re S`);
  });
  ops.push('BT');
  text.forEach((item: PdfTextItem) => {
    const size = item.size ?? 9;
    const estimatedWidth = item.text.length * size * 0.5;
    const x = item.align === 'right' ? Math.max(margin, item.x - estimatedWidth) : item.x;
    ops.push(`/${item.bold ? 'F2' : 'F1'} ${size} Tf`);
    ops.push(`${rgb(item.color ?? '#0f172a')} rg`);
    ops.push(`1 0 0 1 ${x} ${item.y} Tm (${pdfEscape(item.text)}) Tj`);
  });
  ops.push('ET');

  const content = ops.join('\n');
  const contentId = add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  const pageId = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  const pagesId = add(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  objects[pageId - 1] = objects[pageId - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((body: string, index: number) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export async function GET(_request: Request, { params }: { params: { quoteId: string } }) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });
  const db = await createClient() as any;
  const quoteId = params.quoteId;

  const { data: quote, error } = await db
    .from('quotes')
    .select('id, quote_number, lead_id, status, currency, display_currency, updated_at, valid_until, pricing_basis, destination_port, market_id, country_id, approval_required, approved_at')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });

  const [{ data: lead }, { data: lineItems }, { data: organizationTerms }, { data: market }, { data: country }] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, email, phone, country').eq('organization_id', organizationId).eq('id', quote.lead_id).maybeSingle(),
    db.from('quote_line_items').select('id, product_id, product_variant_id, quantity, unit_price, currency, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason, notes').eq('quote_id', quote.id).order('created_at', { ascending: true }),
    db.from('organizations').select('id, name, quote_terms_conditions').eq('id', organizationId).maybeSingle(),
    quote.market_id ? db.from('markets').select('id, name').eq('organization_id', organizationId).eq('id', quote.market_id).maybeSingle() : Promise.resolve({ data: null }),
    quote.country_id ? db.from('countries').select('id, name').eq('organization_id', organizationId).eq('id', quote.country_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const lines: QuoteLineSource[] = (lineItems ?? []) as QuoteLineSource[];
  const productIds = Array.from(new Set(lines.map((line: QuoteLineSource) => line.product_id).filter((id): id is string => Boolean(id))));
  const variantIds = Array.from(new Set(lines.map((line: QuoteLineSource) => line.product_variant_id).filter((id): id is string => Boolean(id))));
  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length ? db.from('products').select('id, name, sku, sku_code, category_id').eq('organization_id', organizationId).in('id', productIds) : Promise.resolve({ data: [] }),
    variantIds.length ? db.from('product_variants').select('id, product_id, name, sku_code, pack_size_value, pack_size_unit, pack_label, units_per_case, moq_cases, moq_kg, pricing_mode_default').in('id', variantIds) : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map<string, ProductLookup>();
  (products ?? []).forEach((product: unknown) => {
    const normalized = asProductLookup(product);
    if (normalized) productMap.set(normalized.id, normalized);
  });
  const variantMap = new Map<string, VariantLookup>();
  (variants ?? []).forEach((variant: unknown) => {
    const normalized = asVariantLookup(variant);
    if (normalized) variantMap.set(normalized.id, normalized);
  });
  const categoryIds = Array.from(new Set(Array.from(productMap.values()).map((product: ProductLookup) => product.category_id).filter((id): id is string => Boolean(id))));
  const { data: categories } = categoryIds.length
    ? await db.from('product_categories').select('id, name, sort_order').eq('organization_id', organizationId).in('id', categoryIds)
    : { data: [] };
  const categoryMap = new Map<string, CategoryLookup>();
  (categories ?? []).forEach((category: unknown) => {
    const normalized = asCategoryLookup(category);
    if (normalized) categoryMap.set(normalized.id, normalized);
  });

  const currency = String(quote.display_currency ?? quote.currency ?? 'USD');
  const rows: QuotePdfLineRow[] = lines.map((line: QuoteLineSource): QuotePdfLineRow => {
    const product = line.product_id ? productMap.get(line.product_id) : undefined;
    const variant = line.product_variant_id ? variantMap.get(line.product_variant_id) : undefined;
    const category = product?.category_id ? categoryMap.get(product.category_id) : undefined;
    const basis = normalizeBasis(variant?.pricing_mode_default ?? quote.pricing_basis);
    const qty = toNumber(line.quantity, 0);
    const quoteUnit = toNumber(line.unit_price, 0);
    const catalogUnitRaw = line.catalog_price_amount === null || line.catalog_price_amount === undefined ? null : toNumber(line.catalog_price_amount, 0);
    const unitsPerCase = toNumber(variant?.units_per_case, 0);
    const quoteCase = basis === 'CASE' ? quoteUnit * (unitsPerCase || 1) : null;
    const catalogCase = catalogUnitRaw !== null && basis === 'CASE' ? catalogUnitRaw * (unitsPerCase || 1) : null;
    const moq = basis === 'KG'
      ? cleanText(variant?.moq_kg, '0')
      : basis === 'CASE'
        ? cleanText(variant?.moq_cases, '0')
        : cleanText(variant?.moq_cases ?? variant?.moq_kg, '0');
    const sku = cleanText(variant?.sku_code ?? product?.sku_code ?? product?.sku, '-');
    const productName = cleanText(product?.name ?? variant?.name, 'Catalog line');
    const categoryName = cleanText(category?.name, 'Catalog');
    return {
      sku,
      productName,
      categoryName,
      categorySort: category?.sort_order ?? 9999,
      pack: basis === 'KG' ? 'Bulk' : formatPack(variant),
      unitsPerCase: basis === 'CASE' ? cleanText(variant?.units_per_case, '-') : '-',
      moq,
      basis,
      qty,
      quoteUnit,
      catalogUnit: catalogUnitRaw,
      total: qty * quoteUnit,
      quoteCase,
      catalogCase,
      isAdjusted: Boolean(line.is_price_overridden || (catalogUnitRaw !== null && Math.abs(catalogUnitRaw - quoteUnit) > 0.0001)),
      adjustmentLabel: buildAdjustmentLabel(line, catalogUnitRaw, quoteUnit),
    };
  });
  const subtotal = rows.reduce((sum: number, row: QuotePdfLineRow) => sum + row.total, 0);
  const defaultQuoteTerms = 'Prices are subject to the validity date shown on this quote. Delivery basis is as per the stated Incoterm. Duties, taxes, and destination charges are excluded unless specifically included. This quote is subject to final order confirmation and agreed payment terms.';
  const pdf = buildQuotePdf({
    quoteTitle: `Quote ${quote.quote_number ?? quote.id.slice(0, 8)}`,
    organizationName: cleanText(organizationTerms?.name, 'SETU Flow'),
    customerName: cleanText(lead?.company_name, 'Unknown customer'),
    preparedFor: cleanText(lead?.company_name, 'Unknown customer'),
    preparedDate: quote.updated_at ? new Date(quote.updated_at).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
    marketName: cleanText(market?.name, '-'),
    destination: cleanText(country?.name ?? lead?.country ?? quote.destination_port, '-'),
    basis: cleanText(quote.pricing_basis, 'FOB').toUpperCase(),
    validUntil: quote.valid_until ? new Date(`${quote.valid_until}T00:00:00`).toLocaleDateString('en-US') : '-',
    currency,
    rows,
    subtotal,
    quoteTerms: organizationTerms?.quote_terms_conditions ?? defaultQuoteTerms,
  });

  await db.from('documents').upsert({
    organization_id: organizationId,
    related_entity: 'quote',
    related_id: quote.id,
    file_name: `quote-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf`,
    file_url: `/api/quotes/${quote.id}/pdf`,
    doc_type: 'quote_pdf',
    uploaded_by: workspace.user?.id ?? null,
    version: 1,
    status: quote.approval_required && !quote.approved_at ? 'pending_approval' : 'ready',
  }, { onConflict: 'organization_id,related_entity,related_id,file_name' }).then(() => null);

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="quote-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
