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

function buildSimplePdf(lines: string[]) {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const textOps: string[] = ['BT', '72 760 Td'];
  lines.slice(0, 42).forEach((line, index) => {
    const size = index === 0 ? 18 : index < 4 ? 11 : 9;
    const font = index === 0 ? boldFontId : fontId;
    textOps.push(`/${index === 0 ? 'F2' : 'F1'} ${size} Tf`);
    if (index > 0) textOps.push('0 -18 Td');
    textOps.push(`(${pdfEscape(line)}) Tj`);
  });
  textOps.push('ET');
  const content = textOps.join('\n');
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
  const productMap = new Map((products ?? []).map((product: any) => [product.id, product]));
  const currency = String(quote.display_currency ?? quote.currency ?? 'USD');
  const rows = (lineItems ?? []).map((line: any) => {
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
  const subtotal = rows.reduce((sum, row) => sum + row.total, 0);
  const pdfLines = [
    `SETU Flow Quote ${quote.quote_number ?? quote.id.slice(0, 8)}`,
    `Customer: ${lead?.company_name ?? 'Unknown customer'}`,
    `Contact: ${lead?.contact_name ?? '-'}  ${lead?.email ?? ''}`,
    `Status: ${quote.status ?? 'draft'}  Currency: ${currency}  Updated: ${quote.updated_at ? new Date(quote.updated_at).toLocaleDateString('en-US') : '-'}`,
    `Approval: ${quote.approval_required && !quote.approved_at ? 'Pending approval' : 'Cleared'}`,
    ' ',
    'Line items',
    ...rows.flatMap((row, index) => [
      `${index + 1}. ${row.name}`,
      `   Qty ${row.qty} x ${money(row.unit, currency)} = ${money(row.total, currency)}${row.override ? '  (quote-only adjusted)' : ''}`,
      row.reason ? `   Note: ${row.reason}` : '',
    ].filter(Boolean)),
    ' ',
    `Grand total: ${money(subtotal, currency)}`,
    ' ',
    'Generated by SETU Flow. Review commercial terms and delivery method before sending.',
  ];
  const pdf = buildSimplePdf(pdfLines);

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
