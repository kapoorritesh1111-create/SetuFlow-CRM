'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Copy, ExternalLink, Save } from 'lucide-react';

type BookingPage = {
  id: string | null;
  exists: boolean;
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeMinutes: number;
  bookingWindowDays: number;
  meetingProvider: string;
  customMeetingUrl: string;
  isActive: boolean;
};

export function CalendarBookingSettings() {
  const [model, setModel] = useState<BookingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [publicUrl, setPublicUrl] = useState('');

  async function load() {
    setLoading(true); setNotice('');
    const response = await fetch('/api/calendar/booking-page', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) setNotice(payload.error || 'Unable to load booking settings.');
    else {
      setModel(payload.bookingPage);
      if (payload.bookingPage?.exists) setPublicUrl(`${window.location.origin}/book/${payload.bookingPage.slug}`);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    if (!model || saving) return;
    setSaving(true); setNotice('');
    const response = await fetch('/api/calendar/booking-page', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(model) });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) { setNotice(payload.error || 'Unable to save booking settings.'); return; }
    setModel(payload.bookingPage);
    setPublicUrl(payload.publicUrl || `${window.location.origin}/book/${payload.bookingPage.slug}`);
    setNotice('Booking page saved.');
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center text-sm font-semibold text-slate-400">Loading booking settings…</div>;
  if (!model) return <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{notice || 'Booking settings are unavailable.'}</div>;

  return <div className="h-full overflow-y-auto bg-[#f7f8fa] p-5 md:p-8">
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="text-[11px] font-black uppercase tracking-[.14em] text-blue-600">Setu Calendar</div><h1 className="mt-1 text-2xl font-black text-slate-950">Booking page</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Share one link with customers and suppliers. Setu only exposes open times calculated from your work week, existing meetings, buffers and minimum notice.</p></div>
        <a href="/calendar" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700">Back to calendar</a>
      </div>

      {notice ? <div className={`mt-5 rounded-xl border p-3 text-sm font-bold ${notice.includes('saved') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{notice}</div> : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-900">Booking experience</h2>
          <div className="mt-5 grid gap-4">
            <label className="text-xs font-bold text-slate-600">Booking link<div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white"><span className="pl-3 text-xs font-semibold text-slate-400">/book/</span><input value={model.slug} onChange={event => setModel({ ...model, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} className="min-w-0 flex-1 rounded-xl border-0 p-3 text-sm outline-none"/></div></label>
            <label className="text-xs font-bold text-slate-600">Title<input value={model.title} onChange={event => setModel({ ...model, title: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/></label>
            <label className="text-xs font-bold text-slate-600">Description<textarea value={model.description} onChange={event => setModel({ ...model, description: event.target.value })} rows={3} className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Meeting duration<select value={model.durationMinutes} onChange={event => setModel({ ...model, durationMinutes: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option><option value={120}>120 minutes</option></select></label>
              <label className="text-xs font-bold text-slate-600">Buffer between meetings<select value={model.bufferMinutes} onChange={event => setModel({ ...model, bufferMinutes: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value={0}>No buffer</option><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></label>
              <label className="text-xs font-bold text-slate-600">Minimum notice<select value={model.minimumNoticeMinutes} onChange={event => setModel({ ...model, minimumNoticeMinutes: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value={0}>None</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={240}>4 hours</option><option value={720}>12 hours</option><option value={1440}>1 day</option><option value={2880}>2 days</option></select></label>
              <label className="text-xs font-bold text-slate-600">Booking window<select value={model.bookingWindowDays} onChange={event => setModel({ ...model, bookingWindowDays: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option><option value={180}>180 days</option></select></label>
            </div>
            <label className="text-xs font-bold text-slate-600">Meeting type<select value={model.meetingProvider} onChange={event => setModel({ ...model, meetingProvider: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="zoom">Zoom</option><option value="custom">Custom meeting link</option><option value="none">No online meeting</option></select></label>
            {model.meetingProvider === 'custom' ? <label className="text-xs font-bold text-slate-600">Custom meeting URL<input value={model.customMeetingUrl} onChange={event => setModel({ ...model, customMeetingUrl: event.target.value })} placeholder="https://…" className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/></label> : null}
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-700"><input type="checkbox" checked={model.isActive} onChange={event => setModel({ ...model, isActive: event.target.checked })} className="h-4 w-4"/>Allow people with the link to book</label>
          </div>
          <div className="mt-5 flex justify-end"><button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2e4a] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Save size={16}/>{saving ? 'Saving…' : 'Save booking page'}</button></div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><CalendarClock className="text-blue-600" size={22}/><h2 className="mt-3 text-sm font-black text-slate-900">Availability source</h2><p className="mt-2 text-xs leading-5 text-slate-500">Your Calendar working hours are the source of truth. Busy/Tentative/Out of office events block public slots; events marked Free do not. Buffers are applied on both sides of existing meetings.</p><a href="/calendar" className="mt-4 inline-block text-xs font-black text-blue-700">Edit working hours →</a></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-900">Share link</h2>{publicUrl ? <><div className="mt-3 break-all rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">{publicUrl}</div><div className="mt-3 flex gap-2"><button onClick={() => navigator.clipboard.writeText(publicUrl)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Copy size={14}/>Copy</button><a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"><ExternalLink size={14}/>Open</a></div></> : <p className="mt-2 text-xs leading-5 text-slate-500">Save the booking page to create its shareable link.</p>}</div>
        </aside>
      </div>
    </div>
  </div>;
}
