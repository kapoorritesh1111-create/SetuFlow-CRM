import type { ReactNode } from 'react';
import { formatDate } from '@/lib/utils';
import type { ConnectorStateCard } from '@/features/integrations/types/connectors';

function toneClass(value: ConnectorStateCard['syncHealth']) {
  if (value === 'healthy') return 'bg-emerald-50 text-emerald-700';
  if (value === 'warning') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-500';
}

type Props = {
  connector: ConnectorStateCard;
  retryAction?: ReactNode;
};

export function ConnectorCard({ connector, retryAction }: Props) {
  return (
    <article className="rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900">{connector.label}</p>
          <p className="mt-1 text-sm text-slate-500">{connector.domain.toUpperCase()} connector</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass(connector.syncHealth)}`}>{connector.syncLabel}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connector.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{connector.active ? 'Active' : 'Paused'}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mapping layer</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{connector.mappingLabel}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Webhook pattern</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{connector.webhookPattern}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Last processed</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{connector.lastProcessedAt ? formatDate(connector.lastProcessedAt) : 'No events yet'}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Retry posture</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{connector.retryQueueCount ? `${connector.retryQueueCount} events in queue` : connector.retryMode}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Continuity</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{connector.continuityLabel}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Inbound / outbound</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{connector.inboundCount} inbound · {connector.outboundCount} outbound</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Validation failures</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{connector.validationFailureCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Queued outbound syncs</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{connector.queuedOutboundCount}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">{connector.statusHint}</p>
      {retryAction ? <div className="mt-4">{retryAction}</div> : null}
    </article>
  );
}
