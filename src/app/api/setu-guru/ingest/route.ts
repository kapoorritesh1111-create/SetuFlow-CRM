/**
 * src/app/api/setu-guru/ingest/route.ts
 * Module A, Step 1 — Ingest API Route (CRM Event Listener)
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { ingestDocument } from '@/lib/rag/ingest';
import { URL } from 'url';
import { createClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB hard limit
const FETCH_TIMEOUT_MS = 15000; // 15 seconds

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
    console.error('[ingest route] WEBHOOK_SECRET_SETU_GURU_INGEST is not set — rejecting all requests');
    return false;
  }
  const provided = request.headers.get('x-webhook-secret');
  if (!provided) return false;

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

// SSRF Protection: Validate URL and block loopback/private IPs
function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') return false; // Strictly HTTPS

    const hostname = url.hostname;
    // Block loopback, private networks, and cloud metadata endpoints
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.')
    ) {
      return false;
    }

    // Optional: Strict allowlist from environment variable
    const allowedDomain = process.env.CRM_STORAGE_DOMAIN_ALLOWLIST;
    if (allowedDomain && !hostname.endsWith(allowedDomain)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
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

  // SSRF Check
  if (!isSafeUrl(fileUrl)) {
    return NextResponse.json({ ok: false, error: 'Invalid or forbidden fileUrl (SSRF check failed)' }, { status: 403 });
  }

  let fileBuffer: Buffer;
  try {
    // Prevent hanging requests (Timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // Fetch with redirect protection
    const fileResponse = await fetch(fileUrl, {
      signal: controller.signal,
      redirect: 'error', 
    });
    clearTimeout(timeoutId);

    if (!fileResponse.ok) {
      return NextResponse.json(
        { ok: false, error: `Failed to fetch fileUrl: ${fileResponse.status}` },
        { status: 502 },
      );
    }

    // MIME Type Validation
    const responseMime = fileResponse.headers.get('content-type');
    if (responseMime && !responseMime.toLowerCase().includes(mimeType.toLowerCase())) {
      return NextResponse.json(
        { ok: false, error: `MIME type mismatch: Expected ${mimeType}, got ${responseMime}` },
        { status: 400 },
      );
    }

    // Resource Exhaustion (Size Check via Header)
    const contentLength = fileResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: 'File exceeds maximum allowed size (10MB)' }, { status: 413 });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    
    // Resource Exhaustion (Size Check post-download)
    if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: 'Downloaded file exceeds maximum allowed size (10MB)' }, { status: 413 });
    }

    fileBuffer = Buffer.from(arrayBuffer);
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      return NextResponse.json({ ok: false, error: 'File fetch timed out' }, { status: 504 });
    }
    return NextResponse.json(
      { ok: false, error: `Error fetching fileUrl: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  // Create an admin (service-role) client to bypass RLS for webhook ingestion
  const adminDbClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const outcome = await ingestDocument({
    organizationId,
    sourceType,
    sourceId,
    fileBuffer,
    mimeType,
    dbClient: adminDbClient, // <--- Injection for Fix A1
  });

  if (outcome.status === 'error') {
    console.error('[ingest route] ingestDocument failed:', outcome.error);
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...outcome });
}