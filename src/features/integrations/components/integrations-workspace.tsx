import Link from 'next/link';
import type { IntegrationsWorkspaceData } from '@/lib/queries/data';
import { formatDate } from '@/lib/utils';
import { buildIntegrationsViewModel } from '@/features/integrations/logic/build-integrations-view-model';
import { ConnectorCard } from '@/features/integrations/ui/connector-card';
import { RetryQueue } from '@/features/integrations/ui/retry-queue';
import { SyncLogList } from '@/features/integrations/ui/sync-log-list';
import { IntegrationReplayButton } from '@/features/integrations/components/integration-replay-button';
import { IntegrationQueueSyncButton } from '@/features/integrations/components/integration-queue-sync-button';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { buildLeadWorkflowHref, buildOrdersHref } from '@/lib/workflow/handoffs';

function toneClass(value: 'green' | 'yellow' | 'red') {
  if (value === 'green') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (value === 'yellow') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-rose-200 bg-rose-50 text-rose-800';
}

type Props = { data: IntegrationsWorkspaceData };

export function IntegrationsWorkspace({ data }: Props) {
  const view = buildIntegrationsViewModel(data);
  const blockedCount = view.outboundCandidates.filter((candidate) => candidate.readiness === 'blocked').length;
  const readyCount = view.outboundCandidates.filter((candidate) => candidate.readiness === 'ready').length;
  const latestSync = view.syncLogs[0] ?? null;
  const latestRetry = view.retryQueue[0] ?? null;
  const dominantUrgencyCount = blockedCount > 0 ? blockedCount : view.overview.retryQueueCount;
  const approvalTruth = blockedCount === 0 ? 'green' : readyCount > 0 ? 'yellow' : 'red';
  const outboundTruth = latestRetry ? 'yellow' : latestSync ? 'green' : 'red';
  const deskSummary = [
    {
      title: 'Approval truth',
      tone: approvalTruth,
      body: blockedCount
        ? `${blockedCount} send packet${blockedCount === 1 ? '' : 's'} are still blocked. A quote existing is not enough.`
        : readyCount
          ? `${readyCount} send packet${readyCount === 1 ? '' : 's'} are clear enough to move forward.`
          : 'Nothing is ready to send yet. Keep approval and contract status in view.',
    },
    {
      title: 'Send readiness',
      tone: readyCount > 0 ? 'green' : blockedCount > 0 ? 'yellow' : 'red',
      body: readyCount
        ? 'There is at least one safe-to-sync path visible from approved commercial or execution truth.'
        : blockedCount
          ? 'The desk is correctly withholding outbound movement until blockers clear.'
          : 'Nothing is ready to send yet, which is safer than pretending outbound is clear.',
    },
    {
      title: 'Latest outbound action',
      tone: outboundTruth,
      body: latestSync
        ? `${latestSync.label} · ${latestSync.status} · ${latestSync.createdAt ? formatDate(latestSync.createdAt) : 'Pending timestamp'}`
        : 'No outbound event is visible yet.',
    },
    {
      title: 'Resend / revision posture',
      tone: latestRetry ? 'yellow' : blockedCount ? 'red' : 'green',
      body: latestRetry
        ? `${latestRetry.label} is the live retry candidate. Do not resend blindly; reconcile the continuity key and blocker reason first.`
        : blockedCount
          ? 'Revision or approval cleanup is still a better next move than resend.'
          : 'No replay pressure is visible right now. This workspace is in a cleaner outbound posture.',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
      <a id="send-queue" className="sr-only" aria-hidden="true"></a>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Approvals &amp; Sending</p>
          <div className="mt-3 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Blocked send packets</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{blockedCount}</p>
              <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${dominantUrgencyCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {dominantUrgencyCount > 0 ? `${dominantUrgencyCount} urgent item${dominantUrgencyCount === 1 ? '' : 's'} require decision` : 'No immediate send pressure'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a href="#governed-send-queue" className="inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Review ready items</a>
              <Link href="/quotes?handoff=approval-send-return" className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50">Back to Quote workspace</Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href={buildOrdersHref({ handoff: 'approval-send-open-orders' })} className="text-sm font-semibold text-brand-700 hover:text-brand-800">Orders &amp; Execution</Link>
            <Link href="/contracts" className="text-sm font-semibold text-slate-700 hover:text-slate-900">Contracts</Link>
          </div>
        </div>
        <CollapsiblePanel
          title="Desk rules"
          summary="Reference only. The ready queue stays ahead of policy detail."
          className="rounded-3xl border border-slate-200 bg-white p-2 shadow-soft"
          bodyClassName="pt-1"
        >
          <ul className="space-y-3 text-sm text-slate-600">
            <li>• A quote is not safe to send until approval truth and continuity blockers are visibly clear.</li>
            <li>• Retry or resend must preserve continuity keys, latest action context, and operator review visibility.</li>
            <li>• Sending must never move ahead of the approved quote and contract status.</li>
            <li>• Technical connector health matters only after the operator can answer: send, revise, or hold?</li>
          </ul>
        </CollapsiblePanel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Connected</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.connectedCount}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ready outbound</p><p className="mt-2 text-2xl font-semibold text-emerald-700">{readyCount}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Blocked outbound</p><p className="mt-2 text-2xl font-semibold text-amber-700">{blockedCount}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Retry pressure</p><p className="mt-2 text-2xl font-semibold text-slate-900">{view.overview.retryQueueCount}</p></div>
      </section>

      <CollapsiblePanel
        title="Desk summary"
        summary="Keep this collapsed while you clear the send queue."
        className="bg-slate-50/70"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {deskSummary.map((item) => (
            <div key={item.title} className={`rounded-2xl border p-4 ${toneClass(item.tone)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">{item.title}</p>
              <p className="mt-3 text-sm leading-6">{item.body}</p>
            </div>
          ))}
        </div>
      </CollapsiblePanel>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div id="governed-send-queue" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Ready to send queue</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">What is actually ready, blocked, or waiting for revision</h3>
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
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${candidate.readiness === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{candidate.readiness === 'ready' ? 'Safe to move' : 'Hold / revise first'}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{candidate.payloadHint} · execution {candidate.stageLabel}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {candidate.readiness === 'ready' ? (
                    <IntegrationQueueSyncButton integrationId={candidate.integrationId} provider={candidate.provider} targetType={candidate.targetType} targetId={candidate.targetId} reason={candidate.reason} />
                  ) : null}
                  {candidate.leadId ? <Link href={buildLeadWorkflowHref(candidate.leadId, undefined, { quoteId: candidate.quoteId, handoff: candidate.readiness === 'ready' ? 'approval-send-quote-live' : 'approval-send-fix-blocker' })} className="text-sm font-semibold text-slate-700 hover:text-slate-900">Open follow-up</Link> : null}
                  <Link href={buildOrdersHref({ quoteId: candidate.quoteId, handoff: 'approval-send-open-orders' })} className="text-sm font-semibold text-slate-700 hover:text-slate-900">Open Orders & Execution</Link>
                </div>
              </article>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No ready-to-send items are waiting right now.</div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Replay / resend pressure</p>
            <div className="mt-4"><RetryQueue items={view.retryQueue} /></div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Latest outbound action</p>
            <div className="mt-4"><SyncLogList items={view.syncLogs.slice(0, 4)} /></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <CollapsiblePanel
          title="Connector posture"
          summary="Technical detail stays available, but collapsed so the ready queue stays the main scan surface."
          className="rounded-3xl border border-slate-200 bg-white p-2 shadow-soft"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Connector posture</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Technical surfaces, kept secondary to the send workspace</h3>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {view.connectors.length ? view.connectors.map((connector) => (
              <ConnectorCard
                key={connector.integrationId}
                connector={connector}
                retryAction={connector.syncLogs[0] ? (
                  <IntegrationReplayButton integrationId={connector.integrationId} eventId={connector.syncLogs[0].id} provider={connector.provider} reason={`Retry requested from ${connector.label} card.`} />
                ) : undefined}
              />
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No integrations are active yet. That is a technical fact, not a reason to blur send readiness.</div>}
          </div>
        </CollapsiblePanel>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Governance alerts</p>
          <div className="mt-4 space-y-3">
            {view.governanceAlerts.length ? view.governanceAlerts.map((alert) => (
              <article key={alert.id} className={`rounded-2xl border p-4 ${alert.severity === 'high' ? 'border-rose-200 bg-rose-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${alert.severity === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{alert.severity === 'high' ? 'High risk' : 'Medium risk'}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{alert.reason}</p>
                <Link href={alert.ctaHref} className="mt-3 inline-flex rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{alert.ctaLabel}</Link>
              </article>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No send alerts are visible right now.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
