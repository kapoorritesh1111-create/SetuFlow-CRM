'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { PackagingEventFields } from './packaging-event-fields';
import { saveEventQuickCapture, type EventQuickCaptureState } from '@/features/trade-events/server/event-quick-capture-actions';

type EventOption = { id: string; name: string; locationLabel: string };

function SubmitButton() {
  const status = useFormStatus();
  return <button type="submit" disabled={status.pending} className="min-h-14 w-full rounded-2xl bg-blue-600 px-5 text-base font-black text-white shadow-lg disabled:opacity-60">{status.pending ? 'Saving…' : 'Save & capture next'}</button>;
}

export function EventQuickCapturePanel({ events, showPackaging = false }: { events: EventOption[]; showPackaging?: boolean }) {
  const [state, action] = useFormState<EventQuickCaptureState | undefined, FormData>(saveEventQuickCapture, undefined);
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [leadType, setLeadType] = useState('buyer');
  const [heat, setHeat] = useState('interested');
  if (!events.length) return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><p className="font-black">Create a trade event first</p></div>;

  return <form action={action} className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <input type="hidden" name="lead_type" value={leadType} /><input type="hidden" name="lead_heat" value={heat} />
    <div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Fast event capture</p><h2 className="mt-1 text-2xl font-black">Save the conversation first</h2><p className="mt-1 text-sm font-medium text-slate-500">Capture only what you know. Requirements can be completed later.</p></div>
    {state?.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{state.error}</div> : null}
    {state?.success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{state.success}{state.possibleMatches ? ` ${state.possibleMatches} possible CRM match${state.possibleMatches === 1 ? '' : 'es'} also surfaced.` : ''}</div> : null}

    <select name="trade_event_id" value={eventId} onChange={(event) => setEventId(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold">{events.map((event) => <option key={event.id} value={event.id}>{event.name} · {event.locationLabel}</option>)}</select>
    <div className="grid grid-cols-2 gap-2">{[['buyer','Buyer'],['supplier','Supplier']].map(([value,label]) => <button key={value} type="button" onClick={() => setLeadType(value)} className={`min-h-12 rounded-2xl border text-sm font-black ${leadType === value ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white'}`}>{label}</button>)}</div>

    <div className="grid gap-3 sm:grid-cols-2"><input name="company" className="min-h-12 rounded-2xl border border-slate-200 px-4" placeholder="Company" /><input name="contact" className="min-h-12 rounded-2xl border border-slate-200 px-4" placeholder="Contact name" /><input name="email" type="email" className="min-h-12 rounded-2xl border border-slate-200 px-4" placeholder="Email" /><input name="phone" className="min-h-12 rounded-2xl border border-slate-200 px-4" placeholder="Phone / WhatsApp" /></div>
    <input name="product_interest" className="min-h-12 w-full rounded-2xl border border-slate-200 px-4" placeholder="Product / requirement — optional" />
    <div className="grid grid-cols-3 gap-2">{[['hot','Hot'],['interested','Interested'],['review_later','Review later']].map(([value,label]) => <button key={value} type="button" onClick={() => setHeat(value)} className={`min-h-11 rounded-2xl border text-xs font-black ${heat === value ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white'}`}>{label}</button>)}</div>
    <textarea name="notes" rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Quick note — what did they ask for?" />
    <div className="grid gap-3 sm:grid-cols-2"><select name="follow_up_promise" className="min-h-12 rounded-2xl border border-slate-200 px-4"><option value="">No promise yet</option><option value="send_catalog">Send catalog</option><option value="send_price">Send price</option><option value="send_sample">Send sample</option><option value="request_artwork">Request artwork</option><option value="call">Call</option><option value="meeting">Schedule meeting</option></select><select name="follow_up_timing" defaultValue="tomorrow" className="min-h-12 rounded-2xl border border-slate-200 px-4"><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="after_event">After event</option></select></div>
    {showPackaging ? <PackagingEventFields /> : null}
    <p className="text-xs font-semibold text-slate-500">Repeated event contacts and exact CRM matches are linked instead of silently duplicated.</p>
    <SubmitButton />
  </form>;
}
