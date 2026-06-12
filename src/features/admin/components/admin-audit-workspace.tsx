import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActivityTimeline } from '@/components/ui/activity-timeline';
import type { ActivityEvent } from '@/lib/activity-timeline';
import type { AuditEventRecord, AuditEventType } from '@/lib/auditLog';
import { formatDateTime } from '@/lib/utils';
import { getAuditEventCategory, getAuditEventLabel, getAuditEventSummary, getAuditEventTone } from '@/lib/adminAuditEvents';

export type AuditViewKey = 'all' | 'catalog' | 'leads' | 'access';

type AuditActorOption = { id: string; label: string };
type AuditSummaryStat = { label: string; value: number; helper: string };

type AuditViewOption = {
  id: AuditViewKey;
  label: string;
  description: string;
};

const VIEW_OPTIONS: AuditViewOption[] = [
  { id: 'all', label: 'All activity', description: 'Everything tracked across the workspace audit surface.' },
  { id: 'catalog', label: 'Catalog + pricing', description: 'Product setup, catalog pricing, and pricing distribution actions.' },
  { id: 'leads', label: 'Leads + quotes', description: 'Lead-adjacent RFQ and quote workflow events.' },
  { id: 'access', label: 'Access + roles', description: 'Invitations, roles, membership state, and security-sensitive actions.' },
];

function toTimelineEvent(event: AuditEventRecord): ActivityEvent {
  return {
    id: `audit-${event.id}`,
    type: 'activity_logged',
    entity_type: 'activity',
    entity_id: event.entity_id ?? event.id,
    actor: event.actor_name ?? event.actor_email ?? event.actor_user_id,
    timestamp: event.created_at,
    title: getAuditEventLabel(event.event_type),
    metadata: {
      category: getAuditEventCategory(event.event_type),
      entity: event.entity_type,
      summary: getAuditEventSummary(event),
    },
  };
}

function getActorLabel(event: AuditEventRecord) {
  return event.actor_name ?? event.actor_email ?? event.actor_user_id ?? 'System';
}

function buildViewHref({
  view,
  selectedEventType,
  selectedActorId,
  since,
  until,
}: {
  view: AuditViewKey;
  selectedEventType: string;
  selectedActorId: string;
  since: string;
  until: string;
}) {
  const params = new URLSearchParams();
  params.set('view', view);
  if (selectedEventType && selectedEventType !== 'all') params.set('event', selectedEventType);
  if (selectedActorId && selectedActorId !== 'all') params.set('actor', selectedActorId);
  if (since) params.set('since', since);
  if (until) params.set('until', until);
  return `/admin/audit?${params.toString()}`;
}

export function AdminAuditWorkspace({
  organizationName,
  events,
  eventTypeOptions,
  actorOptions,
  selectedEventType,
  selectedActorId,
  since,
  until,
  summaryStats,
  selectedView,
  readOnlyMessage,
}: {
  organizationName: string;
  events: AuditEventRecord[];
  eventTypeOptions: AuditEventType[];
  actorOptions: AuditActorOption[];
  selectedEventType: string;
  selectedActorId: string;
  since: string;
  until: string;
  summaryStats: AuditSummaryStat[];
  selectedView: AuditViewKey;
  readOnlyMessage?: string | null;
}) {
  const timelineEvents = events.slice(0, 8).map(toTimelineEvent);
  const activeView = VIEW_OPTIONS.find((option) => option.id === selectedView) ?? VIEW_OPTIONS[0];

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audit center</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Centralized audit log for {organizationName}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use the function tabs below to keep catalog, commercial, and access activity organized in one admin-visible workspace instead of scattering audit panels across operational pages.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={`${events.length} visible`} tone="info" />
            <StatusBadge label={activeView.label} tone="success" />
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          {VIEW_OPTIONS.map((option) => {
            const isActive = option.id === selectedView;
            return (
              <Link
                key={option.id}
                href={buildViewHref({ view: option.id, selectedEventType, selectedActorId, since, until })}
                className={[
                  'rounded-[1.5rem] border px-4 py-4 transition',
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]'
                    : 'border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:bg-slate-50',
                ].join(' ')}
              >
                <p className={['text-sm font-semibold', isActive ? 'text-white' : 'text-slate-900'].join(' ')}>{option.label}</p>
                <p className={['mt-2 text-sm leading-5', isActive ? 'text-slate-200' : 'text-slate-600'].join(' ')}>{option.description}</p>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      {readOnlyMessage ? (
        <StateMessage title="Admin-view state" description={readOnlyMessage} tone="warning" />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filters</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{activeView.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{activeView.description}</p>
            </div>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input type="hidden" name="view" value={selectedView} />
            <label className="flex flex-col gap-2 text-sm text-slate-600 xl:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Event type</span>
              <select name="event" defaultValue={selectedEventType} className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
                <option value="all">All audit events</option>
                {eventTypeOptions.map((item) => (
                  <option key={item} value={item}>{getAuditEventLabel(item)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actor</span>
              <select name="actor" defaultValue={selectedActorId} className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
                <option value="all">All actors</option>
                {actorOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Since</span>
              <input type="date" name="since" defaultValue={since} className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Until</span>
              <input type="date" name="until" defaultValue={until} className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </label>
            <div className="flex items-end gap-2 md:col-span-2 xl:col-span-5">
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.15)] transition hover:-translate-y-0.5 hover:bg-slate-800">Apply filters</button>
              <Link href={buildViewHref({ view: selectedView, selectedEventType: 'all', selectedActorId: 'all', since: '', until: '' })} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset</Link>
              <Link href="/admin/organization" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Back to organization</Link>
            </div>
          </form>
        </SectionCard>

        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recent stream</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Latest activity</h2>
              <p className="mt-2 text-sm text-slate-600">A compact timeline so admins can scan the newest actions without reopening operational routes.</p>
            </div>
          </div>
          <div className="mt-5">
            <ActivityTimeline events={timelineEvents} emptyLabel="No audit activity matches the current filters." />
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Detailed event ledger</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Traceable records</h2>
            <p className="mt-2 text-sm text-slate-600">Use the ledger for exact timestamps, actor visibility, entity references, and payload-aware summaries.</p>
          </div>
        </div>

        {events.length ? (
          <div className="mt-5 overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <table className="min-w-[980px] divide-y divide-slate-200">
              <thead className="bg-slate-50/90">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Summary</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id} className="align-top transition hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge label={getAuditEventLabel(event.event_type)} tone={getAuditEventTone(event.event_type)} />
                          <StatusBadge label={getAuditEventCategory(event.event_type)} tone="neutral" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{getAuditEventSummary(event)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-900">{event.entity_type}</p>
                      <p className="mt-1 text-xs text-slate-500">{event.entity_id ?? 'No entity id recorded'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-900">{getActorLabel(event)}</p>
                      {event.actor_email ? <p className="mt-1 text-xs text-slate-500">{event.actor_email}</p> : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(event.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <StateMessage title="Recoverable failure behavior" description="An empty ledger can mean your filters are too narrow, a chosen actor has no matching events, or the admin flow has not produced new records yet. Reset filters before assuming audit capture is broken." />
            <EmptyState title="No audit events found" description="Adjust the filters or continue working in the admin area. New workflow and access events will appear here as they are recorded." />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
