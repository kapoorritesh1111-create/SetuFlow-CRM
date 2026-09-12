'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarPeopleInput } from './calendar-people-input';

type ShowAs = 'busy' | 'free' | 'tentative' | 'out_of_office' | 'working_elsewhere';
type Attendee = { email: string; name?: string | null; attendee_type?: 'required' | 'optional'; rsvp_status: string };
type Reminder = { minutes_before: number; channel: string };
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
  meeting_provider: string;
  meeting_url?: string | null;
  location?: string | null;
  source_event_id?: string | null;
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

function warningMessages(payload: any) {
  return Array.isArray(payload?.warnings)
    ? payload.warnings.map((warning: any) => String(warning?.message || '')).filter(Boolean)
    : [];
}

export function MobileCalendarWorkspace() {
  const params = useSearchParams();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<MobileEvent | null>(null);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
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
    }
  }, [params]);
  useEffect(() => {
    const eventId = params.get('eventId');
    if (!eventId || openedEventParam.current === eventId || !events.length) return;
    const target = events.find(event => event.id === eventId || event.source_event_id === eventId);
    if (!target) return;
    openedEventParam.current = eventId;
    setSelected(target);
    setDraftStart(null);
    setComposerOpen(true);
  }, [params, events]);

  const groups = useMemo(() => events.reduce<Record<string, MobileEvent[]>>((acc, event) => {
    const key = new Date(event.starts_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    (acc[key] ??= []).push(event);
    return acc;
  }, {}), [events]);

  function createEvent() {
    setSelected(null);
    setDraftStart(new Date());
    setComposerOpen(true);
  }

  function editEvent(event: MobileEvent) {
    setSelected(event);
    setDraftStart(null);
    setComposerOpen(true);
  }

  return <div className="min-h-screen bg-slate-50 pb-24">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Setu Communications</div><h1 className="text-xl font-black text-slate-950">Calendar</h1></div>
        <button onClick={createEvent} aria-label="Create calendar event" className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-xl font-black text-white">+</button>
      </div>
    </header>
    <main className="space-y-6 p-4">
      {loadError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{loadError}<button onClick={() => void load()} className="ml-2 underline">Try again</button></div> : null}
      {loading ? <div className="py-16 text-center text-sm font-bold text-slate-400">Loading schedule…</div>
        : Object.keys(groups).length ? Object.entries(groups).map(([day, list]) => <section key={day}>
          <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">{day}</div>
          <div className="space-y-2">{list.map(event => <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button onClick={() => editEvent(event)} className="flex w-full gap-3 text-left">
              <div className="w-16 shrink-0 text-sm font-black text-slate-900">{event.is_all_day ? 'All day' : new Date(event.starts_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
              <div className="min-w-0 flex-1"><h2 className="truncate font-black text-slate-950">{event.title}</h2><p className="mt-1 text-xs text-slate-500">{event.location || (event.meeting_provider === 'zoom' ? 'Zoom meeting' : 'Calendar event')}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-blue-600">Tap to view or edit</p></div>
            </button>
            {event.meeting_url ? <a href={event.meeting_url} target="_blank" rel="noreferrer" className="ml-[76px] mt-3 inline-flex h-9 items-center rounded-xl bg-blue-600 px-4 text-xs font-black text-white">Join meeting</a> : null}
          </article>)}</div>
        </section>) : <div className="py-20 text-center"><h2 className="text-lg font-black text-slate-800">Your schedule is clear</h2><p className="mt-1 text-sm text-slate-400">Create a meeting when you&apos;re ready.</p><button onClick={createEvent} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Create event</button></div>}
    </main>

    {composerOpen ? <MobileEventComposer
      key={selected?.id ?? 'new'}
      event={selected}
      defaultStart={draftStart ?? new Date()}
      guest={params.get('guest') || ''}
      lead={params.get('lead') || ''}
      mailThread={params.get('mailThread') || ''}
      onClose={() => setComposerOpen(false)}
      onSaved={async () => { setComposerOpen(false); await load(); }}
    /> : null}
  </div>;
}

function MobileEventComposer({ event, defaultStart, guest, lead, mailThread, onClose, onSaved }: ComposerProps) {
  const initialStart = event ? new Date(event.starts_at) : new Date(defaultStart);
  if (!event) initialStart.setMinutes(Math.ceil(initialStart.getMinutes() / 30) * 30, 0, 0);
  const initialEnd = event ? new Date(event.ends_at) : new Date(initialStart.getTime() + 30 * 60000);
  const requiredInitial = event?.calendar_attendees?.filter(attendee => attendee.attendee_type !== 'optional').map(attendee => attendee.email).join(', ') || guest;
  const optionalInitial = event?.calendar_attendees?.filter(attendee => attendee.attendee_type === 'optional').map(attendee => attendee.email).join(', ') || '';
  const defaultReminder = event?.calendar_reminders?.[0]?.minutes_before ?? 15;

  const [title, setTitle] = useState(event?.title ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(initialStart));
  const [endsAt, setEndsAt] = useState(toLocalInput(initialEnd));
  const [requiredPeople, setRequiredPeople] = useState(requiredInitial);
  const [optionalPeople, setOptionalPeople] = useState(optionalInitial);
  const [location, setLocation] = useState(event?.location ?? '');
  const [provider, setProvider] = useState(event?.meeting_provider ?? 'zoom');
  const [meetingUrl, setMeetingUrl] = useState(event?.meeting_url ?? '');
  const [notes, setNotes] = useState(event?.description ?? '');
  const [isAllDay, setIsAllDay] = useState(Boolean(event?.is_all_day));
  const [isPrivate, setIsPrivate] = useState(event?.visibility === 'private');
  const [showAs, setShowAs] = useState<ShowAs>(event?.show_as ?? 'busy');
  const [reminder, setReminder] = useState(defaultReminder);
  const [emailReminder, setEmailReminder] = useState(event?.calendar_reminders?.some(item => item.channel === 'email') ?? false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  function changeStart(value: string) {
    const previousStart = new Date(startsAt);
    const previousEnd = new Date(endsAt);
    const nextStart = new Date(value);
    setStartsAt(value);
    if (!Number.isNaN(nextStart.valueOf())) {
      const duration = Math.max(30 * 60000, previousEnd.getTime() - previousStart.getTime());
      setEndsAt(toLocalInput(new Date(nextStart.getTime() + duration)));
    }
  }

  async function save(allowConflict = false) {
    if (!title.trim()) return;
    setSaving(true);
    setNotice('');
    const required = parseEmails(requiredPeople);
    const optional = parseEmails(optionalPeople).filter(email => !required.includes(email));
    const links = event ? undefined : [
      ...(lead ? [{ entityType: 'lead', entityId: lead, label: 'Lead' }] : []),
      ...(mailThread ? [{ entityType: 'mail_thread', entityId: mailThread, label: 'Setu Mail conversation' }] : []),
    ];
    const payload: any = {
      id: event?.id,
      title: title.trim(),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      isAllDay,
      visibility: isPrivate ? 'private' : 'organization',
      showAs,
      meetingProvider: provider,
      meetingUrl: provider === 'custom' ? meetingUrl : null,
      location: location.trim() || null,
      description: notes,
      attendees: [
        ...required.map(email => ({ email, attendeeType: 'required' })),
        ...optional.map(email => ({ email, attendeeType: 'optional' })),
      ],
      reminderMinutes: reminder,
      reminderChannels: emailReminder ? ['in_app', 'email'] : ['in_app'],
      allowConflict,
    };
    if (links?.length) payload.links = links;

    try {
      const response = await fetch('/api/calendar', { method: event ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (response.status === 409 && !allowConflict) {
        setSaving(false);
        if (confirm(`${result.error}\n\nSave it anyway?`)) await save(true);
        return;
      }
      if (!response.ok) {
        setNotice(result.error || 'Unable to save event.');
        setSaving(false);
        return;
      }
      const warnings = warningMessages(result);
      setSaving(false);
      if (warnings.length) window.alert(`Event saved, but ${warnings.join(' ')}`);
      await onSaved();
    } catch {
      setNotice('Unable to save event. Check your connection and try again.');
      setSaving(false);
    }
  }

  async function remove() {
    if (!event || !confirm('Cancel this event and notify attendees?')) return;
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch(`/api/calendar?id=${event.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        setNotice(result.error || 'Unable to cancel event.');
        setSaving(false);
        return;
      }
      const warnings = warningMessages(result);
      setSaving(false);
      if (warnings.length) window.alert(`Event cancelled, but ${warnings.join(' ')}`);
      await onSaved();
    } catch {
      setNotice('Unable to cancel event. Check your connection and try again.');
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm">
    <div className="mx-auto min-h-full max-w-xl rounded-3xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">{event ? 'Calendar event' : 'New event'}</div><h2 className="mt-1 text-lg font-black text-slate-950">{event ? 'View or edit' : 'Schedule event'}</h2></div>
        <button onClick={onClose} aria-label="Close event" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl font-black text-slate-500">×</button>
      </div>
      <div className="space-y-4 p-4">
        {notice ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{notice}</div> : null}
        <MobileField label="Title"><input value={title} onChange={input => setTitle(input.target.value)} placeholder="Meeting title" className="mobile-calendar-input" /></MobileField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><MobileField label="Starts"><input type="datetime-local" value={startsAt} onChange={input => changeStart(input.target.value)} className="mobile-calendar-input" /></MobileField><MobileField label="Ends"><input type="datetime-local" value={endsAt} min={startsAt} onChange={input => setEndsAt(input.target.value)} className="mobile-calendar-input" /></MobileField></div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={isAllDay} onChange={input => setIsAllDay(input.target.checked)} />All-day event</label>
        <MobileField label="Required attendees"><CalendarPeopleInput ariaLabel="Required attendees" value={requiredPeople} onChange={setRequiredPeople} placeholder="Start typing a name or email" className="mobile-calendar-input" /></MobileField>
        <MobileField label="Optional attendees"><CalendarPeopleInput ariaLabel="Optional attendees" value={optionalPeople} onChange={setOptionalPeople} placeholder="Start typing a name or email" className="mobile-calendar-input" /></MobileField>
        <MobileField label="Location"><input value={location} onChange={input => setLocation(input.target.value)} placeholder="Office, booth, customer site…" className="mobile-calendar-input" /></MobileField>
        <MobileField label="Meeting type"><select value={provider} onChange={input => setProvider(input.target.value)} className="mobile-calendar-input"><option value="zoom">Zoom meeting</option><option value="custom">Custom meeting link</option><option value="in_person">In person</option><option value="none">No online meeting</option></select></MobileField>
        {provider === 'custom' ? <MobileField label="Meeting link"><input value={meetingUrl} onChange={input => setMeetingUrl(input.target.value)} placeholder="https://…" className="mobile-calendar-input" /></MobileField> : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><MobileField label="Show as"><select value={showAs} onChange={input => setShowAs(input.target.value as ShowAs)} className="mobile-calendar-input"><option value="busy">Busy</option><option value="free">Free</option><option value="tentative">Tentative</option><option value="out_of_office">Out of office</option><option value="working_elsewhere">Working elsewhere</option></select></MobileField><MobileField label="Reminder"><select value={reminder} onChange={input => setReminder(Number(input.target.value))} className="mobile-calendar-input"><option value={5}>5 minutes before</option><option value={10}>10 minutes before</option><option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option><option value={1440}>1 day before</option></select></MobileField></div>
        <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={emailReminder} onChange={input => setEmailReminder(input.target.checked)} />Email reminder too</label><label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={isPrivate} onChange={input => setIsPrivate(input.target.checked)} />Private</label></div>
        <MobileField label="Notes"><textarea value={notes} onChange={input => setNotes(input.target.value)} rows={5} placeholder="Agenda or preparation notes" className="mobile-calendar-input resize-none" /></MobileField>
        <div className="rounded-xl bg-slate-50 p-3 text-[11px] font-semibold leading-5 text-slate-500">Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}. Working Hours guide the view and do not restrict when you can schedule.</div>
        {event?.meeting_url ? <a href={event.meeting_url} target="_blank" rel="noreferrer" className="block rounded-xl bg-blue-600 py-3 text-center text-sm font-black text-white">Join meeting</a> : null}
      </div>
      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-4">
        {event ? <button disabled={saving} onClick={() => void remove()} className="text-sm font-black text-rose-600 disabled:opacity-40">Cancel event</button> : <span />}
        <div className="flex gap-2"><button disabled={saving} onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-600 disabled:opacity-40">Close</button><button disabled={saving || !title.trim()} onClick={() => void save()} className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-40">{saving ? 'Saving…' : event ? 'Save changes' : 'Create event'}</button></div>
      </div>
    </div>
    <style jsx global>{`.mobile-calendar-input{width:100%;border:1px solid rgb(226 232 240);border-radius:12px;background:white;padding:10px 12px;font-size:14px;color:rgb(15 23 42);outline:none}.mobile-calendar-input:focus{border-color:rgb(96 165 250);box-shadow:0 0 0 3px rgb(219 234 254)}`}</style>
  </div>;
}

function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black text-slate-700">{label}</span>{children}</label>;
}
