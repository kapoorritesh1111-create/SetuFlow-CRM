'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type ActiveCall = {
  id: string;
  phone: string;
  dialerHref: string;
  startedAt: string;
};

function digitsOnly(value: string) {
  return value.replace(/[^+0-9]/g, '');
}

function secondsSince(startedAt: string) {
  const ms = Date.now() - new Date(startedAt).getTime();
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
}

function durationText(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function parseDuration(value: string) {
  const text = value.trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number(text) * 60;
  const match = text.match(/^(\d+):(\d{1,2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Math.min(Number(match[2]), 59);
}

export function GlobalCallTracker() {
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [disposition, setDisposition] = useState('Connected');
  const [duration, setDuration] = useState('0:00');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elapsed = useMemo(() => active ? secondsSince(active.startedAt) : 0, [active, showOutcome]);

  useEffect(() => {
    const clickHandler = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href^="tel:"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.dataset.setuCallTracking === 'off') return;

      const href = anchor.getAttribute('href') || '';
      const phone = digitsOnly(href.replace(/^tel:/i, ''));
      if (!phone) return;

      event.preventDefault();
      setError(null);
      try {
        const response = await fetch('/api/calls', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            phone,
            dialerHref: href,
            sourcePath: `${window.location.pathname}${window.location.search}`,
          }),
          keepalive: true,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.id) throw new Error(body?.error || 'Unable to log call attempt.');
        const next = { id: body.id, phone, dialerHref: href, startedAt: body.startedAt || new Date().toISOString() } as ActiveCall;
        setActive(next);
        sessionStorage.setItem('setu-active-call', JSON.stringify(next));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to log call attempt.');
      } finally {
        window.location.href = href;
      }
    };

    document.addEventListener('click', clickHandler, true);
    return () => document.removeEventListener('click', clickHandler, true);
  }, []);

  useEffect(() => {
    if (!active) {
      try {
        const raw = sessionStorage.getItem('setu-active-call');
        if (raw) setActive(JSON.parse(raw));
      } catch {}
    }
  }, [active]);

  useEffect(() => {
    const maybePrompt = () => {
      if (!active || document.visibilityState !== 'visible') return;
      const seconds = secondsSince(active.startedAt);
      if (seconds < 3) return;
      setDuration(durationText(seconds));
      setShowOutcome(true);
    };

    window.addEventListener('focus', maybePrompt);
    document.addEventListener('visibilitychange', maybePrompt);
    return () => {
      window.removeEventListener('focus', maybePrompt);
      document.removeEventListener('visibilitychange', maybePrompt);
    };
  }, [active]);

  async function saveOutcome(event: FormEvent) {
    event.preventDefault();
    if (!active) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          id: active.id,
          disposition,
          durationSeconds: parseDuration(duration),
          notes,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Unable to save call outcome.');
      sessionStorage.removeItem('setu-active-call');
      setActive(null);
      setShowOutcome(false);
      setNotes('');
      setDisposition('Connected');
      setDuration('0:00');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save call outcome.');
    } finally {
      setSaving(false);
    }
  }

  if (!showOutcome || !active) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/30 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Log call outcome">
      <form onSubmit={saveOutcome} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-600">Call activity</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">How did the call go?</h2>
            <p className="mt-1 text-xs text-slate-500">{active.phone}</p>
          </div>
          <button type="button" onClick={() => setShowOutcome(false)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600">Later</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-700">Outcome
            <select value={disposition} onChange={(event) => setDisposition(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option>Connected</option>
              <option>No answer</option>
              <option>Call back requested</option>
              <option>Busy</option>
              <option>Wrong number</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-700">Duration
            <input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="4:30" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Duration is prefilled from elapsed time after opening the dialer. Adjust it if the actual connected call was shorter.</p>

        <label className="mt-4 block text-xs font-bold text-slate-700">Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="What was discussed?" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>

        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
        <button disabled={saving} className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
          {saving ? 'Saving call…' : 'Save call activity'}
        </button>
      </form>
    </div>
  );
}
