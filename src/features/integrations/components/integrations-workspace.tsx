import Link from 'next/link';
import type { IntegrationsWorkspaceData } from '@/lib/queries/data';
import { formatDate } from '@/lib/utils';
import { buildIntegrationsViewModel } from '@/features/integrations/logic/build-integrations-view-model';
import { ConnectorCard } from '@/features/integrations/ui/connector-card';
import { RetryQueue } from '@/features/integrations/ui/retry-queue';
import { SyncLogList } from '@/features/integrations/ui/sync-log-list';
import { IntegrationReplayButton } from '@/features/integrations/components/integration-replay-button';
import { IntegrationQueueSyncButton } from '@/features/integrations/components/integration-queue-sync-button';

type Props = { data: IntegrationsWorkspaceData };

export function IntegrationsWorkspace({ data }: Props) {
  const view = buildIntegrationsViewModel(data);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Integrations control desk</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Validated connectors, governed sync payloads, and continuity-aware retries</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            This surface now treats integrations as a governed control system instead of a simple event monitor. Operators can validate inbound payloads,
            queue safe outbound continuity syncs, review retry posture, and confirm that external status never outruns contract, compliance, or execution truth.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4 xl:grid-cols-8">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Connected</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.connectedCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Active</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.activeCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mocks</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.mockConnectorCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sync logs</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.recentEventCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Retry queue</p><p className="mt-2 text-2xl font-semibold text-amber-700">{view.overview.retryQueueCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Validation gaps</p><p className="mt-2 text-2xl font-semibold text-rose-700">{view.overview.validationFailureCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Outbound queued</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.queuedOutboundCount}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Blocked syncs</p><p className="mt-2 text-2xl font-semibold text-amber-700">{view.overview.blockedSyncCount}</p></div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Connector rules</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>• Every inbound connector must validate payloads before workflow effects are considered safe.</li>
            <li>• Every outbound sync must carry governed commercial or execution continuity.</li>
            <li>• Retry posture must retain continuity keys, attempt counts, and operator review visibility.</li>
            <li>• External status must never outrun contract lock, compliance controls, or dispatch evidence.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Connector state</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Configured providers, validation posture, and continuity health</h3>
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
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No integrations are active yet. Start with freight or ERP connectors to validate mapping, status continuity, and retry architecture.</div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Retry queue</p>
            <div className="mt-4"><RetryQueue items={view.retryQueue} /></div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Webhook pattern</p>
            <p className="mt-3 text-sm text-slate-600">Inbound provider events follow a connector registry and provider-specific entry pattern under <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">/api/integrations/webhooks/[provider]</code>, with validation, continuity keys, and governed impact summaries persisted into the sync log.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Governed outbound queue</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Safe-to-sync commercial and execution payloads</h3>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {view.outboundCandidates.length ? view.outboundCandidates.map((candidate) => (
              <article key={`${candidate.provider}-${candidate.targetId}`} className={`rounded-2xl border p-4 ${candidate.readiness === 'ready' ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{candidate.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{candidate.reason}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${candidate.readiness === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{candidate.readiness === 'ready' ? 'Ready to sync' : 'Blocked'}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{candidate.payloadHint} · execution {candidate.stageLabel}</p>
                {candidate.readiness === 'ready' ? (
                  <div className="mt-3">
                    <IntegrationQueueSyncButton
                      integrationId={candidate.integrationId}
                      provider={candidate.provider}
                      targetType={candidate.targetType}
                      targetId={candidate.targetId}
                      reason={candidate.reason}
                    />
                  </div>
                ) : null}
              </article>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No governed outbound payloads are waiting right now.</div>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Governance alerts</p>
          <div className="mt-4 space-y-3">
            {view.governanceAlerts.length ? view.governanceAlerts.map((alert) => (
              <article key={alert.id} className={`rounded-2xl border p-4 ${alert.severity === 'high' ? 'border-rose-200 bg-rose-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${alert.severity === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{alert.severity === 'high' ? 'High' : 'Medium'}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{alert.reason}</p>
                <Link href={alert.ctaHref} className="mt-3 inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700">{alert.ctaLabel}</Link>
              </article>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No governed sync alerts are currently visible.</div>}
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
