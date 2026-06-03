import { NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { buildOrderDocumentPdf, type OrderPdfLine } from '@/lib/orders/order-document-pdf';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

type PreviewPayload = {
  send?: Row;
  organization?: Row;
  order?: Row;
  lead?: Row;
  lines?: Row[];
};

type PreviewRpcResult = {
  data: PreviewPayload | null;
  error: { message?: string } | null;
};

function text(value: unknown, fallback = '') {
  const trimmed = String(value ?? '').trim();
  return trimmed || fallback;
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function documentTitle(type: string, orderType: unknown) {
  const exportMode = String(orderType ?? '').toLowerCase() === 'export' || ['proforma_invoice', 'packing_list', 'freight_request'].includes(type);
  if (type === 'proforma_invoice') return 'Export Proforma Invoice';
  if (type === 'packing_sheet') return exportMode ? 'Export Packing Sheet' : 'Regional Packing / Picklist / QC Sheet';
  if (type === 'packing_list') return 'Export Packing List';
  if (type === 'delivery_note') return exportMode ? 'Export Delivery Note' : 'Regional Delivery Note';
  if (type === 'dispatch_invoice') return exportMode ? 'Export Commercial / Dispatch Invoice' : 'Regional Tax / Dispatch Invoice';
  return exportMode ? 'Export Order Confirmation' : 'Regional Order Confirmation';
}

function documentQuantity(line: Row, documentType: string) {
  if (['packing_sheet', 'packing_list'].includes(documentType)) return num(line.packed_quantity ?? line.ordered_quantity ?? line.quoted_quantity);
  if (documentType === 'delivery_note' || documentType === 'dispatch_invoice') return num(line.dispatched_quantity ?? line.loaded_quantity ?? line.packed_quantity ?? line.ordered_quantity ?? line.quoted_quantity);
  return num(line.ordered_quantity ?? line.quoted_quantity);
}

function filenamePart(value: unknown) {
  return text(value, 'document').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'document';
}

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const token = text(params.token);
  if (!token) return NextResponse.json({ error: 'Preview token is required.' }, { status: 400 });

  const db = await createClient();
  const { data: preview, error } = await db.rpc('get_order_document_preview_by_token', { p_share_token: token }) as unknown as PreviewRpcResult;
  if (error) return NextResponse.json({ error: error.message ?? 'Could not load preview data.' }, { status: 500 });
  if (!preview?.send) return NextResponse.json({ error: 'Tracked document preview not found.' }, { status: 404 });

  const send = preview.send ?? {};
  const order = preview.order ?? {};
  const lead = preview.lead ?? {};
  const organization = preview.organization ?? {};
  const sourceLines = Array.isArray(preview.lines) ? preview.lines : [];
  const documentType = text(send.document_type, 'order_confirmation').toLowerCase();
  if (sourceLines.length === 0) {
    return NextResponse.json({ error: 'No order line items found for this tracked document. Add actual order lines before generating PDF.' }, { status: 422 });
  }

  const currency = text(order.currency, 'USD');
  const lines: OrderPdfLine[] = sourceLines.map((line) => ({
    productName: text(line.product_name_snapshot, 'Order line'),
    variantName: text(line.variant_name_snapshot, '') || null,
    sku: text(line.sku_code ?? line.hsn_code ?? line.hs_code, '') || null,
    quantity: documentQuantity(line, documentType),
    unitPrice: num(line.unit_price),
    currency,
    notes: text(line.change_reason, '') || null,
  }));

  const title = documentTitle(documentType, order.order_type);
  const documentNo = `${text(order.order_number, 'ORD')}-${text(send.id, token).slice(0, 8)}`;
  const bytes = buildOrderDocumentPdf({
    documentType: documentType === 'dispatch_invoice' ? 'invoice' : 'order-confirmation',
    documentNo: `${title} ${documentNo}`,
    companyName: text(lead.company_name, 'Buyer pending'),
    contactName: text(lead.contact_name, '') || null,
    country: text(lead.country ?? order.destination_place, '') || null,
    quoteId: text(order.source_quote_id, 'Tracked order document'),
    contractId: text(order.legacy_contract_id ?? order.id, 'Tracked order'),
    quoteCurrency: currency,
    pricingBasis: text(order.pricing_basis ?? order.incoterm, 'As agreed'),
    createdAt: text(send.sent_at, '') || new Date().toISOString(),
    dueLabel: text(order.payment_terms, 'Commercial terms from order'),
    paymentStatus: text(order.payment_status, 'Tracking pending'),
    organization: {
      name: text(organization.name ?? organization.display_name, 'SETU Flow CRM'),
      legal_name: text(organization.legal_name, '') || null,
      registered_address: text(organization.address ?? organization.billing_address, '') || null,
      city: null,
      postal_code: null,
      headquarters_country: null,
      website: text(organization.website, '') || null,
      contact_email: text(organization.contact_email, '') || null,
      tax_id: text(organization.tax_id, '') || null,
      quote_terms_conditions: null,
      order_terms_conditions: text(order.payment_terms, '') || null,
    },
    lines: lines.map((line) => ({ ...line, notes: `${title}${line.notes ? ` - ${line.notes}` : ''}` })),
  });

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filenamePart(title)}-${filenamePart(documentNo)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
