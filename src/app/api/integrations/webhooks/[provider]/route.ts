import { NextResponse } from 'next/server';
import { connectorRegistry } from '@/features/integrations/server/connectors';

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const payload = await request.json().catch(() => ({}));
  const connector = connectorRegistry[provider];

  if (!connector) {
    return NextResponse.json({ ok: false, error: 'Unknown connector provider.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    provider,
    connector: connector.label,
    mappedPayload: connector.mapInboundPayload(payload as Record<string, unknown>),
  });
}
