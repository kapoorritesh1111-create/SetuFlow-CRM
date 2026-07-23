import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/utils';
import { createEnrichedTradeEvent, updateEnrichedTradeEvent } from '@/features/admin/server/trade-event-actions';

const inputClass = 'min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const buttonClass = 'inline-flex min-h-8 items-center justify-center rounded-ctl bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-800';
const secondaryButtonClass = 'inline-flex min-h-8 items-center justify-center rounded-ctl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50';

type TradeEventRow = Record<string, any>;

function captureDefaults(event: TradeEventRow) {
  const defaults = event.capture_defaults;
  return defaults && typeof defaults === 'object' && !Array.isArray(defaults) ? defaults as Record<string, unknown> : {};
}

function defaultText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function eventStatus(event: TradeEventRow) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startsOn = event.starts_on ? new Date(event.starts_on) : null;
  const endsOn = event.ends_on ? new Date(event.ends_on) : startsOn;
  if (!startsOn) return { label: 'Draft', tone: 'neutral' as const };
  if (endsOn && endsOn < now) return { label: 'Completed', tone: 'success' as const };
  if (startsOn <= now) return { label: 'Live', tone: 'info' as const };
  if (startsOn.getTime() - now.getTime() < 1000 * 60 * 60 * 24 * 90) return { label: 'Upcoming', tone: 'info' as const };
  return { label: 'Scheduled', tone: 'neutral' as const };
}

function EventFields({ event }: { event?: TradeEventRow }) {
  const defaults = event ? captureDefaults(event) : {};
  return (
    <>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Event name
        <input className={`${inputClass} mt-1 w-full`} name="name" defaultValue={event?.name ?? ''} placeholder="e.g. Bharat Tex 2026" required />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          City
          <input className={`${inputClass} mt-1 w-full`} name="city" defaultValue={event?.city ?? ''} placeholder="New Delhi" />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Country
          <input className={`${inputClass} mt-1 w-full`} name="country" defaultValue={event?.country ?? ''} placeholder="India" />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Start date
          <input type="date" className={`${inputClass} mt-1 w-full`} name="starts_on" defaultValue={event?.starts_on ?? ''} />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          End date
          <input type="date" className={`${inputClass} mt-1 w-full`} name="ends_on" defaultValue={event?.ends_on ?? ''} />
        </label>
      </div>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Booth / Stand
        <input className={`${inputClass} mt-1 w-full`} name="booth_number" defaultValue={event?.booth_number ?? ''} placeholder="e.g. Hall 12, Booth 12-S03" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Event image URL
        <input className={`${inputClass} mt-1 w-full`} name="image_url" defaultValue={defaultText(defaults.image_url)} placeholder="https://.../event-banner.jpg" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Event website URL
        <input className={`${inputClass} mt-1 w-full`} name="website_url" defaultValue={defaultText(defaults.website_url)} placeholder="https://official-event-site.com" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Notes
        <textarea className={`${inputClass} mt-1 w-full`} name="notes" rows={3} defaultValue={event?.notes ?? ''} />
      </label>
    </>
  );
}

export function TradeEventsAdminWorkspace({ events }: { events: TradeEventRow[] }) {
  return (
    <div className="space-y-6" id="trade-events-top">
      <SectionCard
        title="Upcoming events"
        eyebrow="Operations"
        description="Maintain live trade events with booth, official website, and card image enrichment for importer/exporter teams."
        actions={<a href="#add-event-drawer" className={buttonClass}>+ Add event</a>}
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="mb-4 text-5xl">🏭</span>
            <p className="mb-4 max-w-sm text-sm text-slate-500">No trade events configured. Add exhibitions and conferences to enable source attribution for scanned contacts.</p>
            <a href="#add-event-drawer" className={buttonClass}>+ Add your first event</a>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const status = eventStatus(event);
              const defaults = captureDefaults(event);
              const hasImage = Boolean(defaults.image_url);
              const hasWebsite = Boolean(defaults.website_url);
              return (
                <div key={event.id} className="flex items-center gap-2.5 rounded-ctl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:shadow-[0_2px_6px_rgba(15,23,42,0.05)]">
                  <span aria-hidden="true" className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm">🎪</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900">{event.name}</p>
                    <p className="truncate text-[10.5px] text-slate-500">
                      {[event.city, event.country].filter(Boolean).join(', ') || 'Location TBC'} · {event.starts_on ? formatDate(event.starts_on) : 'Unscheduled'}{event.ends_on ? ` – ${formatDate(event.ends_on)}` : ''}
                    </p>
                    <p className="mt-1 truncate text-[10.5px] font-semibold text-slate-500">Booth: {event.booth_number || 'Not assigned'} · Image: {hasImage ? 'Ready' : 'Pending'} · Website: {hasWebsite ? 'Ready' : 'Pending'}</p>
                  </div>
                  <StatusBadge label={status.label} tone={status.tone as any} dot={false} />
                  <a href={`#event-${event.id}`} className="shrink-0 text-[10px] font-semibold text-slate-500 transition hover:text-teal-600">Edit ›</a>
                </div>
              );
            })}
          </div>
        )}

        {events.map((event) => (
          <div key={event.id} id={`event-${event.id}`} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
            <a href="#trade-events-top" className="absolute inset-0" aria-label="Close" />
            <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Edit event</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">{event.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">Booth, image, and official website details show on Trade Events cards.</p>
                </div>
                <a href="#trade-events-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">X</a>
              </div>
              <form action={updateEnrichedTradeEvent} className="flex flex-1 flex-col overflow-hidden">
                <input type="hidden" name="id" value={event.id} />
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  <EventFields event={event} />
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                  <a href="#trade-events-top" className={secondaryButtonClass}>Cancel</a>
                  <button type="submit" className={buttonClass}>Save event</button>
                </div>
              </form>
            </aside>
          </div>
        ))}
      </SectionCard>

      <div id="add-event-drawer" className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
        <a href="#trade-events-top" className="absolute inset-0" aria-label="Close" />
        <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Add trade event</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">New event</h2>
              <p className="mt-1 text-sm text-slate-500">Add official event data once, then enrich the card for booth teams.</p>
            </div>
            <a href="#trade-events-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">X</a>
          </div>
          <form action={createEnrichedTradeEvent} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <EventFields />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <a href="#trade-events-top" className={secondaryButtonClass}>Cancel</a>
              <button type="submit" className={buttonClass}>Add event</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
