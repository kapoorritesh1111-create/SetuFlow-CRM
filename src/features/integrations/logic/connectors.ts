import type { ConnectorDefinition, ConnectorStateCard, IntegrationEventRecord, IntegrationRecord, RetryQueueItem, SyncLogItem } from '@/features/integrations/types/connectors';

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    id: 'freight-mock',
    provider: 'freight_mock',
    label: 'Freight mock connector',
    domain: 'freight',
    mappingLabel: 'shipment status -> execution readiness',
    webhookPattern: '/api/integrations/webhooks/freight_mock',
    retryMode: 'manual replay with queued retry visibility',
    statusHint: 'Use for shipment milestones, freight exceptions, and delivery readiness.',
  },
  {
    id: 'erp-mock',
    provider: 'erp_mock',
    label: 'ERP mock connector',
    domain: 'erp',
    mappingLabel: 'invoice / payment / order refs -> commercial state',
    webhookPattern: '/api/integrations/webhooks/erp_mock',
    retryMode: 'manual replay with sync log audit trail',
    statusHint: 'Use for payment posture, order references, and fulfillment reconciliation.',
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
    mappingLabel: 'provider payload -> workspace event log',
    webhookPattern: `/api/integrations/webhooks/${provider}`,
    retryMode: 'manual replay',
    statusHint: 'Generic connector posture with sync visibility only.',
  };
}

function isFailureStatus(status: string | null | undefined) {
  const value = String(status ?? '').toLowerCase();
  return value === 'failed' || value === 'error';
}

function retryEligible(event: IntegrationEventRecord) {
  return isFailureStatus(event.status) || String(event.status ?? '').toLowerCase() === 'queued';
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
  };
}

export function buildRetryQueueItem(event: IntegrationEventRecord, provider: string): RetryQueueItem {
  return {
    id: event.id,
    integrationId: event.integration_id,
    provider,
    label: providerLabel(provider),
    createdAt: event.created_at,
    eventType: event.event_type,
    reason: isFailureStatus(event.status) ? 'Recent failure visible in sync logs.' : 'Queued event waiting for replay or processing.',
  };
}

export function buildConnectorState(integration: IntegrationRecord, events: IntegrationEventRecord[]): ConnectorStateCard {
  const definition = pickDefinition(integration.provider);
  const failures = events.filter((event) => isFailureStatus(event.status));
  const lastProcessedAt = events.find((event) => event.processed_at)?.processed_at ?? events[0]?.created_at ?? null;
  const syncLogs = events.slice(0, 6).map((event) => buildSyncLogItem(event, integration.provider));
  const retryQueueCount = events.filter((event) => retryEligible(event)).length;
  const syncHealth: ConnectorStateCard['syncHealth'] = !events.length ? 'idle' : failures.length ? 'warning' : 'healthy';
  const syncLabel = !events.length ? 'Awaiting first sync' : failures.length ? 'Retry queue visible' : 'Sync healthy';

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
    syncLogs,
  };
}

export function providerLabelForDisplay(value: string) {
  return providerLabel(value);
}
