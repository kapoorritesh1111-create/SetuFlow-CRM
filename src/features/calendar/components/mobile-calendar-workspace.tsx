'use client';

import { CalendarAttendeeList } from './calendar-attendee-list';

import themeStyles from '@/components/layout/communication-theme.module.css';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Search, Settings2, X, Pencil, MapPin, Users, Bell, Video, Repeat2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { CalendarPeopleInput } from './calendar-people-input';
import { MobileCommunicationDrawer } from '@/components/layout/mobile-communication-drawer';
import mobileStyles from '@/components/layout/mobile-communication-surfaces.module.css';

type ShowAs = 'busy' | 'free' | 'tentative' | 'out_of_office' | 'working_elsewhere';
type Attendee = { email: string; name?: string | null; attendee_type?: 'required' | 'optional'; rsvp_status: string };
type Reminder = { minutes_before: number; channel: string };
type CalendarView = 'agenda' | 'week' | 'month';
type RecurrenceScope = 'occurrence' | 'series';
type MobileEvent = {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  is_all_day?: boolean;
  visibility?: 'organization' | 'private';
  show_as?: ShowAs;
  status?: string;
  meeting_provider: string;
  meeting_url?: string | null;
  location?: string | null;
  source_event_id?: string | null;
  recurrence_rule?: string | null;
  recurrence_series_id?: string | null;
  recurrence_original_start?: string | null;
  recurrence_virtual?: boolean;
  series_recurrence_rule?: string | null;
  meeting_metadata?: Record<string, any> | null;
  calendar_attendees?: Attendee[];
  calendar_reminders?: Reminder[];
};

type ComposerProps = {
  event: MobileEvent | null;
  defaultStart: Date;
  guest: string;
  lead: string;
  mailThread: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const toLocalInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const parseEmails = (value: string) => [...new Set(value.split(/[;,\n]/).map(item => item.trim().toLowerCase()).filter(item => item.includes('@')))];
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const isRecurring = (event: MobileEvent | null) => Boolean(event?.recurrence_rule || event?.recurrence_series_id || event?.source_event_id || event?.series_recurrence_rule);

function warningMessages(payload: any) {
  return Array.isArray(payload?.warnings) ? payload.warnings.map((warning: any) => String(warning?.message || '')).filter(Boolean) : [];
}

function relativeDayLabel(date: Date) {
  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return '';
}

function reminderLabel(event: MobileEvent) {
  const reminder = event.calendar_reminders?.find(item => item.channel === 'in_app') ?? event.calendar_reminders?.[0];
  if (!reminder) return 'No reminder';
  const minutes = Number(reminder.minutes_before || 0);
  if (minutes === 0) return 'At start time';
  if (minutes === 1440) return '1 day before';
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'} before`;
  return `${minutes} minutes before`;
}

function recurrenceLabel(event: MobileEvent) {
  const rule = String(event.series_recurrence_rule || event.recurrence_rule || '');
  if (!rule) return '';
  if (rule.includes('FREQ=DAILY')) return 'Repeats daily';
  if (rule.includes('FREQ=WEEKLY')) return 'Repeats weekly';
  if (rule.includes('FREQ=MONTHLY')) return 'Repeats monthly';
  return 'Recurring event';
}

export function MobileCalendarWorkspace() {
  const params = useSearchParams();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<MobileEvent | null>(null);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<CalendarView>('agenda');
  const [anchorDate, setAnchorDate] = useState(() => startOfLocalDay(new Date()));
  const openedEventParam = useRef<string | null>(null);

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
  useEffect(() => {
    if (params.get('compose') === '1') {
      setSelected(null);
      setDraftStart(new Date());
      setComposerOpen(true);
      setDetailOpen(false);
    }
  }, [params]);
  useEffect(() => {
    const eventId = params.get('eventId');
    if (!eventId || openedEventParam.current === eventId || !events.length) return;
    const occurrence = params.get('occurrenceStart');
    const target = events.find(event => (event.id === eventId || event.source_event_id === eventId) && (!occurrence || new Date(event.starts_at).getTime() === new Date(occurrence).getTime()));
    if (!target) return;
    openedEventParam.current = eventId;
    setSelected(target);
    setDraftStart(null);
    setDetailOpen(true);
    setComposerOpen(false);
  }, [params, events]);

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const monthTitle = anchorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const weekDates = useMemo(() => {
    const start = new Date(anchorDate);
    start.setDate(anchorDate.getDate() - anchorDate.getDay());
    return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [anchorDate]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...events].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    if (!query) return sorted;
    return sorted.filter(event => [event.title,event.description ?? '',event.location ?? '',event.meeting_provider ?? '',...(event.calendar_attendees ?? []).flatMap(attendee => [attendee.name ?? '', attendee.email])].join(' ').toLowerCase().includes(query));
  }, [events, search]);

  const eventsByDay = useMemo(() => filteredEvents.reduce<Record<string, MobileEvent[]>>((acc, event) => {
    const key = localDateKey(new Date(event.starts_at));
    (acc[key] ??= []).push(event);
    return acc;
  }, {}), [filteredEvents]);

  const agendaDays = useMemo(() => {
    const days = new Map<string, Date>();
    if (!search.trim()) {
      for (let index = 0; index < 14; index += 1) { const date = new Date(today); date.setDate(today.getDate() + index); days.set(localDateKey(date), date); }
    }
    filteredEvents.forEach(event => { const date = startOfLocalDay(new Date(event.starts_at)); days.set(localDateKey(date), date); });
    return [...days.values()].sort((a, b) => a.getTime() - b.getTime());
  }, [filteredEvents, search, today]);

  const monthDays = useMemo(() => {
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + index); return date; });
  }, [anchorDate]);

  function createEvent() { setSelected(null); setDraftStart(new Date()); setComposerOpen(true); setDetailOpen(false); }
  function openEvent(event: MobileEvent) { setSelected(event); setDraftStart(null); setDetailOpen(true); setComposerOpen(false); }
  function editEvent(event: MobileEvent) { setSelected(event); setDraftStart(null); setDetailOpen(false); setComposerOpen(true); }
  function scrollToDate(date: Date) { setAnchorDate(startOfLocalDay(date)); setMenuOpen(false); setViewMode('agenda'); requestAnimationFrame(() => document.getElementById(`mobile-calendar-${localDateKey(date)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  function shiftPeriod(direction: number) {
    const next = new Date(anchorDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + direction);
    else next.setDate(next.getDate() + direction * 7);
    setAnchorDate(startOfLocalDay(next));
  }

  return <div className={`${themeStyles.scope} min-h-screen bg-surface-1 pb-24 text-content-primary md:hidden`}>
    <header className={`${mobileStyles.header} sticky z-30 shadow-sm`}>
      <div className="relative bg-brand-800 text-white">
        <div className="flex h-14 items-center gap-2 px-3">
          <button type="button" onClick={() => setMenuOpen(open => !open)} className={mobileStyles.iconButton} aria-label="Open calendar menu"><CalendarDays size={22} /></button>
          <h1 className="min-w-0 flex-1 text-[19px] font-semibold">{monthTitle}</h1>
          <button type="button" onClick={() => setSearchOpen(open => !open)} className={mobileStyles.iconButton} aria-label="Search calendar"><Search size={21} /></button>
          <Link href="/calendar/settings" className={mobileStyles.iconButton} aria-label="Calendar settings"><Settings2 size={21}/></Link>
        </div>
        <div className="grid grid-cols-3 gap-1 px-3 pb-3">
          {(['agenda','week','month'] as CalendarView[]).map(view => <button key={view} type="button" onClick={()=>setViewMode(view)} className={`h-9 rounded-lg text-xs font-bold capitalize ${viewMode===view?'bg-white text-brand-900':'bg-white/10 text-white'}`}>{view}</button>)}
        </div>
        {searchOpen ? <div className="px-3 pb-3"><label className="flex h-10 items-center gap-2 rounded-xl bg-surface-1 px-3 text-content-secondary"><Search size={17}/><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search calendar" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />{search ? <button onClick={()=>setSearch('')}><X size={16}/></button>:null}</label></div>:null}
        {menuOpen ? <MobileCommunicationDrawer title="Calendar" subtitle="Setu Calendar" onClose={()=>setMenuOpen(false)}><span className={mobileStyles.sectionLabel}>Views</span>{(['agenda','week','month'] as CalendarView[]).map(view=><button key={view} type="button" className={mobileStyles.row} onClick={()=>{setViewMode(view);setMenuOpen(false);}}><CalendarDays size={20}/><span className="capitalize">{view} view</span></button>)}<span className={mobileStyles.sectionLabel}>Settings and tools</span><Link href="/calendar/settings" className={mobileStyles.row} onClick={()=>setMenuOpen(false)}><Settings2 size={22}/><span>Calendar settings</span></Link><Link href="/calendar/booking" className={mobileStyles.row} onClick={()=>setMenuOpen(false)}>Booking page</Link></MobileCommunicationDrawer> : null}
      </div>
      {viewMode !== 'agenda' ? <div className="flex items-center justify-between border-b border-line bg-surface-1 px-3 py-2"><button onClick={()=>shiftPeriod(-1)} className="h-9 px-3 text-lg">‹</button><button onClick={()=>setAnchorDate(today)} className="text-xs font-bold text-content-accent">Today</button><button onClick={()=>shiftPeriod(1)} className="h-9 px-3 text-lg">›</button></div> : null}
      {viewMode === 'agenda' ? <div className="grid grid-cols-7 border-b border-line bg-surface-1 px-1 pb-2 pt-1">{weekDates.map(date=>{const active=localDateKey(date)===localDateKey(today);return <button key={localDateKey(date)} type="button" onClick={()=>scrollToDate(date)} className="flex min-w-0 flex-col items-center gap-1 py-1 text-content-secondary"><span className="text-[10px] font-semibold uppercase">{date.toLocaleDateString(undefined,{weekday:'narrow'})}</span><span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${active?'bg-brand-800 text-white':''}`}>{date.getDate()}</span></button>})}</div>:null}
    </header>

    <main className="pb-8">
      {loadError ? <div className="m-4 rounded-xl border border-danger-border bg-danger-bg p-4 text-sm font-semibold text-danger-fg">{loadError}<button onClick={()=>void load()} className="ml-2 underline">Try again</button></div>:null}
      {loading ? <div className="py-16 text-center text-sm font-semibold text-content-muted">Loading schedule…</div> : viewMode === 'month' ? <MonthView days={monthDays} anchor={anchorDate} eventsByDay={eventsByDay} onOpen={openEvent} /> : viewMode === 'week' ? <WeekView days={weekDates} eventsByDay={eventsByDay} onOpen={openEvent} /> : <AgendaView days={agendaDays} eventsByDay={eventsByDay} onOpen={openEvent} />}
    </main>

    <button type="button" onClick={createEvent} aria-label="Create calendar event" className="fixed bottom-[82px] right-5 z-[410] grid h-14 w-14 place-items-center rounded-full bg-brand-800 text-3xl font-light text-white shadow-card">+</button>

    {detailOpen && selected ? <MobileEventDetail event={selected} onClose={()=>setDetailOpen(false)} onEdit={()=>editEvent(selected)} onSaved={async()=>{setDetailOpen(false);await load();}} /> : null}
    {composerOpen ? <MobileEventComposer key={selected?.id ?? 'new'} event={selected} defaultStart={draftStart ?? new Date()} guest={params.get('guest') || ''} lead={params.get('lead') || ''} mailThread={params.get('mailThread') || ''} onClose={()=>setComposerOpen(false)} onSaved={async()=>{setComposerOpen(false);await load();}} /> : null}
  </div>;
}

function AgendaView({ days, eventsByDay, onOpen }: { days: Date[]; eventsByDay: Record<string, MobileEvent[]>; onOpen: (event: MobileEvent)=>void }) {
  return <>{days.map(date=>{const key=localDateKey(date);const list=eventsByDay[key]??[];const relative=relativeDayLabel(date);return <section id={`mobile-calendar-${key}`} key={key} className="scroll-mt-40 border-b border-line px-4 py-3"><div className="mb-2 flex items-baseline gap-2"><span className="text-[22px] font-medium">{date.getDate()}</span><span className="text-[17px] font-medium">{date.toLocaleDateString(undefined,{weekday:'long'})}</span>{relative?<span className="text-[17px] font-medium text-content-accent">{relative}</span>:null}</div>{list.length?<div className="space-y-2">{list.map(event=><EventRow key={event.id} event={event} onOpen={onOpen}/>)}</div>:<div className="pb-2 text-[13px] text-content-muted">No plans yet</div>}</section>})}</>;
}

function WeekView({ days, eventsByDay, onOpen }: { days: Date[]; eventsByDay: Record<string, MobileEvent[]>; onOpen: (event: MobileEvent)=>void }) {
  return <div className="grid grid-cols-7 min-h-[70vh] divide-x divide-line border-b border-line">{days.map(date=>{const key=localDateKey(date);const list=eventsByDay[key]??[];const active=localDateKey(date)===localDateKey(new Date());return <section key={key} className="min-w-0 px-1 py-2"><div className={`mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${active?'bg-brand-800 text-white':''}`}>{date.getDate()}</div><div className="space-y-1">{list.map(event=><button key={event.id} onClick={()=>onOpen(event)} className="block w-full rounded-md border-l-2 border-accent-500 bg-surface-2 p-1 text-left"><div className="truncate text-[9px] font-bold">{event.title}</div><div className="text-[8px] text-content-muted">{new Date(event.starts_at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</div></button>)}</div></section>})}</div>;
}

function MonthView({ days, anchor, eventsByDay, onOpen }: { days: Date[]; anchor: Date; eventsByDay: Record<string, MobileEvent[]>; onOpen: (event: MobileEvent)=>void }) {
  return <div className="grid grid-cols-7 border-l border-t border-line">{days.map(date=>{const key=localDateKey(date);const list=eventsByDay[key]??[];const inMonth=date.getMonth()===anchor.getMonth();const today=key===localDateKey(new Date());return <div key={key} className="min-h-[86px] border-b border-r border-line p-1"><div className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${today?'bg-brand-800 text-white':inMonth?'text-content-primary':'text-content-muted opacity-50'}`}>{date.getDate()}</div>{list.slice(0,3).map(event=><button key={event.id} onClick={()=>onOpen(event)} className="mb-1 block w-full truncate rounded bg-surface-2 px-1 py-0.5 text-left text-[8px] font-semibold">{event.title}</button>)}{list.length>3?<div className="text-[8px] text-content-muted">+{list.length-3} more</div>:null}</div>})}</div>;
}

function EventRow({ event, onOpen }: { event: MobileEvent; onOpen: (event: MobileEvent)=>void }) {
  const start=new Date(event.starts_at);const end=new Date(event.ends_at);const minutes=Math.max(0,Math.round((end.getTime()-start.getTime())/60000));
  return <article className="flex gap-3"><div className="w-[58px] shrink-0 pt-2 text-right"><div className="text-[13px] font-medium">{event.is_all_day?'All day':start.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</div>{!event.is_all_day&&minutes?<div className="mt-0.5 text-[10px] text-content-muted">{minutes>=60?`${Math.round(minutes/60)}h`:`${minutes}m`}</div>:null}</div><div className="min-w-0 flex-1 rounded-md border-l-4 border-accent-500 bg-surface-2 px-3 py-2.5"><button type="button" onClick={()=>onOpen(event)} className="block w-full text-left"><h2 className="truncate text-[13px] font-semibold">{event.title}</h2><p className="mt-1 truncate text-[11px] text-content-secondary">{event.location || (event.meeting_provider==='zoom'?'Zoom meeting':'Calendar event')}</p></button>{event.meeting_url?<a href={event.meeting_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-8 items-center rounded-lg bg-brand-800 px-3 text-[11px] font-semibold text-white">Join meeting</a>:null}</div></article>;
}

function MobileEventDetail({ event, onClose, onEdit, onSaved }: { event: MobileEvent; onClose:()=>void; onEdit:()=>void; onSaved:()=>Promise<void>|void }) {
  const [busy,setBusy]=useState(false); const [notice,setNotice]=useState('');
  const start=new Date(event.starts_at); const end=new Date(event.ends_at); const metadata=event.meeting_metadata||{};
  const organizerName=String(metadata.organizer_name||'').trim(); const organizerEmail=String(metadata.organizer_email||'').trim();
  const imported=Boolean(metadata.source_message_id&&metadata.source_attachment_id);
  async function respond(response:'accepted'|'tentative'|'declined') { setBusy(true);setNotice('');try{const res=await fetch('/api/mail/calendar-invite',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messageId:metadata.source_message_id,attachmentId:metadata.source_attachment_id,response})});const body=await res.json();if(!res.ok)throw new Error(body.error||'Unable to update RSVP.');await onSaved();}catch(error){setNotice(error instanceof Error?error.message:'Unable to update RSVP.');setBusy(false);} }
  async function cancel(scope:RecurrenceScope) { const label=scope==='series'?'entire series':'this event';if(!confirm(`Cancel ${label}?`))return;setBusy(true);setNotice('');try{const res=await fetch(`/api/calendar?id=${encodeURIComponent(event.id)}&scope=${scope}`,{method:'DELETE'});const body=await res.json();if(!res.ok)throw new Error(body.error||'Unable to cancel event.');await onSaved();}catch(error){setNotice(error instanceof Error?error.message:'Unable to cancel event.');setBusy(false);} }
  return <div className={`${themeStyles.scope} ${mobileStyles.fullScreen} fixed inset-0 z-[500] overflow-y-auto bg-surface-1`}><header className="sticky top-0 z-10 flex h-16 items-center border-b border-line bg-surface-1 px-4"><button onClick={onClose} className="mr-3 text-3xl leading-none">‹</button><div className="min-w-0 flex-1"><h1 className="truncate text-lg font-bold">Calendar</h1><p className="truncate text-xs text-content-muted">{organizerEmail || event.timezone}</p></div><button onClick={onEdit} className="grid h-10 w-10 place-items-center rounded-full bg-surface-2" aria-label="Edit event"><Pencil size={20}/></button></header><main className="space-y-4 p-4 pb-28">{notice?<div className="rounded-xl bg-danger-bg p-3 text-sm font-semibold text-danger-fg">{notice}</div>:null}<section className="rounded-2xl bg-surface-2 p-4"><div className="flex gap-3"><span className="mt-2 h-3 w-3 rounded-full bg-accent-500"/><div><h2 className="text-2xl font-semibold">{event.title}</h2><p className="mt-3 text-content-secondary">{start.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p><p className="text-content-secondary">{event.is_all_day?'All day':`${start.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})} → ${end.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}`}</p>{recurrenceLabel(event)?<p className="mt-2 text-sm text-content-muted"><Repeat2 size={14} className="mr-1 inline"/>{recurrenceLabel(event)}</p>:null}</div></div></section>{event.location||event.meeting_url?<section className="rounded-2xl bg-surface-2"><div className="flex items-center gap-3 border-b border-line p-4"><MapPin size={22}/><span>{event.location||'Online meeting'}</span></div>{event.meeting_url?<a href={event.meeting_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 text-content-accent"><span className="flex items-center gap-3"><Video size={22}/>Join meeting</span><span>Open</span></a>:null}</section>:null}{organizerName||organizerEmail?<section className="rounded-2xl bg-surface-2 p-4"><div className="flex items-center gap-3"><Users size={22}/><div><div className="font-semibold">{organizerName||organizerEmail}</div>{organizerName&&organizerEmail?<div className="text-sm text-content-muted">{organizerEmail}</div>:null}<div className="mt-1 text-xs text-content-muted">Organizer</div></div></div></section>:null}<CalendarAttendeeList attendees={event.calendar_attendees ?? []}/>{imported?<section className="rounded-2xl bg-surface-2 p-4"><div className="mb-3 text-sm font-bold">RSVP</div><div className="grid grid-cols-3 gap-2"><button disabled={busy} onClick={()=>void respond('accepted')} className="rounded-xl bg-brand-800 py-2 text-xs font-bold text-white">Accept</button><button disabled={busy} onClick={()=>void respond('tentative')} className="rounded-xl border border-line py-2 text-xs font-bold">Tentative</button><button disabled={busy} onClick={()=>void respond('declined')} className="rounded-xl border border-line py-2 text-xs font-bold">Decline</button></div></section>:null}<button onClick={onEdit} className="flex w-full items-center justify-between rounded-2xl bg-surface-2 p-4 text-left"><span className="flex items-center gap-3"><Bell size={22}/><span><div className="font-semibold">Reminder</div><div className="text-sm text-content-muted">{reminderLabel(event)}</div></span></span><span>›</span></button>{event.description?<section className="rounded-2xl bg-surface-2 p-4"><div className="mb-2 font-semibold">Notes</div><div className="whitespace-pre-wrap text-sm text-content-secondary">{event.description}</div></section>:null}<section className="rounded-2xl bg-surface-2 p-4"><button disabled={busy} onClick={()=>void cancel('occurrence')} className="w-full py-2 text-left font-semibold text-danger-fg">{isRecurring(event)?'Cancel this event':'Cancel event'}</button>{isRecurring(event)?<button disabled={busy} onClick={()=>void cancel('series')} className="mt-2 w-full border-t border-line pt-4 text-left font-semibold text-danger-fg">Cancel entire series</button>:null}</section></main></div>;
}

function MobileEventComposer({ event, defaultStart, guest, lead, mailThread, onClose, onSaved }: ComposerProps) {
  const initialStart = event ? new Date(event.starts_at) : new Date(defaultStart);
  if (!event) initialStart.setMinutes(Math.ceil(initialStart.getMinutes() / 30) * 30, 0, 0);
  const initialEnd = event ? new Date(event.ends_at) : new Date(initialStart.getTime() + 30 * 60000);
  const requiredInitial = event?.calendar_attendees?.filter(attendee => attendee.attendee_type !== 'optional').map(attendee => attendee.email).join(', ') || guest;
  const optionalInitial = event?.calendar_attendees?.filter(attendee => attendee.attendee_type === 'optional').map(attendee => attendee.email).join(', ') || '';
  const defaultReminder = event?.calendar_reminders?.find(item=>item.channel==='in_app')?.minutes_before ?? event?.calendar_reminders?.[0]?.minutes_before ?? 15;
  const [title,setTitle]=useState(event?.title??''); const [startsAt,setStartsAt]=useState(toLocalInput(initialStart)); const [endsAt,setEndsAt]=useState(toLocalInput(initialEnd));
  const [requiredPeople,setRequiredPeople]=useState(requiredInitial); const [optionalPeople,setOptionalPeople]=useState(optionalInitial); const [location,setLocation]=useState(event?.location??''); const [provider,setProvider]=useState(event?.meeting_provider??'zoom'); const [meetingUrl,setMeetingUrl]=useState(event?.meeting_url??''); const [notes,setNotes]=useState(event?.description??''); const [isAllDay,setIsAllDay]=useState(Boolean(event?.is_all_day)); const [isPrivate,setIsPrivate]=useState(event?.visibility==='private'); const [showAs,setShowAs]=useState<ShowAs>(event?.show_as??'busy'); const [reminder,setReminder]=useState(defaultReminder); const [emailReminder,setEmailReminder]=useState(event?.calendar_reminders?.some(item=>item.channel==='email')??false); const [scope,setScope]=useState<RecurrenceScope>(isRecurring(event)?'occurrence':'series'); const [saving,setSaving]=useState(false); const [notice,setNotice]=useState('');
  function changeStart(value:string){const previousStart=new Date(startsAt),previousEnd=new Date(endsAt),nextStart=new Date(value);setStartsAt(value);if(!Number.isNaN(nextStart.valueOf())){const duration=Math.max(30*60000,previousEnd.getTime()-previousStart.getTime());setEndsAt(toLocalInput(new Date(nextStart.getTime()+duration)));}}
  async function save(allowConflict=false){if(!title.trim())return;setSaving(true);setNotice('');const required=parseEmails(requiredPeople);const optional=parseEmails(optionalPeople).filter(email=>!required.includes(email));const links=event?undefined:[...(lead?[{entityType:'lead',entityId:lead,label:'Lead'}]:[]),...(mailThread?[{entityType:'mail_thread',entityId:mailThread,label:'Setu Mail conversation'}]:[])];const payload:any={id:event?.id,scope:event&&isRecurring(event)?scope:undefined,title:title.trim(),startsAt:new Date(startsAt).toISOString(),endsAt:new Date(endsAt).toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',isAllDay,visibility:isPrivate?'private':'organization',showAs,meetingProvider:provider,meetingUrl:provider==='custom'?meetingUrl:null,location:location.trim()||null,description:notes,attendees:[...required.map(email=>({email,attendeeType:'required'})),...optional.map(email=>({email,attendeeType:'optional'}))],reminderMinutes:reminder,reminderChannels:emailReminder?['in_app','email']:['in_app'],allowConflict};if(links?.length)payload.links=links;try{const response=await fetch('/api/calendar',{method:event?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(response.status===409&&!allowConflict){setSaving(false);if(confirm(`${result.error}\n\nSave it anyway?`))await save(true);return;}if(!response.ok){setNotice(result.error||'Unable to save event.');setSaving(false);return;}const warnings=warningMessages(result);setSaving(false);if(warnings.length)window.alert(`Event saved, but ${warnings.join(' ')}`);await onSaved();}catch{setNotice('Unable to save event. Check your connection and try again.');setSaving(false);}}
  async function remove(){if(!event)return;const label=isRecurring(event)&&scope==='series'?'entire series':'event';if(!confirm(`Cancel this ${label} and notify attendees?`))return;setSaving(true);setNotice('');try{const response=await fetch(`/api/calendar?id=${encodeURIComponent(event.id)}&scope=${scope}`,{method:'DELETE'});const result=await response.json();if(!response.ok){setNotice(result.error||'Unable to cancel event.');setSaving(false);return;}const warnings=warningMessages(result);setSaving(false);if(warnings.length)window.alert(`Event cancelled, but ${warnings.join(' ')}`);await onSaved();}catch{setNotice('Unable to cancel event. Check your connection and try again.');setSaving(false);}}
  return <div className={`${themeStyles.scope} ${mobileStyles.fullScreen} fixed inset-0 z-[500] overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm`}><div className="mx-auto min-h-full max-w-xl rounded-3xl bg-surface-1 shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-1 px-4 py-4 backdrop-blur"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-content-accent">{event?'Calendar event':'New event'}</div><h2 className="mt-1 text-lg font-bold">{event?'Edit event':'Schedule event'}</h2></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-xl font-bold text-content-muted">×</button></div><div className="space-y-4 p-4">{notice?<div className="rounded-xl border border-danger-border bg-danger-bg p-3 text-xs font-bold text-danger-fg">{notice}</div>:null}{event&&isRecurring(event)?<MobileField label="Apply changes to"><select value={scope} onChange={input=>setScope(input.target.value as RecurrenceScope)} className="mobile-calendar-input"><option value="occurrence">This event only</option><option value="series">Entire series</option></select></MobileField>:null}<MobileField label="Title"><input value={title} onChange={input=>setTitle(input.target.value)} className="mobile-calendar-input"/></MobileField><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><MobileField label="Starts"><input type="datetime-local" value={startsAt} onChange={input=>changeStart(input.target.value)} className="mobile-calendar-input"/></MobileField><MobileField label="Ends"><input type="datetime-local" value={endsAt} min={startsAt} onChange={input=>setEndsAt(input.target.value)} className="mobile-calendar-input"/></MobileField></div><label className="flex items-center gap-2 text-xs font-bold text-content-secondary"><input type="checkbox" checked={isAllDay} onChange={input=>setIsAllDay(input.target.checked)}/>All-day event</label><MobileField label="Required attendees"><CalendarPeopleInput ariaLabel="Required attendees" value={requiredPeople} onChange={setRequiredPeople} placeholder="Start typing a name or email" className="mobile-calendar-input"/></MobileField><MobileField label="Optional attendees"><CalendarPeopleInput ariaLabel="Optional attendees" value={optionalPeople} onChange={setOptionalPeople} placeholder="Start typing a name or email" className="mobile-calendar-input"/></MobileField><MobileField label="Location"><input value={location} onChange={input=>setLocation(input.target.value)} className="mobile-calendar-input"/></MobileField><MobileField label="Meeting type"><select value={provider} onChange={input=>setProvider(input.target.value)} className="mobile-calendar-input"><option value="zoom">Zoom meeting</option><option value="custom">Custom meeting link</option><option value="in_person">In person</option><option value="none">No online meeting</option></select></MobileField>{provider==='custom'?<MobileField label="Meeting link"><input value={meetingUrl} onChange={input=>setMeetingUrl(input.target.value)} className="mobile-calendar-input"/></MobileField>:null}<div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><MobileField label="Show as"><select value={showAs} onChange={input=>setShowAs(input.target.value as ShowAs)} className="mobile-calendar-input"><option value="busy">Busy</option><option value="free">Free</option><option value="tentative">Tentative</option><option value="out_of_office">Out of office</option><option value="working_elsewhere">Working elsewhere</option></select></MobileField><MobileField label="Reminder"><select value={reminder} onChange={input=>setReminder(Number(input.target.value))} className="mobile-calendar-input"><option value={0}>At start time</option><option value={5}>5 minutes before</option><option value={10}>10 minutes before</option><option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option><option value={120}>2 hours before</option><option value={1440}>1 day before</option></select></MobileField></div><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-xs font-bold text-content-secondary"><input type="checkbox" checked={emailReminder} onChange={input=>setEmailReminder(input.target.checked)}/>Email reminder too</label><label className="flex items-center gap-2 text-xs font-bold text-content-secondary"><input type="checkbox" checked={isPrivate} onChange={input=>setIsPrivate(input.target.checked)}/>Private</label></div><MobileField label="Notes"><textarea value={notes} onChange={input=>setNotes(input.target.value)} rows={5} className="mobile-calendar-input resize-none"/></MobileField><div className="rounded-xl bg-surface-2 p-3 text-[11px] font-semibold text-content-muted">Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}</div>{event?.meeting_url?<a href={event.meeting_url} target="_blank" rel="noreferrer" className="block rounded-xl bg-brand-700 py-3 text-center text-sm font-bold text-white">Join meeting</a>:null}</div><div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface-1 px-4 py-4">{event?<button disabled={saving} onClick={()=>void remove()} className="text-sm font-bold text-danger-fg disabled:opacity-40">Cancel {isRecurring(event)&&scope==='series'?'series':'event'}</button>:<span/>}<div className="flex gap-2"><button disabled={saving} onClick={onClose} className="h-11 rounded-xl border border-line px-4 text-sm font-bold text-content-secondary">Close</button><button disabled={saving||!title.trim()} onClick={()=>void save()} className="h-11 rounded-xl bg-brand-800 px-5 text-sm font-bold text-white disabled:opacity-40">{saving?'Saving…':event?'Save changes':'Create event'}</button></div></div></div><style jsx global>{`.mobile-calendar-input{width:100%;border:1px solid var(--sf-border);border-radius:12px;background:var(--sf-surface-1);padding:10px 12px;font-size:14px;color:var(--sf-text-primary);outline:none}.mobile-calendar-input:focus{border-color:var(--sf-action-primary-bg);box-shadow:0 0 0 3px var(--sf-focus-ring)}`}</style></div>;
}

function MobileField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-content-secondary">{label}</span>{children}</label>; }
