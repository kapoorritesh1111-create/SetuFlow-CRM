'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlignLeft, Bell, CalendarPlus, Clock3, MapPin, Settings2, UsersRound, Video } from 'lucide-react';

type Link = { entity_type: string; entity_id: string; label?: string | null };
type Attendee = { email: string; name?: string | null; rsvp_status: string };
type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  is_all_day?: boolean;
  meeting_provider: string;
  meeting_url?: string | null;
  calendar_attendees?: Attendee[];
  calendar_reminders?: Array<{ minutes_before: number; channel: string }>;
  calendar_event_links?: Link[];
};
type Availability = { weekday: number; start_time: string; end_time: string; timezone: string; is_active?: boolean };
type View = 'month' | 'week' | 'day' | 'agenda';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const HOUR_HEIGHT = 64;
const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (value: Date, count: number) => { const date = new Date(value); date.setDate(date.getDate() + count); return date; };
const startOfWeek = (value: Date) => { const date = new Date(value); date.setHours(0,0,0,0); date.setDate(date.getDate() - date.getDay()); return date; };
const isoLocal = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fmtTime = (value: string | Date) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(typeof value === 'string' ? new Date(value) : value);
const timeMinutes = (value: string) => { const [hours, minutes] = value.slice(0,5).split(':').map(Number); return hours * 60 + minutes; };
const dateAtMinutes = (date: Date, minutes: number) => { const next = new Date(date); next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0); return next; };

function defaultAvailability(timezone: string): Availability[] {
  return [1,2,3,4,5].map(weekday => ({ weekday, start_time: DEFAULT_START, end_time: DEFAULT_END, timezone, is_active: true }));
}

function matchesSearch(event: CalendarEvent, query: string) {
  if (!query) return true;
  return [event.title,event.description,event.location,...(event.calendar_attendees ?? []).flatMap(a => [a.email,a.name])]
    .filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase());
}

export function CalendarScheduleWorkspace({ userName }: { userName: string }) {
  const params = useSearchParams();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [events,setEvents] = useState<CalendarEvent[]>([]);
  const [availability,setAvailability] = useState<Availability[]>(() => defaultAvailability(timezone));
  const [view,setView] = useState<View>('week');
  const [cursor,setCursor] = useState(new Date());
  const [selected,setSelected] = useState<CalendarEvent | null>(null);
  const [draftStart,setDraftStart] = useState<Date | null>(null);
  const [eventOpen,setEventOpen] = useState(false);
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState('');
  const [query,setQuery] = useState('');

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
      if (availabilityResponse.ok && Array.isArray(availabilityPayload.availability) && availabilityPayload.availability.length) {
        setAvailability(availabilityPayload.availability);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load calendar.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (params.get('compose') === '1') {
      setSelected(null); setDraftStart(new Date()); setEventOpen(true);
    }
  }, [params]);
  useEffect(() => {
    const onSearch = (event: Event) => setQuery(String((event as CustomEvent).detail ?? '').trim());
    window.addEventListener('setu-calendar-search', onSearch);
    return () => window.removeEventListener('setu-calendar-search', onSearch);
  }, []);

  const filteredEvents = useMemo(() => events.filter(event => matchesSearch(event, query)), [events,query]);
  const workdayNumbers = useMemo(() => availability.filter(row => row.is_active !== false).map(row => row.weekday).sort((a,b) => a-b), [availability]);
  const allWeekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index)), [cursor]);
  const workWeekDays = useMemo(() => allWeekDays.filter(day => workdayNumbers.includes(day.getDay())), [allWeekDays,workdayNumbers]);
  const monthDays = useMemo(() => { const first = new Date(cursor.getFullYear(),cursor.getMonth(),1); const start = startOfWeek(first); return Array.from({ length:42 },(_,i) => addDays(start,i)); }, [cursor]);
  const nextEvent = useMemo(() => [...events].filter(event => new Date(event.ends_at) >= new Date()).sort((a,b) => +new Date(a.starts_at)-+new Date(b.starts_at))[0] ?? null, [events]);

  const title = view === 'day'
    ? new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(cursor)
    : view === 'week'
      ? `${new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(allWeekDays[0])} – ${new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(allWeekDays[6])}`
      : new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(cursor);

  function move(direction: number) {
    const date = new Date(cursor);
    if (view === 'month') date.setMonth(date.getMonth()+direction);
    else if (view === 'week') date.setDate(date.getDate()+7*direction);
    else date.setDate(date.getDate()+direction);
    setCursor(date);
  }
  function openEvent(event: CalendarEvent) { setSelected(event); setDraftStart(null); setCursor(new Date(event.starts_at)); setEventOpen(true); }
  function openCreateAt(start: Date) { setSelected(null); setDraftStart(start); setCursor(start); setEventOpen(true); }

  return <div className="flex h-full min-h-0 bg-white text-slate-900">
    <aside className="hidden w-[224px] shrink-0 border-r border-slate-200 bg-slate-50/70 xl:flex xl:flex-col">
      <div className="border-b border-slate-200 p-4">
        <button onClick={() => openCreateAt(new Date())} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0b2e4a] text-sm font-black text-white shadow-sm hover:bg-[#123f61]"><CalendarPlus size={16}/>New event</button>
      </div>
      <MiniMonth cursor={cursor} onSelect={date => { setCursor(date); setView('day'); }}/>
      <div className="border-t border-slate-200 p-4">
        <div className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">My calendar</div>
        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-700"><span className="h-2.5 w-2.5 rounded-sm bg-[#0c7fff]"/>{userName}</div>
      </div>
      <div className="border-t border-slate-200 p-4">
        <button onClick={() => setSettingsOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-xs font-black text-slate-700 hover:text-[#0b2e4a]"><Clock3 size={15}/>Working hours<Settings2 size={14} className="ml-auto text-slate-400"/></button>
        <div className="mt-2 text-[10px] font-bold leading-5 text-slate-400">{workdayNumbers.length ? workdayNumbers.map(day => DAY_SHORT[day]).join(', ') : 'No work days'}<br/>{availability.length && availability.every(row => row.start_time.slice(0,5) === availability[0].start_time.slice(0,5) && row.end_time.slice(0,5) === availability[0].end_time.slice(0,5)) ? `${fmtClock(availability[0].start_time)}–${fmtClock(availability[0].end_time)}` : 'Custom hours'}</div>
      </div>
      <div className="mt-auto border-t border-slate-200 p-4">
        <div className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">Next up</div>
        {nextEvent ? <button onClick={() => openEvent(nextEvent)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-blue-200"><div className="truncate text-xs font-black text-slate-800">{nextEvent.title}</div><div className="mt-1 text-[10px] font-bold text-blue-600">{sameDay(new Date(nextEvent.starts_at),new Date()) ? 'Today' : new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(new Date(nextEvent.starts_at))} · {fmtTime(nextEvent.starts_at)}</div></button> : <div className="mt-2 text-[10px] font-bold text-slate-400">Nothing scheduled next.</div>}
      </div>
    </aside>

    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-[58px] flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <button onClick={() => openCreateAt(new Date())} className="h-9 rounded-lg bg-[#0b2e4a] px-4 text-xs font-black text-white xl:hidden">+ New event</button>
        <button onClick={() => setCursor(new Date())} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700 hover:bg-slate-50">Today</button>
        <button onClick={() => move(-1)} aria-label="Previous period" className="h-9 w-9 rounded-lg border border-slate-200 text-lg font-black text-slate-600 hover:bg-slate-50">‹</button>
        <button onClick={() => move(1)} aria-label="Next period" className="h-9 w-9 rounded-lg border border-slate-200 text-lg font-black text-slate-600 hover:bg-slate-50">›</button>
        <h1 className="min-w-[180px] flex-1 px-1 text-base font-black text-slate-900">{title}</h1>
        <button onClick={() => setSettingsOpen(true)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50 xl:hidden">Work hours</button>
        <div className="flex rounded-lg bg-slate-100 p-1">{(['month','week','day','agenda'] as View[]).map(item => <button key={item} onClick={() => setView(item)} className={`rounded-md px-3 py-1.5 text-[11px] font-black capitalize ${view===item?'bg-white text-[#0b2e4a] shadow-sm':'text-slate-500 hover:text-slate-800'}`}>{item}</button>)}</div>
      </header>
      {query ? <div className="border-b border-blue-100 bg-blue-50/60 px-4 py-2 text-xs font-bold text-blue-800">Showing calendar results for “{query}” · {filteredEvents.length} match{filteredEvents.length===1?'':'es'}</div> : null}
      {loadError ? <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{loadError} <button onClick={() => void load()} className="ml-2 underline">Try again</button></div> : null}
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? <div className="p-12 text-center text-sm font-bold text-slate-400">Loading your calendar…</div>
          : view === 'week' ? <WorkWeekView days={workWeekDays.length ? workWeekDays : allWeekDays.slice(1,6)} events={filteredEvents} availability={availability} onEvent={openEvent} onCreate={openCreateAt}/>
            : view === 'month' ? <MonthView days={monthDays} cursor={cursor} events={filteredEvents} onEvent={openEvent} onCreate={openCreateAt}/>
              : view === 'day' ? <DayView day={cursor} events={filteredEvents} availability={availability} onEvent={openEvent} onCreate={openCreateAt}/>
                : <AgendaView events={filteredEvents} onEvent={openEvent}/>} 
      </div>
    </section>

    {eventOpen ? <EventComposer event={selected} defaultStart={draftStart ?? cursor} guest={params.get('guest')||''} lead={params.get('lead')||''} mailThread={params.get('mailThread')||''} onClose={() => setEventOpen(false)} onSaved={async () => { setEventOpen(false); await load(); }}/>:null}
    {settingsOpen ? <WorkHoursDrawer availability={availability} timezone={timezone} onClose={() => setSettingsOpen(false)} onSaved={async rows => { setAvailability(rows.length ? rows : defaultAvailability(timezone)); setSettingsOpen(false); }}/>:null}
  </div>;
}

function fmtClock(value: string) {
  const [hour,minute] = value.slice(0,5).split(':').map(Number);
  const date = new Date(); date.setHours(hour,minute,0,0);
  return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(date);
}

function MiniMonth({ cursor,onSelect }: { cursor:Date; onSelect:(date:Date)=>void }) {
  const first = new Date(cursor.getFullYear(),cursor.getMonth(),1); const start = startOfWeek(first); const days = Array.from({length:42},(_,i)=>addDays(start,i));
  return <div className="p-4"><div className="mb-3 text-xs font-black text-slate-800">{new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(cursor)}</div><div className="grid grid-cols-7 gap-y-1 text-center">{DAY_SHORT.map(day => <div key={day} className="text-[9px] font-black text-slate-400">{day[0]}</div>)}{days.map((date,index)=><button key={index} onClick={()=>onSelect(date)} className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${sameDay(date,new Date())?'bg-[#0c7fff] text-white':date.getMonth()===cursor.getMonth()?'text-slate-700 hover:bg-slate-200':'text-slate-300'}`}>{date.getDate()}</button>)}</div></div>;
}

function WorkWeekView({ days,events,availability,onEvent,onCreate }: { days:Date[]; events:CalendarEvent[]; availability:Availability[]; onEvent:(event:CalendarEvent)=>void; onCreate:(date:Date)=>void }) {
  const ranges = availability.length ? availability : defaultAvailability(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const startMinutes = Math.max(6*60, Math.min(...ranges.map(row=>timeMinutes(row.start_time))) - 60);
  const endMinutes = Math.min(22*60, Math.max(...ranges.map(row=>timeMinutes(row.end_time))) + 60);
  const totalMinutes = Math.max(60,endMinutes-startMinutes);
  const height = totalMinutes / 60 * HOUR_HEIGHT;
  const hours = Array.from({length:Math.ceil(totalMinutes/60)+1},(_,i)=>startMinutes+i*60).filter(value=>value<=endMinutes);
  const slots = Array.from({length:Math.ceil(totalMinutes/30)},(_,i)=>startMinutes+i*30);
  return <div className="min-w-[760px]">
    <div className="sticky top-0 z-30 grid border-b border-slate-200 bg-white" style={{gridTemplateColumns:`64px repeat(${days.length}, minmax(128px, 1fr))`}}><div className="border-r border-slate-200"/>{days.map(day=><div key={day.toISOString()} className="border-r border-slate-200 px-2 py-2.5 text-center"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{new Intl.DateTimeFormat(undefined,{weekday:'short'}).format(day)}</div><div className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${sameDay(day,new Date())?'bg-[#0c7fff] text-white':'text-slate-800'}`}>{day.getDate()}</div></div>)}</div>
    <div className="relative grid" style={{gridTemplateColumns:`64px repeat(${days.length}, minmax(128px, 1fr))`,height}}>
      <div className="relative border-r border-slate-200 bg-slate-50/60">{hours.map(minutes=><div key={minutes} className="absolute right-2 -translate-y-2 text-[9px] font-bold text-slate-400" style={{top:(minutes-startMinutes)/60*HOUR_HEIGHT}}>{fmtClock(`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`)}</div>)}</div>
      {days.map(day => {
        const work = ranges.find(row=>row.weekday===day.getDay());
        const dayEvents = events.filter(event=>sameDay(new Date(event.starts_at),day));
        const workStart = work ? timeMinutes(work.start_time) : startMinutes;
        const workEnd = work ? timeMinutes(work.end_time) : endMinutes;
        return <div key={day.toISOString()} className="relative border-r border-slate-200 bg-slate-50/50">
          {work ? <div className="absolute inset-x-0 bg-white" style={{top:(workStart-startMinutes)/60*HOUR_HEIGHT,height:(workEnd-workStart)/60*HOUR_HEIGHT}}/> : null}
          {slots.map(minutes => <button key={minutes} onClick={()=>onCreate(dateAtMinutes(day,minutes))} aria-label={`Create event ${DAY_NAMES[day.getDay()]} ${fmtClock(`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`)}`} className="group absolute inset-x-0 z-[2] border-t border-slate-100 text-left hover:bg-blue-50/60" style={{top:(minutes-startMinutes)/60*HOUR_HEIGHT,height:HOUR_HEIGHT/2}}><span className="pointer-events-none ml-1 hidden rounded bg-white/90 px-1 text-[9px] font-bold text-blue-500 group-hover:inline">Open</span></button>)}
          {dayEvents.map(event => {
            const start = new Date(event.starts_at), end = new Date(event.ends_at);
            const startValue = start.getHours()*60+start.getMinutes(); const endValue = end.getHours()*60+end.getMinutes();
            const top = Math.max(0,(startValue-startMinutes)/60*HOUR_HEIGHT); const eventHeight = Math.max(28,Math.min(height-top,(endValue-startValue)/60*HOUR_HEIGHT));
            return <button key={event.id} onClick={()=>onEvent(event)} className="absolute left-1 right-1 z-20 overflow-hidden rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-left shadow-sm hover:bg-blue-100" style={{top,height:eventHeight}}><div className="truncate text-[10px] font-black text-blue-950">{event.title}</div><div className="mt-0.5 text-[9px] font-bold text-blue-600">{fmtTime(start)}–{fmtTime(end)}</div>{event.location ? <div className="mt-1 truncate text-[9px] text-blue-700">{event.location}</div>:null}</button>;
          })}
        </div>;
      })}
      {sameDay(new Date(),new Date()) ? <CurrentTimeLine days={days} startMinutes={startMinutes} endMinutes={endMinutes}/>:null}
    </div>
  </div>;
}

function CurrentTimeLine({days,startMinutes,endMinutes}:{days:Date[];startMinutes:number;endMinutes:number}) {
  const now = new Date(); if (!days.some(day=>sameDay(day,now))) return null; const minutes = now.getHours()*60+now.getMinutes(); if (minutes<startMinutes||minutes>endMinutes) return null;
  return <div className="pointer-events-none absolute z-20 h-px bg-rose-500" style={{left:64,right:0,top:(minutes-startMinutes)/60*HOUR_HEIGHT}}><span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500"/></div>;
}

function MonthView({days,cursor,events,onEvent,onCreate}:{days:Date[];cursor:Date;events:CalendarEvent[];onEvent:(event:CalendarEvent)=>void;onCreate:(date:Date)=>void}) {
  return <><div className="sticky top-0 z-10 grid grid-cols-7 border-b border-slate-200 bg-slate-50">{DAY_SHORT.map(day=><div key={day} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">{day}</div>)}</div><div className="grid min-h-[720px] grid-cols-7">{days.map((date,index)=>{const list=events.filter(event=>sameDay(new Date(event.starts_at),date));return <div key={index} onDoubleClick={()=>onCreate(dateAtMinutes(date,10*60))} className={`min-h-[116px] border-b border-r border-slate-100 p-2 ${date.getMonth()!==cursor.getMonth()?'bg-slate-50/55':'bg-white'}`}><div className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${sameDay(date,new Date())?'bg-[#0c7fff] text-white':date.getMonth()===cursor.getMonth()?'text-slate-700':'text-slate-300'}`}>{date.getDate()}</div><div className="space-y-1">{list.slice(0,4).map(event=><button key={event.id} onClick={()=>onEvent(event)} className="block w-full truncate rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-left text-[10px] font-bold text-blue-950 hover:bg-blue-100"><span className="mr-1 text-blue-500">{fmtTime(event.starts_at)}</span>{event.title}</button>)}</div></div>})}</div></>;
}

function DayView({day,events,availability,onEvent,onCreate}:{day:Date;events:CalendarEvent[];availability:Availability[];onEvent:(event:CalendarEvent)=>void;onCreate:(date:Date)=>void}) {
  return <WorkWeekView days={[day]} events={events} availability={availability} onEvent={onEvent} onCreate={onCreate}/>;
}

function AgendaView({events,onEvent}:{events:CalendarEvent[];onEvent:(event:CalendarEvent)=>void}) {
  const list=[...events].sort((a,b)=>+new Date(a.starts_at)-+new Date(b.starts_at));
  return <div className="mx-auto max-w-5xl p-5">{list.length?<div className="space-y-2">{list.map(event=><button key={event.id} onClick={()=>onEvent(event)} className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-200 hover:bg-blue-50/30"><div className="w-28 shrink-0"><div className="text-sm font-black text-slate-900">{fmtTime(event.starts_at)}</div><div className="mt-1 text-[10px] font-bold text-slate-400">{new Date(event.starts_at).toLocaleDateString()}</div></div><div className="min-w-0 flex-1"><div className="truncate font-black text-slate-900">{event.title}</div><div className="mt-1 truncate text-xs text-slate-500">{event.location || (event.meeting_provider==='zoom'?'Online meeting':'Calendar event')}</div></div>{event.meeting_url?<span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">JOIN</span>:null}</button>)}</div>:<div className="py-20 text-center text-sm font-bold text-slate-400">No matching calendar events.</div>}</div>;
}

function EventComposer({event,defaultStart,guest,lead,mailThread,onClose,onSaved}:{event:CalendarEvent|null;defaultStart:Date;guest:string;lead:string;mailThread:string;onClose:()=>void;onSaved:()=>void}) {
  const initialStart = event ? new Date(event.starts_at) : new Date(defaultStart);
  if (!event && initialStart.getSeconds() !== 0) initialStart.setMinutes(Math.ceil(initialStart.getMinutes()/30)*30,0,0);
  const initialEnd = event ? new Date(event.ends_at) : new Date(initialStart.getTime()+30*60000);
  const [title,setTitle]=useState(event?.title??'');
  const [startsAt,setStartsAt]=useState(isoLocal(initialStart));
  const [endsAt,setEndsAt]=useState(isoLocal(initialEnd));
  const [guests,setGuests]=useState(event?.calendar_attendees?.map(a=>a.email).join(', ')||guest);
  const [location,setLocation]=useState(event?.location??'');
  const [provider,setProvider]=useState(event?.meeting_provider??'zoom');
  const [url,setUrl]=useState(event?.meeting_url??'');
  const [notes,setNotes]=useState(event?.description??'');
  const [reminder,setReminder]=useState(event?.calendar_reminders?.[0]?.minutes_before??15);
  const [emailReminder,setEmailReminder]=useState(event?.calendar_reminders?.some(r=>r.channel==='email')??false);
  const [saving,setSaving]=useState(false); const [notice,setNotice]=useState('');
  const links=event?.calendar_event_links??[];

  function changeStart(value:string) {
    const oldStart = new Date(startsAt); const oldEnd = new Date(endsAt); const next = new Date(value);
    const duration = Math.max(30*60000,oldEnd.getTime()-oldStart.getTime());
    setStartsAt(value); if (!Number.isNaN(next.valueOf())) setEndsAt(isoLocal(new Date(next.getTime()+duration)));
  }
  async function save(allowConflict=false) {
    const start=new Date(startsAt),end=new Date(endsAt);
    if (!title.trim()) { setNotice('Add an event title.'); return; }
    if (Number.isNaN(start.valueOf())||Number.isNaN(end.valueOf())||end<=start) { setNotice('End time must be after start time.'); return; }
    setSaving(true); setNotice('');
    const contextLinks=[...links,...(lead&&!links.some(x=>x.entity_type==='lead')?[{entityType:'lead',entityId:lead,label:'Lead'}]:[]),...(mailThread&&!links.some(x=>x.entity_type==='mail_thread')?[{entityType:'mail_thread',entityId:mailThread,label:'Setu Mail conversation'}]:[])];
    const payload={id:event?.id,title:title.trim(),startsAt:start.toISOString(),endsAt:end.toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,location:location||null,meetingProvider:provider,meetingUrl:url,description:notes,attendees:guests.split(',').map(x=>x.trim()).filter(Boolean),reminderMinutes:reminder,reminderChannels:emailReminder?['in_app','email']:['in_app'],links:contextLinks,allowConflict};
    const response=await fetch('/api/calendar',{method:event?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}); const result=await response.json();
    if(response.status===409&&!allowConflict){setSaving(false);if(confirm(`${result.error}\n\nCreate it anyway?`))return save(true);return;}
    if(!response.ok){setNotice(result.error||'Unable to save event.');setSaving(false);return;}
    if(!event&&provider==='zoom'){const zoom=await fetch('/api/calendar/zoom/meeting',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventId:result.event.id})});if(!zoom.ok)setNotice('Event created. Connect Zoom in Meeting settings to add a Zoom link.');}
    if(!event&&guests.trim())await fetch('/api/calendar/invite',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventId:result.event.id})});
    setSaving(false);onSaved();
  }
  async function remove(){if(!event||!confirm('Delete this event?'))return;await fetch(`/api/calendar?id=${event.id}`,{method:'DELETE'});onSaved();}

  return <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/25 backdrop-blur-[2px]" onMouseDown={mouse=>{if(mouse.currentTarget===mouse.target)onClose()}}><aside className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl">
    <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200 px-5"><div><div className="text-[10px] font-black uppercase tracking-[.15em] text-blue-600">{event?'Calendar event':'New event'}</div><div className="text-base font-black text-slate-900">{event?'Edit event':'Schedule something'}</div></div><button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-xl font-bold text-slate-500 hover:bg-slate-100">×</button></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      {notice?<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">{notice}</div>:null}
      <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Add title" className="w-full border-0 border-b border-slate-200 px-1 pb-3 text-2xl font-black text-slate-950 outline-none placeholder:text-slate-300 focus:border-blue-400"/>
      <div className="mt-6 space-y-5">
        <ComposerRow icon={<Clock3 size={18}/>} label="Date and time"><div className="grid grid-cols-2 gap-2"><input type="datetime-local" value={startsAt} onChange={e=>changeStart(e.target.value)} className="calendar-control"/><input type="datetime-local" value={endsAt} min={startsAt} onChange={e=>setEndsAt(e.target.value)} className="calendar-control"/></div></ComposerRow>
        <ComposerRow icon={<UsersRound size={18}/>} label="Invite people"><input value={guests} onChange={e=>setGuests(e.target.value)} placeholder="name@company.com, another@company.com" className="calendar-control"/></ComposerRow>
        <ComposerRow icon={<MapPin size={18}/>} label="Location"><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Add a room, office or address" className="calendar-control"/></ComposerRow>
        <ComposerRow icon={<Video size={18}/>} label="Meeting"><select value={provider} onChange={e=>setProvider(e.target.value)} className="calendar-control"><option value="zoom">Zoom meeting</option><option value="custom">Custom meeting link</option><option value="in_person">In person</option><option value="none">No online meeting</option></select>{provider==='custom'?<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste meeting link" className="calendar-control mt-2"/>:provider==='zoom'&&!event?.meeting_url?<div className="mt-2 text-[10px] font-bold text-slate-400">A Zoom link will be added after the event is saved.</div>:null}</ComposerRow>
        <ComposerRow icon={<Bell size={18}/>} label="Reminder"><div className="grid grid-cols-[1fr_auto] gap-2"><select value={reminder} onChange={e=>setReminder(Number(e.target.value))} className="calendar-control"><option value={5}>5 minutes before</option><option value={10}>10 minutes before</option><option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option><option value={1440}>1 day before</option></select><label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={emailReminder} onChange={e=>setEmailReminder(e.target.checked)}/>Email too</label></div></ComposerRow>
        <ComposerRow icon={<AlignLeft size={18}/>} label="Notes"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={6} placeholder="Add an agenda, preparation notes or meeting details" className="calendar-control resize-none"/></ComposerRow>
        {(lead||mailThread||links.length)?<div className="ml-8 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><div className="text-xs font-black text-blue-950">Connected to Setu Flow</div><p className="mt-1 text-xs text-blue-700">This event stays linked to the customer conversation and CRM context.</p></div>:null}
        {event?.meeting_url?<a href={event.meeting_url} target="_blank" rel="noreferrer" className="ml-8 block rounded-lg bg-blue-600 py-2.5 text-center text-sm font-black text-white">Join meeting</a>:null}
      </div>
    </div>
    <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-4">{event?<button onClick={remove} className="text-xs font-black text-rose-600">Delete event</button>:<span/>}<div className="flex gap-2"><button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-600">Cancel</button><button disabled={saving||!title.trim()} onClick={()=>void save()} className="h-10 rounded-lg bg-[#0b2e4a] px-5 text-sm font-black text-white disabled:opacity-40">{saving?'Saving…':event?'Save':'Create event'}</button></div></div>
    <style jsx global>{`.calendar-control{width:100%;border:1px solid rgb(226 232 240);border-radius:8px;background:white;padding:10px 12px;font-size:13px;color:rgb(15 23 42);outline:none}.calendar-control:focus{border-color:rgb(96 165 250);box-shadow:0 0 0 3px rgb(219 234 254)}`}</style>
  </aside></div>;
}

function ComposerRow({icon,label,children}:{icon:React.ReactNode;label:string;children:React.ReactNode}){return <div className="grid grid-cols-[22px_1fr] gap-3"><div className="pt-2.5 text-slate-400">{icon}</div><div><div className="mb-1.5 text-xs font-black text-slate-700">{label}</div>{children}</div></div>}

function WorkHoursDrawer({availability,timezone,onClose,onSaved}:{availability:Availability[];timezone:string;onClose:()=>void;onSaved:(rows:Availability[])=>void}) {
  const [rows,setRows]=useState<Availability[]>(availability.length?availability:defaultAvailability(timezone)); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
  const rowFor=(weekday:number)=>rows.find(row=>row.weekday===weekday);
  function toggle(weekday:number,enabled:boolean){setRows(current=>enabled?[...current,{weekday,start_time:DEFAULT_START,end_time:DEFAULT_END,timezone,is_active:true}].sort((a,b)=>a.weekday-b.weekday):current.filter(row=>row.weekday!==weekday));}
  function change(weekday:number,key:'start_time'|'end_time',value:string){setRows(current=>current.map(row=>row.weekday===weekday?{...row,[key]:value}:row));}
  async function save(){if(rows.some(row=>row.end_time.slice(0,5)<=row.start_time.slice(0,5))){setError('Each work day must end after it starts.');return;}setSaving(true);setError('');const response=await fetch('/api/calendar/availability',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({timezone,days:rows.map(row=>({weekday:row.weekday,startTime:row.start_time.slice(0,5),endTime:row.end_time.slice(0,5)}))})});const payload=await response.json();setSaving(false);if(!response.ok){setError(payload.error||'Unable to save working hours.');return;}onSaved(rows);}
  return <div className="fixed inset-0 z-[95] flex justify-end bg-slate-950/25" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}><aside className="h-full w-full max-w-[430px] bg-white shadow-2xl"><div className="flex h-[58px] items-center justify-between border-b border-slate-200 px-5"><div><div className="text-[10px] font-black uppercase tracking-[.15em] text-blue-600">Calendar settings</div><div className="text-base font-black text-slate-900">Work week & working hours</div></div><button onClick={onClose} className="h-9 w-9 rounded-lg text-xl font-bold text-slate-500 hover:bg-slate-100">×</button></div><div className="p-5"><p className="text-xs leading-5 text-slate-500">Choose the days and times you normally work. Week view uses these settings so busy and open time are easy to scan.</p><div className="mt-5 space-y-2">{DAY_NAMES.map((name,weekday)=>{const row=rowFor(weekday);return <div key={name} className={`grid grid-cols-[108px_1fr] items-center gap-3 rounded-lg border p-3 ${row?'border-slate-200 bg-white':'border-slate-100 bg-slate-50/60'}`}><label className="flex items-center gap-2 text-xs font-black text-slate-700"><input type="checkbox" checked={Boolean(row)} onChange={e=>toggle(weekday,e.target.checked)}/>{name.slice(0,3)}</label>{row?<div className="grid grid-cols-2 gap-2"><input type="time" value={row.start_time.slice(0,5)} onChange={e=>change(weekday,'start_time',e.target.value)} className="calendar-control"/><input type="time" value={row.end_time.slice(0,5)} onChange={e=>change(weekday,'end_time',e.target.value)} className="calendar-control"/></div>:<div className="text-[10px] font-bold text-slate-400">Not a working day</div>}</div>})}</div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-[10px] font-bold text-slate-500">Time zone: {timezone}</div>{error?<div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>:null}</div><div className="absolute bottom-0 right-0 flex w-full max-w-[430px] justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button onClick={onClose} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-600">Cancel</button><button disabled={saving} onClick={()=>void save()} className="h-10 rounded-lg bg-[#0b2e4a] px-5 text-sm font-black text-white disabled:opacity-50">{saving?'Saving…':'Save hours'}</button></div></aside></div>;
}
