import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireWorkspace } from '@/lib/workspace/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PdfRequestBody = {
  sendId?: string;
  shareToken?: string;
};

type OrderDocumentSendRow = {
  id: string;
  organization_id: string;
  order_id: string;
  order_document_id: string;
  share_token: string;
  share_url: string | null;
  document_type: string | null;
  order_documents: { pdf_storage_path: string | null } | null;
};

type OrderDocumentRow = {
  id: string;
  organization_id: string;
  order_id: string;
  document_id: string | null;
  document_type: string | null;
  stage_key: string | null;
  status: string | null;
  version_no: number | null;
  pdf_storage_path: string | null;
  orders: { order_number: string | null; legacy_contract_id: string | null; lead_id: string | null; source_quote_id: string | null } | null;
};

function buildOrigin(request: NextRequest) {
  const envOrigin = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (envOrigin) return envOrigin;
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : 'https://www.setuflowcrm.com';
}

function normalize(value?: string | null) {
  return String(value ?? '').trim();
}

function isExternalOrRoute(value?: string | null) {
  const path = normalize(value);
  return /^https?:\/\//i.test(path) || path.startsWith('/');
}

function safeDocumentLabel(value?: string | null) {
  const type = normalize(value).toLowerCase();
  if (type.includes('packing')) return 'packing-sheet';
  if (type.includes('delivery')) return 'delivery-note';
  if (type.includes('freight')) return 'freight-request';
  if (type.includes('invoice')) return 'invoice';
  if (type.includes('order')) return 'order-confirmation';
  return type.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'order-document';
}

async function loadChromium() {
  const chromium = await import('@sparticuz/chromium');
  return chromium.default;
}

async function loadPuppeteer() {
  const puppeteer = await import('puppeteer-core');
  return puppeteer.default;
}

async function createSignedOrderDocumentUrl(db: NonNullable<ReturnType<typeof createServiceRoleClient>>, storagePath: string) {
  if (isExternalOrRoute(storagePath)) return storagePath;

  const { data: signed, error: signedError } = await db.storage
    .from('order-documents')
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError || !signed?.signedUrl) {
    throw new Error(signedError?.message ?? 'Could not create signed URL.');
  }

  return signed.signedUrl;
}

async function renderAndStorePdf(params: {
  db: NonNullable<ReturnType<typeof createServiceRoleClient>>;
  origin: string;
  organizationId: string;
  orderId: string;
  orderDocumentId: string;
  sendId: string;
  shareToken: string;
  documentType?: string | null;
}) {
  const chromium = await loadChromium();
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 1 });
    const previewUrl = `${params.origin}/order-documents/preview/${encodeURIComponent(params.shareToken)}`;
    await page.goto(previewUrl, { waitUntil: 'networkidle0', timeout: 45_000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
    });

    const date = new Date().toISOString().slice(0, 10);
    const storagePath = `${params.organizationId}/${params.orderId}/${params.orderDocumentId}/${date}-${params.sendId}-${safeDocumentLabel(params.documentType)}.pdf`;

    const upload = await params.db.storage
      .from('order-documents')
      .upload(storagePath, pdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (upload.error) throw new Error(upload.error.message);

    await params.db
      .from('order_documents')
      .update({ pdf_storage_path: storagePath, updated_at: new Date().toISOString() })
      .eq('id', params.orderDocumentId)
      .eq('organization_id', params.organizationId);

    return storagePath;
  } finally {
    await browser.close();
  }
}

async function generateFromSend(request: NextRequest, sendRow: OrderDocumentSendRow) {
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ ok: false, error: 'Server configuration error.' }, { status: 500 });

  const existingPath = sendRow.order_documents?.pdf_storage_path;
  if (existingPath) {
    const signedUrl = await createSignedOrderDocumentUrl(db, existingPath);
    return NextResponse.json({ ok: true, storagePath: existingPath, signedUrl, reused: true });
  }

  try {
    const storagePath = await renderAndStorePdf({
      db,
      origin: buildOrigin(request),
      organizationId: sendRow.organization_id,
      orderId: sendRow.order_id,
      orderDocumentId: sendRow.order_document_id,
      sendId: sendRow.id,
      shareToken: sendRow.share_token,
      documentType: sendRow.document_type,
    });
    const signedUrl = await createSignedOrderDocumentUrl(db, storagePath);
    return NextResponse.json({ ok: true, storagePath, signedUrl, reused: false });
  } catch (pdfError) {
    return NextResponse.json({ ok: false, error: pdfError instanceof Error ? pdfError.message : 'Could not render order document PDF.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: PdfRequestBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sendId = String(body.sendId ?? '').trim();
  const shareToken = String(body.shareToken ?? '').trim();
  if (!sendId && !shareToken) {
    return NextResponse.json({ ok: false, error: 'sendId or shareToken is required.' }, { status: 400 });
  }

  const db = createServiceRoleClient();
  if (!db) {
    return NextResponse.json({ ok: false, error: 'Server configuration error.' }, { status: 500 });
  }

  const query = db
    .from('order_document_sends')
    .select('id, organization_id, order_id, order_document_id, share_token, share_url, document_type, order_documents(pdf_storage_path)')
    .limit(1);

  const { data: sendRow, error } = sendId
    ? await query.eq('id', sendId).returns<OrderDocumentSendRow[]>().maybeSingle()
    : await query.eq('share_token', shareToken).returns<OrderDocumentSendRow[]>().maybeSingle();

  if (error || !sendRow?.id || !sendRow?.share_token) {
    return NextResponse.json({ ok: false, error: 'Tracked order document send was not found.' }, { status: 404 });
  }

  return generateFromSend(request, sendRow);
}

export async function GET(request: NextRequest) {
  const orderDocumentId = normalize(request.nextUrl.searchParams.get('orderDocumentId') ?? request.nextUrl.searchParams.get('id'));

  if (!orderDocumentId) {
    return NextResponse.json({
      ok: true,
      service: 'setuflow-order-document-pdf',
      renderer: 'puppeteer-core + @sparticuz/chromium',
      storageBucket: 'order-documents',
      fallback: 'browser-print',
      redirectContract: '/api/order-documents/pdf?orderDocumentId={order_document_id}',
    });
  }

  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return NextResponse.json({ ok: false, error: 'Workspace not found.' }, { status: 403 });

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ ok: false, error: 'Server configuration error.' }, { status: 500 });

  const { data: orderDocument, error: orderDocumentError } = await db
    .from('order_documents')
    .select('id, organization_id, order_id, document_id, document_type, stage_key, status, version_no, pdf_storage_path, orders(order_number, legacy_contract_id, lead_id, source_quote_id)')
    .eq('id', orderDocumentId)
    .eq('organization_id', organizationId)
    .returns<OrderDocumentRow[]>()
    .maybeSingle();

  if (orderDocumentError) return NextResponse.json({ ok: false, error: orderDocumentError.message }, { status: 500 });
  if (!orderDocument?.id) return NextResponse.json({ ok: false, error: 'Order document was not found.' }, { status: 404 });

  if (orderDocument.pdf_storage_path) {
    try {
      const signedUrl = await createSignedOrderDocumentUrl(db, orderDocument.pdf_storage_path);
      return NextResponse.redirect(signedUrl, 302);
    } catch (storageError) {
      return NextResponse.json({ ok: false, error: storageError instanceof Error ? storageError.message : 'Could not open stored PDF.' }, { status: 500 });
    }
  }

  const { data: sendRow, error: sendError } = await db
    .from('order_document_sends')
    .select('id, organization_id, order_id, order_document_id, share_token, share_url, document_type, order_documents(pdf_storage_path)')
    .eq('organization_id', organizationId)
    .eq('order_document_id', orderDocument.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .returns<OrderDocumentSendRow[]>()
    .maybeSingle();

  if (sendError) return NextResponse.json({ ok: false, error: sendError.message }, { status: 500 });
  if (!sendRow?.share_token) {
    return NextResponse.json({ ok: false, error: 'No tracked preview/send exists for this order document yet.' }, { status: 404 });
  }

  try {
    const storagePath = await renderAndStorePdf({
      db,
      origin: buildOrigin(request),
      organizationId,
      orderId: orderDocument.order_id,
      orderDocumentId: orderDocument.id,
      sendId: sendRow.id,
      shareToken: sendRow.share_token,
      documentType: orderDocument.document_type ?? sendRow.document_type,
    });
    const signedUrl = await createSignedOrderDocumentUrl(db, storagePath);
    return NextResponse.redirect(signedUrl, 302);
  } catch (pdfError) {
    return NextResponse.json({ ok: false, error: pdfError instanceof Error ? pdfError.message : 'Could not render order document PDF.' }, { status: 500 });
  }
}
