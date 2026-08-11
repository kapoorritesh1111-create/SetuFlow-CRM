import { NextResponse } from 'next/server';

import { processInteraktWebhook } from '@/features/integrations/interakt/webhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('Interakt-Signature') ?? request.headers.get('interakt-signature');
  const result = await processInteraktWebhook(rawBody, signature);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, duplicate: result.duplicate });
}
