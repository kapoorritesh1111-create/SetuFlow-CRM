import type { ConnectorDefinition, ConnectorStateCard, IntegrationEventRecord, IntegrationRecord, RetryQueueItem, SyncLogItem } from '@/features/integrations/types/connectors';
import { readIntegrationEventAttemptCount, readIntegrationEventContinuityKey, readIntegrationImpactSummary, readIntegrationValidationLabel } from '@/features/integrations/logic/governance';

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    id: 'freight-mock',
    provider: 'freight_mock',
    label: 'Freight mock connector',
    domain: 'freight',
    mappingLabel: 'shipment status -> governed execution continuity',
    webhookPattern: '/api/integrations/webhooks/freight_mock',
    retryMode: 'retry queue with continuity-aware replay',
    statusHint: 'Use for shipment milestones, freight exceptions, dispatch proof, and delivery continuity.',
  },
  {
    id: 'erp-mock',
    provider: 'erp_mock',
    label: 'ERP mock connector',
    domain: 'erp',
    mappingLabel: 'commercial lock + execution state -> ERP continuity payload',
    webhookPattern: '/api/integrations/webhooks/erp_mock',
    retryMode: 'retry queue with governed outbound requeue',
    statusHint: 'Use for invoice posture, payment continuity, commercial holds, and governed contract snapshots.',
  },
];

function providerLabel(value: string) {
  return value
    .split(/[_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function pickDefinition(provider: string): ConnectorDefinition {
  return CONNECTOR_DEFINITIONS.find((item) => item.provider === provider) ?? {
    id: provider,
    provider,
    label: providerLabel(provider),
    domain: 'other',
    mappingLabel: 'provider payload -> governed sync log',
    webhookPattern: `/api/integrations/webhooks/${provider}`,
    retryMode: 'manual replay',
    statusHint: 'Generic connector posture with validation, continuity, and sync visibility.',
  };
}

function normalize(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function isFailureStatus(status: string | null | undefined) {
  const value = normalize(status);
  return value === 'failed' || value === 'error';
}

function retryEligible(event: IntegrationEventRecord) {
  const status = normalize(event.status);
  return status === 'failed' || status === 'error' || status === 'queued' || status === 'needs_review';
}

export function buildSyncLogItem(event: IntegrationEventRecord, provider: string): SyncLogItem {
  return {
    id: event.id,
    label: `${providerLabel(provider)} · ${event.event_type}`,
    direction: event.direction,
    status: event.status,
    createdAt: event.created_at,
    processedAt: event.processed_at,
    retryEligible: retryEligible(event),
    validationLabel: readIntegrationValidationLabel(event),
    continuityKey: readIntegrationEventContinuityKey(event),
    impactSummary: readIntegrationImpactSummary(event),
    attemptCount: readIntegrationEventAttemptCount(event),
  };
}

export function buildRetryQueueItem(event: IntegrationEventRecord, provider: string): RetryQueueItem {
  const status = normalize(event.status);
  return {
    id: event.id,
    integrationId: event.integration_id,
    provider,
    label: providerLabel(provider),
    createdAt: event.created_at,
    eventType: event.event_type,
    reason: status === 'needs_review'
      ? 'Governed sync effect needs operator review before it can be replayed.'
      : isFailureStatus(event.status)
        ? 'Recent validation or processing failure is visible in sync logs.'
        : 'Queued event waiting for replay or outbound processing.',
    attemptCount: readIntegrationEventAttemptCount(event),
    continuityKey: readIntegrationEventContinuityKey(event),
  };
}

export function buildConnectorState(integration: IntegrationRecord, events: IntegrationEventRecord[]): ConnectorStateCard {
  const definition = pickDefinition(integration.provider);
  const failures = events.filter((event) => isFailureStatus(event.status));
  const validationFailures = events.filter((event) => ['failed', 'error', 'needs_review'].includes(normalize(event.status)));
  const inboundCount = events.filter((event) => normalize(event.direction) === 'inbound').length;
  const outboundCount = events.filter((event) => normalize(event.direction) === 'outbound').length;
  const queuedOutboundCount = events.filter((event) => normalize(event.direction) === 'outbound' && normalize(event.status) === 'queued').length;
  const lastProcessedAt = events.find((event) => event.processed_at)?.processed_at ?? events[0]?.created_at ?? null;
  const syncLogs = events.slice(0, 6).map((event) => buildSyncLogItem(event, integration.provider));
  const retryQueueCount = events.filter((event) => retryEligible(event)).length;
  const syncHealth: ConnectorStateCard['syncHealth'] = !events.length ? 'idle' : failures.length || retryQueueCount ? 'warning' : 'healthy';
  const syncLabel = !events.length ? 'Awaiting first sync' : failures.length || retryQueueCount ? 'Action required' : 'Continuity healthy';
  const continuityLabel = inboundCount && outboundCount ? 'Bidirectional continuity active' : inboundCount || outboundCount ? 'One-way continuity visible' : 'No continuity yet';

  return {
    integrationId: integration.id,
    provider: integration.provider,
    label: definition.label,
    domain: definition.domain,
    active: integration.is_active,
    syncHealth,
    syncLabel,
    lastProcessedAt,
    recentErrors: failures.length,
    mappingLabel: definition.mappingLabel,
    webhookPattern: definition.webhookPattern,
    retryMode: definition.retryMode,
    statusHint: definition.statusHint,
    retryQueueCount,
    inboundCount,
    outboundCount,
    validationFailureCount: validationFailures.length,
    queuedOutboundCount,
    continuityLabel,
    syncLogs,
  };
}

export function providerLabelForDisplay(value: string) {
  return providerLabel(value);
}
