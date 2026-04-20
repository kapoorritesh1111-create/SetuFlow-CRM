import type { IntegrationsWorkspaceData } from '@/lib/queries/data';
import { buildConnectorState, buildRetryQueueItem } from '@/features/integrations/logic/connectors';
import type { IntegrationsWorkspaceViewModel } from '@/features/integrations/types/connectors';

export function buildIntegrationsViewModel(data: IntegrationsWorkspaceData): IntegrationsWorkspaceViewModel {
  const eventsByIntegration = new Map<string, IntegrationsWorkspaceData['integrationEvents']>();
  data.integrationEvents.forEach((event) => {
    const bucket = eventsByIntegration.get(event.integration_id) ?? [];
    bucket.push(event);
    eventsByIntegration.set(event.integration_id, bucket);
  });

  const connectors = data.integrations.map((integration) => buildConnectorState(integration, eventsByIntegration.get(integration.id) ?? []));
  const retryQueue = data.integrationEvents
    .filter((event) => ['failed', 'error', 'queued'].includes(String(event.status ?? '').toLowerCase()))
    .slice(0, 8)
    .map((event) => {
      const provider = data.integrations.find((item) => item.id === event.integration_id)?.provider ?? 'integration';
      return buildRetryQueueItem(event, provider);
    });

  const syncLogs = connectors.flatMap((connector) => connector.syncLogs).sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))).slice(0, 10);

  return {
    overview: {
      connectedCount: data.integrations.length,
      activeCount: data.integrations.filter((item) => item.is_active).length,
      mockConnectorCount: data.integrations.filter((item) => ['freight_mock', 'erp_mock'].includes(item.provider)).length,
      recentEventCount: data.integrationEvents.length,
      retryQueueCount: retryQueue.length,
    },
    connectors,
    retryQueue,
    syncLogs,
  };
}
