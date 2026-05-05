import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';

function money(value: unknown, currency = 'USD') {
  const n = Number(value ?? 0);
  return `${currency} ${Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
}


type ProductLookup = {
  id: string;
  name?: string | null;
  sku?: string | null;
};

type QuotePdfLineRow = {
  name: string;
  qty: number;
  unit: number;
  total: number;
  override: boolean;
  reason: string;
};

function asProductLookup(value: unknown): ProductLookup | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ProductLookup>;
  return typeof candidate.id === 'string' ? { id: candidate.id, name: candidate.name ?? null, sku: candidate.sku ?? null } : null;
}

type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
  color?: string;
};

type PdfBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
};

function rgb(hex: string) {
  const clean = hex.replace('#', '');
  const n = Number.parseInt(clean, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function wrapText(value: string, maxChars: number) {
  const words = String(value ?? '').split(/\s+/).filter(Boolean);
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

function buildQuotePdf(input: {
  quoteTitle: string;
  organizationName: string;
  customerName: string;
  contactLine: string;
  statusLine: string;
  approvalLine: string;
  currency: string;
  rows: QuotePdfLineRow[];
  subtotal: number;
  quoteTerms: string;
  orderTerms: string;
}) {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const boxes: PdfBox[] = [];
  const text: PdfTextItem[] = [];
  const pageW = 612;
  const margin = 42;
  let y = 750;
  const addText = (item: PdfTextItem) => text.push(item);
  const addBox = (box: PdfBox) => boxes.push(box);

  addBox({ x: margin, y: 688, w: pageW - margin * 2, h: 86, fill: '#0b2e4a' });
  addText({ text: input.organizationName || 'SETU Flow', x: margin + 18, y: 750, size: 10, bold: true, color: '#ffffff' });
  addText({ text: input.quoteTitle, x: margin + 18, y: 728, size: 20, bold: true, color: '#ffffff' });
  addText({ text: `Grand Total ${money(input.subtotal, input.currency)}`, x: 398, y: 728, size: 14, bold: true, color: '#ffffff' });
  addText({ text: 'Commercial quotation', x: 398, y: 710, size: 9, color: '#ffffff' });

  y = 660;
  addBox({ x: margin, y: y - 52, w: 252, h: 66, fill: '#f8fafc', stroke: '#dbe4ef' });
  addText({ text: 'BILL TO', x: margin + 12, y: y, size: 8, bold: true });
  addText({ text: input.customerName, x: margin + 12, y: y - 16, size: 11, bold: true });
  addText({ text: input.contactLine, x: margin + 12, y: y - 32, size: 9 });
  addBox({ x: 330, y: y - 52, w: 240, h: 66, fill: '#f8fafc', stroke: '#dbe4ef' });
  addText({ text: 'QUOTE STATUS', x: 342, y: y, size: 8, bold: true });
  addText({ text: input.statusLine, x: 342, y: y - 16, size: 10, bold: true });
  addText({ text: input.approvalLine, x: 342, y: y - 32, size: 9 });

  y = 580;
  addBox({ x: margin, y: y - 18, w: pageW - margin * 2, h: 24, fill: '#eaf4ff', stroke: '#dbe4ef' });
  addText({ text: 'Product / Description', x: margin + 10, y: y - 3, size: 8, bold: true });
  addText({ text: 'Qty', x: 314, y: y - 3, size: 8, bold: true });
  addText({ text: 'Unit Price', x: 374, y: y - 3, size: 8, bold: true });
  addText({ text: 'Total', x: 500, y: y - 3, size: 8, bold: true });
  y -= 32;

  for (const [index, row] of input.rows.entries()) {
    if (y < 170) break;
    const rowHeight = row.reason ? 48 : 36;
    addBox({ x: margin, y: y - rowHeight + 12, w: pageW - margin * 2, h: rowHeight, fill: index % 2 ? '#ffffff' : '#fbfdff', stroke: '#edf2f7' });
    addText({ text: `${index + 1}. ${row.name}`, x: margin + 10, y, size: 10, bold: true });
    if (row.override) addText({ text: 'Quote-only adjusted', x: margin + 10, y: y - 14, size: 8, bold: true });
    if (row.reason) addText({ text: `Note: ${row.reason}`.slice(0, 76), x: margin + 10, y: y - 28, size: 8 });
    addText({ text: String(row.qty), x: 314, y, size: 9 });
    addText({ text: money(row.unit, input.currency), x: 374, y, size: 9 });
    addText({ text: money(row.total, input.currency), x: 500, y, size: 9, bold: true });
    y -= rowHeight + 6;
  }

  addBox({ x: 370, y: y - 36, w: 200, h: 42, fill: '#0b2e4a' });
  addText({ text: 'Grand total', x: 386, y: y - 10, size: 10, bold: true });
  addText({ text: money(input.subtotal, input.currency), x: 470, y: y - 10, size: 12, bold: true });

  y -= 74;
  addText({ text: 'Terms & Conditions', x: margin, y, size: 12, bold: true });
  y -= 16;
  for (const line of wrapText(input.quoteTerms, 105).slice(0, 5)) {
    addText({ text: line, x: margin, y, size: 8 });
    y -= 11;
  }
  addText({ text: 'Order handoff terms', x: margin, y: y - 6, size: 10, bold: true });
  y -= 22;
  for (const line of wrapText(input.orderTerms, 105).slice(0, 3)) {
    addText({ text: line, x: margin, y, size: 8 });
    y -= 11;
  }
  addText({ text: 'Generated by SETU Flow. Review commercial terms, validity, pricing basis, and delivery method before sending.', x: margin, y: 42, size: 8 });

  const ops: string[] = [];
  for (const box of boxes) {
    if (box.fill) ops.push(`${rgb(box.fill)} rg ${box.x} ${box.y} ${box.w} ${box.h} re f`);
    if (box.stroke) ops.push(`${rgb(box.stroke)} RG ${box.x} ${box.y} ${box.w} ${box.h} re S`);
  }
  ops.push('BT');
  for (const item of text) {
    ops.push(`/${item.bold ? 'F2' : 'F1'} ${item.size ?? 9} Tf`);
    ops.push(`${rgb(item.color ?? '#0f172a')} rg`);
    ops.push(`1 0 0 1 ${item.x} ${item.y} Tm (${pdfEscape(item.text)}) Tj`);
  }
  ops.push('ET');
  const content = ops.join('\n');
  const contentId = add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  const pageId = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  const pagesId = add(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  objects[pageId - 1] = objects[pageId - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((body, index) => {
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
    .select('id, quote_number, lead_id, status, currency, display_currency, updated_at, valid_until, approval_required, approved_at')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });

  const [{ data: lead }, { data: lineItems }] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, email, phone, country').eq('organization_id', organizationId).eq('id', quote.lead_id).maybeSingle(),
    db.from('quote_line_items').select('id, product_id, quantity, unit_price, currency, catalog_price_amount, is_price_overridden, override_reason, notes').eq('quote_id', quote.id).order('created_at', { ascending: true }),
  ]);
  const productIds = Array.from(new Set((lineItems ?? []).map((line: any) => line.product_id).filter(Boolean)));
  const { data: products } = productIds.length
    ? await db.from('products').select('id, name, sku').eq('organization_id', organizationId).in('id', productIds)
    : { data: [] };
  const productMap = new Map<string, ProductLookup>();
  (products ?? []).forEach((product: unknown) => {
    const normalized = asProductLookup(product);
    if (normalized) productMap.set(normalized.id, normalized);
  });
  const currency = String(quote.display_currency ?? quote.currency ?? 'USD');
  const rows: QuotePdfLineRow[] = (lineItems ?? []).map((line: any): QuotePdfLineRow => {
    const product = productMap.get(line.product_id);
    const qty = Number(line.quantity ?? 0);
    const unit = Number(line.unit_price ?? 0);
    return {
      name: product?.name ?? 'Catalog line',
      qty,
      unit,
      total: qty * unit,
      override: Boolean(line.is_price_overridden),
      reason: line.override_reason ?? line.notes ?? '',
    };
  });
  const subtotal = rows.reduce((sum: number, row: QuotePdfLineRow) => sum + row.total, 0);
  const { data: organizationTerms } = await db
    .from('organizations')
    .select('id, name, quote_terms_conditions, order_terms_conditions')
    .eq('id', organizationId)
    .maybeSingle()
    .then((result: any) => result?.error ? { data: null } : result);
  const defaultQuoteTerms = 'Prices are valid only within the stated quote validity period. Final shipment, documentation, inspection, and bank charges are subject to agreed Incoterms and written confirmation. Quote-only discounts or markups do not change catalog defaults.';
  const defaultOrderTerms = 'Orders are released after acceptance, payment term confirmation, and any required internal approval. Packaging, labeling, lead time, and delivery schedule are confirmed before dispatch.';
  const pdf = buildQuotePdf({
    quoteTitle: `Quote ${quote.quote_number ?? quote.id.slice(0, 8)}`,
    organizationName: organizationTerms?.name ?? 'SETU Flow',
    customerName: lead?.company_name ?? 'Unknown customer',
    contactLine: `${lead?.contact_name ?? '-'}  ${lead?.email ?? ''}`,
    statusLine: `Status: ${quote.status ?? 'draft'} · Currency: ${currency} · Updated: ${quote.updated_at ? new Date(quote.updated_at).toLocaleDateString('en-US') : '-'}`,
    approvalLine: `Approval: ${quote.approval_required && !quote.approved_at ? 'Pending approval' : 'Cleared'}`,
    currency,
    rows,
    subtotal,
    quoteTerms: organizationTerms?.quote_terms_conditions ?? defaultQuoteTerms,
    orderTerms: organizationTerms?.order_terms_conditions ?? defaultOrderTerms,
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
