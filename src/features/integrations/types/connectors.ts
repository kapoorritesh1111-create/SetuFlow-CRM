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
  validationLabel: string;
  continuityKey: string | null;
  impactSummary: string;
  attemptCount: number;
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
  inboundCount: number;
  outboundCount: number;
  validationFailureCount: number;
  queuedOutboundCount: number;
  continuityLabel: string;
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
  attemptCount: number;
  continuityKey: string | null;
};

export type IntegrationOverview = {
  connectedCount: number;
  activeCount: number;
  mockConnectorCount: number;
  recentEventCount: number;
  retryQueueCount: number;
  validationFailureCount: number;
  queuedOutboundCount: number;
  blockedSyncCount: number;
};

export type GovernedSyncCandidate = {
  integrationId: string;
  provider: string;
  targetType: 'contract';
  targetId: string;
  quoteId: string;
  leadId: string;
  title: string;
  reason: string;
  stageLabel: string;
  readiness: 'ready' | 'blocked';
  payloadHint: string;
};

export type IntegrationGovernanceAlert = {
  id: string;
  provider: string;
  title: string;
  reason: string;
  severity: 'high' | 'medium';
  ctaHref: string;
  ctaLabel: string;
};

export type IntegrationsWorkspaceViewModel = {
  overview: IntegrationOverview;
  connectors: ConnectorStateCard[];
  retryQueue: RetryQueueItem[];
  syncLogs: SyncLogItem[];
  outboundCandidates: GovernedSyncCandidate[];
  governanceAlerts: IntegrationGovernanceAlert[];
};
