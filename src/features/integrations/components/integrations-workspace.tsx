import type { IntegrationsWorkspaceData } from '@/lib/queries/data';
import { formatDate } from '@/lib/utils';

type Props = { data: IntegrationsWorkspaceData };

function providerLabel(value: string) {
  return value
    .split(/[_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getSyncState(events: IntegrationsWorkspaceData['integrationEvents']) {
  if (!events.length) return { label: 'Not synced yet', tone: 'text-slate-500', errors: 0, lastSyncedAt: null as string | null };
  const failed = events.filter((event) => ['failed', 'error'].includes(String(event.status).toLowerCase())).length;
  const lastProcessed = events.find((event) => event.processed_at)?.processed_at ?? events[0]?.created_at ?? null;
  return {
    label: failed ? 'Needs attention' : 'Healthy',
    tone: failed ? 'text-rose-700' : 'text-emerald-700',
    errors: failed,
    lastSyncedAt: lastProcessed,
  };
}

export function IntegrationsWorkspace({ data }: Props) {
  const eventsByIntegration = new Map<string, IntegrationsWorkspaceData['integrationEvents']>();
  data.integrationEvents.forEach((event) => {
    const bucket = eventsByIntegration.get(event.integration_id) ?? [];
    bucket.push(event);
    eventsByIntegration.set(event.integration_id, bucket);
  });

  const recentFailures = data.integrationEvents.filter((event) => ['failed', 'error'].includes(String(event.status).toLowerCase())).slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Integrations control desk</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Connected systems and sync health</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Keep external systems visible from one operator surface. This phase prioritizes connection health, recent sync behavior,
            and error visibility before deep configuration complexity.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Connected</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data.integrations.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Recent events</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data.integrationEvents.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Errors visible</p>
              <p className="mt-2 text-2xl font-semibold text-rose-700">{recentFailures.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Foundation rules</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>• No silent sync failures.</li>
            <li>• Operators should see last good sync and current error posture.</li>
            <li>• Retries and configuration complexity come after visibility is trustworthy.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Provider status</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Active integrations</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {data.integrations.length ? data.integrations.map((integration) => {
              const events = eventsByIntegration.get(integration.id) ?? [];
              const sync = getSyncState(events);
              return (
                <article key={integration.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{providerLabel(integration.provider)}</p>
                      <p className="mt-1 text-sm text-slate-500">Updated {formatDate(integration.updated_at)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${integration.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {integration.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sync health</p>
                      <p className={`mt-2 text-sm font-semibold ${sync.tone}`}>{sync.label}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Last processed</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{sync.lastSyncedAt ? formatDate(sync.lastSyncedAt) : 'No events yet'}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Recent error count</span>
                    <span className={sync.errors ? 'font-semibold text-rose-700' : 'font-semibold text-emerald-700'}>{sync.errors}</span>
                  </div>
                </article>
              );
            }) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No integrations are active yet. Connect email, ERP, or logistics providers here first.</div>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Recent sync failures</p>
          <div className="mt-4 space-y-3">
            {recentFailures.length ? recentFailures.map((event) => (
              <article key={event.id} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{providerLabel(data.integrations.find((item) => item.id === event.integration_id)?.provider ?? 'integration')}</p>
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">{event.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{event.event_type} · {event.direction}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(event.created_at)}</p>
              </article>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No failed sync events are currently visible.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
