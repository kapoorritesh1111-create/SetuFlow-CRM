import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';
import { buildOrderDocumentPdf, type OrderPdfLine } from '@/lib/orders/order-document-pdf';
import { loadOrganizationLogo } from '@/lib/pdf/organization-logo';
import { recordGeneratedDocument } from '@/lib/documents/generated-document-registry';
import { writeAuditLog } from '@/lib/auditLog';

function safeId(value: string) { return String(value ?? '').slice(0, 8); }

export async function GET(_request: Request, { params }: { params: { contractId: string } }) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });

  const db = (await createClient()) as any;
  const { contractId } = params;
  const { data: contract, error: contractError } = await db.from('contracts').select('id, quote_id, lead_id, signed_at, commercial_lock_state, pricing_basis, quote_currency, execution_state, status').eq('organization_id', organizationId).eq('id', contractId).maybeSingle();
  if (contractError) return NextResponse.json({ error: contractError.message }, { status: 500 });
  if (!contract?.id) return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });

  const [{ data: quote }, { data: org }] = await Promise.all([
    db.from('quotes').select('id, quote_number, lead_id, currency, display_currency, pricing_basis, updated_at, created_at').eq('organization_id', organizationId).eq('id', contract.quote_id).maybeSingle(),
    db.from('organizations').select('id, name, legal_name, logo_storage_path, registered_address, city, postal_code, headquarters_country, website, contact_email, tax_id, quote_terms_conditions, order_terms_conditions').eq('id', organizationId).maybeSingle(),
  ]);
  const { data: lead } = quote?.lead_id ? await db.from('leads').select('id, company_name, contact_name, country').eq('organization_id', organizationId).eq('id', quote.lead_id).maybeSingle() : { data: null };
  const { data: lineRows, error: lineRowsError } = await db.from('contract_line_items').select('id, product_id, product_variant_id, quantity, unit_price, currency, notes').eq('contract_id', contract.id).order('id', { ascending: true });
  if (lineRowsError) return NextResponse.json({ error: lineRowsError.message }, { status: 500 });
  const linesRaw = Array.isArray(lineRows) ? lineRows : [];
  if (!linesRaw.length) return NextResponse.json({ error: 'No line items found for this order. Add product lines before generating the order confirmation PDF.' }, { status: 422 });

  const productIds = Array.from(new Set(linesRaw.map((line: any) => line.product_id).filter(Boolean)));
  const variantIds = Array.from(new Set(linesRaw.map((line: any) => line.product_variant_id).filter(Boolean)));
  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length ? db.from('products').select('id, name, sku, sku_code').eq('organization_id', organizationId).in('id', productIds) : Promise.resolve({ data: [] }),
    variantIds.length ? db.from('product_variants').select('id, name, pack_label, sku_code').in('id', variantIds) : Promise.resolve({ data: [] }),
  ]);
  const productMap = new Map((products ?? []).map((item: any) => [item.id, item]));
  const variantMap = new Map((variants ?? []).map((item: any) => [item.id, item]));
  const lines: OrderPdfLine[] = linesRaw.map((line: any) => {
    const product: any = productMap.get(line.product_id) ?? {};
    const variant: any = variantMap.get(line.product_variant_id) ?? {};
    return { productName: product.name ?? variant.name ?? 'Order line', variantName: variant.pack_label ?? variant.name ?? null, sku: variant.sku_code ?? product.sku_code ?? product.sku ?? null, quantity: Number(line.quantity ?? 0), unitPrice: line.unit_price, currency: line.currency ?? contract.quote_currency ?? quote?.display_currency ?? quote?.currency, notes: line.notes };
  });
  const logoImage = await loadOrganizationLogo(db, organizationId, org);
  const businessNumber = String(quote?.quote_number ?? '').trim() || safeId(contract.id).toUpperCase();
  const filename = `order-confirmation-${businessNumber}.pdf`;
  const bytes = buildOrderDocumentPdf({
    documentType: 'order-confirmation',
    documentNo: `Order Confirmation ${businessNumber}`,
    companyName: lead?.company_name ?? 'Customer',
    contactName: lead?.contact_name ?? null,
    country: lead?.country ?? null,
    quoteId: String(quote?.quote_number ?? '').trim() || `Quote ${safeId(quote?.id ?? contract.quote_id)}`,
    contractId: contract.id,
    quoteCurrency: contract.quote_currency ?? quote?.display_currency ?? quote?.currency,
    pricingBasis: contract.pricing_basis ?? quote?.pricing_basis,
    signedAt: contract.signed_at,
    createdAt: quote?.updated_at ?? quote?.created_at,
    dueLabel: 'Commercial terms from organization profile',
    paymentStatus: 'Tracking pending',
    organization: org ?? null,
    logoImage,
    lines,
  });

  const now = new Date().toISOString();
  await recordGeneratedDocument(db, {
    organizationId,
    relatedEntity: 'contract',
    relatedId: contract.id,
    fileName: filename,
    fileUrl: `/api/orders/${contract.id}/order-confirmation/pdf`,
    docType: 'order_confirmation',
    uploadedBy: workspace.user?.id ?? null,
    uploadedAt: now,
    version: 1,
    status: 'approved',
  });

  if (['draft', 'quote_accepted', 'accepted', '', null].includes(String(contract.execution_state ?? '').toLowerCase())) {
    await db.from('contracts').update({ execution_state: 'confirmed', updated_at: now }).eq('organization_id', organizationId).eq('id', contract.id).then(() => null);
    await writeAuditLog({ organizationId, action: 'contract_progressed', entityType: 'contract', entityId: contract.id, actorUserId: workspace.user?.id ?? null, payload: { previous: { execution_state: contract.execution_state ?? 'draft' }, new: { execution_state: 'confirmed' }, metadata: { source: 'order_confirmation_pdf_generated', quote_id: contract.quote_id, lead_id: contract.lead_id } } });
  }

  return new Response(new Uint8Array(bytes), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"`, 'Cache-Control': 'no-store' } });
}
