import { NextResponse } from 'next/server';
import { connectorRegistry } from '@/features/integrations/server/connectors';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWebhookSecretForProvider, verifyWebhookSignature } from '@/lib/security/webhook';
import { createClient } from '@/lib/supabase/server';
import { buildInboundGovernanceImpact } from '@/features/integrations/server/governed-sync';

type WebhookAuditStatus = 'accepted' | 'rejected';

type WebhookAuditInput = {
  organizationId: string;
  integrationId: string;
  provider: string;
  status: WebhookAuditStatus;
  reason: string;
  eventId?: string | null;
  validation?: { ok: boolean; errors: string[]; label: string } | null;
};

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

function readSignature(request: Request) {
  return request.headers.get('x-hub-signature-256') ?? request.headers.get('x-webhook-signature') ?? '';
}

function parsePayload(rawBody: string) {
  try {
    return readRecord(JSON.parse(rawBody));
  } catch {
    return {};
  }
}

async function writeWebhookAudit(input: WebhookAuditInput) {
  await writeAuditLog({
    organizationId: input.organizationId,
    action: `webhook_${input.status}`,
    entityType: 'integration',
    entityId: input.integrationId,
    actorUserId: null,
    payload: {
      provider: input.provider,
      reason: input.reason,
      eventId: input.eventId ?? null,
      validation: input.validation ?? null,
      receivedFrom: 'webhook',
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const connector = connectorRegistry[provider];

  if (!connector) {
    return NextResponse.json({ ok: false, error: 'Unknown connector provider.' }, { status: 404 });
  }

  const rawBody = await request.text();
  const signature = readSignature(request);
  const secret = getWebhookSecretForProvider(provider);

  if (!secret || !verifyWebhookSignature(secret, rawBody, signature)) {
    if (hasSupabaseEnv) {
      const payloadForAudit = parsePayload(rawBody);
      const integrationId = readString(payloadForAudit.integration_id) ?? readString(request.headers.get('x-integration-id'));

      if (integrationId) {
        const db = await createClient();
        const { data: integration } = await db
          .from('integrations')
          .select('id, organization_id, provider')
          .eq('id', integrationId)
          .eq('provider', provider)
          .maybeSingle();

        if (integration?.id && integration.organization_id) {
          await writeWebhookAudit({
            organizationId: integration.organization_id,
            integrationId: integration.id,
            provider,
            status: 'rejected',
            reason: secret ? 'invalid_signature' : 'missing_webhook_secret',
          });
        }
      }
    }

    return NextResponse.json({ ok: false, error: 'Invalid signature.' }, { status: 401 });
  }

  const payload = parsePayload(rawBody);
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

  const db = await createClient();
  const { data: integration } = await db
    .from('integrations')
    .select('id, organization_id, provider, is_active')
    .eq('id', integrationId)
    .eq('provider', provider)
    .maybeSingle();

  if (!integration?.id || !integration.organization_id) {
    return NextResponse.json({ ok: false, error: 'Integration not found for this provider.' }, { status: 404 });
  }

  const { data: priorEvents } = await db
    .from('integration_events')
    .select('id, payload')
    .eq('integration_id', integration.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const priorAttemptCount = (Array.isArray(priorEvents) ? priorEvents : []).reduce((max: number, event: { payload: unknown }) => {
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

  const targetKey = governanceImpact && typeof governanceImpact === 'object' && 'targetKey' in governanceImpact
    ? readString((governanceImpact as Record<string, unknown>).targetKey) ?? continuityKey
    : continuityKey;

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
      target_key: targetKey,
      attempt_count: priorAttemptCount + 1,
      received_from: 'webhook',
    },
  };

  const eventStatus = validation.ok && governanceImpact.safeToApply ? 'processed' : 'error';
  const { data: eventRow, error } = await db
    .from('integration_events')
    .insert({
      integration_id: integration.id,
      direction: 'inbound',
      event_type: String(mappedPayload.event_type ?? payload.event_type ?? 'webhook_event'),
      status: eventStatus,
      payload: persistedPayload,
      processed_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle();

  if (error) {
    await writeWebhookAudit({
      organizationId: integration.organization_id,
      integrationId: integration.id,
      provider,
      status: 'rejected',
      reason: 'event_persistence_failed',
      validation,
    });

    return NextResponse.json({ ok: false, error: error.message, validation, mappedPayload }, { status: 500 });
  }

  await writeWebhookAudit({
    organizationId: integration.organization_id,
    integrationId: integration.id,
    provider,
    status: validation.ok ? 'accepted' : 'rejected',
    reason: validation.ok ? eventStatus : 'payload_validation_failed',
    eventId: eventRow?.id ?? null,
    validation,
  });

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
