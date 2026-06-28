import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';

export const runtime = 'nodejs';

const INK = '#0f172a';
const MUTED = '#475569';
const NAVY = '#0b2e4a';
const BLUE = '#1d4ed8';
const LINE = '#cbd5e1';
const PANEL = '#f8fafc';
const GREEN = '#ecfdf5';
const AMBER = '#fffbeb';
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);

type PdfText = { x: number; y: number; text: string; size: number; bold: boolean; color: string; right: boolean };
type PdfRow = { sku: string; product: string; qty: string; details: string; unitPrice: string; amount: string };
type KeyValue = [string, string];

type PdfData = {
  title: string;
  subtitle: string;
  documentNo: string;
  issueDate: string;
  status: string;
  org: any;
  buyer: any;
  quote: any;
  order: any;
  shipment: any;
  rows: PdfRow[];
  summary: KeyValue[];
  terms: string[];
  notes: string[];
};

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, fallback = '-') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function clip(value: unknown, max = 42, fallback = '-') {
  const out = text(value, fallback);
  return out.length > max ? `${out.slice(0, Math.max(1, max - 3))}...` : out;
}

function dateText(value: unknown) {
  const out = text(value, '');
  if (!out) return '-';
  const date = new Date(out.includes('T') ? out : `${out}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}

function money(value: unknown, currency = 'USD') {
  return `${currency} ${num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pdfText(value: string) {
  return String(value).split(BS).join(BS + BS).split('(').join(BS + '(').split(')').join(BS + ')').split(NL).join(' ');
}

function rgb(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return `${(((value >> 16) & 255) / 255).toFixed(3)} ${(((value >> 8) & 255) / 255).toFixed(3)} ${((value & 255) / 255).toFixed(3)}`;
}

function width(value: string, size: number, bold = false) {
  return value.length * size * (bold ? 0.56 : 0.52);
}

function orgLogoMark(org: any) {
  const name = text(org?.legal_name ?? org?.name, 'ORG').replace(/[^A-Za-z0-9 ]/g, ' ').trim();
  const words = name.split(/\s+/).filter(Boolean).filter((word) => !['demo', 'llc', 'llp', 'inc', 'ltd', 'private', 'limited', 'exports', 'exporter'].includes(word.toLowerCase()));
  const mark = (words.length >= 2 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? name).slice(0, 3)).toUpperCase();
  return mark || 'ORG';
}

function labelForDocType(value: unknown) {
  const type = text(value, '').toLowerCase();
  if (type.includes('sample')) return { title: 'Sample Approval Sheet', subtitle: 'Buyer sample sign-off and fit/color approval gate' };
  if (type.includes('packing')) return { title: 'Packing List', subtitle: 'Carton, quantity and packing control document' };
  if (type.includes('shipment')) return { title: 'Shipment Booking Summary', subtitle: 'Freight booking, BOL/AWB and tracking gate' };
  if (type.includes('order')) return { title: 'Order Confirmation', subtitle: 'Accepted quote converted to executable order' };
  if (type.includes('catalog')) return { title: 'Buyer Catalog Share', subtitle: 'Buyer-specific catalog and commercial context' };
  if (type.includes('quote')) return { title: 'Commercial Quote', subtitle: 'Buyer-facing price list and quote document' };
  return { title: 'Client Document', subtitle: 'Buyer-facing workflow document' };
}

function buildPdf(data: PdfData) {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const ops: string[] = [];
  const copy: PdfText[] = [];
  const left = 24;
  const right = 588;
  const box = (x: number, y: number, w: number, h: number, fill?: string, stroke?: string) => {
    if (fill) ops.push(`${rgb(fill)} rg ${x} ${y} ${w} ${h} re f`);
    if (stroke) ops.push(`${rgb(stroke)} RG ${x} ${y} ${w} ${h} re S`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color = LINE, lineWidth = 0.7) => ops.push(`${rgb(color)} RG ${lineWidth} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const put = (x: number, y: number, value: string, size = 7, bold = false, color = INK, alignRight = false) => copy.push({ x, y, text: value, size, bold, color, right: alignRight });
  const logo = orgLogoMark(data.org);

  box(0, 0, 612, 792, '#ffffff');
  box(left, 724, 564, 44, '#ffffff', LINE);
  box(left, 724, 44, 44, NAVY);
  put(46, 746, logo, logo.length > 2 ? 6.8 : 8.5, true, '#ffffff', true);
  put(78, 750, clip(data.org?.legal_name ?? data.org?.name, 38, 'Apparel DEMO'), 11, true, NAVY);
  put(78, 736, clip(data.org?.website, 52, 'https://www.setuflowcrm.com'), 6.3, false, MUTED);
  put(230, 752, data.title, 15.2, true, NAVY);
  put(230, 736, data.subtitle, 7.5, false, MUTED);
  box(462, 732, 116, 28, PANEL, LINE);
  put(574, 750, clip(data.documentNo, 28), 8.2, true, NAVY, true);
  put(574, 739, `${data.issueDate} | ${data.status}`, 5.7, false, MUTED, true);

  box(24, 612, 176, 92, PANEL, LINE);
  put(36, 686, 'SELLER / EXPORTER', 6.5, true, BLUE);
  put(36, 672, clip(data.org?.legal_name ?? data.org?.name, 34, 'Apparel DEMO'), 8, true);
  put(36, 658, clip(data.org?.registered_address, 38), 6.2, false, MUTED);
  put(36, 648, clip([data.org?.city, data.org?.postal_code, data.org?.headquarters_country].filter(Boolean).join(', '), 38), 6.2, false, MUTED);
  put(36, 632, clip(data.org?.contact_email, 36), 6.2, false, MUTED);
  put(36, 622, `Tax ID: ${clip(data.org?.tax_id, 28)}`, 6.2, false, MUTED);

  box(216, 612, 176, 92, PANEL, LINE);
  put(228, 686, 'BUYER / IMPORTER', 6.5, true, BLUE);
  put(228, 672, clip(data.buyer?.company_name, 34, 'Buyer pending'), 8, true);
  put(228, 658, clip(data.buyer?.contact_name, 35, ''), 6.2, false, MUTED);
  put(228, 648, clip(data.buyer?.country, 35, data.order?.destination_place ?? data.quote?.destination_port), 6.2, false, MUTED);
  put(228, 632, clip(data.buyer?.email, 36), 6.2, false, MUTED);
  put(228, 622, clip(data.buyer?.phone ?? data.buyer?.whatsapp_number, 36), 6.2, false, MUTED);

  box(408, 612, 180, 92, PANEL, LINE);
  data.summary.slice(0, 6).forEach(([label, value], index) => {
    const y = 688 - index * 12;
    put(420, y, label, 5.3, true, MUTED);
    put(580, y, clip(value, 25), 5.7, false, INK, true);
  });

  box(left, 590, 564, 14, data.status.toLowerCase().includes('review') ? AMBER : GREEN, data.status.toLowerCase().includes('review') ? '#fbbf24' : '#bbf7d0');
  put(36, 594, `${data.title}: generated from live CRM data for this buyer, quote, order, and shipment workflow.`, 5.45, false, data.status.toLowerCase().includes('review') ? '#92400e' : '#166534');

  let y = 560;
  box(18, y - 17, 576, 20, '#e2e8f0', LINE);
  put(24, y - 10, '#', 5, true, NAVY);
  put(58, y - 10, 'SKU / Ref', 5, true, NAVY);
  put(134, y - 10, 'Product / Gate Item', 5, true, NAVY);
  put(314, y - 10, 'Qty', 5, true, NAVY, true);
  put(342, y - 10, 'Details', 5, true, NAVY);
  put(480, y - 10, 'Unit', 5, true, NAVY, true);
  put(582, y - 10, 'Amount', 5, true, NAVY, true);
  y -= 23;

  const rows = data.rows.length ? data.rows : [{ sku: '-', product: data.title, qty: '-', details: 'Workflow record generated from CRM data', unitPrice: '-', amount: '-' }];
  rows.slice(0, 12).forEach((row, index) => {
    box(18, y - 15, 576, 21, index % 2 ? '#ffffff' : '#f8fafc', LINE);
    put(24, y - 6, String(index + 1), 5.2);
    put(58, y - 6, clip(row.sku, 16), 5.2);
    put(134, y - 6, clip(row.product, 36), 5.2, index === 0);
    put(314, y - 6, clip(row.qty, 9), 5.2, false, INK, true);
    put(342, y - 6, clip(row.details, 34), 5.2, false, MUTED);
    put(480, y - 6, clip(row.unitPrice, 18), 5.2, false, INK, true);
    put(582, y - 6, clip(row.amount, 18), 5.2, index === 0, INK, true);
    y -= 21;
  });

  line(18, y + 5, 594, y + 5, NAVY, 1.1);
  const total = rows.map((row) => Number(String(row.amount).replace(/[^0-9.-]/g, ''))).filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
  put(450, y - 7, 'Document Total / Control', 8.2, true, NAVY, true);
  put(582, y - 7, total ? money(total, data.order?.currency ?? data.quote?.display_currency ?? data.quote?.currency ?? 'USD') : `${rows.length} line(s)`, 8.5, true, NAVY, true);

  y -= 44;
  box(24, y - 72, 274, 72, PANEL, LINE);
  put(36, y - 15, 'WORKFLOW CONTEXT', 7, true, NAVY);
  data.notes.slice(0, 5).forEach((lineText, index) => put(36, y - 31 - index * 10, `- ${clip(lineText, 72)}`, 5.7, false, MUTED));

  box(314, y - 72, 274, 72, PANEL, LINE);
  put(326, y - 15, 'COMMERCIAL REFERENCES', 7, true, NAVY);
  [
    ['Quote', text(data.quote?.quote_number, '-')],
    ['Order', text(data.order?.order_number, '-')],
    ['Shipment', text(data.shipment?.booking_reference, '-')],
    ['BOL/AWB', text(data.shipment?.bol_awb_number, '-')],
    ['Tracking', text(data.shipment?.tracking_number, '-')],
  ].forEach(([label, value], index) => {
    put(326, y - 31 - index * 10, label, 5.8, false, MUTED);
    put(580, y - 31 - index * 10, clip(value, 26), 5.8, false, INK, true);
  });

  y -= 94;
  box(left, y - 86, right - left, 86, '#ffffff', LINE);
  put(36, y - 15, 'TERMS & CONDITIONS', 7, true, NAVY);
  data.terms.slice(0, 6).forEach((lineText, index) => put(36, y - 31 - index * 9.5, clip(lineText, 135), 5.2, false, MUTED));

  box(372, 52, 176, 42, '#ffffff', LINE);
  put(384, 78, 'Authorized Signatory', 6.2, true, NAVY);
  put(384, 62, clip(data.org?.legal_name ?? data.org?.name, 42, 'Apparel DEMO'), 5.8, false, MUTED);
  put(36, 62, 'Generated by SETU Flow CRM from client workspace data.', 5.8, false, MUTED);

  const textOps = copy.flatMap((entry) => {
    const x = entry.right ? Math.max(left, entry.x - width(entry.text, entry.size, entry.bold)) : entry.x;
    return ['BT', `${rgb(entry.color)} rg /F${entry.bold ? 'B' : 'R'} ${entry.size} Tf`, `1 0 0 1 ${x.toFixed(2)} ${entry.y.toFixed(2)} Tm (${pdfText(entry.text)}) Tj`, 'ET'];
  });
  const stream = [...ops, ...textOps].join(NL);
  const content = add(`<< /Length ${Buffer.byteLength(stream, 'binary')} >>${NL}stream${NL}${stream}${NL}endstream`);
  const page = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /FR ${font} 0 R /FB ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`);
  const pages = add(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`);
  objects[page - 1] = objects[page - 1].replace('/Parent 0 0 R', `/Parent ${pages} 0 R`);
  const catalog = add(`<< /Type /Catalog /Pages ${pages} 0 R >>`);

  let pdf = `%PDF-1.4${NL}`;
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${index + 1} 0 obj${NL}${object}${NL}endobj${NL}`;
  });
  const xref = Buffer.byteLength(pdf, 'binary');
  pdf += `xref${NL}0 ${objects.length + 1}${NL}0000000000 65535 f ${NL}`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n ${NL}`; });
  pdf += `trailer${NL}<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>${NL}startxref${NL}${xref}${NL}%%EOF${NL}`;
  return Buffer.from(pdf, 'binary');
}

function docNo(document: any, quote: any, order: any) {
  const type = text(document?.doc_type, '').toLowerCase();
  if (type.includes('quote')) return `Quote ${quote?.quote_number ?? document.id.slice(0, 8)}`;
  if (type.includes('order')) return order?.order_number ?? `Order ${document.id.slice(0, 8)}`;
  if (type.includes('packing')) return `${order?.order_number ?? 'Order'} / Packing`;
  if (type.includes('shipment')) return `${order?.order_number ?? 'Order'} / Shipment`;
  if (type.includes('sample')) return `Sample ${document.id.slice(0, 8).toUpperCase()}`;
  if (type.includes('catalog')) return `Catalog ${document.id.slice(0, 8).toUpperCase()}`;
  return document?.file_name ?? `Document ${document.id.slice(0, 8)}`;
}

function buildTerms(document: any, org: any, order: any, quote: any) {
  const type = text(document?.doc_type, '').toLowerCase();
  if (type.includes('sample')) return [
    'Sample approval confirms style direction, fit, trims, shade and buyer feedback before bulk production.',
    'Bulk production remains subject to final purchase order, approved quote, payment terms and production capacity.',
    'Any material change after approval may require revised sample sign-off and timeline confirmation.',
    text(org?.order_terms_conditions ?? org?.quote_terms_conditions, 'Buyer approvals, specifications and delivery terms are governed by the final order confirmation.'),
  ];
  if (type.includes('packing')) return [
    'Packing quantities are prepared against approved order lines and may be reconciled before dispatch.',
    'Carton marks, weights and dimensions should be validated before loading and shipping document release.',
    'Buyer is responsible for destination customs, duties and handling unless otherwise agreed in writing.',
    text(org?.order_terms_conditions, 'Packing list is subject to final QC, loading and freight handover confirmation.'),
  ];
  if (type.includes('shipment')) return [
    'Shipment booking details are subject to carrier or forwarder confirmation and port schedule changes.',
    'BOL/AWB and tracking references become binding once issued by the carrier or freight forwarder.',
    `Incoterm: ${text(order?.incoterm ?? order?.pricing_basis ?? quote?.pricing_basis, 'As agreed')}. Payment terms: ${text(order?.payment_terms, 'As agreed')}.`,
    text(org?.order_terms_conditions, 'Freight, insurance and destination charges follow the commercial terms agreed with the buyer.'),
  ];
  if (type.includes('order')) return [
    `Order is based on accepted quote ${text(quote?.quote_number, '-')} and buyer confirmation.`,
    `Payment terms: ${text(order?.payment_terms, '30% advance, balance before dispatch unless otherwise agreed')}.`,
    `Incoterm and place: ${text(order?.incoterm ?? order?.pricing_basis, 'FOB')} ${text(order?.destination_port ?? order?.destination_place, '')}.`,
    text(org?.order_terms_conditions ?? org?.quote_terms_conditions, 'Order confirmation is subject to agreed specifications, quantities, timelines and payment terms.'),
  ];
  if (type.includes('catalog')) return [
    'Catalog share is buyer-specific and may include selected products, indicative MOQ and price visibility.',
    'Final prices, pack sizes and availability are confirmed through a formal quote before order acceptance.',
    text(org?.quote_terms_conditions, 'Catalog data is indicative and subject to final commercial confirmation.'),
  ];
  return [
    text(org?.order_terms_conditions ?? org?.quote_terms_conditions, 'This document is generated from CRM workflow data and subject to final commercial confirmation.'),
  ];
}

async function getLead(db: any, organizationId: string, leadId?: string | null) {
  if (!leadId) return null;
  const { data } = await db.from('leads').select('id, company_name, contact_name, email, phone, whatsapp_number, country, products_or_needs, notes').eq('organization_id', organizationId).eq('id', leadId).maybeSingle();
  return data ?? null;
}

async function getQuote(db: any, organizationId: string, quoteId?: string | null) {
  if (!quoteId) return null;
  const { data } = await db.from('quotes').select('id, quote_number, lead_id, status, currency, display_currency, pricing_basis, destination_port, valid_until, notes_customer, updated_at, created_at').eq('organization_id', organizationId).eq('id', quoteId).maybeSingle();
  return data ?? null;
}

async function getOrder(db: any, organizationId: string, options: { orderId?: string | null; quoteId?: string | null; leadId?: string | null }) {
  if (options.orderId) {
    const { data } = await db.from('orders').select('*').eq('organization_id', organizationId).eq('id', options.orderId).maybeSingle();
    if (data) return data;
  }
  if (options.quoteId) {
    const { data } = await db.from('orders').select('*').eq('organization_id', organizationId).eq('source_quote_id', options.quoteId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) return data;
  }
  if (options.leadId) {
    const { data } = await db.from('orders').select('*').eq('organization_id', organizationId).eq('lead_id', options.leadId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) return data;
  }
  return null;
}

async function productMapFor(db: any, organizationId: string, productIds: string[]) {
  const ids = Array.from(new Set(productIds.filter(Boolean)));
  if (!ids.length) return new Map<string, any>();
  const { data } = await db.from('products').select('id, name, sku, sku_code, hsn_code, pack_size, description').eq('organization_id', organizationId).in('id', ids);
  return new Map((data ?? []).map((product: any) => [product.id, product]));
}

export async function GET(_request: Request, { params }: { params: { documentId: string } }) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });

  const db = (await createClient()) as any;
  const { documentId } = params;
  const { data: document, error } = await db.from('documents').select('*').eq('organization_id', organizationId).eq('id', documentId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!document?.id) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

  const quoteId = document.linked_quote_id ?? (document.related_entity === 'quote' ? document.related_id : null);
  const quote = await getQuote(db, organizationId, quoteId);
  const order = await getOrder(db, organizationId, { orderId: document.related_entity === 'order' ? document.related_id : null, quoteId: quote?.id, leadId: document.related_entity === 'lead' ? document.related_id : quote?.lead_id });
  const lead = await getLead(db, organizationId, document.related_entity === 'lead' ? document.related_id : quote?.lead_id ?? order?.lead_id ?? null);
  const [{ data: org }, { data: shipment }] = await Promise.all([
    db.from('organizations').select('id, name, legal_name, logo_url, logo_storage_path, website, registered_address, city, postal_code, headquarters_country, contact_email, tax_id, quote_terms_conditions, order_terms_conditions, default_currency').eq('id', organizationId).maybeSingle(),
    order?.id ? db.from('shipments').select('*').eq('organization_id', organizationId).eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const typeInfo = labelForDocType(document.doc_type);
  const currency = text(order?.currency ?? quote?.display_currency ?? quote?.currency ?? org?.default_currency, 'USD').toUpperCase();
  let rows: PdfRow[] = [];

  if (order?.id) {
    const { data: orderLines } = await db.from('order_lines').select('*').eq('organization_id', organizationId).eq('order_id', order.id).order('created_at', { ascending: true });
    rows = (orderLines ?? []).map((line: any) => ({
      sku: text(line.sku_code ?? line.hsn_code),
      product: text(line.product_name_snapshot ?? line.variant_name_snapshot, 'Order line'),
      qty: text(line.ordered_quantity ?? line.approved_quantity ?? line.quoted_quantity, '-'),
      details: text(line.category_snapshot ?? line.unit_of_measure ?? line.line_status, 'Apparel goods'),
      unitPrice: money(line.unit_price, line.currency ?? currency),
      amount: money(line.line_total ?? num(line.ordered_quantity ?? line.approved_quantity ?? 1) * num(line.unit_price), line.currency ?? currency),
    }));
  } else if (quote?.id) {
    const { data: quoteLines } = await db.from('quote_line_items').select('*').eq('quote_id', quote.id).order('created_at', { ascending: true });
    const products = await productMapFor(db, organizationId, (quoteLines ?? []).map((line: any) => line.product_id));
    rows = (quoteLines ?? []).map((line: any) => {
      const product: any = products.get(line.product_id) ?? {};
      const unit = num(line.unit_price ?? line.catalog_price_amount);
      const qty = num(line.quantity, 1);
      return {
        sku: text(product.sku_code ?? product.sku ?? line.product_id),
        product: text(product.name, 'Catalog line'),
        qty: text(qty),
        details: text(product.pack_size ?? product.hsn_code ?? quote.pricing_basis, 'Quote line'),
        unitPrice: money(unit, currency),
        amount: money(unit * qty, currency),
      };
    });
  } else if (lead?.id) {
    const { data: interests } = await db.from('lead_product_interests').select('id, product_id, label, interest_type, source_context').eq('organization_id', organizationId).eq('lead_id', lead.id).limit(12);
    const products = await productMapFor(db, organizationId, (interests ?? []).map((row: any) => row.product_id));
    rows = (interests ?? []).map((interest: any) => {
      const product: any = products.get(interest.product_id) ?? {};
      return {
        sku: text(product.sku_code ?? product.sku ?? interest.interest_type, '-'),
        product: text(product.name ?? interest.label, 'Interested product'),
        qty: text(interest.source_context?.quantity ?? interest.source_context?.moq ?? '-'),
        details: text(product.pack_size ?? product.hsn_code ?? interest.interest_type, 'Buyer interest'),
        unitPrice: text(product.fob_price ? money(product.fob_price, product.pricing_currency ?? currency) : '-'),
        amount: '-',
      };
    });
  }

  const summary: KeyValue[] = [
    ['Buyer', text(lead?.company_name, '-')],
    ['Quote', text(quote?.quote_number, '-')],
    ['Order', text(order?.order_number, '-')],
    ['Incoterm', text(order?.incoterm ?? order?.pricing_basis ?? quote?.pricing_basis, '-')],
    ['Currency', currency],
    ['Shipment', text(shipment?.booking_reference, '-')],
  ];

  const notes = [
    `Buyer: ${text(lead?.company_name, '-')}`,
    `Contact: ${text(lead?.contact_name, '-')}`,
    `Quote: ${text(quote?.quote_number, '-')}`,
    `Order: ${text(order?.order_number, '-')}`,
    `Shipment: ${text(shipment?.booking_reference, '-')}`,
  ];

  const bytes = buildPdf({
    title: typeInfo.title,
    subtitle: typeInfo.subtitle,
    documentNo: docNo(document, quote, order),
    issueDate: dateText(document.updated_at ?? document.uploaded_at ?? new Date().toISOString()),
    status: text(document.status, 'generated'),
    org: org ?? workspace.organization,
    buyer: lead ?? {},
    quote: quote ?? {},
    order: order ?? {},
    shipment: shipment ?? {},
    rows,
    summary,
    terms: buildTerms(document, org, order, quote),
    notes,
  });

  const filename = text(document.file_name, `${typeInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`).replace(/\.pdf$/i, '') + '.pdf';
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
