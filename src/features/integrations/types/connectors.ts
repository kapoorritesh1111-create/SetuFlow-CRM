import type { IntegrationsWorkspaceData } from '@/lib/queries/data';

export type IntegrationRecord = IntegrationsWorkspaceData['integrations'][number];
export type IntegrationEventRecord = IntegrationsWorkspaceData['integrationEvents'][number];

export type ConnectorDefinition = {
  id: string;
  provider: string;
  label: string;
  domain: 'freight' | 'erp' | 'other';
  mappingLabel: string;
  webhookPattern: string;
  retryMode: string;
  statusHint: string;
};

export type SyncLogItem = {
  id: string;
  label: string;
  direction: string;
  status: string;
  createdAt: string | null;
  processedAt: string | null;
  retryEligible: boolean;
};

export type ConnectorStateCard = {
  integrationId: string;
  provider: string;
  label: string;
  domain: 'freight' | 'erp' | 'other';
  active: boolean;
  syncHealth: 'healthy' | 'warning' | 'idle';
  syncLabel: string;
  lastProcessedAt: string | null;
  recentErrors: number;
  mappingLabel: string;
  webhookPattern: string;
  retryMode: string;
  statusHint: string;
  retryQueueCount: number;
  syncLogs: SyncLogItem[];
};

export type RetryQueueItem = {
  id: string;
  integrationId: string;
  provider: string;
  label: string;
  createdAt: string | null;
  eventType: string;
  reason: string;
};

export type IntegrationOverview = {
  connectedCount: number;
  activeCount: number;
  mockConnectorCount: number;
  recentEventCount: number;
  retryQueueCount: number;
};

export type IntegrationsWorkspaceViewModel = {
  overview: IntegrationOverview;
  connectors: ConnectorStateCard[];
  retryQueue: RetryQueueItem[];
  syncLogs: SyncLogItem[];
};
