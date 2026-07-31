/**
 * src/app/api/setu-guru/ingest/route.ts
 * Module A, Step 1 — Ingest API Route (CRM Event Listener)
 *
 * ⚠️ ASSUMPTION FLAG: this is written against standard Next.js App Router
 * conventions and the error-handling style already seen in retrieve.ts /
 * provider.ts. It does NOT copy `src/app/api/webhooks/mailtrap/route.ts`
 * because that file's contents haven't been reviewed yet — if the CRM
 * webhook pattern there does things differently (e.g. a signature header
 * check, a specific auth middleware, a different response envelope),
 * paste that file and this route should be aligned to match it before
 * shipping. In particular, this route currently has NO webhook-signature
 * verification — that needs to be added to match however the CRM signs
 * its outbound events, or this endpoint is spoofable by anyone who knows
 * the URL.
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
import { ingestDocument } from '@/lib/rag/ingest';

interface IngestRequestBody {
  organizationId?: string;
  sourceType?: string;
  sourceId?: string;
  fileUrl?: string;
  mimeType?: string;
}

export async function POST(request: NextRequest) {
  // TODO: verify CRM webhook signature/secret here before trusting the
  // payload — see assumption flag above.

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