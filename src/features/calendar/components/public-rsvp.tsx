'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, MapPin, Video } from 'lucide-react';

type ResponseChoice = 'accepted' | 'tentative' | 'declined';
type Payload = {
  attendee: { email: string; name?: string | null; attendeeType: string; response: string; respondedAt?: string | null };
  event: {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    startsAt: string;
    endsAt: string;
    timezone: string;
    isAllDay: boolean;
    status: string;
    meetingProvider: string;
    meetingUrl?: string | null;
  };
};

const choices: Array<{ value: ResponseChoice; label: string }> = [
  { value: 'accepted', label: 'Accept' },
  { value: 'tentative', label: 'Tentative' },
  { value: 'declined', label: 'Decline' },
];

export function PublicRsvp({ token, suggestedResponse }: { token: string; suggestedResponse?: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const initial = choices.some(choice => choice.value === suggestedResponse) ? suggestedResponse as ResponseChoice : null;
  const [selected, setSelected] = useState<ResponseChoice | null>(initial);

  useEffect(() => {
    let active = true;
    fetch(`/api/calendar/rsvp/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Invitation not found.');
        if (active) setPayload(body);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Invitation not found.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const when = useMemo(() => {
    if (!payload) return '';
    const event = payload.event;
    if (event.isAllDay) {
      return new Intl.DateTimeFormat(undefined, { timeZone: event.timezone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(event.startsAt));
    }
    const day = new Intl.DateTimeFormat(undefined, { timeZone: event.timezone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(event.startsAt));
    const start = new Intl.DateTimeFormat(undefined, { timeZone: event.timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(event.startsAt));
    const end = new Intl.DateTimeFormat(undefined, { timeZone: event.timezone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(event.endsAt));
    return `${day} · ${start} – ${end}`;
  }, [payload]);

  async function respond(choice: ResponseChoice) {
    setSelected(choice);
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/calendar/rsvp/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ response: choice }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to save your response.');
      setPayload(current => current ? { ...current, attendee: { ...current.attendee, response: body.response, respondedAt: body.respondedAt } } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your response.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-2xl p-8 text-center text-sm font-semibold text-slate-500">Loading invitation…</div>;
  if (!payload) return <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-rose-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold text-slate-900">Invitation unavailable</h1><p className="mt-3 text-sm text-slate-600">{error || 'This invitation link is invalid or no longer available.'}</p></div>;

  const cancelled = payload.event.status === 'cancelled';
  const currentResponse = payload.attendee.response;
  return <div className="min-h-screen bg-slate-50 px-4 py-10">
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-[#0b2e4a] px-7 py-5 text-white"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-blue-100"><CalendarDays size={16}/>Setu Calendar</div><h1 className="mt-2 text-2xl font-bold">{cancelled ? `Cancelled: ${payload.event.title}` : payload.event.title}</h1></div>
      <div className="space-y-5 p-7">
        <div className="flex gap-3"><Clock3 size={18} className="mt-0.5 shrink-0 text-slate-400"/><div><div className="text-sm font-semibold text-slate-900">{when}</div><div className="mt-1 text-xs text-slate-500">Calendar timezone: {payload.event.timezone}</div></div></div>
        {payload.event.location ? <div className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-slate-400"/><div className="text-sm text-slate-700">{payload.event.location}</div></div> : null}
        {payload.event.description ? <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 whitespace-pre-wrap">{payload.event.description}</div> : null}

        {cancelled ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">This meeting has been cancelled. No response is required.</div> : <>
          <div><div className="text-sm font-bold text-slate-900">Your response</div><div className="mt-1 text-xs text-slate-500">Responding as {payload.attendee.email}</div></div>
          <div className="grid gap-2 sm:grid-cols-3">{choices.map(choice => {
            const active = (currentResponse === choice.value) || (selected === choice.value && saving);
            return <button key={choice.value} disabled={saving} onClick={() => void respond(choice.value)} className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${active ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'} disabled:opacity-60`}>{active ? <span className="inline-flex items-center gap-2"><CheckCircle2 size={16}/>{choice.label}</span> : choice.label}</button>;
          })}</div>
          {currentResponse !== 'needs_action' ? <p className="text-xs font-semibold text-emerald-700">Response saved: {currentResponse === 'accepted' ? 'Accepted' : currentResponse === 'tentative' ? 'Tentative' : 'Declined'}.</p> : null}
          {payload.event.meetingUrl && currentResponse !== 'declined' ? <a href={payload.event.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#0b2e4a] px-4 py-2.5 text-sm font-bold text-white"><Video size={16}/>Join meeting</a> : null}
        </>}
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      </div>
    </div>
  </div>;
}
