'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlignLeft, Bell, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock3, EyeOff, Link2, MapPin, Save, Settings2, Trash2, UsersRound, Video, X } from 'lucide-react';
import { dateTimeLocalValue, localDateTimeToUtc, parseRecurrenceRule, recurrencePresetRule, wallClockParts } from '@/lib/calendar/recurrence';

type ShowAs = 'busy' | 'free' | 'tentative' | 'out_of_office' | 'working_elsewhere';
type RepeatPreset = 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly';
type EditScope = 'occurrence' | 'series';
type Link = { entity_type: string; entity_id: string; label?: string | null };
type Attendee = { email: string; name?: string | null; attendee_type?: 'required' | 'optional'; rsvp_status: string; responded_at?: string | null };
type CalendarPreference = { timezone: string; defaultReminderMinutes: number; defaultReminderChannels: string[] };
type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  is_all_day?: boolean;
  visibility?: 'organization' | 'private';
  show_as?: ShowAs;
  meeting_provider: string;
  meeting_url?: string | null;
  recurrence_rule?: string | null;
  recurrence_series_id?: string | null;
  recurrence_original_start?: string | null;
  recurrence_virtual?: boolean;
  source_event_id?: string | null;
  calendar_attendees?: Attendee[];
  calendar_reminders?: Array<{ minutes_before: number; channel: string }>;
  calendar_event_links?: Link[];
};
type Availability = { weekday: number; start_time: string; end_time: string; timezone: string; is_active?: boolean };
type View = 'month' | 'week' | 'day' | 'agenda';
type Positioned = { event: CalendarEvent; top: number; height: number; column: number; columns: number };

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_PICKER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';
const HOUR_HEIGHT = 52;
const GUTTER = 58;

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const nominalDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const eventDateKey = (value: string | Date, timeZone: string) => wallClockParts(value, timeZone).dateKey;
const eventSameDay = (value: string, day: Date, timeZone: string) => eventDateKey(value, timeZone) === nominalDateKey(day);
const addDays = (date: Date, count: number) => { const next = new Date(date); next.setDate(next.getDate() + count); return next; };
const weekStart = (date: Date) => { const next = new Date(date); next.setHours(0, 0, 0, 0); next.setDate(next.getDate() - next.getDay()); return next; };
const isoLocal = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fmtTime = (value: string | Date, timeZone?: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) }).format(typeof value === 'string' ? new Date(value) : value);
const minutesOf = (value: string) => { const [hour, minute] = value.slice(0, 5).split(':').map(Number); return hour * 60 + minute; };
const eventMinutes = (value: string, timeZone: string) => { const parts = wallClockParts(value, timeZone); return parts.hour * 60 + parts.minute; };
const atMinutes = (date: Date, minutes: number) => { const next = new Date(date); next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0); return next; };
const parseEmails = (value: string) => [...new Set(value.split(/[;,\n]/).map(item => item.trim().toLowerCase()).filter(item => item.includes('@')))];

function defaultAvailability(timezone: string): Availability[] {
  return [1, 2, 3, 4, 5].map(weekday => ({ weekday, start_time: DEFAULT_START, end_time: DEFAULT_END, timezone, is_active: true }));
}

function matchesSearch(event: CalendarEvent, query: string) {
  if (!query) return true;
  return [event.title, event.description, event.location, ...(event.calendar_attendees ?? []).flatMap(attendee => [attendee.email, attendee.name])]
    .filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase());
}

function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) { return aStart < bEnd && aEnd > bStart; }

function layoutEvents(events: CalendarEvent[], startMinutes: number, totalHeight: number, timeZone: string): Positioned[] {
  const timed = events.filter(event => !event.is_all_day).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const active: Array<{ end: number; column: number }> = [];
  const rows: Array<Positioned & { startValue: number; endValue: number }> = [];
  for (const event of timed) {
    const startValue = eventMinutes(event.starts_at, timeZone);
    const endValue = eventMinutes(event.ends_at, timeZone);
    for (let i = active.length - 1; i >= 0; i -= 1) if (active[i].end <= startValue) active.splice(i, 1);
    const used = new Set(active.map(item => item.column));
    let column = 0;
    while (used.has(column)) column += 1;
    active.push({ end: endValue, column });
    const top = Math.max(0, ((startValue - startMinutes) / 60) * HOUR_HEIGHT);
    const height = Math.max(24, Math.min(totalHeight - top, ((endValue - startValue) / 60) * HOUR_HEIGHT));
    rows.push({ event, top, height, column, columns: 1, startValue, endValue });
  }
  return rows.map(row => {
    const maxCollisionColumn = rows.filter(other => other !== row && other.startValue < row.endValue && other.endValue > row.startValue).reduce((max, other) => Math.max(max, other.column), row.column);
    return { event: row.event, top: row.top, height: row.height, column: row.column, columns: maxCollisionColumn + 1 };
  });
}

export function CalendarBatchOneWorkspace({ userName }: { userName: string }) {
  const params = useSearchParams();
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [calendarTimezone, setCalendarTimezone] = useState(browserTimezone);
  const [preference, setPreference] = useState<CalendarPreference>({ timezone: browserTimezone, defaultReminderMinutes: 15, defaultReminderChannels: ['in_app'] });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availability, setAvailability] = useState<Availability[]>(() => defaultAvailability(browserTimezone));
  const [view, setView] = useState<View>('week');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true); setLoadError('');
    try {
      const [calendarResponse, availabilityResponse] = await Promise.all([
        fetch('/api/calendar', { cache: 'no-store' }),
        fetch('/api/calendar/availability', { cache: 'no-store' }),
      ]);
      const calendarPayload = await calendarResponse.json();
      const availabilityPayload = await availabilityResponse.json();
      if (!calendarResponse.ok) throw new Error(calendarPayload.error || 'Unable to load calendar.');
      setEvents(calendarPayload.events ?? []);
      if (calendarPayload.preferences?.timezone) {
        setCalendarTimezone(calendarPayload.preferences.timezone);
        setPreference(calendarPayload.preferences);
      }
      if (availabilityResponse.ok && Array.isArray(availabilityPayload.availability) && availabilityPayload.availability.length) setAvailability(availabilityPayload.availability);
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Unable to load calendar.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (params.get('compose') === '1') { setSelected(null); setDraftStart(new Date()); setComposerOpen(true); } }, [params]);
  useEffect(() => { const onSearch = (event: Event) => setQuery(String((event as CustomEvent).detail ?? '').trim()); window.addEventListener('setu-calendar-search', onSearch); return () => window.removeEventListener('setu-calendar-search', onSearch); }, []);

  const filteredEvents = useMemo(() => events.filter(event => matchesSearch(event, query)), [events, query]);
  const allWeekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart(cursor), index)), [cursor]);
  const workdayNumbers = useMemo(() => availability.filter(row => row.is_active !== false).map(row => row.weekday).sort((a, b) => a - b), [availability]);
  const workWeekDays = useMemo(() => allWeekDays.filter(day => workdayNumbers.includes(day.getDay())), [allWeekDays, workdayNumbers]);
  const monthDays = useMemo(() => { const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); return Array.from({ length: 42 }, (_, index) => addDays(weekStart(first), index)); }, [cursor]);
  const nextEvent = useMemo(() => events.filter(event => new Date(event.ends_at) >= new Date()).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0] ?? null, [events]);
  const title = view === 'day' ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(cursor) : view === 'week' ? `${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(allWeekDays[0])} – ${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(allWeekDays[6])}` : new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(cursor);

  function move(direction: number) { const date = new Date(cursor); if (view === 'month') date.setMonth(date.getMonth() + direction); else if (view === 'week') date.setDate(date.getDate() + direction * 7); else date.setDate(date.getDate() + direction); setCursor(date); }
  function createAt(date: Date) { setSelected(null); setDraftStart(date); setCursor(date); setComposerOpen(true); }
  function edit(event: CalendarEvent) { setSelected(event); setDraftStart(null); setCursor(new Date(event.starts_at)); setComposerOpen(true); }
  const visibleDays = workWeekDays.length ? workWeekDays : allWeekDays.slice(1, 6);

  return <div className="flex h-full min-h-0 bg-white text-slate-900">
    <aside className="hidden w-[244px] shrink-0 border-r border-slate-200 bg-[#f7f8fa] xl:flex xl:flex-col">
      <div className="border-b border-slate-200 p-3"><button onClick={() => createAt(new Date())} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"><CalendarPlus size={16}/>New event</button></div>
      <MiniMonth cursor={cursor} onSelect={date => { setCursor(date); setView('day'); }}/>
      <div className="border-t border-slate-200 px-4 py-3"><div className="text-[11px] font-bold text-slate-900">My calendars</div><label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked readOnly className="accent-[#0c7fff]"/><span className="h-2.5 w-2.5 rounded-full bg-[#0c7fff]"/><span className="truncate">{userName}</span></label></div>
      <div className="border-t border-slate-200 px-4 py-3"><button onClick={() => setSettingsOpen(true)} className="flex w-full items-center gap-2 text-left text-xs font-bold text-slate-700 hover:text-[#0b2e4a]"><Clock3 size={15}/>Working hours<Settings2 size={14} className="ml-auto text-slate-400"/></button><div className="mt-2 text-[10px] font-semibold leading-5 text-slate-400">{workdayNumbers.length ? workdayNumbers.map(day => DAY_SHORT[day]).join(', ') : 'No work days'}<br/>{sameHours(availability) ? `${fmtClock(availability[0].start_time)}–${fmtClock(availability[0].end_time)}` : 'Custom hours'}<br/>{calendarTimezone}</div></div>
      <div className="mt-auto border-t border-slate-200 p-4"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Next up</div>{nextEvent ? <button onClick={() => edit(nextEvent)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-blue-200"><div className="truncate text-xs font-bold text-slate-800">{nextEvent.title}</div><div className="mt-1 text-[10px] font-semibold text-blue-600">{fmtTime(nextEvent.starts_at, calendarTimezone)} · {calendarTimezone}</div></button> : <div className="mt-2 text-[10px] font-semibold text-slate-400">Nothing scheduled next.</div>}</div>
    </aside>

    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-[50px] items-center gap-2 border-b border-slate-200 bg-[#f4f5f7] px-3"><button onClick={() => createAt(new Date())} className="h-8 rounded-lg bg-white px-3 text-xs font-bold text-slate-800 ring-1 ring-slate-200 xl:hidden">+ New event</button><button onClick={() => setCursor(new Date())} className="h-8 rounded-md px-3 text-xs font-bold text-slate-700 hover:bg-white">Today</button><button onClick={() => move(-1)} aria-label="Previous period" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white"><ChevronLeft size={17}/></button><button onClick={() => move(1)} aria-label="Next period" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white"><ChevronRight size={17}/></button><h1 className="min-w-[240px] flex-1 px-1 text-sm font-bold text-slate-800">{title}</h1><div className="flex items-center rounded-md border border-slate-200 bg-white p-0.5">{(['month','week','day','agenda'] as View[]).map(item => <button key={item} onClick={() => setView(item)} className={`rounded px-3 py-1.5 text-[11px] font-bold capitalize ${view === item ? 'bg-slate-100 text-[#0b2e4a]' : 'text-slate-500 hover:text-slate-800'}`}>{item}</button>)}</div></header>
      {query ? <div className="border-b border-blue-100 bg-blue-50/60 px-4 py-1.5 text-xs font-semibold text-blue-800">Showing calendar results for “{query}” · {filteredEvents.length} match{filteredEvents.length === 1 ? '' : 'es'}</div> : null}
      {loadError ? <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{loadError} <button onClick={() => void load()} className="ml-2 underline">Try again</button></div> : null}
      <div className="min-h-0 flex-1 overflow-auto">{loading ? <div className="p-12 text-center text-sm font-semibold text-slate-400">Loading your calendar…</div> : view === 'week' ? <DenseWeek days={visibleDays} events={filteredEvents} availability={availability} timeZone={calendarTimezone} onEvent={edit} onCreate={createAt}/> : view === 'month' ? <Month days={monthDays} cursor={cursor} events={filteredEvents} timeZone={calendarTimezone} onEvent={edit} onCreate={createAt}/> : view === 'day' ? <DenseWeek days={[cursor]} events={filteredEvents} availability={availability} timeZone={calendarTimezone} onEvent={edit} onCreate={createAt}/> : <Agenda events={filteredEvents} timeZone={calendarTimezone} onEvent={edit}/>}</div>
    </section>

    {composerOpen ? <EventComposer event={selected} allEvents={events} defaultStart={draftStart ?? cursor} preference={preference} guest={params.get('guest') || ''} lead={params.get('lead') || ''} mailThread={params.get('mailThread') || ''} onClose={() => setComposerOpen(false)} onSaved={async () => { setComposerOpen(false); await load(); }}/> : null}
    {settingsOpen ? <WorkHours availability={availability} timezone={calendarTimezone} onClose={() => setSettingsOpen(false)} onSaved={rows => { setAvailability(rows.length ? rows : defaultAvailability(calendarTimezone)); setSettingsOpen(false); }}/> : null}
  </div>;
}

function sameHours(rows: Availability[]) { return Boolean(rows.length && rows.every(row => row.start_time.slice(0, 5) === rows[0].start_time.slice(0, 5) && row.end_time.slice(0, 5) === rows[0].end_time.slice(0, 5))); }
function fmtClock(value: string) { const [hour, minute] = value.slice(0, 5).split(':').map(Number); const date = new Date(); date.setHours(hour, minute, 0, 0); return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date); }

function MiniMonth({ cursor, onSelect }: { cursor: Date; onSelect: (date: Date) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const days = Array.from({ length: 42 }, (_, index) => addDays(weekStart(first), index));
  return <div className="p-4"><div className="mb-3 text-xs font-bold text-slate-800">{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(cursor)}</div><div className="grid grid-cols-7 gap-y-1 text-center">{DAY_SHORT.map(day => <div key={day} className="text-[9px] font-bold text-slate-400">{day[0]}</div>)}{days.map((date, index) => <button key={index} onClick={() => onSelect(date)} className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${sameDay(date, new Date()) ? 'bg-[#0c7fff] text-white' : date.getMonth() === cursor.getMonth() ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-300'}`}>{date.getDate()}</button>)}</div></div>;
}

function DenseWeek({ days, events, availability, timeZone, onEvent, onCreate }: { days: Date[]; events: CalendarEvent[]; availability: Availability[]; timeZone: string; onEvent: (event: CalendarEvent) => void; onCreate: (date: Date) => void }) {
  const ranges = availability.length ? availability : defaultAvailability(timeZone); const activeRanges = ranges.filter(row => row.is_active !== false); const startMinutes = 0; const endMinutes = 24 * 60; const height = 24 * HOUR_HEIGHT;
  const hours = Array.from({ length: 24 }, (_, index) => index * 60); const slots = Array.from({ length: 48 }, (_, index) => index * 30); const focusSource = activeRanges.length ? activeRanges : ranges; const focusMinutes = Math.max(0, Math.min(...focusSource.map(row => minutesOf(row.start_time))) - 60); const gridRef = useRef<HTMLDivElement | null>(null); const dayKey = days.map(day => day.toISOString().slice(0, 10)).join('|'); const allDay = days.map(day => events.filter(event => event.is_all_day && eventSameDay(event.starts_at, day, timeZone)));
  useEffect(() => { const scroller = gridRef.current?.parentElement; if (!scroller) return; const frame = requestAnimationFrame(() => { scroller.scrollTop = Math.max(0, focusMinutes / 60 * HOUR_HEIGHT - 16); }); return () => cancelAnimationFrame(frame); }, [dayKey, focusMinutes]);
  return <div ref={gridRef} className="min-w-[820px] bg-white">
    <div className="sticky top-0 z-40 bg-white shadow-[0_1px_0_0_rgb(226,232,240)]"><div className="grid" style={{ gridTemplateColumns: `${GUTTER}px repeat(${days.length}, minmax(140px,1fr))` }}><div className="border-r border-slate-200 bg-[#fafafa] px-2 py-2 text-right text-[9px] font-semibold text-slate-400">{timeZone.split('/').pop()?.replace('_', ' ')}</div>{days.map(day => <div key={day.toISOString()} className={`border-r border-slate-200 px-2 py-2 ${sameDay(day, new Date()) ? 'bg-blue-50/40' : 'bg-[#fafafa]'}`}><div className="text-[10px] font-semibold uppercase text-slate-500">{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day)}</div><div className={`mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-bold ${sameDay(day, new Date()) ? 'bg-[#0c7fff] text-white' : 'text-slate-800'}`}>{day.getDate()}</div></div>)}</div><div className="grid min-h-[34px] border-t border-slate-100" style={{ gridTemplateColumns: `${GUTTER}px repeat(${days.length}, minmax(140px,1fr))` }}><div className="border-r border-slate-200 bg-[#fafafa] px-2 py-2 text-right text-[9px] font-semibold text-slate-400">All day</div>{allDay.map((list, index) => <div key={days[index].toISOString()} className="min-h-[34px] border-r border-slate-200 bg-white p-1">{list.slice(0, 2).map(event => <button key={event.id} onClick={() => onEvent(event)} className="mb-1 block w-full truncate rounded bg-blue-100 px-2 py-1 text-left text-[10px] font-bold text-blue-950">{event.title}</button>)}{list.length > 2 ? <div className="px-1 text-[9px] font-semibold text-slate-400">+{list.length - 2} more</div> : null}</div>)}</div></div>
    <div className="relative grid" style={{ gridTemplateColumns: `${GUTTER}px repeat(${days.length}, minmax(140px,1fr))`, height }}><div className="relative border-r border-slate-200 bg-[#fafafa]">{hours.map(minutes => <div key={minutes} className="absolute right-2 -translate-y-2 text-[9px] font-semibold text-slate-400" style={{ top: minutes / 60 * HOUR_HEIGHT }}>{fmtClock(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)}</div>)}</div>{days.map(day => { const work = activeRanges.find(row => row.weekday === day.getDay()); const workStart = work ? minutesOf(work.start_time) : 0; const workEnd = work ? minutesOf(work.end_time) : 0; const positioned = layoutEvents(events.filter(event => !event.is_all_day && eventSameDay(event.starts_at, day, timeZone)), startMinutes, height, timeZone); return <div key={day.toISOString()} className={`relative border-r border-slate-200 ${sameDay(day, new Date()) ? 'bg-blue-50/20' : 'bg-slate-50/45'}`}>{work ? <div className="absolute inset-x-0 bg-white" style={{ top: workStart / 60 * HOUR_HEIGHT, height: Math.max(0, workEnd - workStart) / 60 * HOUR_HEIGHT }}/> : null}{hours.map(minutes => <div key={minutes} className="pointer-events-none absolute inset-x-0 border-t border-slate-200/80" style={{ top: minutes / 60 * HOUR_HEIGHT }}/>) }{slots.map(minutes => <button key={minutes} onClick={() => onCreate(atMinutes(day, minutes))} className="group absolute inset-x-0 z-[2] border-t border-dotted border-slate-100 text-left hover:bg-blue-50/70" style={{ top: minutes / 60 * HOUR_HEIGHT, height: HOUR_HEIGHT / 2 }} aria-label={`Create event ${DAY_NAMES[day.getDay()]} ${fmtClock(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)}`}><span className="pointer-events-none ml-1 hidden rounded bg-white/90 px-1 text-[9px] font-semibold text-blue-500 group-hover:inline">Open</span></button>)}{positioned.map(item => { const width = 100 / item.columns; const left = item.column * width; const tone = item.event.show_as === 'free' ? 'border-slate-400 bg-slate-100 text-slate-700' : item.event.show_as === 'tentative' ? 'border-amber-500 bg-amber-50 text-amber-950' : 'border-[#0c7fff] bg-blue-100 text-blue-950'; return <button key={item.event.id} onClick={() => onEvent(item.event)} className={`absolute z-20 overflow-hidden rounded-[4px] border-l-[4px] px-1.5 py-1 text-left shadow-sm ${tone}`} style={{ top: item.top, height: item.height, left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` }}><div className="truncate text-[10px] font-bold leading-tight">{item.event.title}</div>{item.height >= 34 ? <div className="mt-0.5 truncate text-[9px] font-semibold opacity-75">{fmtTime(item.event.starts_at, timeZone)}–{fmtTime(item.event.ends_at, timeZone)}</div> : null}{item.height >= 50 && item.event.location ? <div className="mt-0.5 truncate text-[9px] opacity-70">{item.event.location}</div> : null}{item.height >= 42 && item.event.meeting_url ? <span className="absolute bottom-1 right-1 rounded bg-white/70 px-1 text-[8px] font-bold text-blue-700">Join</span> : null}</button>; })}</div>; })}<CurrentTime days={days} startMinutes={startMinutes} endMinutes={endMinutes} timeZone={timeZone}/></div>
  </div>;
}

function CurrentTime({ days, startMinutes, endMinutes, timeZone }: { days: Date[]; startMinutes: number; endMinutes: number; timeZone: string }) {
  const now = new Date(); const nowParts = wallClockParts(now, timeZone); const todayKey = nowParts.dateKey; if (!days.some(day => nominalDateKey(day) === todayKey)) return null; const minutes = nowParts.hour * 60 + nowParts.minute; if (minutes < startMinutes || minutes > endMinutes) return null;
  return <div className="pointer-events-none absolute z-30 h-px bg-[#0c7fff]" style={{ left: GUTTER, right: 0, top: (minutes - startMinutes) / 60 * HOUR_HEIGHT }}><span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#0c7fff]"/><span className="absolute -left-[52px] -top-2 bg-white pr-1 text-[9px] font-bold text-[#0c7fff]">{fmtTime(now, timeZone)}</span></div>;
}

function Month({ days, cursor, events, timeZone, onEvent, onCreate }: { days: Date[]; cursor: Date; events: CalendarEvent[]; timeZone: string; onEvent: (event: CalendarEvent) => void; onCreate: (date: Date) => void }) {
  return <><div className="sticky top-0 z-10 grid grid-cols-7 border-b border-slate-200 bg-[#fafafa]">{DAY_SHORT.map(day => <div key={day} className="px-2 py-2 text-center text-[10px] font-bold uppercase text-slate-400">{day}</div>)}</div><div className="grid min-h-[720px] grid-cols-7">{days.map((date, index) => { const list = events.filter(event => eventSameDay(event.starts_at, date, timeZone)); return <div key={index} onDoubleClick={() => onCreate(atMinutes(date, 10 * 60))} className={`min-h-[116px] border-b border-r border-slate-100 p-2 ${date.getMonth() !== cursor.getMonth() ? 'bg-slate-50/55' : 'bg-white'}`}><div className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${sameDay(date, new Date()) ? 'bg-[#0c7fff] text-white' : date.getMonth() === cursor.getMonth() ? 'text-slate-700' : 'text-slate-300'}`}>{date.getDate()}</div><div className="space-y-1">{list.slice(0, 4).map(event => <button key={event.id} onClick={() => onEvent(event)} className="block w-full truncate rounded border-l-[3px] border-blue-500 bg-blue-50 px-2 py-1 text-left text-[10px] font-semibold text-blue-950"><span className="mr-1 text-blue-500">{event.is_all_day ? '' : fmtTime(event.starts_at, timeZone)}</span>{event.title}</button>)}</div></div>; })}</div></>;
}

function Agenda({ events, timeZone, onEvent }: { events: CalendarEvent[]; timeZone: string; onEvent: (event: CalendarEvent) => void }) {
  const list = [...events].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  return <div className="mx-auto max-w-5xl p-5">{list.length ? <div className="space-y-2">{list.map(event => <button key={event.id} onClick={() => onEvent(event)} className="flex w-full items-center gap-4 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-blue-200"><div className="w-28 shrink-0"><div className="text-sm font-bold text-slate-900">{event.is_all_day ? 'All day' : fmtTime(event.starts_at, timeZone)}</div><div className="mt-1 text-[10px] font-semibold text-slate-400">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone }).format(new Date(event.starts_at))}</div></div><div className="min-w-0 flex-1"><div className="truncate font-bold text-slate-900">{event.title}{event.recurrence_series_id ? <span className="ml-2 text-[9px] font-black text-blue-500">RECURRING</span> : null}</div><div className="mt-1 truncate text-xs text-slate-500">{event.location || (event.meeting_provider === 'zoom' ? 'Online meeting' : 'Calendar event')}</div></div>{event.meeting_url ? <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">JOIN</span> : null}</button>)}</div> : <div className="py-20 text-center text-sm font-semibold text-slate-400">No matching calendar events.</div>}</div>;
}

function repeatFromRule(rule?: string | null): RepeatPreset {
  if (!rule) return 'none';
  if (/FREQ=DAILY/.test(rule)) return 'daily';
  if (/BYDAY=MO,TU,WE,TH,FR/.test(rule)) return 'weekdays';
  if (/FREQ=MONTHLY/.test(rule)) return 'monthly';
  return 'weekly';
}

function attendeeResponseLabel(status?: string | null) {
  const value = String(status || 'needs_action').toLowerCase();
  if (value === 'accepted') return 'Accepted';
  if (value === 'tentative') return 'Tentative';
  if (value === 'declined') return 'Declined';
  return 'Awaiting response';
}

function attendeeResponseTone(status?: string | null) {
  const value = String(status || 'needs_action').toLowerCase();
  if (value === 'accepted') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value === 'tentative') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (value === 'declined') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-500';
}

function AttendeeResponse({ status }: { status?: string | null }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-black ${attendeeResponseTone(status)}`}>{attendeeResponseLabel(status)}</span>;
}

function RecurringScopeDialog({ mode, onSelect, onClose }: { mode: 'edit' | 'delete'; onSelect: (scope: EditScope) => void; onClose: () => void }) {
  const deleting = mode === 'delete';
  return <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/45 p-4" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}><div className="w-full max-w-[470px] rounded-2xl bg-white p-5 shadow-2xl"><div className="text-[10px] font-black uppercase tracking-[.14em] text-blue-600">Recurring meeting</div><h2 className="mt-1 text-xl font-black text-slate-950">{deleting ? 'Cancel recurring meeting' : 'Edit recurring meeting'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{deleting ? 'Choose what you want to cancel. Attendees will be notified only for the scope you select.' : 'Choose whether your changes apply only to the selected meeting occurrence or to the entire recurring series.'}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => onSelect('occurrence')} className={`rounded-xl border p-4 text-left ${deleting ? 'border-rose-200 hover:bg-rose-50' : 'border-blue-200 hover:bg-blue-50'}`}><div className={`text-sm font-black ${deleting ? 'text-rose-700' : 'text-blue-800'}`}>{deleting ? 'Cancel this occurrence' : 'This occurrence'}</div><div className="mt-1 text-xs leading-5 text-slate-500">Only this selected date changes. The rest of the series stays intact.</div></button><button onClick={() => onSelect('series')} className={`rounded-xl border p-4 text-left ${deleting ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-100' : 'border-slate-300 hover:bg-slate-50'}`}><div className={`text-sm font-black ${deleting ? 'text-rose-800' : 'text-slate-900'}`}>{deleting ? 'Cancel entire series' : 'Entire series'}</div><div className="mt-1 text-xs leading-5 text-slate-500">Apply the action to the recurring meeting series.</div></button></div><div className="mt-5 flex justify-end"><button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Go back</button></div></div></div>;
}

function EventComposer({ event, allEvents, defaultStart, preference, guest, lead, mailThread, onClose, onSaved }: { event: CalendarEvent | null; allEvents: CalendarEvent[]; defaultStart: Date; preference: CalendarPreference; guest: string; lead: string; mailThread: string; onClose: () => void; onSaved: () => void }) {
  const timezone = event?.timezone || preference.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const initialStartValue = event ? dateTimeLocalValue(event.starts_at, timezone) : isoLocal(defaultStart);
  const initialStart = localDateTimeToUtc(initialStartValue, timezone) || new Date(event?.starts_at || defaultStart);
  const initialEndValue = event ? dateTimeLocalValue(event.ends_at, timezone) : isoLocal(new Date(initialStart.getTime() + 30 * 60000));
  const requiredInitial = event?.calendar_attendees?.filter(attendee => attendee.attendee_type !== 'optional').map(attendee => attendee.email).join(', ') || guest;
  const optionalInitial = event?.calendar_attendees?.filter(attendee => attendee.attendee_type === 'optional').map(attendee => attendee.email).join(', ') || '';
  const recurring = Boolean(event?.recurrence_series_id || event?.recurrence_rule);
  const seriesRule = event?.recurrence_rule || (event?.recurrence_series_id ? event?.recurrence_rule : null);
  const parsedSeriesRule = parseRecurrenceRule(seriesRule);
  const initialRepeatDay = wallClockParts(initialStart, timezone).weekday;
  const initialRepeatDays = parsedSeriesRule?.frequency === 'WEEKLY' && parsedSeriesRule.byDay.length ? parsedSeriesRule.byDay : [Math.max(0, initialRepeatDay)];
  const initialRepeatUntil = parsedSeriesRule?.until ? wallClockParts(parsedSeriesRule.until, timezone).dateKey : '';
  const [title, setTitle] = useState(event?.title ?? '');
  const [startsAt, setStartsAt] = useState(initialStartValue);
  const [endsAt, setEndsAt] = useState(initialEndValue);
  const [requiredPeople, setRequiredPeople] = useState(requiredInitial);
  const [optionalPeople, setOptionalPeople] = useState(optionalInitial);
  const [location, setLocation] = useState(event?.location ?? '');
  const [provider, setProvider] = useState(event?.meeting_provider ?? 'zoom');
  const [url, setUrl] = useState(event?.meeting_url ?? '');
  const [notes, setNotes] = useState(event?.description ?? '');
  const [reminder, setReminder] = useState(event?.calendar_reminders?.[0]?.minutes_before ?? preference.defaultReminderMinutes ?? 15);
  const [emailReminder, setEmailReminder] = useState(event ? event.calendar_reminders?.some(item => item.channel === 'email') ?? false : preference.defaultReminderChannels?.includes('email') ?? false);
  const [isAllDay, setIsAllDay] = useState(Boolean(event?.is_all_day));
  const [showAs, setShowAs] = useState<ShowAs>(event?.show_as ?? 'busy');
  const [isPrivate, setIsPrivate] = useState(event?.visibility === 'private');
  const [repeat, setRepeat] = useState<RepeatPreset>(repeatFromRule(seriesRule));
  const [repeatDays, setRepeatDays] = useState<number[]>(initialRepeatDays);
  const [repeatUntil, setRepeatUntil] = useState(initialRepeatUntil);
  const [scope, setScope] = useState<EditScope>(event?.recurrence_series_id ? 'occurrence' : 'series');
  const [editScopePromptOpen, setEditScopePromptOpen] = useState(recurring);
  const [deleteScopePromptOpen, setDeleteScopePromptOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const links = event?.calendar_event_links ?? [];
  const start = localDateTimeToUtc(startsAt, timezone) || new Date(startsAt);
  const end = localDateTimeToUtc(endsAt, timezone) || new Date(endsAt);
  const conflicts = allEvents.filter(item => item.id !== event?.id && item.show_as !== 'free' && overlap(start, end, new Date(item.starts_at), new Date(item.ends_at)));
  const requiredEmails = parseEmails(requiredPeople); const optionalEmails = parseEmails(optionalPeople);
  const attendeeByEmail = new Map((event?.calendar_attendees ?? []).map(attendee => [attendee.email.toLowerCase(), attendee]));
  const acceptedCount = (event?.calendar_attendees ?? []).filter(attendee => attendee.rsvp_status === 'accepted').length;
  const attendeeCount = event?.calendar_attendees?.length ?? 0;

  function changeStart(value: string) {
    const oldStart = localDateTimeToUtc(startsAt, timezone) || new Date(startsAt); const oldEnd = localDateTimeToUtc(endsAt, timezone) || new Date(endsAt); const next = localDateTimeToUtc(value, timezone); const duration = Math.max(30 * 60000, oldEnd.getTime() - oldStart.getTime()); setStartsAt(value); if (next) setEndsAt(dateTimeLocalValue(new Date(next.getTime() + duration), timezone));
  }

  function changeRepeat(value: RepeatPreset) {
    setRepeat(value);
    if (value === 'weekly' && !repeatDays.length) {
      const nextStart = localDateTimeToUtc(startsAt, timezone);
      setRepeatDays([wallClockParts(nextStart || initialStart, timezone).weekday]);
    }
    if (value === 'none') setRepeatUntil('');
  }

  function toggleRepeatDay(weekday: number) {
    setRepeatDays(current => current.includes(weekday) ? current.filter(day => day !== weekday) : [...current, weekday].sort((a, b) => a - b));
  }

  async function save(allowConflict = false, resetExceptions = false) {
    const startValue = localDateTimeToUtc(startsAt, timezone); const endValue = localDateTimeToUtc(endsAt, timezone);
    if (!title.trim()) { setNotice('Add an event title.'); return; }
    if (!startValue || !endValue || endValue <= startValue) { setNotice('End time must be after start time.'); return; }
    const seriesEdit = !(scope === 'occurrence' && recurring);
    if (seriesEdit && repeat === 'weekly' && !repeatDays.length) { setNotice('Choose at least one day for the weekly repeat.'); return; }
    if (seriesEdit && repeat !== 'none' && repeatUntil && repeatUntil < startsAt.slice(0, 10)) { setNotice('The repeat end date cannot be before the meeting start date.'); return; }
    let recurrenceRule: string | null | undefined;
    try { recurrenceRule = seriesEdit ? recurrencePresetRule(repeat, startValue.toISOString(), timezone, { byDay: repeatDays, untilDate: repeatUntil || null }) : undefined; }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Choose a valid recurrence pattern.'); return; }
    setSaving(true); setNotice('');
    const contextLinks = [...links, ...(lead && !links.some(item => item.entity_type === 'lead') ? [{ entityType: 'lead', entityId: lead, label: 'Lead' }] : []), ...(mailThread && !links.some(item => item.entity_type === 'mail_thread') ? [{ entityType: 'mail_thread', entityId: mailThread, label: 'Setu Mail conversation' }] : [])];
    const attendees = [...requiredEmails.map(email => ({ email, attendeeType: 'required' })), ...optionalEmails.filter(email => !requiredEmails.includes(email)).map(email => ({ email, attendeeType: 'optional' }))];
    const payload = { id: event?.id, title: title.trim(), localStartsAt: startsAt, localEndsAt: endsAt, timezone, location: location || null, isAllDay, visibility: isPrivate ? 'private' : 'organization', showAs, meetingProvider: provider, meetingUrl: url, description: notes, attendees, reminderMinutes: reminder, reminderChannels: emailReminder ? ['in_app', 'email'] : ['in_app'], links: contextLinks, recurrenceRule, scope, allowConflict, resetExceptions };
    const response = await fetch('/api/calendar', { method: event ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (response.status === 409 && result.code === 'SERIES_EXCEPTIONS_RESET_REQUIRED' && !resetExceptions) { setSaving(false); if (confirm(`${result.error}\n\nOccurrence-specific changes will be reset.`)) return save(allowConflict, true); return; }
    if (response.status === 409 && !allowConflict) { setSaving(false); if (confirm(`${result.error}\n\nSave it anyway?`)) return save(true, resetExceptions); return; }
    if (!response.ok) { setNotice(result.error || 'Unable to save event.'); setSaving(false); return; }
    const warnings = Array.isArray(result.warnings) ? result.warnings.map((warning: any) => String(warning?.message || '')).filter(Boolean) : [];
    setSaving(false); if (warnings.length) window.alert(`Event saved, but ${warnings.join(' ')}`); onSaved();
  }

  async function remove(targetScope: EditScope = scope) {
    if (!event) return;
    if (!recurring && !confirm('Cancel this event and notify attendees?')) return;
    setSaving(true); setNotice('');
    try { const response = await fetch(`/api/calendar?id=${encodeURIComponent(event.id)}&scope=${targetScope}`, { method: 'DELETE' }); const result = await response.json().catch(() => ({})); if (!response.ok) { setNotice(result.error || 'Unable to cancel event.'); return; } const warnings = Array.isArray(result.warnings) ? result.warnings.map((warning: any) => String(warning?.message || '')).filter(Boolean) : []; if (warnings.length) window.alert(`Event cancelled, but ${warnings.join(' ')}`); onSaved(); }
    catch { setNotice('Unable to cancel event right now. Please try again.'); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-[90] bg-slate-950/25 p-4 backdrop-blur-[1px]" onMouseDown={mouse => { if (mouse.currentTarget === mouse.target) onClose(); }}><div className="mx-auto flex h-[calc(100vh-32px)] max-w-[1220px] flex-col overflow-hidden rounded-xl bg-[#f4f5f7] shadow-2xl"><div className="flex min-h-[50px] shrink-0 items-center gap-1 border-b border-slate-200 bg-[#eef0f2] px-3"><button disabled={saving || !title.trim()} onClick={() => void save()} className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold text-slate-700 hover:bg-white disabled:opacity-40"><Save size={15}/>{saving ? 'Saving…' : 'Save'}</button><button disabled={saving} onClick={onClose} className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold text-slate-700 hover:bg-white disabled:opacity-40"><X size={15}/>Discard</button>{event ? <button disabled={saving} onClick={() => recurring ? setDeleteScopePromptOpen(true) : void remove('series')} className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold text-rose-600 hover:bg-white disabled:opacity-40"><Trash2 size={15}/>Delete</button> : null}<span className="mx-1 h-5 w-px bg-slate-300"/><select value={showAs} onChange={input => setShowAs(input.target.value as ShowAs)} className="h-8 rounded-md border-0 bg-transparent px-2 text-xs font-bold text-slate-700 hover:bg-white"><option value="busy">Busy</option><option value="free">Free</option><option value="tentative">Tentative</option><option value="out_of_office">Out of office</option><option value="working_elsewhere">Working elsewhere</option></select><label className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-bold text-slate-700 hover:bg-white"><Bell size={14}/><select value={reminder} onChange={input => setReminder(Number(input.target.value))} className="bg-transparent outline-none"><option value={5}>5 minutes before</option><option value={10}>10 minutes before</option><option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option><option value={1440}>1 day before</option></select></label><button onClick={() => setIsPrivate(value => !value)} className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold ${isPrivate ? 'bg-white text-[#0b2e4a]' : 'text-slate-700 hover:bg-white'}`}><EyeOff size={14}/>{isPrivate ? 'Private' : 'Mark private'}</button><button onClick={() => setAssistantOpen(value => !value)} className={`ml-auto flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold ${assistantOpen ? 'bg-white text-[#0b2e4a]' : 'text-slate-700 hover:bg-white'}`}><CalendarDays size={14}/>Scheduling assistant</button><button onClick={onClose} aria-label="Close event composer" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white"><X size={17}/></button></div>
    <div className="flex min-h-0 flex-1 gap-3 p-3"><main className="min-w-0 flex-1 overflow-y-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200"><div className="mx-auto max-w-[900px] p-6">{notice ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{notice}</div> : null}<div className="mb-5 flex items-center gap-3 text-xs font-semibold text-slate-500"><span className="h-3 w-3 rounded-full bg-[#0c7fff]"/><span>Calendar · {timezone}</span></div><input autoFocus value={title} onChange={input => setTitle(input.target.value)} placeholder="New event" className="w-full border-0 border-b border-blue-300 px-1 pb-2 text-2xl font-semibold text-slate-950 outline-none placeholder:text-slate-300"/><div className="mt-5 space-y-2"><Line icon={<UsersRound size={17}/>}><div className="flex items-center gap-2 border-b border-slate-200 pb-2"><input value={requiredPeople} onChange={input => setRequiredPeople(input.target.value)} placeholder="Add required people" className="min-w-0 flex-1 border-0 text-sm outline-none placeholder:text-slate-400"/><span className="text-[10px] font-semibold text-slate-400">Required</span></div><div className="mt-2 flex items-center gap-2 border-b border-slate-200 pb-2"><input value={optionalPeople} onChange={input => setOptionalPeople(input.target.value)} placeholder="Add optional people" className="min-w-0 flex-1 border-0 text-sm outline-none placeholder:text-slate-400"/><span className="text-[10px] font-semibold text-slate-400">Optional</span></div>{attendeeCount ? <div className="mt-2"><div className="mb-1.5 text-[10px] font-bold text-slate-500">RSVP · {acceptedCount}/{attendeeCount} accepted</div><div className="flex flex-wrap gap-1.5">{event?.calendar_attendees?.map(attendee => <span key={attendee.email} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600"><span className="max-w-[220px] truncate">{attendee.name || attendee.email}</span><AttendeeResponse status={attendee.rsvp_status}/></span>)}</div></div> : null}</Line><Line icon={<Clock3 size={17}/>}><div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-sm"><input type="datetime-local" value={startsAt} onChange={input => changeStart(input.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-blue-400"/><span className="text-slate-400">to</span><input type="datetime-local" value={endsAt} min={startsAt} onChange={input => setEndsAt(input.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-blue-400"/><label className="ml-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><input type="checkbox" checked={isAllDay} onChange={input => setIsAllDay(input.target.checked)}/>All day</label><span className="ml-auto text-[10px] font-semibold text-slate-400">{timezone}</span></div></Line><Line icon={<Link2 size={17}/>}><div className="border-b border-slate-200 pb-2"><div className="flex flex-wrap items-center gap-2"><select value={repeat} disabled={recurring && scope === 'occurrence'} onChange={input => changeRepeat(input.target.value as RepeatPreset)} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none disabled:bg-slate-50"><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="weekdays">Every weekday</option><option value="monthly">Every month</option></select>{recurring ? <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Editing<select value={scope} onChange={input => setScope(input.target.value as EditScope)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-bold"><option value="occurrence">This occurrence</option><option value="series">Entire series</option></select></label> : <span className="text-[10px] font-semibold text-slate-400">Recurrence keeps this wall-clock time in {timezone}, including across DST.</span>}</div>{repeat === 'weekly' && !(recurring && scope === 'occurrence') ? <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[10px] font-bold text-slate-500">Repeat on</span>{WEEKDAY_PICKER.map(weekday => <button type="button" key={weekday} onClick={() => toggleRepeatDay(weekday)} className={`h-7 min-w-9 rounded-full border px-2 text-[10px] font-black ${repeatDays.includes(weekday) ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>{DAY_SHORT[weekday]}</button>)}</div> : null}{repeat !== 'none' && !(recurring && scope === 'occurrence') ? <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold text-slate-500">Ends</span><input type="date" min={startsAt.slice(0, 10)} value={repeatUntil} onChange={input => setRepeatUntil(input.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700"/><span className="text-[10px] font-semibold text-slate-400">{repeatUntil ? 'Last recurrence date' : 'Leave blank for no end date'}</span></div> : null}</div></Line><Line icon={<MapPin size={17}/>}><input value={location} onChange={input => setLocation(input.target.value)} placeholder="Add a location" className="w-full border-0 border-b border-slate-200 pb-2 text-sm outline-none placeholder:text-slate-400"/></Line><Line icon={<Video size={17}/>}><div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2"><select value={provider} disabled={recurring && scope === 'occurrence'} onChange={input => setProvider(input.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none disabled:bg-slate-50"><option value="zoom">Zoom meeting</option><option value="custom">Custom meeting link</option><option value="in_person">In person</option><option value="none">No online meeting</option></select>{provider === 'custom' ? <input value={url} onChange={input => setUrl(input.target.value)} placeholder="Paste meeting link" className="min-w-[260px] flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none"/> : null}{provider === 'zoom' && !event?.meeting_url ? <span className="text-[10px] font-semibold text-slate-400">Zoom link is created when the event is saved.</span> : null}</div></Line><Line icon={<Bell size={17}/>}><label className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={emailReminder} onChange={input => setEmailReminder(input.target.checked)}/>Also send reminder by email</label></Line><Line icon={<AlignLeft size={17}/>}><textarea value={notes} onChange={input => setNotes(input.target.value)} rows={12} placeholder="Add an agenda, preparation notes or meeting details" className="w-full resize-none border-0 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-300"/></Line></div>{(lead || mailThread || links.length) ? <div className="ml-8 mt-5 rounded-lg border border-blue-100 bg-blue-50/60 p-3"><div className="text-xs font-bold text-blue-950">Connected to Setu Flow</div><p className="mt-1 text-xs text-blue-700">This meeting stays linked to the customer conversation and CRM context.</p></div> : null}{event?.meeting_url ? <a href={event.meeting_url} target="_blank" rel="noreferrer" className="ml-8 mt-4 inline-flex rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white">Join meeting</a> : null}</div></main>
      {assistantOpen ? <aside className="hidden w-[286px] shrink-0 overflow-y-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200 lg:block"><div className="border-b border-slate-200 px-4 py-3"><div className="text-sm font-bold text-slate-800">Scheduling assistant</div><div className="mt-1 text-[10px] font-semibold text-slate-400">Availability and RSVP response</div></div><div className="p-4"><div className={`rounded-lg border p-3 ${conflicts.length ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="text-xs font-bold text-slate-800">You</div><div className={`mt-1 text-[11px] font-bold ${conflicts.length ? 'text-rose-700' : 'text-emerald-700'}`}>{conflicts.length ? 'Busy at this time' : 'Available'}</div>{conflicts.slice(0, 2).map(item => <div key={item.id} className="mt-2 truncate text-[10px] font-semibold text-slate-500">{fmtTime(item.starts_at, timezone)}–{fmtTime(item.ends_at, timezone)} · {item.title}</div>)}</div>{[...requiredEmails, ...optionalEmails.filter(email => !requiredEmails.includes(email))].map(email => { const attendee = attendeeByEmail.get(email); return <div key={email} className="mt-2 rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-xs font-bold text-slate-700">{attendee?.name || email}</div>{attendee?.name ? <div className="mt-0.5 truncate text-[9px] font-semibold text-slate-400">{email}</div> : null}</div><AttendeeResponse status={attendee?.rsvp_status}/></div><div className="mt-2 text-[10px] font-semibold text-slate-400">Availability unknown</div></div>; })}{!requiredEmails.length && !optionalEmails.length ? <div className="mt-3 text-[11px] leading-5 text-slate-400">Add attendees to compare availability. External calendar availability is shown only when a trusted calendar source exists.</div> : null}<div className="mt-4 rounded-lg bg-slate-50 p-3 text-[10px] font-semibold leading-5 text-slate-500">RSVP status comes from the invitation response. External availability is separate and remains unknown until Setu has a connected calendar source.</div></div></aside> : null}
    </div></div>{editScopePromptOpen ? <RecurringScopeDialog mode="edit" onSelect={nextScope => { setScope(nextScope); setEditScopePromptOpen(false); }} onClose={onClose}/> : null}{deleteScopePromptOpen ? <RecurringScopeDialog mode="delete" onSelect={nextScope => { setScope(nextScope); setDeleteScopePromptOpen(false); void remove(nextScope); }} onClose={() => setDeleteScopePromptOpen(false)}/> : null}</div>;
}

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) { return <div className="grid grid-cols-[24px_1fr] gap-3 py-1"><div className="pt-2 text-slate-400">{icon}</div><div>{children}</div></div>; }

function WorkHours({ availability, timezone, onClose, onSaved }: { availability: Availability[]; timezone: string; onClose: () => void; onSaved: (rows: Availability[]) => void }) {
  const [rows, setRows] = useState<Availability[]>(availability.length ? availability : defaultAvailability(timezone)); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const rowFor = (weekday: number) => rows.find(row => row.weekday === weekday);
  function toggle(weekday: number, enabled: boolean) { setRows(current => enabled ? [...current, { weekday, start_time: DEFAULT_START, end_time: DEFAULT_END, timezone, is_active: true }].sort((a, b) => a.weekday - b.weekday) : current.filter(row => row.weekday !== weekday)); }
  function change(weekday: number, key: 'start_time' | 'end_time', value: string) { setRows(current => current.map(row => row.weekday === weekday ? { ...row, [key]: value } : row)); }
  async function save() { if (rows.some(row => row.end_time.slice(0, 5) <= row.start_time.slice(0, 5))) { setError('Each work day must end after it starts.'); return; } setSaving(true); setError(''); const response = await fetch('/api/calendar/availability', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ timezone, days: rows.map(row => ({ weekday: row.weekday, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5) })) }) }); const payload = await response.json(); setSaving(false); if (!response.ok) { setError(payload.error || 'Unable to save working hours.'); return; } onSaved(rows); }
  return <div className="fixed inset-0 z-[95] flex justify-end bg-slate-950/25" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}><aside className="relative h-full w-full max-w-[430px] bg-white shadow-2xl"><div className="flex h-[58px] items-center justify-between border-b border-slate-200 px-5"><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-blue-600">Calendar settings</div><div className="text-base font-bold text-slate-900">Work week & working hours</div></div><button onClick={onClose} className="h-9 w-9 rounded-lg text-xl font-bold text-slate-500 hover:bg-slate-100">×</button></div><div className="p-5"><p className="text-xs leading-5 text-slate-500">Choose the days and times you normally work. Week view opens near those hours, while the full 24-hour day remains available when you scroll.</p><div className="mt-5 space-y-2">{DAY_NAMES.map((name, weekday) => { const row = rowFor(weekday); return <div key={name} className={`grid grid-cols-[108px_1fr] items-center gap-3 rounded-lg border p-3 ${row ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/60'}`}><label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={Boolean(row)} onChange={input => toggle(weekday, input.target.checked)}/>{name.slice(0, 3)}</label>{row ? <div className="grid grid-cols-2 gap-2"><input type="time" value={row.start_time.slice(0, 5)} onChange={input => change(weekday, 'start_time', input.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"/><input type="time" value={row.end_time.slice(0, 5)} onChange={input => change(weekday, 'end_time', input.target.value)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs"/></div> : <div className="text-[10px] font-semibold text-slate-400">Not a working day</div>}</div>; })}</div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-[10px] font-semibold text-slate-500">Time zone: {timezone}</div>{error ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div> : null}</div><div className="absolute bottom-0 right-0 flex w-full justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600">Cancel</button><button disabled={saving} onClick={() => void save()} className="h-10 rounded-lg bg-[#0b2e4a] px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save hours'}</button></div></aside></div>;
}
