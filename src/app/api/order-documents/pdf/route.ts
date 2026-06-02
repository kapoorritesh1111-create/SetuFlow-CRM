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
  document_type: string | null;
  stage_key: string | null;
  status: string | null;
  pdf_storage_path: string | null;
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

function previewUrlFor(request: NextRequest, sendRow: Pick<OrderDocumentSendRow, 'share_token' | 'share_url'>) {
  return normalize(sendRow.share_url) || `${buildOrigin(request)}/order-documents/preview/${encodeURIComponent(sendRow.share_token)}`;
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

async function loadSendRow(db: NonNullable<ReturnType<typeof createServiceRoleClient>>, sendId: string, shareToken: string) {
  const query = db
    .from('order_document_sends')
    .select('id, organization_id, order_id, order_document_id, share_token, share_url, document_type, order_documents(pdf_storage_path)')
    .limit(1);

  return sendId
    ? query.eq('id', sendId).returns<OrderDocumentSendRow[]>().maybeSingle()
    : query.eq('share_token', shareToken).returns<OrderDocumentSendRow[]>().maybeSingle();
}

async function respondForSend(request: NextRequest, sendRow: OrderDocumentSendRow) {
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ ok: false, error: 'Server configuration error.' }, { status: 500 });

  const existingPath = sendRow.order_documents?.pdf_storage_path;
  if (existingPath) {
    const signedUrl = await createSignedOrderDocumentUrl(db, existingPath);
    return NextResponse.json({ ok: true, pdfAvailable: true, storagePath: existingPath, signedUrl, reused: true });
  }

  return NextResponse.json({
    ok: true,
    pdfAvailable: false,
    previewUrl: previewUrlFor(request, sendRow),
    message: 'No stored PDF exists yet. Use the tracked workflow preview instead.',
  });
}

export async function POST(request: NextRequest) {
  let body: PdfRequestBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sendId = normalize(body.sendId);
  const shareToken = normalize(body.shareToken);
  if (!sendId && !shareToken) {
    return NextResponse.json({ ok: false, error: 'sendId or shareToken is required.' }, { status: 400 });
  }

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ ok: false, error: 'Server configuration error.' }, { status: 500 });

  const { data: sendRow, error } = await loadSendRow(db, sendId, shareToken);
  if (error || !sendRow?.id || !sendRow?.share_token) {
    return NextResponse.json({ ok: false, error: 'Tracked order document send was not found.' }, { status: 404 });
  }

  return respondForSend(request, sendRow);
}

export async function GET(request: NextRequest) {
  const orderDocumentId = normalize(request.nextUrl.searchParams.get('orderDocumentId') ?? request.nextUrl.searchParams.get('id'));

  if (!orderDocumentId) {
    return NextResponse.json({
      ok: true,
      service: 'setuflow-order-document-pdf',
      storageBucket: 'order-documents',
      redirectContract: '/api/order-documents/pdf?orderDocumentId={order_document_id}',
      fallback: 'tracked-preview-when-no-stored-pdf',
    });
  }

  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;
  if (!organizationId) return NextResponse.json({ ok: false, error: 'Workspace not found.' }, { status: 403 });

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ ok: false, error: 'Server configuration error.' }, { status: 500 });

  const { data: orderDocument, error: orderDocumentError } = await db
    .from('order_documents')
    .select('id, organization_id, order_id, document_type, stage_key, status, pdf_storage_path')
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

  return NextResponse.redirect(previewUrlFor(request, sendRow), 302);
}
