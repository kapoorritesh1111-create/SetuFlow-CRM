import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { TradeEventsManager } from '@/features/trade-events/components/trade-events-manager';
import { TradeEventEntryCapture } from '@/features/trade-events/components/trade-event-entry-capture';
import { TradeShowCapture } from '@/features/trade-events/components/trade-show-capture';
import { convertTradeEventEntryToLead } from '@/features/trade-events/server/actions';
import { getTradeEventsData } from '@/lib/queries/trade-events';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime } from '@/lib/utils';
import { requireWorkspace } from '@/lib/workspace/auth';

type CaptureDefaultsRow = {
  id: string;
  capture_defaults: { source_label?: string | null; quick_lead_title?: string | null } | null;
};

type TradeEventsCaptureDefaultsDb = {
  from: (table: 'trade_events') => {
    select: (columns: string) => {
      eq: (column: 'organization_id', value: string) => Promise<{ data: CaptureDefaultsRow[] | null }>;
    };
  };
};
function formatTradeEventDateRange(startsOn?: string | null, endsOn?: string | null) {
  if (!startsOn && !endsOn) return 'Dates not set';
  const parseDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const start = parseDate(startsOn);
  const end = parseDate(endsOn);
  if (!start && !end) return 'Dates not set';
  if (start && !end) return formatDate(startsOn);
  if (!start && end) return formatDate(endsOn);
  const sameYear = start!.getUTCFullYear() === end!.getUTCFullYear();
  const startLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(start!);
  const endLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(end!);
  return `${startLabel} – ${endLabel}`;
}

export default async function TradeEventsPage({ searchParams }: { searchParams?: { notice?: string | string[] } }) {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Trade events workspace"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization_members row is active for this user and points to the seeded workspace."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const data = await getTradeEventsData(workspace.organization.id);
  const supabase = await createClient();
  const captureDefaultsDb = supabase as unknown as TradeEventsCaptureDefaultsDb;
  const { data: captureDefaultRows } = await captureDefaultsDb
    .from('trade_events')
    .select('id, capture_defaults')
    .eq('organization_id', workspace.organization.id);
  const captureDefaultsByEventId = new Map<string, { source_label?: string | null; quick_lead_title?: string | null } | null>(
    (captureDefaultRows ?? []).map((row) => [row.id, row.capture_defaults ?? null]),
  );
  const noticeKey = Array.isArray(searchParams?.notice) ? searchParams.notice[0] ?? null : searchParams?.notice ?? null;
  const entryCountByEvent = new Map<string, number>();
  for (const entry of data.entries) {
    entryCountByEvent.set(entry.trade_event_id, (entryCountByEvent.get(entry.trade_event_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Trade events</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Shows and source touchpoints</h2>
        <p className="mt-2 text-sm text-slate-600">
          Track the trade events that generate buyer and supplier relationships across your organization.
        </p>
      </div>

      <QueryIssuesAlert issues={data.queryIssues} />
      {noticeKey === 'capture-converted' ? (
        <WorkspaceState eyebrow="Capture handoff" title="Lead is ready for Follow-up" description="This capture was converted into a live lead. Continue in Follow-up to qualify it, then open Quote only when commercial readiness is real." primaryActionHref="/leads?handoff=capture-converted" primaryActionLabel="Open Follow-up" secondaryActionHref="/quotes" secondaryActionLabel="Open Quote workspace" />
      ) : null}
      <TradeEventEntryCapture events={data.events} />
      <TradeShowCapture events={data.events} />
      <TradeEventsManager events={data.events} />

      {data.entries.length ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Recent intake entries</p>
              <p className="mt-1 text-sm text-slate-600">Raw captured contacts waiting for qualification, deduplication, or conversion to leads.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{data.entries.length} tracked</span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Trade event</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Captured</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => {
                  const event = data.events.find((item) => item.id === entry.trade_event_id);
                  const isConverted = String(entry.status || '').toLowerCase() === 'converted' && Boolean(entry.converted_lead_id);
                  return (
                    <tr key={entry.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {entry.captured_company_name || 'Unnamed company'}
                        <p className="mt-1 text-xs font-normal text-slate-500">{entry.captured_notes || entry.source_label || 'No notes yet'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{event?.name || 'Unknown event'}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.captured_contact_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{String(entry.status || 'new').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(entry.captured_at || entry.created_at)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {isConverted ? (
                          <div className="flex flex-wrap gap-2">
                            <a href={`/leads/${entry.converted_lead_id}?tab=workflow&handoff=capture-open-lead`} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                              Open lead
                            </a>
                            <a href={`/quotes?leadId=${entry.converted_lead_id}&handoff=capture-open-quote`} className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              Open Quote
                            </a>
                          </div>
                        ) : (
                          <form action={convertTradeEventEntryToLead}>
                            <input type="hidden" name="entry_id" value={entry.id} />
                            <button type="submit" className="rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              Convert to lead
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {data.events.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.events.map((event) => {
            const captureDefaults = captureDefaultsByEventId.get(event.id) ?? null;
            const quickLeadSourceLabel = captureDefaults?.source_label ?? event.name;
            const eventEntryCount = entryCountByEvent.get(event.id) ?? 0;
            const captureHref = `/leads?quickLead=1&sourceType=trade_event&eventId=${event.id}&sourceLabel=${encodeURIComponent(quickLeadSourceLabel)}`;
            return (
            <article key={event.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex flex-col gap-4">
                <span className="inline-flex w-fit rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-base font-semibold text-emerald-800">
                  {eventEntryCount} lead{eventEntryCount === 1 ? '' : 's'} captured
                </span>
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-900">{event.name}</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{formatTradeEventDateRange(event.starts_on, event.ends_on)}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {[event.city, event.country].filter(Boolean).join(', ') || 'Location not set'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">{event.notes ?? 'No notes added yet.'}</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <a
                  href={captureHref}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-800 sm:flex-1"
                >
                  Capture lead
                </a>
                <button
                  type="button"
                  data-share-capture-link={captureHref}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M7 6.5h7.5v9H7z" />
                    <path d="M5.5 13.5h-1v-9H12v1" />
                  </svg>
                  <span>Share capture link</span>
                </button>
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <WorkspaceState
          eyebrow="Trade events workspace"
          title="No trade events yet"
          description="Add records for IndusFood, Gulfood, Anuga, and other shows to power source reporting."
        />
      )}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', async function (event) {
              var button = event.target && event.target.closest ? event.target.closest('[data-share-capture-link]') : null;
              if (!button) return;
              var link = button.getAttribute('data-share-capture-link');
              if (!link) return;
              var absoluteLink = new URL(link, window.location.origin).toString();
              try {
                await navigator.clipboard.writeText(absoluteLink);
                var label = button.querySelector('span');
                if (!label) return;
                var original = label.textContent || 'Share capture link';
                label.textContent = 'Copied!';
                window.setTimeout(function () { label.textContent = original; }, 2000);
              } catch (error) {
                window.prompt('Copy capture link', absoluteLink);
              }
            });
          `,
        }}
      />
    </div>
  );
}
