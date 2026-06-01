import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';
import { buildOrderDocumentPdf, type OrderPdfLine } from '@/lib/orders/order-document-pdf';

function safeId(value: string) {
  return String(value ?? '').slice(0, 8);
}

export async function GET(_request: Request, { params }: { params: { contractId: string } }) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });

  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });

  const db = (await createClient()) as any;
  const { contractId } = params;

  const { data: contract, error: contractError } = await db
    .from('contracts')
    .select('id, quote_id, signed_at, commercial_lock_state, pricing_basis, quote_currency, execution_state, status, created_at')
    .eq('organization_id', organizationId)
    .eq('id', contractId)
    .maybeSingle();

  if (contractError) return NextResponse.json({ error: contractError.message }, { status: 500 });
  if (!contract?.id) return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });

  const [{ data: quote }, { data: org }] = await Promise.all([
    db
      .from('quotes')
      .select('id, lead_id, currency, display_currency, pricing_basis, updated_at, created_at')
      .eq('organization_id', organizationId)
      .eq('id', contract.quote_id)
      .maybeSingle(),
    db
      .from('organizations')
      .select('id, name, legal_name, registered_address, city, postal_code, headquarters_country, website, contact_email, tax_id, quote_terms_conditions, order_terms_conditions')
      .eq('id', organizationId)
      .maybeSingle(),
  ]);

  const { data: lead } = quote?.lead_id
    ? await db
      .from('leads')
      .select('id, company_name, contact_name, country')
      .eq('organization_id', organizationId)
      .eq('id', quote.lead_id)
      .maybeSingle()
    : { data: null };

  const { data: lineRows } = await db
    .from('contract_line_items')
    .select('id, product_id, product_variant_id, quantity, unit_price, currency, notes')
    .eq('contract_id', contract.id)
    .order('id', { ascending: true });

  const linesRaw = Array.isArray(lineRows) ? lineRows : [];
  const productIds = Array.from(new Set(linesRaw.map((line: any) => line.product_id).filter(Boolean)));
  const variantIds = Array.from(new Set(linesRaw.map((line: any) => line.product_variant_id).filter(Boolean)));

  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length
      ? db.from('products').select('id, name, sku, sku_code').eq('organization_id', organizationId).in('id', productIds)
      : Promise.resolve({ data: [] }),
    variantIds.length
      ? db.from('product_variants').select('id, name, pack_label, sku_code').in('id', variantIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map((products ?? []).map((item: any) => [item.id, item]));
  const variantMap = new Map((variants ?? []).map((item: any) => [item.id, item]));
  const lines: OrderPdfLine[] = linesRaw.map((line: any) => {
    const product: any = productMap.get(line.product_id) ?? {};
    const variant: any = variantMap.get(line.product_variant_id) ?? {};
    return {
      productName: product.name ?? variant.name ?? 'Order line',
      variantName: variant.pack_label ?? variant.name ?? null,
      sku: variant.sku_code ?? product.sku_code ?? product.sku ?? null,
      quantity: Number(line.quantity ?? 0),
      unitPrice: line.unit_price,
      currency: line.currency ?? contract.quote_currency ?? quote?.display_currency ?? quote?.currency,
      notes: line.notes,
    };
  });

  const filename = `invoice-${safeId(contract.id)}.pdf`;
  const bytes = buildOrderDocumentPdf({
    documentType: 'invoice',
    documentNo: `Invoice ${safeId(contract.id)}`,
    companyName: lead?.company_name ?? 'Customer',
    contactName: lead?.contact_name ?? null,
    country: lead?.country ?? null,
    quoteId: quote?.id ?? contract.quote_id,
    contractId: contract.id,
    quoteCurrency: contract.quote_currency ?? quote?.display_currency ?? quote?.currency,
    pricingBasis: contract.pricing_basis ?? quote?.pricing_basis,
    signedAt: contract.signed_at,
    createdAt: contract.created_at ?? quote?.created_at ?? new Date().toISOString(),
    dueLabel: 'Payment per agreed terms',
    paymentStatus: 'Tracking pending',
    organization: org ?? null,
    lines,
  });

  await db.from('documents').upsert({
    organization_id: organizationId,
    related_entity: 'contract',
    related_id: contract.id,
    file_name: filename,
    file_url: `/api/orders/${contract.id}/invoice/pdf`,
    doc_type: 'invoice',
    uploaded_by: workspace.user?.id ?? null,
    version: 1,
    status: 'ready',
  }, { onConflict: 'organization_id,related_entity,related_id,file_name' }).then(() => null);

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
