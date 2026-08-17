import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { EventWorkspaceCard } from './event-workspace-card';
import { getTradeEventStatus } from '@/lib/trade-events/command-center';
import type { TradeCommandEntry, TradeCommandLead } from '@/lib/trade-events/query';
import { buildTradeEventsViewModel } from '@/lib/trade-events/view-model';

type Model = ReturnType<typeof buildTradeEventsViewModel>;

export function TradeEventsEventList({ model, view, entries, leads }: { model: Model; view: 'my' | 'past'; entries: TradeCommandEntry[]; leads: TradeCommandLead[] }) {
  const visible = view === 'past'
    ? [...model.events].filter((event) => getTradeEventStatus(event) === 'completed').reverse()
    : model.events.filter((event) => getTradeEventStatus(event) !== 'completed');

  return <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">{view === 'past' ? 'Past events' : 'My events'}</p><h2 className="text-xl font-black">{view === 'past' ? 'Completed shows' : 'Upcoming & active shows'}</h2></div><Link href="/admin/trade-events" className="text-sm font-black text-blue-700">+ Add event</Link></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((event) => {
        const group = model.groups.find((item) => item.event.id === event.id);
        const ids = group ? [group.event, ...group.duplicates].map((item) => String(item.id)) : [String(event.id)];
        return <EventWorkspaceCard key={event.id} event={event} duplicateCount={group?.duplicates.length ?? 0} captured={entries.filter((entry) => ids.includes(String(entry.trade_event_id ?? ''))).length} crmLeads={leads.filter((lead) => ids.includes(String(lead.trade_event_id ?? ''))).length} />;
      })}
      {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:col-span-2 xl:col-span-3"><CalendarDays className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 font-black">No events in this view</p></div> : null}
    </div>
  </section>;
}
