import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';

const INK = '#0f172a';
const MUTED = '#475569';
const NAVY = '#0b2e4a';
const BLUE = '#1d4ed8';
const LINE = '#cbd5e1';
const PANEL = '#f8fafc';

function n(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function s(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function c(value: unknown, max = 36, fallback = '-') {
  const text = s(value, fallback);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function d(value: unknown) {
  const text = s(value, '');
  if (!text) return '-';
  const date = new Date(text.includes('T') ? text : `${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}

function esc(value: string) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

function rgb(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return `${(((value >> 16) & 255) / 255).toFixed(3)} ${(((value >> 8) & 255) / 255).toFixed(3)} ${((value & 255) / 255).toFixed(3)}`;
}

function money(value: unknown, currency = 'USD') {
  return `${currency} ${n(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function basis(value: unknown) {
  const normalized = s(value, 'FOB').replace(/_/g, ' ').trim().toUpperCase();
  return normalized.includes('EX') ? 'EXW' : normalized || 'FOB';
}

function quoteDocumentStatus(quote: any) {
  return quote.approval_required && !quote.approved_at ? 'submitted' : 'approved';
}

type TextOp = { x: number; y: number; text: string; size?: number; bold?: boolean; color?: string; right?: boolean };
type QuoteLine = { sku: string; product: string; qty: number; basis: string; casePrice: number; total: number; note: string };

function buildPdf(data: {
  quoteNo: string;
  org: any;
  buyer: any;
  market: string;
  destination: string;
  place: string;
  basis: string;
  currency: string;
  quoteDate: string;
  validUntil: string;
  terms: string;
  rows: QuoteLine[];
}) {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const ops: string[] = [];
  const texts: TextOp[] = [];

  const box = (x: number, y: number, w: number, h: number, fill?: string, stroke?: string) => {
    if (fill) ops.push(`${rgb(fill)} rg ${x} ${y} ${w} ${h} re f`);
    if (stroke) ops.push(`${rgb(stroke)} RG ${x} ${y} ${w} ${h} re S`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color = LINE, width = 0.7) => {
    ops.push(`${rgb(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const txt = (x: number, y: number, text: string, size = 7, bold = false, color = INK, right = false) => {
    texts.push({ x, y, text, size, bold, color, right });
  };

  const total = data.rows.reduce((sum, row) => sum + row.total, 0);

  box(0, 0, 612, 792, '#ffffff');
  box(24, 724, 564, 44, '#ffffff', LINE);
  box(24, 724, 44, 44, NAVY);
  txt(35, 746, 'SETU', 7, true, '#ffffff');
  txt(78, 750, c(data.org?.legal_name ?? data.org?.name, 34, 'SETU Groups LLC'), 10.5, true, NAVY);
  txt(78, 736, c(data.org?.website, 42, 'https://www.setuflowcrm.com'), 6.4, false, MUTED);
  txt(204, 752, 'SETU Flow - Client Price List', 15.2, true, NAVY);
  txt(204, 736, 'Pro Forma Quotation', 8.8, false, MUTED);
  box(474, 732, 104, 28, PANEL, LINE);
  txt(484, 750, data.quoteNo, 8.5, true, NAVY);
  txt(484, 739, `${data.quoteDate} | Valid ${data.validUntil}`, 5.7, false, MUTED);

  box(24, 612, 176, 92, PANEL, LINE);
  txt(36, 686, 'SELLER / EXPORTER', 6.5, true, BLUE);
  txt(36, 672, c(data.org?.legal_name ?? data.org?.name, 34, 'SETU Groups LLC'), 8, true);
  txt(36, 658, c(data.org?.registered_address, 38), 6.2, false, MUTED);
  txt(36, 648, c([data.org?.city, data.org?.postal_code, data.org?.headquarters_country].filter(Boolean).join(', '), 38), 6.2, false, MUTED);
  txt(36, 632, c(data.org?.contact_email, 36), 6.2, false, MUTED);
  txt(36, 622, `Tax ID: ${c(data.org?.tax_id, 28)}`, 6.2, false, MUTED);

  box(216, 612, 176, 92, PANEL, LINE);
  txt(228, 686, 'BUYER / IMPORTER', 6.5, true, BLUE);
  txt(228, 672, c(data.buyer?.company_name, 34, 'Unknown customer'), 8, true);
  txt(228, 658, c(data.buyer?.contact_name, 35, ''), 6.2, false, MUTED);
  txt(228, 648, c(data.buyer?.country, 35, data.destination), 6.2, false, MUTED);
  txt(228, 632, c(data.buyer?.email, 36), 6.2, false, MUTED);
  txt(228, 622, c(data.buyer?.phone, 36), 6.2, false, MUTED);

  box(408, 612, 180, 92, PANEL, LINE);
  [['Destination', data.destination], ['Market', data.market], ['Basis', `${data.basis} Incoterms 2020`], ['Named place', data.place], ['Currency', data.currency], ['Lines', String(data.rows.length)]].forEach(([label, value], index) => {
    const rowY = 688 - index * 12;
    txt(420, rowY, label, 5.3, true, MUTED);
    txt(578, rowY, c(value, 23), 5.7, false, INK, true);
  });

  box(24, 590, 564, 14, '#eef6ff', '#bfdbfe');
  txt(36, 594, 'Taxes, duties and destination charges follow the agreed Incoterm. Unless included, buyer pays import duty, VAT/GST, clearance and destination handling.', 5.45, false, '#1e3a8a');

  const tableX = 18;
  const tableW = 576;
  let y = 560;
  box(tableX, y - 17, tableW, 20, '#e2e8f0', LINE);
  const headers: Array<[string, number]> = [['#', 24], ['SKU', 70], ['Product', 160], ['Qty', 44], ['Basis', 46], [`${data.currency}/Case`, 80], [`Total ${data.currency}`, 92]];
  let x = tableX + 6;
  headers.forEach(([header, width]) => {
    txt(x, y - 10, header, 5, true, NAVY);
    x += width;
  });

  y -= 23;
  data.rows.slice(0, 12).forEach((row, index) => {
    box(tableX, y - 15, tableW, 21, index % 2 ? '#ffffff' : '#f8fafc', LINE);
    x = tableX + 6;
    const cells: Array<[string, number, boolean?]> = [
      [String(index + 1), 24],
      [c(row.sku, 15), 70],
      [c(row.product, 30), 160],
      [String(row.qty || '-'), 44],
      [row.basis, 46],
      [money(row.casePrice, data.currency), 80, true],
      [money(row.total, data.currency), 92, true],
    ];
    cells.forEach(([value, width, right]) => {
      txt(right ? x + width - 4 : x, y - 6, value, 5.2, index === 0, INK, Boolean(right));
      x += width;
    });
    y -= 21;
  });

  line(tableX, y + 5, tableX + tableW, y + 5, NAVY, 1.1);
  txt(392, y - 7, 'Grand Total', 8.5, true, NAVY);
  txt(590, y - 7, money(total, data.currency), 9, true, NAVY, true);

  y -= 32;
  box(24, y - 58, 274, 58, PANEL, LINE);
  txt(36, y - 13, 'COMMERCIAL & COMPLIANCE', 7, true, NAVY);
  [`Destination: ${data.destination}`, `Basis: ${data.basis}`, 'Specs, ingredients and nutrition available on request.', 'HS codes are indicative and should be validated.'].forEach((lineText, index) => {
    txt(36, y - 27 - index * 10, `- ${c(lineText, 72)}`, 5.7, false, MUTED);
  });
  box(314, y - 58, 274, 58, PANEL, LINE);
  txt(326, y - 13, `FINANCIAL SUMMARY (${data.currency})`, 7, true, NAVY);
  [['Subtotal', money(total, data.currency)], ['Documentation / packaging', money(0, data.currency)], ['Freight / insurance', 'Not included unless stated'], ['Taxes / duties', 'Per Incoterm / buyer account']].forEach(([label, value], index) => {
    txt(326, y - 27 - index * 10, label, 5.8, false, MUTED);
    txt(578, y - 27 - index * 10, value, 5.8, false, INK, true);
  });

  y -= 76;
  box(24, y - 54, 564, 54, '#ffffff', LINE);
  txt(36, y - 13, 'TERMS & CONDITIONS', 7, true, NAVY);
  [`Quote valid until ${data.validUntil}.`, `Prices quoted on ${data.basis} basis from ${data.place}.`, 'Import duties, VAT/GST, customs clearance and destination handling are buyer account unless included.', 'Order confirmation is subject to agreed quantities, pack sizes, MOQs and specifications.', c(data.terms, 120)].forEach((lineText, index) => {
    txt(36, y - 25 - index * 8.5, c(lineText, 138), 5.2, false, MUTED);
  });

  const textOps = texts.flatMap((text) => [
    'BT',
    `${rgb(text.color ?? INK)} rg /F${text.bold ? 'B' : 'R'} ${text.size ?? 7} Tf`,
    `1 0 0 1 ${text.x} ${text.y} Tm (${esc(text.text)}) Tj`,
    'ET',
  ]);
  const stream = [...ops, ...textOps].join('\n');
  const content = add(`<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}\nendstream`);
  const page = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /FR ${font} 0 R /FB ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`);
  const pages = add(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`);
  objects[page - 1] = objects[page - 1].replace('/Parent 0 0 R', `/Parent ${pages} 0 R`);
  const catalog = add(`<< /Type /Catalog /Pages ${pages} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer << /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

export async function GET(_request: Request, { params }: { params: { quoteId: string } }) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });

  const db = (await createClient()) as any;
  const { quoteId } = params;
  const { data: quote, error } = await db
    .from('quotes')
    .select('id, quote_number, lead_id, currency, display_currency, updated_at, created_at, valid_until, pricing_basis, destination_port, market_id, country_id, freight_profile_id, approval_required, approved_at, notes_customer')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });

  const { data: leadRow } = await db.from('leads').select('id, company_name, contact_name, email, phone, country').eq('organization_id', organizationId).eq('id', quote.lead_id).maybeSingle();
  const countryPromise = quote.country_id
    ? db.from('countries').select('id, name, market_id, default_port_of_loading').eq('organization_id', organizationId).eq('id', quote.country_id).maybeSingle()
    : leadRow?.country
      ? db.from('countries').select('id, name, market_id, default_port_of_loading').eq('organization_id', organizationId).ilike('name', leadRow.country).maybeSingle()
      : Promise.resolve({ data: null });

  const [{ data: items }, { data: org }, { data: country }, { data: freight }] = await Promise.all([
    db.from('quote_line_items').select('id, product_id, product_variant_id, quantity, unit_price, catalog_price_amount, is_price_overridden, override_reason, notes').eq('quote_id', quote.id).order('created_at', { ascending: true }),
    db.from('organizations').select('id, name, legal_name, logo_url, registered_address, city, postal_code, headquarters_country, website, contact_email, tax_id, quote_terms_conditions, default_currency').eq('id', organizationId).maybeSingle(),
    countryPromise,
    quote.freight_profile_id ? db.from('freight_profiles').select('id, destination_port, notes').eq('organization_id', organizationId).eq('id', quote.freight_profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const marketId = quote.market_id ?? country?.market_id ?? null;
  const { data: market } = marketId ? await db.from('markets').select('id, name').eq('organization_id', organizationId).eq('id', marketId).maybeSingle() : { data: null };
  const lines = (items ?? []) as any[];
  const productIds = Array.from(new Set(lines.map((line) => line.product_id).filter(Boolean)));
  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length ? db.from('products').select('id, name, sku, sku_code, hsn_code, category_id').eq('organization_id', organizationId).in('id', productIds) : Promise.resolve({ data: [] }),
    productIds.length ? db.from('product_variants').select('id, product_id, name, sku_code, hsn_code, country_of_origin, pack_label, units_per_case').in('product_id', productIds) : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map((products ?? []).map((product: any) => [product.id, product]));
  const variantMap = new Map((variants ?? []).map((variant: any) => [variant.id, variant]));
  const quoteBasis = basis(quote.pricing_basis);
  const currency = String(quote.display_currency ?? quote.currency ?? org?.default_currency ?? 'USD').toUpperCase();
  const rows: QuoteLine[] = lines.map((line) => {
    const product: any = productMap.get(line.product_id) ?? {};
    const variant: any = variantMap.get(line.product_variant_id) ?? {};
    const casePrice = n(line.unit_price ?? line.catalog_price_amount);
    return {
      sku: s(variant.sku_code ?? product.sku_code ?? product.sku),
      product: s(product.name ?? variant.name, 'Catalog line'),
      qty: n(line.quantity, 1),
      basis: quoteBasis,
      casePrice,
      total: n(line.quantity, 1) * casePrice,
      note: s(line.override_reason ?? line.notes, '-'),
    };
  });

  const bytes = buildPdf({
    quoteNo: `Quote ${quote.quote_number ?? quote.id.slice(0, 8)}`,
    org: org ?? { name: workspace.organization?.name },
    buyer: leadRow ?? {},
    market: s(market?.name),
    destination: s(country?.name ?? leadRow?.country),
    place: s(quote.destination_port ?? freight?.destination_port ?? country?.default_port_of_loading, 'Confirm port/place before sending'),
    basis: quoteBasis,
    currency,
    quoteDate: d(quote.updated_at ?? quote.created_at),
    validUntil: d(quote.valid_until),
    terms: s(org?.quote_terms_conditions ?? quote.notes_customer, 'Prices are subject to validity, Incoterms basis, final order confirmation, agreed payment terms, and buyer destination charges unless included.'),
    rows,
  });

  await db.from('documents').upsert({
    organization_id: organizationId,
    related_entity: 'quote',
    related_id: quote.id,
    file_name: `quote-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf`,
    file_url: `/api/quotes/${quote.id}/pdf`,
    doc_type: 'quote_pdf',
    uploaded_by: workspace.user?.id ?? null,
    uploaded_at: quote.updated_at ?? quote.created_at ?? new Date().toISOString(),
    version: 1,
    status: quoteDocumentStatus(quote),
    linked_quote_id: quote.id,
  }, { onConflict: 'organization_id,related_entity,related_id,file_name' }).then(() => null);

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="quote-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
