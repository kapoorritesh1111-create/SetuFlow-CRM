/**
 * src/app/api/setu-guru/ingest/route.ts
 * Module A, Step 1 — Ingest API Route (CRM Event Listener)
 *
 * AUTH: follows the repo's existing WEBHOOK_SECRET_<PROVIDER> convention
 * (seen in .env: WEBHOOK_SECRET_FREIGHT_MOCK, WEBHOOK_SECRET_ERP_MOCK).
 * Set WEBHOOK_SECRET_SETU_GURU_INGEST in your environment and configure
 * the CRM to send it as the `x-webhook-secret` header on every request to
 * this endpoint. Requests missing or mismatching this header are rejected
 * with 401 before any payload is trusted.
 *
 * ⚠️ If the actual CRM integration uses a different auth scheme (e.g. an
 * HMAC signature over the raw body, like some webhook providers do,
 * rather than a static shared secret), this needs to be swapped for that
 * — a static secret is weaker than HMAC because it doesn't verify the
 * body wasn't tampered with in transit, only that the caller knows the
 * secret. Confirm which scheme the CRM actually sends before relying on
 * this in production.
 *
 * Expected payload shape (adjust to match actual CRM event format):
 * {
 *   "organizationId": "uuid",
 *   "sourceType": "compliance_document" | ...,
 *   "sourceId": "uuid",
 *   "fileUrl": "https://...",   // fetched server-side below
 *   "mimeType": "application/pdf"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { ingestDocument } from '@/lib/rag/ingest';

interface IngestRequestBody {
  organizationId?: string;
  sourceType?: string;
  sourceId?: string;
  fileUrl?: string;
  mimeType?: string;
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.WEBHOOK_SECRET_SETU_GURU_INGEST;
  if (!expected) {
    // Fail closed: an unset secret must never mean "no auth required".
    console.error('[ingest route] WEBHOOK_SECRET_SETU_GURU_INGEST is not set — rejecting all requests');
    return false;
  }

  const provided = request.headers.get('x-webhook-secret');
  if (!provided) return false;

  // Constant-time comparison to avoid leaking the secret via timing.
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: IngestRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { organizationId, sourceType, sourceId, fileUrl, mimeType } = body;

  if (!organizationId || !sourceType || !sourceId || !fileUrl || !mimeType) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields: organizationId, sourceType, sourceId, fileUrl, mimeType' },
      { status: 400 },
    );
  }

  let fileBuffer: Buffer;
  try {
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { ok: false, error: `Failed to fetch fileUrl: ${fileResponse.status}` },
        { status: 502 },
      );
    }
    const arrayBuffer = await fileResponse.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: `Error fetching fileUrl: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  const outcome = await ingestDocument({
    organizationId,
    sourceType,
    sourceId,
    fileBuffer,
    mimeType,
  });

  if (outcome.status === 'error') {
    console.error('[ingest route] ingestDocument failed:', outcome.error);
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...outcome });
}