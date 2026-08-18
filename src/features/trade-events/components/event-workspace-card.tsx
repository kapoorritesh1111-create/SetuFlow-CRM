import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { eventBooth, eventReadiness, getTradeEventStatus, getEventTimingLabel, type CommandCenterEvent } from '@/lib/trade-events/command-center';

function eventRange(event: CommandCenterEvent) {
  if (!event.starts_on) return 'Dates not set';
  if (!event.ends_on || event.starts_on === event.ends_on) return formatDate(event.starts_on);
  return `${formatDate(event.starts_on)} – ${formatDate(event.ends_on)}`;
}

function statusCopy(status: ReturnType<typeof getTradeEventStatus>) {
  if (status === 'live') return 'Live now';
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'completed') return 'Completed';
  return 'Dates needed';
}

export function EventWorkspaceCard({ event, captured, crmLeads, duplicateCount = 0 }: { event: CommandCenterEvent; captured: number; crmLeads: number; duplicateCount?: number }) {
  const location = [event.city, event.country].filter(Boolean).join(', ') || 'Location TBD';
  const status = getTradeEventStatus(event);
  const readiness = eventReadiness(event);
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">{statusCopy(status)} · {getEventTimingLabel(event)}</p>
          <h3 className="mt-1 truncate text-lg font-black text-slate-950">{event.name}</h3>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">{readiness.score}% ready</span>
      </div>
      <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-500"><MapPin className="h-4 w-4" />{location}</p>
      <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-500"><CalendarDays className="h-4 w-4" />{eventRange(event)}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white p-3 text-center text-sm">
        <div><b className="block text-lg">{captured}</b><span className="text-[10px] font-bold text-slate-500">Captured</span></div>
        <div><b className="block text-lg">{crmLeads}</b><span className="text-[10px] font-bold text-slate-500">CRM leads</span></div>
        <div><b className="block truncate">{eventBooth(event)}</b><span className="text-[10px] font-bold text-slate-500">Booth</span></div>
      </div>
      {duplicateCount > 0 ? <p className="mt-2 text-[11px] font-bold text-amber-700">{duplicateCount} exact duplicate {duplicateCount === 1 ? 'record' : 'records'} safely grouped.</p> : null}
      <Link href={`/leads?view=trade-event&eventId=${encodeURIComponent(String(event.id))}`} className="mt-3 flex min-h-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-sm font-black text-blue-700">Open event leads</Link>
    </article>
  );
}
