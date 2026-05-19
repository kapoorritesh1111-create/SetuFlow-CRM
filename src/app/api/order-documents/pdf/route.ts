import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PdfRequestBody = {
  sendId?: string;
  shareToken?: string;
};

function buildOrigin(request: NextRequest) {
  const envOrigin = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (envOrigin) return envOrigin;
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return host ? `${proto}://${host}` : 'https://www.setuflowcrm.com';
}

async function loadChromium() {
  const chromium = await import('@sparticuz/chromium');
  return chromium.default;
}

async function loadPuppeteer() {
  const puppeteer = await import('puppeteer-core');
  return puppeteer.default;
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
  const query = db
    .from('order_document_sends')
    .select('id, organization_id, order_id, order_document_id, share_token, share_url, document_type, order_documents(pdf_storage_path)')
    .limit(1);

  const { data: sendRow, error } = sendId
    ? await query.eq('id', sendId).maybeSingle()
    : await query.eq('share_token', shareToken).maybeSingle();

  if (error || !sendRow?.id || !sendRow?.share_token) {
    return NextResponse.json({ ok: false, error: 'Tracked order document send was not found.' }, { status: 404 });
  }

  const existingPath = sendRow.order_documents?.pdf_storage_path;
  if (existingPath) {
    const { data: signed, error: signedError } = await db.storage
      .from('order-documents')
      .createSignedUrl(existingPath, 60 * 60);

    if (!signedError && signed?.signedUrl) {
      return NextResponse.json({ ok: true, storagePath: existingPath, signedUrl: signed.signedUrl, reused: true });
    }
  }

  const chromium = await loadChromium();
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 1 });
    const previewUrl = `${buildOrigin(request)}/order-documents/preview/${encodeURIComponent(sendRow.share_token)}`;
    await page.goto(previewUrl, { waitUntil: 'networkidle0', timeout: 45_000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
    });

    const date = new Date().toISOString().slice(0, 10);
    const storagePath = `${sendRow.organization_id}/${sendRow.order_id}/${sendRow.order_document_id}/${date}-${sendRow.id}.pdf`;

    const upload = await db.storage
      .from('order-documents')
      .upload(storagePath, pdf, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (upload.error) {
      return NextResponse.json({ ok: false, error: upload.error.message }, { status: 500 });
    }

    await db
      .from('order_documents')
      .update({ pdf_storage_path: storagePath, updated_at: new Date().toISOString() })
      .eq('id', sendRow.order_document_id)
      .eq('organization_id', sendRow.organization_id);

    const { data: signed, error: signedError } = await db.storage
      .from('order-documents')
      .createSignedUrl(storagePath, 60 * 60);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, storagePath, error: signedError?.message ?? 'Could not create signed URL.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, storagePath, signedUrl: signed.signedUrl, reused: false });
  } finally {
    await browser.close();
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'setuflow-order-document-pdf',
    renderer: 'puppeteer-core + @sparticuz/chromium',
    storageBucket: 'order-documents',
    fallback: 'browser-print',
  });
}
