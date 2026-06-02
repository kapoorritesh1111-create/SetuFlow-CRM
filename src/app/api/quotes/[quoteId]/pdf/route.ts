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

function n(v: unknown, f = 0) { const x = Number(v ?? f); return Number.isFinite(x) ? x : f; }
function s(v: unknown, f = '-') { const t = String(v ?? '').trim(); return t || f; }
function c(v: unknown, m = 36, f = '-') { const t = s(v, f); return t.length > m ? t.slice(0, m - 3) + '...' : t; }
function d(v: unknown) { const t = s(v, ''); if (!t) return '-'; const dt = new Date(t.includes('T') ? t : `${t}T00:00:00`); return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-GB'); }
function esc(v: string) { return String(v).replace(/\/g, '\\').replace(/\(/g, '\(').replace(/\)/g, '\)').replace(/[\r\n]+/g, ' '); }
function rgb(hex: string) { const x = Number.parseInt(hex.replace('#', ''), 16); return `${(((x >> 16) & 255) / 255).toFixed(3)} ${(((x >> 8) & 255) / 255).toFixed(3)} ${((x & 255) / 255).toFixed(3)}`; }
function money(v: unknown, cur = 'USD') { return `${cur} ${n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function basis(v: unknown) { const x = s(v, 'FOB').replace(/_/g, ' ').trim().toUpperCase(); return x.includes('EX') ? 'EXW' : x || 'FOB'; }
function lead(v: unknown) { const x = n(v); return x ? `${Math.max(1, x - 3)}-${x} days` : 'Confirm per order'; }
function shelf(v: unknown) { const x = n(v); return x ? `${x} months` : 'Available per SKU'; }
function textFor(product: any, variant: any) { return `${s(variant?.sku_code, '')} ${s(variant?.pack_label, '')} ${s(product?.sku_code, '')} ${s(product?.sku, '')} ${s(product?.name, '')} ${s(variant?.name, '')}`.toLowerCase(); }
function inferredSnackPackGrams(product: any, variant: any) { const source = textFor(product, variant); if (source.includes('banana')) return 100; if (source.includes('kabuli') || source.includes('chana')) return 150; if (source.includes('okra')) return 30; if (source.includes('beetroot') || source.includes('mango') || source.includes('jackfruit') || source.includes('sweet potato') || source.includes('sweet corn')) return 50; return 0; }
function parsePackGrams(variant: any, product: any) { const value = n(variant?.pack_size_value); const unit = s(variant?.pack_size_unit, '').toLowerCase(); if (value && (unit.includes('kg') || unit === 'kilogram')) return value * 1000; if (value) return value; const label = s(variant?.pack_label, ''); const match = label.match(/([0-9]+(?:\.[0-9]+)?)/); if (match) { const parsed = Number(match[1]); return label.toLowerCase().includes('kg') ? parsed * 1000 : parsed; } return inferredSnackPackGrams(product, variant); }
function packGrams(variant: any, product: any) { const grams = parsePackGrams(variant, product); return grams ? String(Math.round(grams)) : '-'; }
function inferredUnitsPerCase(product: any, variant: any) { const value = n(variant?.units_per_case); if (value > 1) return Math.round(value); const source = textFor(product, variant); return /(chips|chana|okra|mango|banana|beetroot|jackfruit|sweet corn|sweet potato)/.test(source) ? 72 : Math.max(1, Math.round(value || 1)); }
function inferredMoqCases(product: any, variant: any, line: any) { const value = n(variant?.moq_cases); if (value > 1) return Math.round(value); const source = textFor(product, variant); if (/(chips|chana|okra|mango|banana|beetroot|jackfruit|sweet corn|sweet potato)/.test(source)) return 15; return Math.max(1, Math.round(n(line?.quantity, 1))); }
function addressLines(org: any) { const cityLine = [org?.city, org?.postal_code, org?.headquarters_country].map((v) => s(v, '')).filter(Boolean).join(', '); return [s(org?.registered_address, ''), cityLine].filter(Boolean); }
function quoteDocumentStatus(quote: any) { return quote.approval_required && !quote.approved_at ? 'submitted' : 'approved'; }

type Row = { sku: string; product: string; hs: string; packGrams: string; unitsPerCase: number; moqCases: number; basis: string; origin: string; unitPrice: number; casePrice: number; total: number; note: string; shelf: string; lead: string; };
type TextOp = { x: number; y: number; t: string; size?: number; bold?: boolean; color?: string; right?: boolean };

function buildPdf(data: { quoteNo: string; org: any; buyer: any; market: string; destination: string; place: string; basis: string; currency: string; quoteDate: string; validUntil: string; terms: string; rows: Row[] }) {
  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const ops: string[] = [];
  const texts: TextOp[] = [];
  const box = (x: number, y: number, w: number, h: number, fill?: string, stroke?: string) => { if (fill) ops.push(`${rgb(fill)} rg ${x} ${y} ${w} ${h} re f`); if (stroke) ops.push(`${rgb(stroke)} RG ${x} ${y} ${w} ${h} re S`); };
  const line = (x1: number, y1: number, x2: number, y2: number, color = LINE, width = 0.7) => ops.push(`${rgb(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const txt = (x: number, y: number, t: string, size = 7, bold = false, color = INK, right = false) => texts.push({ x, y, t, size, bold, color, right });
  const total = data.rows.reduce((a, r) => a + r.total, 0);
  const leadSummary = Array.from(new Set(data.rows.map(r => r.lead))).slice(0, 2).join(', ') || 'Confirm per order';
  const originSummary = Array.from(new Set(data.rows.map(r => r.origin))).slice(0, 3).join(', ') || 'Confirm per SKU';
  const shelfSummary = Array.from(new Set(data.rows.map(r => r.shelf))).slice(0, 2).join(', ') || 'Available per SKU';
  const sellerAddress = addressLines(data.org);

  box(0, 0, 612, 792, '#ffffff');
  box(24, 724, 564, 44, '#ffffff', LINE);
  box(24, 724, 44, 44, NAVY); txt(36, 746, 'LOGO', 7, true, '#ffffff');
  txt(78, 750, c(data.org.legal_name ?? data.org.name, 32, 'SETU Groups LLC'), 10.5, true, NAVY);
  txt(78, 736, c(data.org.website, 42, 'https://www.setuflowcrm.com/'), 6.4, false, MUTED);
  txt(204, 752, 'SETU Flow - Client Price List', 15.2, true, NAVY);
  txt(204, 736, 'Pro Forma Quotation', 8.8, false, MUTED);
  box(474, 732, 104, 28, PANEL, LINE); txt(484, 750, data.quoteNo, 8.5, true, NAVY); txt(484, 739, `${data.quoteDate} · Valid ${data.validUntil}`, 5.7, false, MUTED);

  box(24, 612, 176, 92, PANEL, LINE); txt(36, 686, 'SELLER / EXPORTER', 6.5, true, BLUE); txt(36, 672, c(data.org.legal_name ?? data.org.name, 34), 8, true); txt(36, 658, c(sellerAddress[0], 38), 6.2, false, MUTED); txt(36, 648, c(sellerAddress[1], 38), 6.2, false, MUTED); txt(36, 632, c(data.org.contact_email, 36), 6.2, false, MUTED); txt(36, 622, `Tax ID: ${c(data.org.tax_id, 28)}`, 6.2, false, MUTED);
  box(216, 612, 176, 92, PANEL, LINE); txt(228, 686, 'BUYER / IMPORTER', 6.5, true, BLUE); txt(228, 672, c(data.buyer.company_name, 34, 'Unknown customer'), 8, true); txt(228, 658, c(data.buyer.contact_name, 35, ''), 6.2, false, MUTED); txt(228, 648, c(data.buyer.country, 35, data.destination), 6.2, false, MUTED); txt(228, 632, c(data.buyer.email, 36), 6.2, false, MUTED); txt(228, 622, c(data.buyer.phone, 36), 6.2, false, MUTED);
  box(408, 612, 180, 92, PANEL, LINE); [['Destination', data.destination], ['Market', data.market], ['Basis', `${data.basis} (Incoterms 2020)`], ['Named place', data.place], ['Currency', data.currency], ['Lead time', leadSummary]].forEach(([k, v], i) => { const yy = 688 - i * 12; txt(420, yy, k, 5.3, true, MUTED); txt(578, yy, c(v, 23), 5.7, false, INK, true); });
  box(24, 590, 564, 14, '#eef6ff', '#bfdbfe'); txt(36, 594, 'Taxes, duties and destination charges follow the agreed Incoterm. Unless included, buyer pays import duty, VAT/GST, clearance and destination handling.', 5.45, false, '#1e3a8a');

  const tableX = 18; const tableW = 576; let y = 560; const rowH = 21;
  const cols = [ ['#', 18, 'left'], ['SKU', 64, 'left'], ['Product', 100, 'left'], ['Pack (g)', 42, 'right'], ['Units/Case', 45, 'right'], ['MOQ', 44, 'center'], ['Basis', 36, 'center'], [`${data.currency}/Unit`, 60, 'right'], [`${data.currency}/Case`, 60, 'right'], [`Total (${data.currency})`, 80, 'right'] ] as const;
  box(tableX, y - 17, tableW, 20, '#e2e8f0', LINE);
  let x = tableX + 6;
  cols.forEach(([h, w, align]) => { const width = Number(w); const xPos = align === 'right' ? x + width - 4 : align === 'center' ? x + width / 2 - String(h).length * 1.05 : x; txt(xPos, y - 10, h, 4.7, true, NAVY, false); x += width; });
  y -= 23;
  data.rows.slice(0, 10).forEach((r, i) => {
    box(tableX, y - 15, tableW, rowH, i % 2 ? '#ffffff' : '#f8fafc', LINE); x = tableX + 6;
    const cells: Array<[string, number, 'left' | 'right' | 'center']> = [ [String(i + 1), 18, 'left'], [c(r.sku, 14), 64, 'left'], [c(r.product, 20), 100, 'left'], [r.packGrams, 42, 'right'], [String(r.unitsPerCase || '-'), 45, 'right'], [String(r.moqCases || '-'), 44, 'center'], [r.basis, 36, 'center'], [money(r.unitPrice, data.currency), 60, 'right'], [money(r.casePrice, data.currency), 60, 'right'], [money(r.total, data.currency), 80, 'right'] ];
    cells.forEach(([value, w, align]) => { const xPos = align === 'right' ? x + w - 4 : align === 'center' ? x + w / 2 - value.length * 1.15 : x; txt(xPos, y - 6, value, 5.15, i === 0 && (align === 'left' || value.includes(data.currency)), INK, false); x += w; }); y -= rowH;
  });
  line(tableX, y + 5, tableX + tableW, y + 5, NAVY, 1.1); txt(392, y - 7, 'Grand Total', 8.5, true, NAVY); txt(590, y - 7, money(total, data.currency), 9, true, NAVY, true);

  y -= 24;
  box(24, y - 68, 274, 68, PANEL, LINE); txt(36, y - 13, 'COMMERCIAL & COMPLIANCE', 7, true, NAVY); [`Country of origin: ${originSummary}`, `Shelf life: ${shelfSummary}`, 'Specs, ingredients and nutrition available on request.', 'HS codes are indicative and should be validated for destination market.'].forEach((l, i) => txt(36, y - 27 - i * 10, `- ${c(l, 72)}`, 5.7, false, MUTED));
  box(314, y - 68, 274, 68, PANEL, LINE); txt(326, y - 13, `FINANCIAL SUMMARY (${data.currency})`, 7, true, NAVY); [['Subtotal', money(total, data.currency)], ['Documentation / packaging', money(0, data.currency)], ['Freight / insurance', 'Not included unless stated'], ['Taxes / duties', 'Per Incoterm / buyer account']].forEach(([k, v], i) => { txt(326, y - 27 - i * 10, k, 5.8, false, MUTED); txt(578, y - 27 - i * 10, v, 5.8, false, INK, true); });
  y -= 82;
  box(24, y - 54, 564, 54, '#ffffff', LINE); txt(36, y - 13, 'TERMS & CONDITIONS', 7, true, NAVY); [`Quote valid until ${data.validUntil}.`, `Prices quoted on ${data.basis} basis from ${data.place}.`, 'Import duties, VAT/GST, customs clearance and destination handling are buyer account unless included.', 'Order confirmation is subject to agreed quantities, pack sizes, MOQs and specifications.', 'Prices may change before confirmation if cost, freight, policy or currency inputs change.'].forEach((l, i) => txt(36, y - 25 - i * 8.5, c(l, 138), 5.2, false, MUTED));

  const stream = [...ops, 'BT', ...texts.map(t => `${rgb(t.color ?? INK)} rg /F${t.bold ? 'B' : 'R'} ${t.size ?? 7} Tf ${t.x} ${t.y} Td (${esc(t.t)}) Tj`), 'ET'].join('\n');
  const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  const page = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /FR ${font} 0 R /FB ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`);
  const pages = add(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`);
  objects[page - 1] = objects[page - 1].replace('/Parent 0 0 R', `/Parent ${pages} 0 R`);
  const catalog = add(`<< /Type /Catalog /Pages ${pages} 0 R >>`);
  let pdf = '%PDF-1.4\n'; const offsets = [0]; objects.forEach((obj, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; }); const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer << /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

export async function GET(_request: Request, { params }: { params: { quoteId: string } }) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  const workspace = await requireWorkspace(); const organizationId = workspace.organization?.id; if (!organizationId) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });
  const db = (await createClient()) as any; const { quoteId } = params;
  const { data: quote, error } = await db.from('quotes').select('id, quote_number, lead_id, currency, display_currency, updated_at, created_at, valid_until, pricing_basis, destination_port, market_id, country_id, freight_profile_id, approval_required, approved_at, notes_customer').eq('organization_id', organizationId).eq('id', quoteId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); if (!quote?.id) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
  const { data: leadRow } = await db.from('leads').select('id, company_name, contact_name, email, phone, country').eq('organization_id', organizationId).eq('id', quote.lead_id).maybeSingle();
  const countryPromise = quote.country_id ? db.from('countries').select('id, name, market_id, default_port_of_loading').eq('organization_id', organizationId).eq('id', quote.country_id).maybeSingle() : leadRow?.country ? db.from('countries').select('id, name, market_id, default_port_of_loading').eq('organization_id', organizationId).ilike('name', leadRow.country).maybeSingle() : Promise.resolve({ data: null });
  const [{ data: items }, { data: org }, { data: country }, { data: freight }] = await Promise.all([
    db.from('quote_line_items').select('id, product_id, product_variant_id, quantity, unit_price, catalog_price_amount, is_price_overridden, override_reason, notes').eq('quote_id', quote.id).order('created_at', { ascending: true }),
    db.from('organizations').select('id, name, legal_name, logo_url, registered_address, city, postal_code, headquarters_country, website, contact_email, tax_id, quote_terms_conditions, default_currency').eq('id', organizationId).maybeSingle(),
    countryPromise,
    quote.freight_profile_id ? db.from('freight_profiles').select('id, destination_port, notes').eq('organization_id', organizationId).eq('id', quote.freight_profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const marketId = quote.market_id ?? country?.market_id ?? null; const { data: market } = marketId ? await db.from('markets').select('id, name').eq('organization_id', organizationId).eq('id', marketId).maybeSingle() : { data: null };
  const lines = (items ?? []) as any[]; const productIds = Array.from(new Set(lines.map(l => l.product_id).filter(Boolean)));
  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length ? db.from('products').select('id, name, sku, sku_code, hsn_code, category_id').eq('organization_id', organizationId).in('id', productIds) : Promise.resolve({ data: [] }),
    productIds.length ? db.from('product_variants').select('id, product_id, name, sku_code, hsn_code, country_of_origin, pack_size_value, pack_size_unit, pack_label, units_per_case, moq_cases, moq_kg, pricing_mode_default, shipment_notes, lead_time_days, shelf_life_months').in('product_id', productIds) : Promise.resolve({ data: [] }),
  ]);
  const productMap = new Map((products ?? []).map((p: any) => [p.id, p])); const variantsByProduct = new Map<string, any[]>(); for (const v of variants ?? []) { const list = variantsByProduct.get(v.product_id) ?? []; list.push(v); variantsByProduct.set(v.product_id, list); }
  const categoryIds = Array.from(new Set((products ?? []).map((p: any) => p.category_id).filter(Boolean))); const { data: categories } = categoryIds.length ? await db.from('product_categories').select('id, name, default_lead_time_days, default_shelf_life_months, default_country_of_origin, default_shipment_notes').eq('organization_id', organizationId).in('id', categoryIds) : { data: [] }; const categoryMap = new Map((categories ?? []).map((cat: any) => [cat.id, cat]));
  const currency = String(quote.display_currency ?? quote.currency ?? org?.default_currency ?? 'USD').toUpperCase(); const quoteBasis = basis(quote.pricing_basis);
  const rows: Row[] = lines.map((line: any) => {
    const product: any = productMap.get(line.product_id) ?? {}; const variantsForProduct = variantsByProduct.get(line.product_id) ?? []; const variant: any = variantsForProduct.find((v: any) => v.id === line.product_variant_id) ?? variantsForProduct[0] ?? {}; const category: any = categoryMap.get(product.category_id) ?? {};
    const unitsPerCase = inferredUnitsPerCase(product, variant); const moqCases = inferredMoqCases(product, variant, line); const casePrice = n(line.unit_price ?? line.catalog_price_amount); const unitPrice = unitsPerCase > 1 ? casePrice / unitsPerCase : casePrice;
    return { sku: s(variant.sku_code ?? product.sku_code ?? product.sku), product: s(product.name ?? variant.name, 'Catalog line'), hs: s(variant.hsn_code ?? product.hsn_code, 'TBC'), packGrams: packGrams(variant, product), unitsPerCase, moqCases, basis: quoteBasis, origin: s(variant.country_of_origin ?? category.default_country_of_origin, 'Confirm per SKU'), unitPrice, casePrice, total: moqCases * casePrice, note: s(line.override_reason ?? line.notes, '-'), shelf: shelf(variant.shelf_life_months ?? category.default_shelf_life_months), lead: lead(variant.lead_time_days ?? category.default_lead_time_days) };
  });
  const place = s(quote.destination_port ?? freight?.destination_port ?? country?.default_port_of_loading, 'Confirm port/place before sending');
  const bytes = buildPdf({ quoteNo: `Quote ${quote.quote_number ?? quote.id.slice(0, 8)}`, org: org ?? { name: workspace.organization?.name }, buyer: leadRow ?? {}, market: s(market?.name), destination: s(country?.name ?? leadRow?.country), place, basis: quoteBasis, currency, quoteDate: d(quote.updated_at ?? quote.created_at), validUntil: d(quote.valid_until), terms: s(org?.quote_terms_conditions ?? quote.notes_customer, 'Prices are subject to validity, Incoterms basis, final order confirmation, agreed payment terms, and buyer destination charges unless included.'), rows });
  await db.from('documents').upsert({ organization_id: organizationId, related_entity: 'quote', related_id: quote.id, file_name: `quote-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf`, file_url: `/api/quotes/${quote.id}/pdf`, doc_type: 'quote_pdf', uploaded_by: workspace.user?.id ?? null, uploaded_at: quote.updated_at ?? quote.created_at ?? new Date().toISOString(), version: 1, status: quoteDocumentStatus(quote), linked_quote_id: quote.id }, { onConflict: 'organization_id,related_entity,related_id,file_name' }).then(() => null);
  return new Response(new Uint8Array(bytes), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="quote-${quote.quote_number ?? quote.id.slice(0, 8)}.pdf"`, 'Cache-Control': 'no-store' } });
}
