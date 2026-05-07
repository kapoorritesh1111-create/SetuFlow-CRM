import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';

const navy = '#0b2e4a';
const border = '#cbd5e1';
const soft = '#f6f8fb';

function n(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function s(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}
function clip(value: unknown, max = 40, fallback = '-') {
  const text = s(value, fallback);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}
function cash(value: unknown, currency = 'USD') {
  return `${currency} ${n(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dateOut(value: unknown) {
  const raw = s(value, '');
  if (!raw) return '-';
  const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}
function esc(value: string) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
}
function rgb(hex: string) {
  const parsed = Number.parseInt(hex.replace('#', ''), 16);
  return `${(((parsed >> 16) & 255) / 255).toFixed(3)} ${(((parsed >> 8) & 255) / 255).toFixed(3)} ${((parsed & 255) / 255).toFixed(3)}`;
}
function wrap(value: unknown, width: number) {
  const lines: string[] = [];
  let current = '';
  for (const word of s(value, '').split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) { lines.push(current); current = word; } else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}
function priceMode(value: unknown) {
  const mode = s(value, 'unit').toLowerCase();
  if (mode.includes('case')) return 'CASE';
  if (mode.includes('kg') || mode.includes('bulk')) return 'KG';
  return 'UNIT';
}
function basis(value: unknown) {
  const out = s(value, 'FOB').replace(/_/g, ' ').toUpperCase();
  return out.includes('EX') ? 'EXW' : out;
}
function months(value: unknown) {
  const count = n(value);
  return count ? `${count} months` : 'Available per SKU';
}
function days(value: unknown) {
  const count = n(value);
  return count ? `${Math.max(1, count - 3)}-${count} days` : 'Confirm per order';
}

type Row = { sku: string; product: string; hs: string; pack: string; uom: string; units: string; moq: string; origin: string; unit: number; net: number; discount: string; note: string; total: number; shelf: string; lead: string };
type DrawText = { x: number; y: number; value: string; size?: number; bold?: boolean; color?: string; align?: 'right' | 'center' };

function makePdf(data: { quoteNo: string; org: any; buyer: any; market: string; destination: string; quoteBasis: string; place: string; currency: string; quoteDate: string; validUntil: string; terms: string; leadSummary: string; rows: Row[] }) {
  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const ops: string[] = [];
  const texts: DrawText[] = [];
  const box = (x: number, y: number, w: number, h: number, fill?: string, stroke?: string) => {
    if (fill) ops.push(`${rgb(fill)} rg ${x} ${y} ${w} ${h} re f`);
    if (stroke) ops.push(`${rgb(stroke)} RG ${x} ${y} ${w} ${h} re S`);
  };
  const text = (item: DrawText) => texts.push(item);
  const total = data.rows.reduce((sum, row) => sum + row.total, 0);
  const origins = Array.from(new Set(data.rows.map((row) => row.origin).filter(Boolean))).slice(0, 3).join(', ') || 'Confirm per SKU';
  const shelf = Array.from(new Set(data.rows.map((row) => row.shelf).filter(Boolean))).slice(0, 2).join(', ') || 'Available per SKU';

  box(24, 738, 42, 36, navy); text({ x: 33, y: 755, value: 'LOGO', size: 7.5, bold: true, color: '#ffffff' });
  text({ x: 76, y: 763, value: clip(data.org.legal_name ?? data.org.name, 30, 'SETU Flow'), size: 10.5, bold: true, color: navy });
  text({ x: 76, y: 750, value: clip(data.org.website, 38, 'Streamlining Global Trade'), size: 6.4, color: '#475569' });
  text({ x: 188, y: 763, value: 'SETU Flow - Client Price List', size: 15.5, bold: true, color: navy });
  text({ x: 188, y: 746, value: 'Pro Forma Quotation', size: 9, color: '#334155' });
  box(462, 734, 126, 44, navy); text({ x: 474, y: 760, value: data.quoteNo, size: 10, bold: true, color: '#ffffff' });
  text({ x: 474, y: 747, value: `Quote Date: ${data.quoteDate}`, size: 6.2, color: '#ffffff' });
  text({ x: 474, y: 737, value: `Valid Until: ${data.validUntil}`, size: 6.2, color: '#ffffff' });

  box(24, 602, 168, 118, '#ffffff', border); text({ x: 34, y: 704, value: 'SELLER / EXPORTER', size: 7, bold: true, color: navy });
  text({ x: 34, y: 686, value: clip(data.org.legal_name ?? data.org.name, 34), size: 8, bold: true });
  wrap(data.org.registered_address, 32).slice(0, 3).forEach((line, index) => text({ x: 34, y: 672 - index * 9, value: line, size: 6.3 }));
  text({ x: 34, y: 642, value: clip(data.org.contact_email, 34), size: 6.3 }); text({ x: 34, y: 632, value: clip(data.org.website, 34), size: 6.3 }); text({ x: 34, y: 616, value: `Tax/VAT: ${clip(data.org.tax_id, 22)}`, size: 6.3, bold: true });

  box(206, 602, 154, 118, '#ffffff', border); text({ x: 216, y: 704, value: 'BUYER / IMPORTER', size: 7, bold: true, color: navy });
  text({ x: 216, y: 686, value: clip(data.buyer.company_name, 31, 'Unknown customer'), size: 8, bold: true });
  text({ x: 216, y: 672, value: clip(data.buyer.contact_name, 31, ''), size: 6.3 }); text({ x: 216, y: 662, value: clip(data.buyer.country, 31, data.destination), size: 6.3 });
  text({ x: 216, y: 642, value: clip(data.buyer.email, 34), size: 6.3 }); text({ x: 216, y: 632, value: clip(data.buyer.phone, 34), size: 6.3 });

  box(374, 602, 214, 118, '#ffffff', border);
  [['DESTINATION', data.destination], ['MARKET', data.market], ['BASIS', `${data.quoteBasis} (Incoterms 2020)`], ['NAMED PLACE', data.place], ['CURRENCY', data.currency], ['PAYMENT TERMS', 'As agreed / per quote terms'], ['LEAD TIME', data.leadSummary], ['TAXES', 'Destination charges buyer account unless included']].forEach(([label, value], index) => {
    const y = 708 - index * 14; box(374, y - 4, 214, 14, index % 2 ? '#ffffff' : soft, '#e2e8f0'); text({ x: 384, y, value: label, size: 5.5, bold: true, color: '#334155' }); text({ x: 472, y, value: clip(value, 30), size: 6 });
  });

  box(24, 580, 564, 14, '#eef6ff', '#bfdbfe'); text({ x: 34, y: 584, value: 'Export sales may be zero-rated/exempt where applicable; destination taxes, customs and local charges are buyer account unless included.', size: 5.6, color: '#1e3a8a' });

  let y = 558; box(24, y - 15, 564, 18, navy);
  [['#', 30], ['SKU', 48], ['Product', 108], ['HS', 190], ['Pack', 234], ['UOM', 270], ['Units', 308], ['MOQ', 344], ['Origin', 378], ['Unit', 430], ['Disc', 472], ['Net', 508], ['Notes', 552]].forEach(([header, x]) => text({ x: Number(x), y: y - 9, value: String(header), size: 5.4, bold: true, color: '#ffffff' }));
  y -= 22;
  data.rows.slice(0, 8).forEach((row, index) => {
    box(24, y - 16, 564, 22, index % 2 ? '#ffffff' : '#f8fafc', '#dbe3ed');
    text({ x: 30, y, value: String(index + 1), size: 5.6, bold: true }); text({ x: 48, y, value: clip(row.sku, 17), size: 5.3 }); text({ x: 108, y, value: clip(row.product, 23), size: 5.3 }); text({ x: 190, y, value: clip(row.hs, 10), size: 5.3 }); text({ x: 234, y, value: clip(row.pack, 10), size: 5.3 }); text({ x: 270, y, value: row.uom, size: 5.3 });
    text({ x: 330, y, value: row.units, size: 5.3, align: 'right' }); text({ x: 360, y, value: row.moq, size: 5.3, align: 'right' }); text({ x: 378, y, value: clip(row.origin, 10), size: 5.3 }); text({ x: 462, y, value: cash(row.unit, data.currency), size: 5.3, align: 'right' }); text({ x: 494, y, value: row.discount, size: 5.3, align: 'right' }); text({ x: 542, y, value: cash(row.net, data.currency), size: 5.3, align: 'right' }); text({ x: 552, y, value: clip(row.note, 9), size: 5.1 });
    y -= 22;
  });

  y -= 6; box(24, y - 86, 274, 86, '#ffffff', border); text({ x: 34, y: y - 13, value: 'COMMERCIAL & COMPLIANCE', size: 7, bold: true, color: navy });
  [`Country of origin: ${origins}`, `Shelf life: ${shelf}`, 'Product specs, ingredients and nutrition available on request.', 'Export docs: invoice, packing list, certificate of origin and applicable certificates.', 'HS codes are indicative and subject to buyer validation.'].forEach((line, index) => text({ x: 34, y: y - 28 - index * 10, value: `- ${clip(line, 76)}`, size: 5.7 }));
  box(314, y - 86, 274, 86, '#ffffff', border); text({ x: 326, y: y - 13, value: `FINANCIAL SUMMARY (${data.currency})`, size: 7, bold: true, color: navy });
  [['Subtotal after discount', cash(total, data.currency)], ['Documentation / packaging charge', cash(0, data.currency)], ['Freight / insurance', 'Not included unless stated'], ['Taxes / duties', 'Buyer account unless included']].forEach(([label, value], index) => { text({ x: 326, y: y - 28 - index * 11, value: label, size: 5.8 }); text({ x: 578, y: y - 28 - index * 11, value, size: 5.8, align: 'right' }); });
  box(314, y - 86, 274, 18, navy); text({ x: 326, y: y - 80, value: 'GRAND TOTAL', size: 9, bold: true, color: '#ffffff' }); text({ x: 578, y: y - 80, value: cash(total, data.currency), size: 9, bold: true, color: '#ffffff', align: 'right' });

  y -= 104; box(24, y - 66, 564, 66, '#ffffff', border); text({ x: 34, y: y - 13, value: 'TERMS & CONDITIONS', size: 7, bold: true, color: navy });
  [`Quote valid until ${data.validUntil}.`, `Prices quoted on ${data.quoteBasis} basis from ${data.place}.`, 'Destination taxes, customs charges and destination handling are buyer account unless included.', 'Order confirmation is subject to agreed quantities, pack sizes, MOQs and specifications.', 'Export documentation will be provided as per applicable regulations.', 'Prices may change before confirmation if cost, freight, policy or currency inputs change.'].forEach((line, index) => text({ x: index < 3 ? 34 : 318, y: y - 27 - (index % 3) * 12, value: `${index + 1}. ${clip(line, 70)}`, size: 5.6 }));
  y -= 78; box(24, y - 48, 274, 48, '#ffffff', border); text({ x: 34, y: y - 13, value: 'LEAD TIME & SHIPMENT', size: 7, bold: true, color: navy }); [`Lead time: ${data.leadSummary}.`, `Port/place: ${data.place}.`, 'Shipment schedule and routing are confirmed after PO and document review.'].forEach((line, index) => text({ x: 34, y: y - 27 - index * 9, value: `- ${clip(line, 68)}`, size: 5.6 }));
  box(314, y - 48, 274, 48, '#ffffff', border); text({ x: 326, y: y - 13, value: 'NOTES', size: 7, bold: true, color: navy }); ['Quote is confidential and intended solely for the addressee.', 'Pricing basis and charges must be reviewed before sending.', clip(data.terms, 70)].forEach((line, index) => text({ x: 326, y: y - 27 - index * 9, value: `- ${line}`, size: 5.6 }));
  y -= 66; box(24, y - 50, 564, 50, '#ffffff', border); text({ x: 34, y: y - 14, value: 'AUTHORIZED SIGNATURE (SELLER)', size: 6.5, bold: true, color: navy }); text({ x: 34, y: y - 31, value: 'Name: ______________________', size: 5.7 }); text({ x: 34, y: y - 43, value: 'Date: _______________________', size: 5.7 }); text({ x: 236, y: y - 14, value: 'GET IN TOUCH', size: 6.5, bold: true, color: navy }); text({ x: 236, y: y - 30, value: clip(data.org.contact_email, 34), size: 5.7 }); text({ x: 236, y: y - 42, value: clip(data.org.website, 34), size: 5.7 }); text({ x: 420, y: y - 14, value: 'ACCEPTANCE (IMPORTER)', size: 6.5, bold: true, color: navy }); text({ x: 420, y: y - 31, value: 'Accepted by: ________________', size: 5.7 }); text({ x: 420, y: y - 43, value: 'Signature: _________________', size: 5.7 });
  box(0, 14, 612, 14, navy); text({ x: 245, y: 18, value: 'THANK YOU FOR YOUR BUSINESS!', size: 7.5, bold: true, color: '#ffffff' });

  ops.push('BT');
  for (const item of texts) {
    const size = item.size ?? 7;
    const width = item.value.length * size * 0.46;
    const x = item.align === 'right' ? Math.max(18, item.x - width) : item.align === 'center' ? Math.max(18, item.x - width / 2) : item.x;
    ops.push(`/${item.bold ? 'F2' : 'F1'} ${size} Tf\n${rgb(item.color ?? '#0f172a')} rg\n1 0 0 1 ${x} ${item.y} Tm (${pdfEscape(item.value)}) Tj`);
  }
  ops.push('ET');

  const content = ops.join('\n');
  const contentId = add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  const pageId = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`);
  const pagesId = add(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  objects[pageId - 1] = objects[pageId - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export async function GET(_request: Request, { params }: { params: { quoteId: string } }) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });
  const db = (await createClient()) as any;
  const { quoteId } = params;

  const { data: quote, error } = await db.from('quotes').select('id, quote_number, lead_id, currency, display_currency, updated_at, created_at, valid_until, pricing_basis, destination_port, market_id, country_id, freight_profile_id, approval_required, approved_at, notes_customer').eq('organization_id', organizationId).eq('id', quoteId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });

  const { data: lead } = await db.from('leads').select('id, company_name, contact_name, email, phone, country').eq('organization_id', organizationId).eq('id', quote.lead_id).maybeSingle();
  const countryPromise = quote.country_id
    ? db.from('countries').select('id, name, market_id, default_port_of_loading').eq('organization_id', organizationId).eq('id', quote.country_id).maybeSingle()
    : lead?.country
      ? db.from('countries').select('id, name, market_id, default_port_of_loading').eq('organization_id', organizationId).ilike('name', lead.country).maybeSingle()
      : Promise.resolve({ data: null });

  const [{ data: lines }, { data: org }, { data: country }, { data: freight }] = await Promise.all([
    db.from('quote_line_items').select('id, product_id, product_variant_id, quantity, unit_price, catalog_price_amount, is_price_overridden, override_reason, notes').eq('quote_id', quote.id).order('created_at', { ascending: true }),
    db.from('organizations').select('id, name, legal_name, logo_url, registered_address, website, contact_email, tax_id, quote_terms_conditions, default_currency').eq('id', organizationId).maybeSingle(),
    countryPromise,
    quote.freight_profile_id ? db.from('freight_profiles').select('id, destination_port, notes').eq('organization_id', organizationId).eq('id', quote.freight_profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const marketId = quote.market_id ?? country?.market_id ?? null;
  const { data: market } = marketId ? await db.from('markets').select('id, name').eq('organization_id', organizationId).eq('id', marketId).maybeSingle() : { data: null };

  const quoteLines = (lines ?? []) as any[];
  const productIds = Array.from(new Set(quoteLines.map((line) => line.product_id).filter(Boolean)));
  const variantIds = Array.from(new Set(quoteLines.map((line) => line.product_variant_id).filter(Boolean)));
  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length ? db.from('products').select('id, name, sku, sku_code, hsn_code, category_id').eq('organization_id', organizationId).in('id', productIds) : Promise.resolve({ data: [] }),
    variantIds.length ? db.from('product_variants').select('id, product_id, name, sku_code, hsn_code, country_of_origin, pack_size_value, pack_size_unit, pack_label, units_per_case, moq_cases, moq_kg, pricing_mode_default, shipment_notes, lead_time_days, shelf_life_months').in('id', variantIds) : Promise.resolve({ data: [] }),
  ]);
  const productMap = new Map((products ?? []).map((product: any) => [product.id, product]));
  const variantMap = new Map((variants ?? []).map((variant: any) => [variant.id, variant]));
  const categoryIds = Array.from(new Set((products ?? []).map((product: any) => product.category_id).filter(Boolean)));
  const { data: categories } = categoryIds.length ? await db.from('product_categories').select('id, name, default_lead_time_days, default_shelf_life_months, default_country_of_origin, default_shipment_notes').eq('organization_id', organizationId).in('id', categoryIds) : { data: [] };
  const categoryMap = new Map((categories ?? []).map((category: any) => [category.id, category]));
  const currency = String(quote.display_currency ?? quote.currency ?? org?.default_currency ?? 'USD');

  const rows: Row[] = quoteLines.map((line) => {
    const product: any = productMap.get(line.product_id) ?? {};
    const variant: any = variantMap.get(line.product_variant_id) ?? {};
    const category: any = categoryMap.get(product.category_id) ?? {};
    const net = n(line.unit_price);
    const catalog = line.catalog_price_amount == null ? net : n(line.catalog_price_amount);
    const mode = priceMode(variant.pricing_mode_default ?? quote.pricing_basis);
    const pack = s(variant.pack_label, '') || (s(variant.pack_size_value, '') && s(variant.pack_size_unit, '') ? `${s(variant.pack_size_value, '')} ${s(variant.pack_size_unit, '')}` : '-');
    return {
      sku: s(variant.sku_code ?? product.sku_code ?? product.sku),
      product: s(product.name ?? variant.name, 'Catalog line'),
      hs: s(variant.hsn_code ?? product.hsn_code, 'TBC'),
      pack,
      uom: mode === 'KG' ? 'Kg' : mode === 'CASE' ? 'Case' : 'Unit',
      units: s(variant.units_per_case),
      moq: mode === 'KG' ? s(variant.moq_kg, '0') : s(variant.moq_cases ?? variant.moq_kg, '0'),
      origin: s(variant.country_of_origin ?? category.default_country_of_origin, 'Confirm per SKU'),
      unit: catalog,
      net,
      discount: line.is_price_overridden && catalog ? `${(((catalog - net) / catalog) * 100).toFixed(1)}%` : '-',
      note: s(line.override_reason ?? line.notes, '-'),
      total: n(line.quantity) * net,
      shelf: months(variant.shelf_life_months ?? category.default_shelf_life_months),
      lead: days(variant.lead_time_days ?? category.default_lead_time_days),
    };
  });

  const place = s(quote.destination_port ?? freight?.destination_port ?? country?.default_port_of_loading, 'Confirm port/place before sending');
  const leadSummary = Array.from(new Set(rows.map((row) => row.lead))).slice(0, 2).join(', ') || 'Confirm per order';
  const pdf = makePdf({ quoteNo: `Quote ${quote.quote_number ?? quote.id.slice(0, 8)}`, org: org ?? { name: workspace.organization?.name }, buyer: lead ?? {}, market: s(market?.name), destination: s(country?.name ?? lead?.country), quoteBasis: basis(quote.pricing_basis), place, currency, quoteDate: dateOut(quote.updated_at ?? quote.created_at), validUntil: dateOut(quote.valid_until), terms: s(org?.quote_terms_conditions ?? quote.notes_customer, 'Prices are subject to validity, Incoterms basis, final order confirmation, agreed payment terms, and buyer destination charges unless included.'), leadSummary, rows });

  await db.from('documents').upsert({ organization_id: organizationId, related_entity: 'quote', related_id: quote.id, file_name: `quote-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf`, file_url: `/api/quotes/${quote.id}/pdf`, doc_type: 'quote_pdf', uploaded_by: workspace.user?.id ?? null, version: 1, status: quote.approval_required && !quote.approved_at ? 'pending_approval' : 'ready' }, { onConflict: 'organization_id,related_entity,related_id,file_name' }).then(() => null);

  return new Response(new Uint8Array(pdf), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="quote-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf"`, 'Cache-Control': 'no-store' } });
}
