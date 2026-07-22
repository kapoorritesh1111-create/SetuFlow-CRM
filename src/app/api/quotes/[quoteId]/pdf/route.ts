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
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);

type PdfText = { x: number; y: number; text: string; size: number; bold: boolean; color: string; right: boolean };
type PdfRow = { sku: string; product: string; qty: number; basis: string; casePrice: number; total: number };

type PdfData = {
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
  rows: PdfRow[];
};

function num(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, fallback = '-') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function clip(value: unknown, max = 36, fallback = '-') {
  const out = text(value, fallback);
  return out.length > max ? `${out.slice(0, Math.max(1, max - 3))}...` : out;
}

function dateText(value: unknown) {
  const out = text(value, '');
  if (!out) return '-';
  const date = new Date(out.includes('T') ? out : `${out}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}

function pdfText(value: string) {
  return String(value).split(BS).join(BS + BS).split('(').join(BS + '(').split(')').join(BS + ')').split(NL).join(' ');
}

function rgb(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return `${(((value >> 16) & 255) / 255).toFixed(3)} ${(((value >> 8) & 255) / 255).toFixed(3)} ${((value & 255) / 255).toFixed(3)}`;
}

function money(value: unknown, currency = 'USD') {
  return `${currency} ${num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function quoteBasis(value: unknown) {
  const out = text(value, 'FOB').replaceAll('_', ' ').trim().toUpperCase();
  return out.includes('EX') ? 'EXW' : out || 'FOB';
}

function docStatus(quote: any) {
  return quote.approval_required && !quote.approved_at ? 'submitted' : 'approved';
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
  const total = data.rows.reduce((sum, row) => sum + row.total, 0);
  const logo = orgLogoMark(data.org);

  box(0, 0, 612, 792, '#ffffff');
  box(left, 724, 564, 44, '#ffffff', LINE);
  box(left, 724, 44, 44, NAVY);
  put(46, 746, logo, logo.length > 2 ? 6.8 : 8.5, true, '#ffffff', true);
  put(78, 750, clip(data.org?.legal_name ?? data.org?.name, 34, 'SETU Groups LLC'), 10.5, true, NAVY);
  put(78, 736, clip(data.org?.website, 42, 'https://www.setuflowcrm.com'), 6.4, false, MUTED);
  put(204, 752, 'SETU Flow - Client Price List', 15.2, true, NAVY);
  put(204, 736, 'Pro Forma Quotation', 8.8, false, MUTED);
  box(474, 732, 104, 28, PANEL, LINE);
  put(578, 750, data.quoteNo, 8.5, true, NAVY, true);
  put(578, 739, `${data.quoteDate} | Valid ${data.validUntil}`, 5.7, false, MUTED, true);

  box(24, 612, 176, 92, PANEL, LINE);
  put(36, 686, 'SELLER / EXPORTER', 6.5, true, BLUE);
  put(36, 672, clip(data.org?.legal_name ?? data.org?.name, 34, 'SETU Groups LLC'), 8, true);
  put(36, 658, clip(data.org?.registered_address, 38), 6.2, false, MUTED);
  put(36, 648, clip([data.org?.city, data.org?.postal_code, data.org?.headquarters_country].filter(Boolean).join(', '), 38), 6.2, false, MUTED);
  put(36, 632, clip(data.org?.contact_email, 36), 6.2, false, MUTED);
  put(36, 622, `Tax ID: ${clip(data.org?.tax_id, 28)}`, 6.2, false, MUTED);

  box(216, 612, 176, 92, PANEL, LINE);
  put(228, 686, 'BUYER / IMPORTER', 6.5, true, BLUE);
  put(228, 672, clip(data.buyer?.company_name, 34, 'Unknown customer'), 8, true);
  put(228, 658, clip(data.buyer?.contact_name, 35, ''), 6.2, false, MUTED);
  put(228, 648, clip(data.buyer?.country, 35, data.destination), 6.2, false, MUTED);
  put(228, 632, clip(data.buyer?.email, 36), 6.2, false, MUTED);
  put(228, 622, clip(data.buyer?.phone, 36), 6.2, false, MUTED);

  box(408, 612, 180, 92, PANEL, LINE);
  [['Destination', data.destination], ['Market', data.market], ['Basis', `${data.basis} Incoterms 2020`], ['Named place', data.place], ['Currency', data.currency], ['Lines', String(data.rows.length)]].forEach(([label, value], index) => {
    const y = 688 - index * 12;
    put(420, y, label, 5.3, true, MUTED);
    put(580, y, clip(value, 24), 5.7, false, INK, true);
  });

  box(left, 590, 564, 14, '#eef6ff', '#bfdbfe');
  put(36, 594, 'Taxes, duties and destination charges follow the agreed Incoterm. Unless included, buyer pays import duty, VAT/GST, clearance and destination handling.', 5.45, false, '#1e3a8a');

  let y = 560;
  box(18, y - 17, 576, 20, '#e2e8f0', LINE);
  put(24, y - 10, '#', 5, true, NAVY);
  put(62, y - 10, 'SKU', 5, true, NAVY);
  put(142, y - 10, 'Product', 5, true, NAVY);
  put(318, y - 10, 'Qty', 5, true, NAVY, true);
  put(372, y - 10, 'Basis', 5, true, NAVY);
  put(458, y - 10, `${data.currency}/Case`, 5, true, NAVY, true);
  put(582, y - 10, `Total ${data.currency}`, 5, true, NAVY, true);
  y -= 23;

  data.rows.slice(0, 12).forEach((row, index) => {
    box(18, y - 15, 576, 21, index % 2 ? '#ffffff' : '#f8fafc', LINE);
    put(24, y - 6, String(index + 1), 5.2);
    put(62, y - 6, clip(row.sku, 16), 5.2);
    put(142, y - 6, clip(row.product, 34), 5.2, index === 0);
    put(318, y - 6, String(row.qty || '-'), 5.2, false, INK, true);
    put(372, y - 6, row.basis, 5.2);
    put(458, y - 6, money(row.casePrice, data.currency), 5.2, index === 0, INK, true);
    put(582, y - 6, money(row.total, data.currency), 5.2, index === 0, INK, true);
    y -= 21;
  });

  line(18, y + 5, 594, y + 5, NAVY, 1.1);
  put(450, y - 7, 'Grand Total', 8.5, true, NAVY, true);
  put(582, y - 7, money(total, data.currency), 9, true, NAVY, true);

  y -= 44;
  box(24, y - 68, 274, 68, PANEL, LINE);
  put(36, y - 15, 'COMMERCIAL & COMPLIANCE', 7, true, NAVY);
  [`Destination: ${data.destination}`, `Basis: ${data.basis}`, 'Specs, ingredients and nutrition available on request.', 'HS codes are indicative and should be validated.'].forEach((lineText, index) => put(36, y - 31 - index * 10, `- ${clip(lineText, 72)}`, 5.7, false, MUTED));

  box(314, y - 68, 274, 68, PANEL, LINE);
  put(326, y - 15, `FINANCIAL SUMMARY (${data.currency})`, 7, true, NAVY);
  [['Subtotal', money(total, data.currency)], ['Documentation / packaging', money(0, data.currency)], ['Freight / insurance', 'Not included'], ['Taxes / duties', 'Per Incoterm']].forEach(([label, value], index) => {
    put(326, y - 31 - index * 10, label, 5.8, false, MUTED);
    put(580, y - 31 - index * 10, value, 5.8, false, INK, true);
  });

  y -= 90;
  box(left, y - 76, right - left, 76, '#ffffff', LINE);
  put(36, y - 15, 'TERMS & CONDITIONS', 7, true, NAVY);
  [`Quote valid until ${data.validUntil}.`, `Prices quoted on ${data.basis} basis from ${data.place}.`, 'Import duties, VAT/GST, customs clearance and destination handling are buyer account unless included.', 'Order confirmation is subject to agreed quantities, pack sizes, MOQs and specifications.', clip(data.terms, 118)].forEach((lineText, index) => put(36, y - 31 - index * 9.5, clip(lineText, 135), 5.2, false, MUTED));

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
    db.from('quote_line_items').select('id, product_id, product_variant_id, quantity, unit_price, catalog_price_amount, is_price_overridden, override_reason, notes, line_type, input_snapshot_json').eq('quote_id', quote.id).order('created_at', { ascending: true }),
    db.from('organizations').select('id, name, legal_name, logo_url, logo_storage_path, registered_address, city, postal_code, headquarters_country, website, contact_email, tax_id, quote_terms_conditions, default_currency').eq('id', organizationId).maybeSingle(),
    countryPromise,
    quote.freight_profile_id ? db.from('freight_profiles').select('id, destination_port, notes').eq('organization_id', organizationId).eq('id', quote.freight_profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const marketId = quote.market_id ?? country?.market_id ?? null;
  const { data: market } = marketId ? await db.from('markets').select('id, name').eq('organization_id', organizationId).eq('id', marketId).maybeSingle() : { data: null };
  const lines = (items ?? []) as any[];
  const productIds = Array.from(new Set(lines.map((line) => line.product_id).filter(Boolean)));
  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length ? db.from('products').select('id, name, sku, sku_code, hsn_code, category_id').eq('organization_id', organizationId).in('id', productIds) : Promise.resolve({ data: [] }),
    productIds.length ? db.from('product_variants').select('id, product_id, name, sku_code, country_of_origin, pack_label, units_per_case').in('product_id', productIds) : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map((products ?? []).map((product: any) => [product.id, product]));
  const variantMap = new Map((variants ?? []).map((variant: any) => [variant.id, variant]));
  const quoteBase = quoteBasis(quote.pricing_basis);
  const currency = String(quote.display_currency ?? quote.currency ?? org?.default_currency ?? 'USD').toUpperCase();
  const { data: optionalCharges } = await db
    .from('quote_optional_charges')
    .select('label, amount, currency')
    .eq('organization_id', organizationId)
    .eq('quote_id', quote.id);
  // S27-STARK-D1: packaging lines were previously excluded from the branded
  // quote PDF entirely (this route predates the packaging vertical). Include
  // them using the same saved spec summary shown in-app, and include
  // optional charges (freight, rush, etc.) so the PDF total always matches
  // what the buyer sees on screen.
  const rows: PdfRow[] = lines.map((line) => {
    if (line.line_type === 'packaging') {
      const qty = num(line.quantity, 1);
      const unitPrice = num(line.unit_price);
      return {
        sku: 'PKG',
        product: text(line.input_snapshot_json?.spec_summary, 'Custom packaging line'),
        qty,
        basis: quoteBase,
        casePrice: unitPrice,
        total: qty * unitPrice,
      };
    }
    const product: any = productMap.get(line.product_id) ?? {};
    const variant: any = variantMap.get(line.product_variant_id) ?? {};
    const casePrice = num(line.unit_price ?? line.catalog_price_amount);
    return {
      sku: text(variant.sku_code ?? product.sku_code ?? product.sku),
      product: text(product.name ?? variant.name, 'Catalog line'),
      qty: num(line.quantity, 1),
      basis: quoteBase,
      casePrice,
      total: num(line.quantity, 1) * casePrice,
    };
  });
  for (const charge of (optionalCharges ?? []) as any[]) {
    const amount = num(charge.amount);
    if (amount <= 0) continue;
    rows.push({ sku: '—', product: text(charge.label, 'Additional charge'), qty: 1, basis: quoteBase, casePrice: amount, total: amount });
  }

  const bytes = buildPdf({
    quoteNo: `Quote ${quote.quote_number ?? quote.id.slice(0, 8)}`,
    org: org ?? { name: workspace.organization?.name },
    buyer: leadRow ?? {},
    market: text(market?.name),
    destination: text(country?.name ?? leadRow?.country),
    place: text(quote.destination_port ?? freight?.destination_port ?? country?.default_port_of_loading, 'Confirm port/place before sending'),
    basis: quoteBase,
    currency,
    quoteDate: dateText(quote.updated_at ?? quote.created_at),
    validUntil: dateText(quote.valid_until),
    terms: text(org?.quote_terms_conditions ?? quote.notes_customer, 'Prices are subject to validity, Incoterms basis, final order confirmation, agreed payment terms, and buyer destination charges unless included.'),
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
    status: docStatus(quote),
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
