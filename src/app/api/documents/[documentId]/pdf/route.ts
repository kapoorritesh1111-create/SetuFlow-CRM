import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';
import { escapeHtml, logoDataUrl, renderHtmlToPdf } from '@/lib/pdf/browser-pdf';

export const runtime = 'nodejs';

type PdfRow = { sku: string; product: string; qty: string; details: string; unitPrice: string; amount: string };
type KeyValue = [string, string];

type PdfData = {
  title: string;
  subtitle: string;
  documentNo: string;
  issueDate: string;
  status: string;
  logoUrl: string | null;
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

function dateText(value: unknown) {
  const out = text(value, '');
  if (!out) return '-';
  const date = new Date(out.includes('T') ? out : `${out}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}

function money(value: unknown, currency = 'USD') {
  return `${currency} ${num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  return [text(org?.order_terms_conditions ?? org?.quote_terms_conditions, 'This document is generated from CRM workflow data and subject to final commercial confirmation.')];
}

function td(value: unknown, cls = '') {
  return `<td class="${cls}">${escapeHtml(value)}</td>`;
}

function buildHtml(data: PdfData) {
  const orgName = text(data.org?.legal_name ?? data.org?.name, 'Organization');
  const logo = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${escapeHtml(orgName)} logo" />`
    : `<span>${escapeHtml(orgLogoMark(data.org))}</span>`;
  const total = data.rows.map((row) => Number(String(row.amount).replace(/[^0-9.-]/g, ''))).filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
  const currency = text(data.order?.currency ?? data.quote?.display_currency ?? data.quote?.currency, 'USD').toUpperCase();
  const rows = (data.rows.length ? data.rows : [{ sku: '-', product: data.title, qty: '-', details: 'Workflow record generated from CRM data', unitPrice: '-', amount: '-' }]).map((row, index) => `
    <tr>
      ${td(index + 1, 'muted center')}
      ${td(row.sku)}
      ${td(row.product, 'strong')}
      ${td(row.qty, 'right')}
      ${td(row.details, 'muted')}
      ${td(row.unitPrice, 'right')}
      ${td(row.amount, 'right strong')}
    </tr>`).join('');
  const summary = data.summary.slice(0, 6).map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  const notes = data.notes.slice(0, 5).map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  const terms = data.terms.slice(0, 6).map((line) => `<li>${escapeHtml(line)}</li>`).join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: white; }
  .page { width: 100%; padding: 18px; }
  .header { display: grid; grid-template-columns: 250px 1fr 160px; gap: 18px; align-items: center; border: 1px solid #cbd5e1; padding: 10px; }
  .brand { display: grid; grid-template-columns: 64px 1fr; gap: 12px; align-items: center; }
  .logo { width: 64px; height: 54px; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; background: #fff; overflow: hidden; }
  .logo img { max-width: 58px; max-height: 48px; object-fit: contain; display: block; }
  .logo span { font-weight: 900; color: #0b2e4a; font-size: 15px; letter-spacing: .04em; }
  .org h2, .doc h1 { margin: 0; color: #0b2e4a; }
  .org h2 { font-size: 18px; }
  .org p, .doc p, .ref p { margin: 5px 0 0; color: #475569; font-size: 10px; }
  .doc { text-align: center; }
  .doc h1 { font-size: 24px; }
  .ref { border: 1px solid #cbd5e1; padding: 10px; text-align: right; background: #f8fafc; }
  .ref strong { display: block; color: #0b2e4a; font-size: 13px; }
  .cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; margin-top: 24px; }
  .card { border: 1px solid #cbd5e1; background: #f8fafc; padding: 14px; min-height: 114px; }
  .label { color: #1d4ed8; font-weight: 900; text-transform: uppercase; font-size: 10px; margin-bottom: 12px; }
  .card h3 { margin: 0 0 10px; font-size: 14px; }
  .card p { margin: 4px 0; color: #475569; font-size: 10px; }
  .summary div { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 10px; }
  .summary span { color: #475569; font-weight: 700; }
  .banner { margin-top: 14px; border: 1px solid #bbf7d0; background: #ecfdf5; color: #166534; padding: 9px 12px; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 10px; }
  th { background: #e2e8f0; color: #0b2e4a; text-align: left; padding: 9px; border: 1px solid #cbd5e1; font-size: 9px; text-transform: uppercase; }
  td { padding: 10px 9px; border: 1px solid #cbd5e1; }
  tr:nth-child(even) td { background: #f8fafc; }
  .right { text-align: right; } .center { text-align: center; } .strong { font-weight: 800; } .muted { color: #475569; }
  .total { border-top: 3px solid #0b2e4a; display: flex; justify-content: flex-end; gap: 30px; padding: 12px 0 0; margin-top: 0; font-weight: 900; color: #0b2e4a; font-size: 16px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 34px; }
  .panel { border: 1px solid #cbd5e1; background: #f8fafc; padding: 14px; min-height: 98px; }
  .panel h4, .terms h4 { margin: 0 0 12px; color: #0b2e4a; font-size: 12px; }
  .panel ul, .terms ul { margin: 0; padding-left: 16px; color: #475569; font-size: 10px; line-height: 1.7; }
  .refs div { display: flex; justify-content: space-between; font-size: 10px; padding: 3px 0; }
  .terms { margin-top: 22px; border: 1px solid #cbd5e1; padding: 14px; min-height: 100px; }
  .footer { display: flex; justify-content: space-between; margin-top: 24px; color: #475569; font-size: 10px; }
  .signature { border: 1px solid #cbd5e1; padding: 12px 60px 12px 12px; color: #0b2e4a; font-weight: 800; }
</style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div class="brand"><div class="logo">${logo}</div><div class="org"><h2>${escapeHtml(orgName)}</h2><p>${escapeHtml(text(data.org?.website, ''))}</p></div></div>
      <div class="doc"><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.subtitle)}</p></div>
      <div class="ref"><strong>${escapeHtml(data.documentNo)}</strong><p>${escapeHtml(data.issueDate)} | ${escapeHtml(data.status)}</p></div>
    </section>
    <section class="cards">
      <div class="card"><div class="label">Seller / Exporter</div><h3>${escapeHtml(orgName)}</h3><p>${escapeHtml(text(data.org?.registered_address, ''))}</p><p>${escapeHtml([data.org?.city, data.org?.postal_code, data.org?.headquarters_country].filter(Boolean).join(', '))}</p><p>${escapeHtml(text(data.org?.contact_email, ''))}</p><p>Tax ID: ${escapeHtml(text(data.org?.tax_id, '-'))}</p></div>
      <div class="card"><div class="label">Buyer / Importer</div><h3>${escapeHtml(text(data.buyer?.company_name, 'Buyer pending'))}</h3><p>${escapeHtml(text(data.buyer?.contact_name, ''))}</p><p>${escapeHtml(text(data.buyer?.country, ''))}</p><p>${escapeHtml(text(data.buyer?.email, ''))}</p><p>${escapeHtml(text(data.buyer?.phone ?? data.buyer?.whatsapp_number, ''))}</p></div>
      <div class="card summary">${summary}</div>
    </section>
    <div class="banner">${escapeHtml(data.title)} generated from live CRM data for this buyer, quote, order and shipment workflow.</div>
    <table>
      <thead><tr><th>#</th><th>SKU / Ref</th><th>Product / Gate Item</th><th class="right">Qty</th><th>Details</th><th class="right">Unit</th><th class="right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total"><span>Document Total / Control</span><span>${escapeHtml(total ? money(total, currency) : `${data.rows.length} line(s)`)}</span></div>
    <section class="grid2">
      <div class="panel"><h4>Workflow Context</h4><ul>${notes}</ul></div>
      <div class="panel refs"><h4>Commercial References</h4>
        <div><span>Quote</span><strong>${escapeHtml(text(data.quote?.quote_number, '-'))}</strong></div>
        <div><span>Order</span><strong>${escapeHtml(text(data.order?.order_number, '-'))}</strong></div>
        <div><span>Shipment</span><strong>${escapeHtml(text(data.shipment?.booking_reference, '-'))}</strong></div>
        <div><span>BOL/AWB</span><strong>${escapeHtml(text(data.shipment?.bol_awb_number, '-'))}</strong></div>
        <div><span>Tracking</span><strong>${escapeHtml(text(data.shipment?.tracking_number, '-'))}</strong></div>
      </div>
    </section>
    <section class="terms"><h4>Terms & Conditions</h4><ul>${terms}</ul></section>
    <section class="footer"><div>Generated by SETU Flow CRM from client workspace data.</div><div class="signature">Authorized Signatory<br />${escapeHtml(orgName)}</div></section>
  </main>
</body>
</html>`;
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
  const { data } = await db.from('products').select('id, name, sku, sku_code, hsn_code, pack_size, description, fob_price, pricing_currency').eq('organization_id', organizationId).in('id', ids);
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
  const [{ data: org }, { data: shipment }, { data: brandSettings }] = await Promise.all([
    db.from('organizations').select('id, name, legal_name, logo_url, logo_storage_path, website, registered_address, city, postal_code, headquarters_country, contact_email, tax_id, quote_terms_conditions, order_terms_conditions, default_currency').eq('id', organizationId).maybeSingle(),
    order?.id ? db.from('shipments').select('*').eq('organization_id', organizationId).eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    db.from('organization_brand_settings').select('workspace_logo_storage_path').eq('organization_id', organizationId).maybeSingle(),
  ]);

  const logoUrl = await logoDataUrl(db, (brandSettings as any)?.workspace_logo_storage_path ?? org?.logo_storage_path);
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
      return { sku: text(product.sku_code ?? product.sku ?? line.product_id), product: text(product.name, 'Catalog line'), qty: text(qty), details: text(product.pack_size ?? product.hsn_code ?? quote.pricing_basis, 'Quote line'), unitPrice: money(unit, currency), amount: money(unit * qty, currency) };
    });
  } else if (lead?.id) {
    const { data: interests } = await db.from('lead_product_interests').select('id, product_id, label, interest_type, source_context').eq('organization_id', organizationId).eq('lead_id', lead.id).limit(12);
    const products = await productMapFor(db, organizationId, (interests ?? []).map((row: any) => row.product_id));
    rows = (interests ?? []).map((interest: any) => {
      const product: any = products.get(interest.product_id) ?? {};
      return { sku: text(product.sku_code ?? product.sku ?? interest.interest_type, '-'), product: text(product.name ?? interest.label, 'Interested product'), qty: text(interest.source_context?.quantity ?? interest.source_context?.moq ?? '-'), details: text(product.pack_size ?? product.hsn_code ?? interest.interest_type, 'Buyer interest'), unitPrice: text(product.fob_price ? money(product.fob_price, product.pricing_currency ?? currency) : '-'), amount: '-' };
    });
  }

  const data: PdfData = {
    title: typeInfo.title,
    subtitle: typeInfo.subtitle,
    documentNo: docNo(document, quote, order),
    issueDate: dateText(document.updated_at ?? document.uploaded_at ?? new Date().toISOString()),
    status: text(document.status, 'generated'),
    logoUrl,
    org: org ?? workspace.organization,
    buyer: lead ?? {},
    quote: quote ?? {},
    order: order ?? {},
    shipment: shipment ?? {},
    rows,
    summary: [
      ['Buyer', text(lead?.company_name, '-')],
      ['Quote', text(quote?.quote_number, '-')],
      ['Order', text(order?.order_number, '-')],
      ['Incoterm', text(order?.incoterm ?? order?.pricing_basis ?? quote?.pricing_basis, '-')],
      ['Currency', currency],
      ['Shipment', text(shipment?.booking_reference, '-')],
    ],
    terms: buildTerms(document, org, order, quote),
    notes: [`Buyer: ${text(lead?.company_name, '-')}`, `Contact: ${text(lead?.contact_name, '-')}`, `Quote: ${text(quote?.quote_number, '-')}`, `Order: ${text(order?.order_number, '-')}`, `Shipment: ${text(shipment?.booking_reference, '-')}`],
  };

  const bytes = await renderHtmlToPdf(buildHtml(data));
  const filename = text(document.file_name, `${typeInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`).replace(/\.pdf$/i, '') + '.pdf';
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"`, 'Cache-Control': 'no-store' },
  });
}
