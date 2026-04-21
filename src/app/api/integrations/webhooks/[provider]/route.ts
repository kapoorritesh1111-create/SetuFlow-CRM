import { NextResponse } from 'next/server';
import { connectorRegistry } from '@/features/integrations/server/connectors';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { buildInboundGovernanceImpact } from '@/features/integrations/server/governed-sync';

function readRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readAttemptCount(payload: Record<string, unknown>) {
  const metadata = readRecord(payload.metadata);
  const value = metadata.attempt_count;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const payload = readRecord(await request.json().catch(() => ({})));
  const connector = connectorRegistry[provider];

  if (!connector) {
    return NextResponse.json({ ok: false, error: 'Unknown connector provider.' }, { status: 404 });
  }

  const mappedPayload = connector.mapInboundPayload(payload);
  const validation = connector.validatePayload(payload);
  const continuityKey = connector.continuityKey({ ...payload, ...mappedPayload });

  if (!hasSupabaseEnv) {
    return NextResponse.json({
      ok: validation.ok,
      provider,
      connector: connector.label,
      validation,
      continuity: { key: continuityKey, attempt_count: 1 },
      mappedPayload,
    }, { status: validation.ok ? 200 : 422 });
  }

  const integrationId = readString(payload.integration_id) ?? readString(request.headers.get('x-integration-id'));
  if (!integrationId) {
    return NextResponse.json({ ok: false, error: 'integration_id is required for persisted webhook processing.', validation }, { status: 400 });
  }

  const db = (await createClient()) as any;
  const { data: integration } = await db
    .from('integrations')
    .select('id, organization_id, provider, is_active')
    .eq('id', integrationId)
    .eq('provider', provider)
    .maybeSingle();

  if (!integration?.id) {
    return NextResponse.json({ ok: false, error: 'Integration not found for this provider.' }, { status: 404 });
  }

  const { data: priorEvents } = await db
    .from('integration_events')
    .select('id, payload')
    .eq('integration_id', integration.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const priorAttemptCount = (Array.isArray(priorEvents) ? priorEvents : []).reduce((max: number, event: any) => {
    const payloadRecord = readRecord(event.payload);
    const metadata = readRecord(payloadRecord.metadata);
    const continuity = readRecord(payloadRecord.continuity);
    const key = readString(continuity.key) ?? readString(metadata.target_key) ?? null;
    if (continuityKey && key === continuityKey) return Math.max(max, readAttemptCount(readRecord(event.payload)));
    return max;
  }, 0);

  const governanceImpact = validation.ok
    ? await buildInboundGovernanceImpact({
        db,
        organizationId: integration.organization_id,
        provider,
        contractId: readString(mappedPayload.contract_id),
        quoteId: readString(mappedPayload.quote_id),
      })
    : { safeToApply: false, summary: 'Payload failed provider validation.', blockedReasons: validation.errors };

  const persistedPayload = {
    raw_payload: payload,
    mapped_payload: mappedPayload,
    validation,
    continuity: {
      key: continuityKey,
      attempt_count: priorAttemptCount + 1,
    },
    impact: governanceImpact,
    metadata: {
      target_key: governanceImpact && typeof governanceImpact === 'object' && 'targetKey' in governanceImpact ? (governanceImpact as any).targetKey ?? continuityKey : continuityKey,
      attempt_count: priorAttemptCount + 1,
      received_from: 'webhook',
    },
  };

  const status = !validation.ok ? 'failed' : governanceImpact.safeToApply ? 'processed' : 'needs_review';
  const { data: eventRow, error } = await db
    .from('integration_events')
    .insert({
      integration_id: integration.id,
      direction: 'inbound',
      event_type: String(mappedPayload.event_type ?? payload.event_type ?? 'webhook_event'),
      status,
      payload: persistedPayload,
      processed_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, validation, mappedPayload }, { status: 500 });
  }

  return NextResponse.json({
    ok: validation.ok,
    provider,
    connector: connector.label,
    validation,
    continuity: { key: continuityKey, attempt_count: priorAttemptCount + 1 },
    impact: governanceImpact,
    mappedPayload,
    eventId: eventRow?.id ?? null,
  }, { status: validation.ok ? 200 : 422 });
}
