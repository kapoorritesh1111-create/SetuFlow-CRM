import { NextResponse } from 'next/server';

import { processInteraktWebhook } from '@/features/integrations/interakt/webhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('Interakt-Signature') ?? request.headers.get('interakt-signature');
  const result = await processInteraktWebhook(rawBody, signature);

  // Reject invalid signatures/malformed payloads. Once a verified event is accepted,
  // processing errors are retained in lead_intake_webhook_events and acknowledged
  // to avoid repeated retries or endpoint suspension by the provider.
  if (!result.ok && (result.status === 401 || result.status === 400)) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  if (!result.ok) {
    return NextResponse.json({ ok: true, accepted: true, processingError: true }, { status: 200 });
  }

  return NextResponse.json({ ok: true, duplicate: result.duplicate });
}
