import type { IntegrationEventRecord } from '@/features/integrations/types/connectors';

export function shouldQueueRetry(event: IntegrationEventRecord) {
  const status = String(event.status ?? '').toLowerCase();
  return status === 'failed' || status === 'error' || status === 'queued';
}
