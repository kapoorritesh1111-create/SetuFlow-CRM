import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { TradeEventsManager } from '@/features/trade-events/components/trade-events-manager';
import { TradeEventEntryCapture } from '@/features/trade-events/components/trade-event-entry-capture';
import { TradeShowCapture } from '@/features/trade-events/components/trade-show-capture';
import { convertTradeEventEntryToLead } from '@/features/trade-events/server/actions';
import { getTradeEventsData } from '@/lib/queries/data';
import { formatDate, formatDateTime } from '@/lib/utils';
import { requireWorkspace } from '@/lib/workspace/auth';

export default async function TradeEventsPage() {
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
                          <a href={`/leads/${entry.converted_lead_id}`} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                            Open lead
                          </a>
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
          {data.events.map((event) => (
            <article key={event.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{event.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {[event.city, event.country].filter(Boolean).join(', ') || 'Location not set'}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {entryCountByEvent.get(event.id) ?? 0} entries
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Starts</p>
                  <p className="mt-1 text-sm text-slate-800">{formatDate(event.starts_on)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ends</p>
                  <p className="mt-1 text-sm text-slate-800">{formatDate(event.ends_on)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">{event.notes ?? 'No notes added yet.'}</p>
            </article>
          ))}
        </div>
      ) : (
        <WorkspaceState
          eyebrow="Trade events workspace"
          title="No trade events yet"
          description="Add records for IndusFood, Gulfood, Anuga, and other shows to power source reporting."
        />
      )}
    </div>
  );
}
