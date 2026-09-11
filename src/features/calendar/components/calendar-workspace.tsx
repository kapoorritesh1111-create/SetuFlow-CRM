'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Link = { entity_type: string; entity_id: string; label?: string | null };
type Event = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  meeting_provider: string;
  meeting_url?: string | null;
  calendar_attendees?: Array<{ email: string; name?: string | null; rsvp_status: string }>;
  calendar_reminders?: Array<{ minutes_before: number; channel: string }>;
  calendar_event_links?: Link[];
};
type View = 'month' | 'week' | 'day' | 'agenda';

const fmtTime = (value: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isoLocal = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const startOfWeek = (value: Date) => { const date = new Date(value); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - date.getDay()); return date; };
const addDays = (value: Date, count: number) => { const date = new Date(value); date.setDate(date.getDate() + count); return date; };

function matchesSearch(event: Event, query: string) {
  if (!query) return true;
  const haystack = [event.title, event.description, event.location, ...(event.calendar_attendees ?? []).flatMap(attendee => [attendee.email, attendee.name])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function CalendarWorkspace({ userName }: { userName: string }) {
  const params = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState('');

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/calendar', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load calendar.');
      setEvents(payload.events ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load calendar.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (params.get('compose') === '1') { setSelected(null); setOpen(true); } }, [params]);
  useEffect(() => {
    const onSearch = (event: Event) => setQuery(String((event as unknown as CustomEvent).detail ?? '').trim());
    window.addEventListener('setu-calendar-search', onSearch as unknown as EventListener);
    return () => window.removeEventListener('setu-calendar-search', onSearch as unknown as EventListener);
  }, []);

  const filteredEvents = useMemo(() => events.filter(event => matchesSearch(event, query)), [events, query]);
  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [cursor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index)), [cursor]);

  const title = view === 'day'
    ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(cursor)
    : view === 'week'
      ? `${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(weekDays[0])} – ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(weekDays[6])}`
      : new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(cursor);

  function move(direction: number) {
    const date = new Date(cursor);
    if (view === 'month') date.setMonth(date.getMonth() + direction);
    else if (view === 'week') date.setDate(date.getDate() + 7 * direction);
    else date.setDate(date.getDate() + direction);
    setCursor(date);
  }
  function openEvent(event: Event) { setSelected(event); setCursor(new Date(event.starts_at)); setOpen(true); }
  function createOn(date: Date) { setCursor(date); setSelected(null); setOpen(true); }

  return (
    <div className="flex h-full min-h-0 bg-white text-slate-900">
      <aside className="hidden w-[218px] shrink-0 border-r border-slate-200 bg-slate-50/70 xl:flex xl:flex-col">
        <div className="border-b border-slate-200 p-4">
          <button onClick={() => { setSelected(null); setOpen(true); }} className="flex h-10 w-full items-center justify-center rounded-lg bg-[#0b2e4a] text-sm font-black text-white shadow-sm hover:bg-[#123f61]">+ New event</button>
        </div>
        <MiniMonth cursor={cursor} onSelect={date => { setCursor(date); setView('day'); }} />
        <div className="border-t border-slate-200 p-4">
          <div className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">My calendars</div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-700"><span className="h-2.5 w-2.5 rounded-sm bg-[#0c7fff]" />{userName}</div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[58px] flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <button onClick={() => { setSelected(null); setOpen(true); }} className="h-9 rounded-lg bg-[#0b2e4a] px-4 text-xs font-black text-white xl:hidden">+ New event</button>
          <button onClick={() => setCursor(new Date())} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700 hover:bg-slate-50">Today</button>
          <button onClick={() => move(-1)} aria-label="Previous period" className="h-9 w-9 rounded-lg border border-slate-200 text-lg font-black text-slate-600 hover:bg-slate-50">‹</button>
          <button onClick={() => move(1)} aria-label="Next period" className="h-9 w-9 rounded-lg border border-slate-200 text-lg font-black text-slate-600 hover:bg-slate-50">›</button>
          <h1 className="min-w-[180px] flex-1 px-1 text-base font-black text-slate-900">{title}</h1>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(['month', 'week', 'day', 'agenda'] as View[]).map(item => <button key={item} onClick={() => setView(item)} className={`rounded-md px-3 py-1.5 text-[11px] font-black capitalize ${view === item ? 'bg-white text-[#0b2e4a] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{item}</button>)}
          </div>
        </header>

        {query ? <div className="border-b border-blue-100 bg-blue-50/60 px-4 py-2 text-xs font-bold text-blue-800">Showing calendar results for “{query}” · {filteredEvents.length} match{filteredEvents.length === 1 ? '' : 'es'}</div> : null}
        {loadError ? <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{loadError} <button onClick={() => void load()} className="ml-2 underline">Try again</button></div> : null}

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? <div className="p-12 text-center text-sm font-bold text-slate-400">Loading your calendar…</div>
            : view === 'month' ? <MonthView days={monthDays} cursor={cursor} events={filteredEvents} onEvent={openEvent} onDay={createOn} />
              : view === 'week' ? <WeekView days={weekDays} events={filteredEvents} onEvent={openEvent} onDay={createOn} />
                : view === 'day' ? <DayView day={cursor} events={filteredEvents} onEvent={openEvent} onCreate={createOn} />
                  : <AgendaView events={filteredEvents} onEvent={openEvent} />}
        </div>
      </section>

      {open ? <EventDrawer event={selected} defaultDate={cursor} guest={params.get('guest') || ''} lead={params.get('lead') || ''} mailThread={params.get('mailThread') || ''} onClose={() => setOpen(false)} onSaved={async () => { setOpen(false); await load(); }} /> : null}
    </div>
  );
}

function MiniMonth({ cursor, onSelect }: { cursor: Date; onSelect: (date: Date) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));
  return <div className="p-4"><div className="mb-3 text-xs font-black text-slate-800">{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(cursor)}</div><div className="grid grid-cols-7 gap-y-1 text-center"><>{['S','M','T','W','T','F','S'].map((day, index) => <div key={`${day}-${index}`} className="text-[9px] font-black text-slate-400">{day}</div>)}</>{days.map((date, index) => <button key={index} onClick={() => onSelect(date)} className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${sameDay(date, new Date()) ? 'bg-[#0c7fff] text-white' : date.getMonth() === cursor.getMonth() ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300'}`}>{date.getDate()}</button>)}</div></div>;
}

function MonthView({ days, cursor, events, onEvent, onDay }: { days: Date[]; cursor: Date; events: Event[]; onEvent: (event: Event) => void; onDay: (date: Date) => void }) {
  return <><div className="sticky top-0 z-10 grid grid-cols-7 border-b border-slate-200 bg-slate-50">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div key={day} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">{day}</div>)}</div><div className="grid min-h-[720px] grid-cols-7">{days.map((date, index) => { const dayEvents = events.filter(event => sameDay(new Date(event.starts_at), date)); return <div key={index} onDoubleClick={() => onDay(date)} className={`min-h-[116px] border-b border-r border-slate-100 p-2 ${date.getMonth() !== cursor.getMonth() ? 'bg-slate-50/55' : 'bg-white'}`}><div className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${sameDay(date, new Date()) ? 'bg-[#0c7fff] text-white' : date.getMonth() === cursor.getMonth() ? 'text-slate-700' : 'text-slate-300'}`}>{date.getDate()}</div><div className="space-y-1">{dayEvents.slice(0, 4).map(event => <button key={event.id} onClick={() => onEvent(event)} className="block w-full truncate rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-left text-[10px] font-bold text-blue-950 hover:bg-blue-100"><span className="mr-1 text-blue-500">{fmtTime(event.starts_at)}</span>{event.title}</button>)}{dayEvents.length > 4 ? <div className="px-1 text-[9px] font-bold text-slate-400">+{dayEvents.length - 4} more</div> : null}</div></div>; })}</div></>;
}

function WeekView({ days, events, onEvent, onDay }: { days: Date[]; events: Event[]; onEvent: (event: Event) => void; onDay: (date: Date) => void }) {
  return <div className="grid min-h-full grid-cols-7 divide-x divide-slate-200"><>{days.map(date => { const dayEvents = events.filter(event => sameDay(new Date(event.starts_at), date)).sort((a,b) => +new Date(a.starts_at) - +new Date(b.starts_at)); return <section key={date.toISOString()} className="min-w-0 bg-white"><button onClick={() => onDay(date)} className="sticky top-0 z-10 w-full border-b border-slate-200 bg-slate-50 px-2 py-3 text-center hover:bg-slate-100"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)}</div><div className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${sameDay(date,new Date()) ? 'bg-[#0c7fff] text-white' : 'text-slate-800'}`}>{date.getDate()}</div></button><div className="space-y-2 p-2">{dayEvents.length ? dayEvents.map(event => <button key={event.id} onClick={() => onEvent(event)} className="w-full rounded-lg border border-blue-100 bg-blue-50 p-2 text-left hover:bg-blue-100"><div className="text-[10px] font-black text-blue-600">{fmtTime(event.starts_at)}–{fmtTime(event.ends_at)}</div><div className="mt-0.5 truncate text-[11px] font-black text-blue-950">{event.title}</div>{event.location ? <div className="mt-1 truncate text-[9px] text-blue-700">{event.location}</div> : null}</button>) : <button onClick={() => onDay(date)} className="w-full rounded-lg border border-dashed border-slate-200 px-2 py-5 text-[10px] font-bold text-slate-300 hover:border-blue-200 hover:text-blue-500">No events</button>}</div></section>; })}</></div>;
}

function DayView({ day, events, onEvent, onCreate }: { day: Date; events: Event[]; onEvent: (event: Event) => void; onCreate: (date: Date) => void }) {
  const list = events.filter(event => sameDay(new Date(event.starts_at), day)).sort((a,b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  return <div className="mx-auto max-w-4xl p-5"><div className="space-y-2">{list.length ? list.map(event => <EventRow key={event.id} event={event} onClick={() => onEvent(event)} />) : <button onClick={() => onCreate(day)} className="w-full rounded-2xl border border-dashed border-slate-200 py-20 text-center"><div className="text-base font-black text-slate-700">Your schedule is clear</div><div className="mt-1 text-xs font-bold text-slate-400">Create an event for this day</div></button>}</div></div>;
}

function AgendaView({ events, onEvent }: { events: Event[]; onEvent: (event: Event) => void }) {
  const list = [...events].sort((a,b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  return <div className="mx-auto max-w-5xl p-5">{list.length ? <div className="space-y-2">{list.map(event => <EventRow key={event.id} event={event} onClick={() => onEvent(event)} showDate />)}</div> : <div className="py-20 text-center text-sm font-bold text-slate-400">No matching calendar events.</div>}</div>;
}

function EventRow({ event, onClick, showDate = false }: { event: Event; onClick: () => void; showDate?: boolean }) {
  return <button onClick={onClick} className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-200 hover:bg-blue-50/30"><div className="w-24 shrink-0"><div className="text-sm font-black text-slate-900">{fmtTime(event.starts_at)}</div>{showDate ? <div className="mt-1 text-[10px] font-bold text-slate-400">{new Date(event.starts_at).toLocaleDateString()}</div> : null}</div><div className="min-w-0 flex-1"><div className="truncate font-black text-slate-900">{event.title}</div><div className="mt-1 truncate text-xs text-slate-500">{event.location || (event.meeting_provider === 'zoom' ? 'Online meeting' : 'Calendar event')}</div></div>{event.meeting_url ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">JOIN</span> : null}</button>;
}

function EventDrawer({ event, defaultDate, guest, lead, mailThread, onClose, onSaved }: { event: Event | null; defaultDate: Date; guest: string; lead: string; mailThread: string; onClose: () => void; onSaved: () => void }) {
  const start = new Date(defaultDate); start.setHours(10,0,0,0); const end = new Date(start); end.setMinutes(end.getMinutes()+30);
  const [title,setTitle] = useState(event?.title ?? '');
  const [startsAt,setStartsAt] = useState(isoLocal(event ? new Date(event.starts_at) : start));
  const [endsAt,setEndsAt] = useState(isoLocal(event ? new Date(event.ends_at) : end));
  const [guests,setGuests] = useState(event?.calendar_attendees?.map(attendee => attendee.email).join(', ') || guest);
  const [provider,setProvider] = useState(event?.meeting_provider ?? 'zoom');
  const [url,setUrl] = useState(event?.meeting_url ?? '');
  const [notes,setNotes] = useState(event?.description ?? '');
  const [reminder,setReminder] = useState(event?.calendar_reminders?.[0]?.minutes_before ?? 15);
  const [emailReminder,setEmailReminder] = useState(event?.calendar_reminders?.some(item => item.channel === 'email') ?? false);
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState('');
  const links = event?.calendar_event_links ?? [];

  async function save(allowConflict = false) {
    setSaving(true); setNotice('');
    const contextLinks = [...links,
      ...(lead && !links.some(item => item.entity_type === 'lead') ? [{ entityType: 'lead', entityId: lead, label: 'Lead' }] : []),
      ...(mailThread && !links.some(item => item.entity_type === 'mail_thread') ? [{ entityType: 'mail_thread', entityId: mailThread, label: 'Setu Mail conversation' }] : []),
    ];
    const payload = { id: event?.id, title, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, meetingProvider: provider, meetingUrl: url, description: notes, attendees: guests.split(',').map(item => item.trim()).filter(Boolean), reminderMinutes: reminder, reminderChannels: emailReminder ? ['in_app','email'] : ['in_app'], links: contextLinks, allowConflict };
    const response = await fetch('/api/calendar', { method: event ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (response.status === 409 && !allowConflict) { setSaving(false); if (confirm(`${result.error}\n\nCreate it anyway?`)) return save(true); return; }
    if (!response.ok) { setNotice(result.error || 'Unable to save event.'); setSaving(false); return; }
    if (!event && provider === 'zoom') { const zoom = await fetch('/api/calendar/zoom/meeting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventId: result.event.id }) }); if (!zoom.ok) setNotice('Event created. Connect Zoom in Meeting settings to add a Zoom link.'); }
    if (!event && guests.trim()) await fetch('/api/calendar/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventId: result.event.id }) });
    setSaving(false); onSaved();
  }
  async function remove() { if (!event || !confirm('Delete this event?')) return; await fetch(`/api/calendar?id=${event.id}`, { method: 'DELETE' }); onSaved(); }

  return <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/25 backdrop-blur-[2px]" onMouseDown={mouse => { if (mouse.currentTarget === mouse.target) onClose(); }}><aside className="h-full w-full max-w-[520px] overflow-y-auto bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-5"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">{event ? 'Calendar event' : 'New event'}</div><h2 className="mt-1 text-xl font-black text-slate-950">{event ? 'Event details' : 'Schedule something'}</h2></div><button onClick={onClose} className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-bold text-slate-500">×</button></div><div className="space-y-5 p-6">{notice ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{notice}</div> : null}<Field label="Title"><input value={title} onChange={input => setTitle(input.target.value)} placeholder="Packaging review" className="input"/></Field><div className="grid grid-cols-2 gap-3"><Field label="Starts"><input type="datetime-local" value={startsAt} onChange={input => setStartsAt(input.target.value)} className="input"/></Field><Field label="Ends"><input type="datetime-local" value={endsAt} onChange={input => setEndsAt(input.target.value)} className="input"/></Field></div><Field label="Guests"><input value={guests} onChange={input => setGuests(input.target.value)} placeholder="buyer@company.com" className="input"/></Field><Field label="Meeting"><select value={provider} onChange={input => setProvider(input.target.value)} className="input"><option value="zoom">Zoom — recommended</option><option value="custom">Custom meeting link</option><option value="in_person">In person</option><option value="none">No meeting</option></select></Field>{provider === 'custom' ? <Field label="Meeting link"><input value={url} onChange={input => setUrl(input.target.value)} className="input"/></Field> : null}<div className="grid grid-cols-2 gap-3"><Field label="Reminder"><select value={reminder} onChange={input => setReminder(Number(input.target.value))} className="input"><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={1440}>1 day</option></select></Field><Field label="Delivery"><label className="flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={emailReminder} onChange={input => setEmailReminder(input.target.checked)}/> Email too</label></Field></div><Field label="Notes"><textarea value={notes} onChange={input => setNotes(input.target.value)} rows={4} className="input resize-none"/></Field>{(lead || mailThread || links.length) ? <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><div className="text-xs font-black text-blue-950">CRM context</div><p className="mt-1 text-xs text-blue-700">This meeting stays connected to the customer conversation and related CRM work.</p></div> : null}{event?.meeting_url ? <a href={event.meeting_url} target="_blank" rel="noreferrer" className="block rounded-xl bg-blue-600 py-3 text-center text-sm font-black text-white">Join meeting</a> : null}</div><div className="sticky bottom-0 flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">{event ? <button onClick={remove} className="text-sm font-black text-rose-600">Delete</button> : <span/>}<div className="flex gap-2"><button onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-600">Cancel</button><button disabled={saving || !title} onClick={() => void save()} className="h-10 rounded-xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-40">{saving ? 'Saving…' : event ? 'Save changes' : 'Create event'}</button></div></div></aside><style jsx global>{`.input{width:100%;border:1px solid rgb(226 232 240);border-radius:12px;background:white;padding:10px 12px;font-size:14px;color:rgb(15 23 42);outline:none}.input:focus{border-color:rgb(96 165 250);box-shadow:0 0 0 3px rgb(219 234 254)}`}</style></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-700">{label}</span>{children}</label>; }
