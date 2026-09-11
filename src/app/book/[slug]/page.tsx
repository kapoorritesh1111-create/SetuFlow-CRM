'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type Slot = { startsAt: string; endsAt: string; organizerDate: string; organizerTime: string };
type BookingPayload = {
  page?: {
    slug: string;
    title: string;
    description?: string | null;
    durationMinutes: number;
    bufferMinutes: number;
    minimumNoticeMinutes: number;
    bookingWindowDays: number;
    meetingProvider: string;
    timezone: string;
    organizerName?: string;
  };
  slots?: Slot[];
  error?: string;
};

export default function BookingPage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<BookingPayload | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);
  const visitorTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  async function load() {
    setError('');
    const response = await fetch(`/api/calendar/booking?slug=${encodeURIComponent(params.slug)}`, { cache: 'no-store' });
    const payload = await response.json();
    setData(payload);
    if (!response.ok) setError(payload.error || 'Unable to load availability.');
  }

  useEffect(() => { void load(); }, [params.slug]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of data?.slots ?? []) {
      const key = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: visitorTimeZone }).format(new Date(slot.startsAt));
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return [...groups.entries()].slice(0, 10);
  }, [data?.slots, visitorTimeZone]);

  async function book() {
    if (!selected || busy) return;
    setBusy(true); setError('');
    const response = await fetch('/api/calendar/booking', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: params.slug, startsAt: selected.startsAt, name, email, notes, timezone: visitorTimeZone }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || 'Unable to book that time.');
      if (response.status === 409) { setSelected(null); await load(); }
      return;
    }
    setConfirmation(payload);
  }

  if (!data) return <main className="grid min-h-screen place-items-center bg-slate-50 text-sm font-bold text-slate-400">Loading availability…</main>;
  if (data.error || !data.page) return <main className="grid min-h-screen place-items-center bg-slate-50 px-6"><div className="text-center"><h1 className="text-xl font-black text-slate-900">Booking page unavailable</h1><p className="mt-2 text-sm text-slate-500">{error || 'Please contact the meeting organizer.'}</p></div></main>;

  return <main className="min-h-screen bg-slate-50 px-4 py-8 md:py-12">
    <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
      <div className="grid md:grid-cols-[.75fr_1.25fr]">
        <section className="bg-slate-950 p-8 text-white md:p-10">
          <div className="text-[11px] font-black uppercase tracking-[.2em] text-blue-300">Setu Communications</div>
          <h1 className="mt-5 text-3xl font-black">{data.page.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{data.page.description || 'Choose a time that works for you.'}</p>
          {data.page.organizerName ? <p className="mt-6 text-sm font-bold text-white">with {data.page.organizerName}</p> : null}
          <div className="mt-8 space-y-3 text-sm font-bold text-slate-300">
            <div>◷ {data.page.durationMinutes} minutes</div>
            <div>◎ {data.page.meetingProvider === 'zoom' ? 'Zoom meeting' : data.page.meetingProvider === 'custom' ? 'Online meeting' : 'Meeting'}</div>
            <div>◉ Times shown in {visitorTimeZone.replace('_', ' ')}</div>
          </div>
          {data.page.timezone !== visitorTimeZone ? <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300">Organizer working hours are maintained in <strong className="text-white">{data.page.timezone.replace('_', ' ')}</strong>. Setu converts them to your local timezone automatically, including daylight-saving changes.</div> : null}
        </section>

        <section className="p-6 md:p-8">
          {confirmation ? <div className="py-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-600">✓</div>
            <h2 className="mt-5 text-2xl font-black text-slate-950">You&apos;re booked</h2>
            <p className="mt-2 text-sm text-slate-500">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: visitorTimeZone }).format(new Date(confirmation.startsAt))}</p>
            <p className="mt-2 text-sm text-slate-500">{confirmation.invitationSent ? 'A calendar invitation has been sent to your email.' : 'The organizer has your booking. Calendar invitation delivery may still need attention.'}</p>
            {confirmation.meetingUrl ? <a href={confirmation.meetingUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Join meeting</a> : null}
            {confirmation.warnings?.length ? <div className="mx-auto mt-6 max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs font-semibold text-amber-800">{confirmation.warnings.join(' ')}</div> : null}
          </div> : <>
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-black text-slate-950">Choose a time</h2><p className="mt-1 text-xs text-slate-500">Only currently available times are shown.</p></div><button onClick={() => void load()} className="text-xs font-bold text-blue-700">Refresh</button></div>
            {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}
            <div className="mt-5 max-h-[430px] space-y-5 overflow-y-auto pr-1">
              {grouped.map(([day, slots]) => <div key={day}><div className="sticky top-0 bg-white pb-2 text-xs font-black text-slate-500">{day}</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{slots.map(slot => <button key={slot.startsAt} onClick={() => setSelected(slot)} className={`rounded-xl border p-3 text-left text-xs font-black ${selected?.startsAt === slot.startsAt ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:border-blue-200'}`}>{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: visitorTimeZone }).format(new Date(slot.startsAt))}</button>)}</div></div>)}
              {!grouped.length ? <div className="rounded-xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">No open times are available in the current booking window.</div> : null}
            </div>
            {selected ? <div className="mt-6 border-t border-slate-200 pt-6"><div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-900">Selected: {new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: visitorTimeZone }).format(new Date(selected.startsAt))}</div><div className="space-y-3"><input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/><input value={email} onChange={event => setEmail(event.target.value)} placeholder="Work email" type="email" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="What would you like to discuss?" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" rows={3}/><button disabled={!name.trim() || !email.trim() || busy} onClick={() => void book()} className="w-full rounded-xl bg-slate-950 py-3 text-sm font-black text-white disabled:opacity-40">{busy ? 'Booking…' : 'Schedule meeting'}</button></div></div> : null}
          </>}
        </section>
      </div>
    </div>
  </main>;
}
