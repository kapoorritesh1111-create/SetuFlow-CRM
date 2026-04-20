import type { IntegrationsWorkspaceData } from '@/lib/queries/data';
import { formatDate } from '@/lib/utils';
import { buildIntegrationsViewModel } from '@/features/integrations/logic/build-integrations-view-model';
import { ConnectorCard } from '@/features/integrations/ui/connector-card';
import { RetryQueue } from '@/features/integrations/ui/retry-queue';
import { SyncLogList } from '@/features/integrations/ui/sync-log-list';
import { IntegrationReplayButton } from '@/features/integrations/components/integration-replay-button';

type Props = { data: IntegrationsWorkspaceData };

export function IntegrationsWorkspace({ data }: Props) {
  const view = buildIntegrationsViewModel(data);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Integrations control desk</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Connector architecture, sync posture, and retry visibility</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            This surface now treats integrations as a connector system instead of a simple event monitor. Operators can see connector posture,
            mapping intent, webhook patterns, sync logs, and retry pressure in one place.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Connected</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.connectedCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Active</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.activeCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mocks</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.mockConnectorCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sync logs</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.recentEventCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Retry queue</p><p className="mt-2 text-2xl font-semibold text-amber-700">{view.overview.retryQueueCount}</p></div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Connector rules</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>• Every connector should expose a mapping layer.</li>
            <li>• Every inbound provider should follow a webhook handler pattern.</li>
            <li>• Retry posture must be visible before failures disappear into logs.</li>
            <li>• Freight and ERP mock connectors should prove the architecture before external rollout.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Connector state</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Configured providers and mapping posture</h3>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {view.connectors.length ? view.connectors.map((connector) => (
              <ConnectorCard
                key={connector.integrationId}
                connector={connector}
                retryAction={connector.syncLogs[0] ? (
                  <IntegrationReplayButton
                    integrationId={connector.integrationId}
                    eventId={connector.syncLogs[0].id}
                    provider={connector.provider}
                    reason={`Retry requested from ${connector.label} card.`}
                  />
                ) : undefined}
              />
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No integrations are active yet. Start with freight or ERP mocks to validate mapping and retry architecture.</div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Retry queue</p>
            <div className="mt-4"><RetryQueue items={view.retryQueue} /></div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Webhook pattern</p>
            <p className="mt-3 text-sm text-slate-600">Inbound provider events now follow a connector registry and provider-specific webhook entry pattern under <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">/api/integrations/webhooks/[provider]</code>.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Sync log timeline</p>
          <div className="mt-4"><SyncLogList items={view.syncLogs} /></div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Latest processed connector</p>
          <p className="mt-3 text-sm text-slate-600">
            {view.connectors.find((item) => item.lastProcessedAt)?.label ?? 'No processed connector yet'}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {view.connectors.find((item) => item.lastProcessedAt)?.lastProcessedAt ? formatDate(view.connectors.find((item) => item.lastProcessedAt)?.lastProcessedAt ?? '') : 'Awaiting first processed event'}
          </p>
        </div>
      </section>
    </div>
  );
}
