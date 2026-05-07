import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value: unknown, fallback = '-'): string {
  const s = String(value ?? '').trim();
  return s || fallback;
}

function short(value: unknown, max = 36, fallback = '-'): string {
  const text = cleanText(value, fallback);
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

function money(value: unknown, currency = 'USD'): string {
  const n = toNumber(value, 0);
  const prefix = currency === 'USD' ? '$' : `${currency} `;
  return `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateText(value: unknown, fallback = '-'): string {
  const text = cleanText(value, '');
  if (!text) return fallback;
  const date = text.includes('T') ? new Date(text) : new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-GB');
}

function pdfEscape(value: string): string {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
}

function rgb(hex: string): string {
  const clean = hex.replace('#', '');
  const n = Number.parseInt(clean, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
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

function formatBasis(value: unknown): string {
  const raw = cleanText(value, 'FOB').toUpperCase().replace(/_/g, ' ');
  if (raw === 'FOB') return 'FOB';
  if (raw === 'CIF') return 'CIF';
  if (raw.includes('EX')) return 'EXW / Ex-Factory';
  return raw;
}

function normalizePricingMode(value: unknown): string {
  const basis = cleanText(value, 'unit').toLowerCase();
  if (basis.includes('case')) return 'CASE';
  if (basis.includes('kg') || basis.includes('bulk')) return 'KG';
  return 'UNIT';
}

function formatPack(variant: VariantLookup | undefined): string {
  if (!variant) return '-';
  const label = cleanText(variant.pack_label, '');
  if (label) return label;
  const value = cleanText(variant.pack_size_value, '');
  const unit = cleanText(variant.pack_size_unit, '');
  if (value && unit) return `${value}${unit}`;
  return value || '-';
}

function monthsText(value: unknown): string {
  const months = toNumber(value, 0);
  return months > 0 ? `${months} months` : 'Available per SKU';
}

function daysRangeText(value: unknown): string {
  const days = toNumber(value, 0);
  if (!days) return 'Confirm per category / order';
  if (days <= 7) return `${days} days`;
  return `${Math.max(1, days - 3)}–${days} days`;
}

type ProductLookup = {
  id: string;
  name?: string | null;
  sku?: string | null;
  sku_code?: string | null;
  hsn_code?: string | null;
  category_id?: string | null;
  description?: string | null;
};

type VariantLookup = {
  id: string;
  product_id?: string | null;
  name?: string | null;
  sku_code?: string | null;
  hsn_code?: string | null;
  country_of_origin?: string | null;
  pack_size_value?: number | string | null;
  pack_size_unit?: string | null;
  pack_label?: string | null;
  units_per_case?: number | string | null;
  moq_cases?: number | string | null;
  moq_kg?: number | string | null;
  pricing_mode_default?: string | null;
  packaging_type?: string | null;
  packaging_unit?: string | null;
  shipment_notes?: string | null;
  lead_time_days?: number | string | null;
  shelf_life_months?: number | string | null;
};

type CategoryLookup = {
  id: string;
  name?: string | null;
  sort_order?: number | null;
  default_lead_time_days?: number | string | null;
  default_shelf_life_months?: number | string | null;
  default_country_of_origin?: string | null;
  default_shipment_notes?: string | null;
};

type QuoteLineSource = {
  id: string;
  product_id?: string | null;
  product_variant_id?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  catalog_price_amount?: number | string | null;
  is_price_overridden?: boolean | null;
  override_reason?: string | null;
  notes?: string | null;
};

type QuotePdfLineRow = {
  sku: string;
  productName: string;
  categoryName: string;
  categorySort: number;
  hsCode: string;
  pack: string;
  uom: string;
  unitsPerCase: string;
  moq: string;
  origin: string;
  unitPrice: number;
  discount: string;
  netPrice: number;
  note: string;
  total: number;
  leadTime: string;
  shelfLife: string;
};

type PdfTextItem = { text: string; x: number; y: number; size?: number; bold?: boolean; color?: string; align?: 'left' | 'right' | 'center' };
type PdfBox = { x: number; y: number; w: number; h: number; fill?: string; stroke?: string; radius?: number };

type PdfContext = {
  quoteTitle: string;
  organization: any;
  buyer: any;
  marketName: string;
  destination: string;
  basis: string;
  namedPlace: string;
  currency: string;
  validUntil: string;
  preparedDate: string;
  paymentTerms: string;
  leadTimeSummary: string;
  taxNote: string;
  rows: QuotePdfLineRow[];
  subtotal: number;
  documentationCharge: number;
  quoteTerms: string;
  shipmentNotes: string[];
};

function discountLabel(line: QuoteLineSource): string {
  const catalog = line.catalog_price_amount === null || line.catalog_price_amount === undefined ? null : toNumber(line.catalog_price_amount, 0);
  const unit = toNumber(line.unit_price, 0);
  if (!catalog || catalog <= 0 || !line.is_price_overridden) return '-';
  const diffPct = ((catalog - unit) / catalog) * 100;
  if (Math.abs(diffPct) < 0.1) return '-';
  return diffPct > 0 ? `${diffPct.toFixed(1)}%` : `+${Math.abs(diffPct).toFixed(1)}%`;
}

function buildPdf(input: PdfContext): Buffer {
  const objects: string[] = [];
  const add = (body: string): number => { objects.push(body); return objects.length; };
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const boxes: PdfBox[] = [];
  const text: PdfTextItem[] = [];
  const addBox = (box: PdfBox) => boxes.push(box);
  const addText = (item: PdfTextItem) => text.push(item);
  const pageW = 612;
  const margin = 18;
  const navy = '#0b2e4a';
  const light = '#f4f7fb';
  const border = '#cbd5e1';

  function right(value: string, x: number, y: number, size = 7, bold = false, color = '#0f172a') { addText({ text: value, x, y, size, bold, color, align: 'right' }); }
  function center(value: string, x: number, y: number, size = 7, bold = false, color = '#0f172a') { addText({ text: value, x, y, size, bold, color, align: 'center' }); }
  function label(value: string, x: number, y: number) { addText({ text: value.toUpperCase(), x, y, size: 5.8, bold: true, color: '#334155' }); }

  // Header
  addBox({ x: margin, y: 742, w: 48, h: 34, fill: navy });
  center('LOGO', margin + 24, 757, 8, true, '#ffffff');
  addText({ text: short(input.organization.name ?? input.organization.legal_name, 24, 'SETU Flow'), x: 72, y: 762, size: 10, bold: true, color: navy });
  addText({ text: short(input.organization.website, 34, 'Streamlining Global Trade'), x: 72, y: 748, size: 6.5, color: '#475569' });
  addText({ text: 'SETU Flow – Client Price List', x: 172, y: 764, size: 17, bold: true, color: navy });
  addText({ text: 'Pro Forma Quotation', x: 172, y: 746, size: 9, color: '#334155' });
  addBox({ x: 465, y: 742, w: 128, h: 38, fill: navy });
  center(input.quoteTitle, 529, 762, 10, true, '#ffffff');
  addText({ text: `Quote Date: ${input.preparedDate}`, x: 474, y: 748, size: 6.5, color: '#ffffff' });
  addText({ text: `Valid Until: ${input.validUntil}`, x: 474, y: 738, size: 6.5, color: '#ffffff' });

  // Seller / buyer / details cards
  addBox({ x: margin, y: 604, w: 170, h: 124, fill: '#ffffff', stroke: border });
  addBox({ x: 28, y: 707, w: 86, h: 14, fill: navy });
  addText({ text: 'SELLER / EXPORTER', x: 34, y: 711, size: 6, bold: true, color: '#ffffff' });
  addText({ text: short(input.organization.legal_name ?? input.organization.name, 30), x: 28, y: 692, size: 8, bold: true, color: navy });
  wrapText(cleanText(input.organization.registered_address, ''), 32).slice(0, 3).forEach((line, index) => addText({ text: line, x: 28, y: 677 - index * 9, size: 6.4 }));
  addText({ text: short(input.organization.contact_email, 32, '-'), x: 28, y: 644, size: 6.4 });
  addText({ text: short(input.organization.website, 32, '-'), x: 28, y: 633, size: 6.4 });
  addText({ text: `Tax/VAT: ${short(input.organization.tax_id, 22, '-')}`, x: 28, y: 618, size: 6.4, bold: true });

  addBox({ x: 202, y: 604, w: 150, h: 124, fill: '#ffffff', stroke: border });
  addBox({ x: 212, y: 707, w: 84, h: 14, fill: navy });
  addText({ text: 'BUYER / IMPORTER', x: 218, y: 711, size: 6, bold: true, color: '#ffffff' });
  addText({ text: short(input.buyer.company_name, 28, 'Unknown customer'), x: 212, y: 692, size: 8, bold: true, color: navy });
  addText({ text: short(input.buyer.contact_name, 30, ''), x: 212, y: 678, size: 6.4 });
  addText({ text: short(input.buyer.country, 30, input.destination), x: 212, y: 667, size: 6.4 });
  addText({ text: short(input.buyer.email, 32, '-'), x: 212, y: 650, size: 6.4 });
  addText({ text: short(input.buyer.phone, 32, '-'), x: 212, y: 639, size: 6.4 });

  addBox({ x: 362, y: 604, w: 231, h: 124, fill: '#ffffff', stroke: border });
  const details = [
    ['Destination', input.destination],
    ['Market', input.marketName],
    ['Basis', `${input.basis} (Incoterms 2020)`],
    ['Named place', input.namedPlace],
    ['Currency', input.currency],
    ['Payment terms', input.paymentTerms],
    ['Lead time', input.leadTimeSummary],
    ['Tax treatment', 'Buyer import duties / VAT unless included'],
  ];
  details.forEach(([k, v], index) => {
    const rowY = 716 - index * 14;
    addBox({ x: 362, y: rowY - 4, w: 231, h: 14, fill: index % 2 ? '#ffffff' : light, stroke: '#e2e8f0' });
    addText({ text: k.toUpperCase(), x: 372, y: rowY, size: 5.6, bold: true, color: '#334155' });
    addText({ text: short(v, 35), x: 458, y: rowY, size: 6.1 });
  });

  // Tax note strip
  addBox({ x: margin, y: 582, w: 575, h: 14, fill: '#eef6ff', stroke: '#bfdbfe' });
  addText({ text: short(input.taxNote, 142), x: 26, y: 586, size: 5.6, color: '#1e3a8a' });

  // Product table
  let y = 560;
  addBox({ x: margin, y: y - 15, w: 575, h: 18, fill: navy });
  const columns = [
    ['#', 22], ['SKU', 42], ['Product', 82], ['HS Code', 148], ['Pack', 190], ['UOM', 226], ['Units', 258], ['MOQ', 290], ['Origin', 322], ['Unit', 368], ['Disc.', 412], ['Net', 448], ['Notes', 492],
  ];
  columns.forEach(([name, x]) => addText({ text: String(name), x: Number(x), y: y - 9, size: 5.6, bold: true, color: '#ffffff' }));
  y -= 22;
  input.rows.slice(0, 8).forEach((row, index) => {
    const rowH = 22;
    addBox({ x: margin, y: y - rowH + 6, w: 575, h: rowH, fill: index % 2 ? '#ffffff' : '#f8fafc', stroke: '#dbe3ed' });
    addText({ text: String(index + 1), x: 22, y, size: 5.8, bold: true });
    addText({ text: short(row.sku, 13), x: 42, y, size: 5.6 });
    addText({ text: short(row.productName, 18), x: 82, y, size: 5.6 });
    addText({ text: short(row.hsCode, 10), x: 148, y, size: 5.6 });
    addText({ text: short(row.pack, 10), x: 190, y, size: 5.6 });
    addText({ text: row.uom, x: 226, y, size: 5.6 });
    right(row.unitsPerCase, 280, y, 5.6);
    right(row.moq, 312, y, 5.6);
    addText({ text: short(row.origin, 9), x: 322, y, size: 5.6 });
    right(money(row.unitPrice, input.currency), 404, y, 5.6);
    right(row.discount, 440, y, 5.6);
    right(money(row.netPrice, input.currency), 486, y, 5.6);
    addText({ text: short(row.note, 18), x: 492, y, size: 5.3 });
    y -= rowH;
  });
  addBox({ x: margin, y: y - 12, w: 575, h: 16, fill: '#f8fafc', stroke: '#dbe3ed' });
  center('Product details are pulled from quote lines, product variants, and category defaults where available.', 306, y - 6, 5.8, true, navy);
  y -= 32;

  // Lower panels
  const panelTop = y;
  addBox({ x: margin, y: panelTop - 86, w: 282, h: 86, fill: '#ffffff', stroke: border });
  addText({ text: 'COMMERCIAL & COMPLIANCE', x: 28, y: panelTop - 13, size: 7, bold: true, color: navy });
  const shelfSet = Array.from(new Set(input.rows.map((row) => row.shelfLife).filter(Boolean))).slice(0, 2).join(', ') || 'Available per SKU';
  const originSet = Array.from(new Set(input.rows.map((row) => row.origin).filter((origin) => origin && origin !== '-'))).slice(0, 3).join(', ') || 'Confirm per SKU';
  const compliance = [
    `Country of origin: ${originSet}`,
    `Shelf life: ${shelfSet}`,
    'Product specs, ingredients, and nutrition available on request.',
    'Export docs: commercial invoice, packing list, certificate of origin, and product-specific certificates where applicable.',
    'HS codes are indicative and subject to buyer validation in destination market.',
  ];
  compliance.forEach((line, index) => addText({ text: `• ${short(line, 82)}`, x: 28, y: panelTop - 27 - index * 10, size: 5.7 }));

  const docsCharge = input.documentationCharge;
  const grandTotal = input.subtotal + docsCharge;
  addBox({ x: 316, y: panelTop - 86, w: 277, h: 86, fill: '#ffffff', stroke: border });
  addText({ text: `FINANCIAL SUMMARY (${input.currency})`, x: 326, y: panelTop - 13, size: 7, bold: true, color: navy });
  const summaryRows = [
    ['Subtotal after discount', money(input.subtotal, input.currency)],
    ['Documentation / packaging charge', money(docsCharge, input.currency)],
    ['Freight / insurance', 'Not included unless stated'],
    ['Taxes / duties', 'Buyer account unless included'],
  ];
  summaryRows.forEach(([k, v], index) => {
    const rowY = panelTop - 28 - index * 11;
    addText({ text: k, x: 326, y: rowY, size: 5.8 });
    right(v, 582, rowY, 5.8);
  });
  addBox({ x: 316, y: panelTop - 86, w: 277, h: 18, fill: navy });
  addText({ text: 'GRAND TOTAL', x: 326, y: panelTop - 80, size: 9, bold: true, color: '#ffffff' });
  right(money(grandTotal, input.currency), 582, panelTop - 80, 9, true, '#ffffff');

  const termsY = panelTop - 104;
  addBox({ x: margin, y: termsY - 70, w: 575, h: 70, fill: '#ffffff', stroke: border });
  addText({ text: 'TERMS & CONDITIONS', x: 28, y: termsY - 13, size: 7, bold: true, color: navy });
  const terms = [
    `This quotation is valid until ${input.validUntil}.`,
    `Prices are quoted on ${input.basis} basis from ${input.namedPlace}.`,
    'Destination import duties, VAT/GST, customs charges, and destination handling are payable by buyer unless explicitly included.',
    'Order confirmation is subject to mutual agreement on quantities, pack sizes, MOQs, and specifications.',
    'Export documentation will be provided as per applicable regulations and buyer requirements.',
    'Prices may change before confirmation if raw material, freight, tax, policy, or currency inputs change.',
  ];
  terms.forEach((line, index) => {
    const col = index < 3 ? 28 : 316;
    const rowY = termsY - 27 - (index % 3) * 12;
    addText({ text: `${index + 1}. ${short(line, 74)}`, x: col, y: rowY, size: 5.6 });
  });

  const shipY = termsY - 82;
  addBox({ x: margin, y: shipY - 52, w: 282, h: 52, fill: '#ffffff', stroke: border });
  addText({ text: 'LEAD TIME & SHIPMENT', x: 28, y: shipY - 13, size: 7, bold: true, color: navy });
  const shipNotes = [
    `Lead time: ${input.leadTimeSummary}.`,
    `Port/place: ${input.namedPlace}.`,
    ...input.shipmentNotes,
  ].slice(0, 4);
  shipNotes.forEach((line, index) => addText({ text: `• ${short(line, 72)}`, x: 28, y: shipY - 27 - index * 9, size: 5.6 }));
  addBox({ x: 316, y: shipY - 52, w: 277, h: 52, fill: '#ffffff', stroke: border });
  addText({ text: 'NOTES', x: 326, y: shipY - 13, size: 7, bold: true, color: navy });
  [
    'Quote is confidential and intended solely for the addressee.',
    'Pricing basis and charges must be reviewed before sending.',
    short(input.quoteTerms, 78, 'Commercial terms are printed from organization quote terms where available.'),
  ].forEach((line, index) => addText({ text: `• ${line}`, x: 326, y: shipY - 27 - index * 9, size: 5.6 }));

  // Footer
  addBox({ x: margin, y: 36, w: 575, h: 52, fill: '#ffffff', stroke: border });
  addText({ text: 'AUTHORIZED SIGNATURE (SELLER)', x: 28, y: 73, size: 6.5, bold: true, color: navy });
  addText({ text: 'Name: ___________________________', x: 28, y: 58, size: 5.7 });
  addText({ text: 'Date: ____________________________', x: 28, y: 47, size: 5.7 });
  addText({ text: 'GET IN TOUCH', x: 236, y: 73, size: 6.5, bold: true, color: navy });
  addText({ text: short(input.organization.contact_email, 34, '-'), x: 236, y: 60, size: 5.7 });
  addText({ text: short(input.organization.website, 34, '-'), x: 236, y: 49, size: 5.7 });
  addText({ text: 'ACCEPTANCE (IMPORTER)', x: 420, y: 73, size: 6.5, bold: true, color: navy });
  addText({ text: 'Accepted by: _____________________', x: 420, y: 60, size: 5.7 });
  addText({ text: 'Signature: _______________________', x: 420, y: 49, size: 5.7 });
  addBox({ x: 0, y: 14, w: 612, h: 14, fill: navy });
  center('THANK YOU FOR YOUR BUSINESS!', 306, 18, 7.5, true, '#ffffff');

  const ops: string[] = [];
  boxes.forEach((box) => {
    if (box.fill) ops.push(`${rgb(box.fill)} rg ${box.x} ${box.y} ${box.w} ${box.h} re f`);
    if (box.stroke) ops.push(`${rgb(box.stroke)} RG ${box.x} ${box.y} ${box.w} ${box.h} re S`);
  });
  ops.push('BT');
  text.forEach((item) => {
    const size = item.size ?? 8;
    let x = item.x;
    const estimatedWidth = item.text.length * size * 0.48;
    if (item.align === 'right') x = Math.max(margin, item.x - estimatedWidth);
    if (item.align === 'center') x = Math.max(margin, item.x - estimatedWidth / 2);
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
    .select('id, quote_number, lead_id, status, currency, display_currency, updated_at, created_at, valid_until, pricing_basis, destination_port, market_id, country_id, freight_profile_id, approval_required, approved_at, notes_customer')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });

  const [{ data: lead }, { data: lineItems }, { data: organization }, { data: market }, { data: country }, { data: freightProfile }] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, email, phone, country, website').eq('organization_id', organizationId).eq('id', quote.lead_id).maybeSingle(),
    db.from('quote_line_items').select('id, product_id, product_variant_id, quantity, unit_price, currency, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason, notes').eq('quote_id', quote.id).order('created_at', { ascending: true }),
    db.from('organizations').select('id, name, legal_name, logo_url, registered_address, city, postal_code, website, contact_email, tax_id, quote_terms_conditions, order_terms_conditions, default_currency').eq('id', organizationId).maybeSingle(),
    quote.market_id ? db.from('markets').select('id, name').eq('organization_id', organizationId).eq('id', quote.market_id).maybeSingle() : Promise.resolve({ data: null }),
    quote.country_id ? db.from('countries').select('id, name, default_port_of_loading').eq('organization_id', organizationId).eq('id', quote.country_id).maybeSingle() : Promise.resolve({ data: null }),
    quote.freight_profile_id ? db.from('freight_profiles').select('id, name, destination_port, notes').eq('organization_id', organizationId).eq('id', quote.freight_profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const lines: QuoteLineSource[] = (lineItems ?? []) as QuoteLineSource[];
  const productIds = Array.from(new Set(lines.map((line) => line.product_id).filter((id): id is string => Boolean(id))));
  const variantIds = Array.from(new Set(lines.map((line) => line.product_variant_id).filter((id): id is string => Boolean(id))));

  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length ? db.from('products').select('id, name, sku, sku_code, hsn_code, category_id, description').eq('organization_id', organizationId).in('id', productIds) : Promise.resolve({ data: [] }),
    variantIds.length ? db.from('product_variants').select('id, product_id, name, sku_code, hsn_code, country_of_origin, pack_size_value, pack_size_unit, pack_label, units_per_case, moq_cases, moq_kg, pricing_mode_default, packaging_type, packaging_unit, shipment_notes, lead_time_days, shelf_life_months').in('id', variantIds) : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map<string, ProductLookup>();
  (products ?? []).forEach((product: ProductLookup) => productMap.set(product.id, product));
  const variantMap = new Map<string, VariantLookup>();
  (variants ?? []).forEach((variant: VariantLookup) => variantMap.set(variant.id, variant));
  const categoryIds = Array.from(new Set(Array.from(productMap.values()).map((product) => product.category_id).filter((id): id is string => Boolean(id))));
  const { data: categories } = categoryIds.length
    ? await db.from('product_categories').select('id, name, sort_order, default_lead_time_days, default_shelf_life_months, default_country_of_origin, default_shipment_notes').eq('organization_id', organizationId).in('id', categoryIds)
    : { data: [] };
  const categoryMap = new Map<string, CategoryLookup>();
  (categories ?? []).forEach((category: CategoryLookup) => categoryMap.set(category.id, category));

  const currency = String(quote.display_currency ?? quote.currency ?? organization?.default_currency ?? 'USD');
  const rows: QuotePdfLineRow[] = lines.map((line) => {
    const product = line.product_id ? productMap.get(line.product_id) : undefined;
    const variant = line.product_variant_id ? variantMap.get(line.product_variant_id) : undefined;
    const category = product?.category_id ? categoryMap.get(product.category_id) : undefined;
    const mode = normalizePricingMode(variant?.pricing_mode_default ?? quote.pricing_basis);
    const quantity = toNumber(line.quantity, 0);
    const unitPrice = toNumber(line.unit_price, 0);
    const catalog = line.catalog_price_amount === null || line.catalog_price_amount === undefined ? null : toNumber(line.catalog_price_amount, 0);
    const categoryLead = category?.default_lead_time_days;
    const categoryShelf = category?.default_shelf_life_months;
    const leadDays = variant?.lead_time_days ?? categoryLead;
    const shelfMonths = variant?.shelf_life_months ?? categoryShelf;
    const origin = cleanText(variant?.country_of_origin ?? category?.default_country_of_origin, 'Confirm per SKU');
    return {
      sku: cleanText(variant?.sku_code ?? product?.sku_code ?? product?.sku, '-'),
      productName: cleanText(product?.name ?? variant?.name, 'Catalog line'),
      categoryName: cleanText(category?.name, 'Catalog'),
      categorySort: category?.sort_order ?? 9999,
      hsCode: cleanText(variant?.hsn_code ?? product?.hsn_code, 'TBC'),
      pack: formatPack(variant),
      uom: mode === 'KG' ? 'Kg' : mode === 'CASE' ? 'Case' : 'Unit',
      unitsPerCase: cleanText(variant?.units_per_case, '-'),
      moq: mode === 'KG' ? cleanText(variant?.moq_kg, '0') : cleanText(variant?.moq_cases ?? variant?.moq_kg, '0'),
      origin,
      unitPrice: catalog ?? unitPrice,
      discount: discountLabel(line),
      netPrice: unitPrice,
      note: cleanText(line.override_reason ?? line.notes ?? variant?.shipment_notes ?? category?.default_shipment_notes, '-'),
      total: quantity * unitPrice,
      leadTime: daysRangeText(leadDays),
      shelfLife: monthsText(shelfMonths),
    };
  });

  const subtotal = rows.reduce((sum, row) => sum + row.total, 0);
  const namedPlace = cleanText(quote.destination_port ?? freightProfile?.destination_port ?? country?.default_port_of_loading, 'Confirm port/place before sending');
  const leadTimeSummary = Array.from(new Set(rows.map((row) => row.leadTime))).filter(Boolean).slice(0, 2).join(', ') || 'Confirm per category / order';
  const taxNote = 'Export sales may be zero-rated/exempt under seller-country export rules where applicable; destination import duty, VAT/GST, customs charges, and local taxes are buyer account unless explicitly included.';
  const defaultQuoteTerms = 'Prices are subject to the validity date shown on this quote. Delivery basis is as per the stated Incoterm. Destination import duties, VAT/GST, customs charges, and destination handling are payable by buyer unless explicitly included. This quote is subject to final order confirmation and agreed payment terms.';
  const shipmentNotes = [
    freightProfile?.notes,
    'Shipment method and schedule confirmed after PO and payment terms.',
    'Port/place may vary by country, freight profile, and agreed Incoterm.',
  ].filter(Boolean) as string[];

  const pdf = buildPdf({
    quoteTitle: `Quote ${quote.quote_number ?? quote.id.slice(0, 8)}`,
    organization: organization ?? { name: workspace.organization?.name ?? 'SETU Flow' },
    buyer: lead ?? {},
    marketName: cleanText(market?.name, '-'),
    destination: cleanText(country?.name ?? lead?.country, '-'),
    basis: formatBasis(quote.pricing_basis),
    namedPlace,
    currency,
    validUntil: dateText(quote.valid_until),
    preparedDate: dateText(quote.updated_at ?? quote.created_at, new Date().toLocaleDateString('en-GB')),
    paymentTerms: 'As agreed / per quote terms',
    leadTimeSummary,
    taxNote,
    rows,
    subtotal,
    documentationCharge: 0,
    quoteTerms: cleanText(organization?.quote_terms_conditions ?? quote.notes_customer, defaultQuoteTerms),
    shipmentNotes,
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
