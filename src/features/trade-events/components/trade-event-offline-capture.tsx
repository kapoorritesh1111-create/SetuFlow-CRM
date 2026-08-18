'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  countOfflineTradeCaptures,
  createTradeCaptureClientId,
  enqueueOfflineTradeCapture,
  listOfflineTradeCaptures,
  retryOfflineTradeCapture,
  subscribeOfflineTradeCaptureQueue,
  type OfflineTradeCapturePayload,
} from '@/lib/trade-events/offline-capture-queue';
import { flushOfflineTradeCaptures } from './trade-event-offline-sync';

function tomorrowFollowUpIso() {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  value.setMinutes(0, 0, 0);
  return value.toISOString();
}

export function TradeEventOfflineCapture({
  event,
  initialLeadType = 'buyer',
}: {
  event: { id: string; name: string; locationLabel?: string | null };
  initialLeadType?: 'buyer' | 'supplier';
}) {
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>(initialLeadType);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const failedItems = useMemo(() => listOfflineTradeCaptures().filter((item) => item.status === 'failed'), [pendingCount]);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      setPendingCount(countOfflineTradeCaptures());
    };
    refresh();
    const unsubscribe = subscribeOfflineTradeCaptureQueue(refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      unsubscribe();
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);

  async function submitOnline(payload: OfflineTradeCapturePayload) {
    const response = await fetch('/api/trade-events/offline-capture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'same-origin',
    });
    const body = await response.json().catch(() => ({})) as { error?: string; success?: string };
    if (!response.ok) throw new Error(body.error ?? 'Could not save this lead.');
    return body.success ?? 'Lead saved.';
  }

  async function handleSubmit(eventTarget: HTMLFormElement) {
    setError('');
    setMessage('');
    if (!companyName.trim()) {
      setError('Company name is required so the offline lead can be matched safely when it syncs.');
      return;
    }
    setSaving(true);
    const payload: OfflineTradeCapturePayload = {
      clientCaptureId: createTradeCaptureClientId(),
      tradeEventId: event.id,
      eventName: event.name,
      leadType,
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      nextFollowUpAt: tomorrowFollowUpIso(),
    };

    try {
      if (navigator.onLine) {
        try {
          const success = await submitOnline(payload);
          setMessage(success);
        } catch (requestError) {
          if (navigator.onLine) throw requestError;
          enqueueOfflineTradeCapture(payload);
          setMessage('Connection dropped. Lead saved on this device and queued for automatic sync.');
        }
      } else {
        enqueueOfflineTradeCapture(payload);
        setMessage('Offline lead saved on this device. It will sync automatically when the connection returns.');
      }
      eventTarget.reset();
      setCompanyName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setNotes('');
      setPendingCount(countOfflineTradeCaptures());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save this lead.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 md:hidden">
      <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">Offline Event Capture</p>
            <h1 className="mt-1 text-2xl font-black">{event.name}</h1>
            <p className="mt-1 text-xs font-semibold text-slate-300">{event.locationLabel || 'Trade event'} · {online ? 'Connected' : 'Offline'}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${online ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'}`}>
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <p className="mt-4 text-sm text-slate-300">Use this fallback only when the show floor connection is unavailable. Saved leads stay on this device until Setu Flow confirms they synced.</p>
      </section>

      {pendingCount > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black">{pendingCount} capture{pendingCount === 1 ? '' : 's'} waiting to sync</p>
              <p className="mt-1 text-xs font-semibold text-amber-800">Keep Setu Flow open after reconnecting. Sync retries automatically.</p>
            </div>
            {online ? <button type="button" onClick={() => void flushOfflineTradeCaptures()} className="rounded-xl bg-amber-900 px-3 py-2 text-xs font-black text-white">Sync now</button> : null}
          </div>
        </section>
      ) : null}

      {failedItems.length > 0 ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950">
          <p className="text-sm font-black">{failedItems.length} capture{failedItems.length === 1 ? '' : 's'} need review</p>
          <div className="mt-2 space-y-2">
            {failedItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/80 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">{item.payload.companyName}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-rose-700">{item.lastError || 'Sync needs review.'}</p>
                </div>
                <button type="button" onClick={() => { retryOfflineTradeCapture(item.id); void flushOfflineTradeCaptures(); }} className="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-black">Retry</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <form
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(event.currentTarget);
        }}
      >
        {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{message}</div> : null}
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-900">{error}</div> : null}

        <div className="grid grid-cols-2 gap-2">
          {(['buyer', 'supplier'] as const).map((type) => (
            <button key={type} type="button" onClick={() => setLeadType(type)} className={`min-h-12 rounded-2xl border text-sm font-black capitalize ${leadType === type ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{type}</button>
          ))}
        </div>

        <input name="company_name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 px-4" placeholder="Company *" autoComplete="organization" />
        <input name="contact_name" value={contactName} onChange={(event) => setContactName(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 px-4" placeholder="Contact name" autoComplete="name" />
        <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 px-4" placeholder="Email" autoComplete="email" />
        <input name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 px-4" placeholder="Phone / WhatsApp" autoComplete="tel" inputMode="tel" />
        <textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="What did they ask for?" />

        <button type="submit" disabled={saving} className="min-h-14 w-full rounded-2xl bg-blue-600 px-5 text-base font-black text-white shadow-lg disabled:opacity-60">
          {saving ? 'Saving…' : online ? 'Save lead' : 'Save offline'}
        </button>
        <p className="text-center text-xs font-semibold text-slate-500">Each offline capture receives a unique sync ID so reconnect retries cannot intentionally create the same event lead twice.</p>
      </form>

      <Link href="/trade-events" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700">Back to Events</Link>
    </div>
  );
}
