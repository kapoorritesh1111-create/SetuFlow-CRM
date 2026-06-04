'use client';

import { useMemo, useState, useTransition } from 'react';

type FormState = 'idle' | 'calendar' | 'form' | 'success' | 'error';

const interests = ['Lead capture & pipeline', 'Quote workflow & pricing', 'Order execution & dispatch', 'Trade events & field capture', 'Setu Guru AI assistant', 'Digital vCard & contact exchange', 'Full platform walkthrough'];
const teamSizes = ['1–5 users', '6–10 users', '11–25 users', '25+ users'];

// Calendar slot generator — builds a 2-week grid of available slots (Mon–Fri, 9am–5pm UTC+0)
function buildSlots() {
  const slots: { label: string; date: string; time: string; iso: string }[] = [];
  const now = new Date();
  let day = new Date(now);
  day.setHours(0, 0, 0, 0);
  let count = 0;
  while (slots.length < 12) {
    day = new Date(day.getTime() + 86400000);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    count++;
    if (count < 2) continue; // Skip next 1 business day buffer
    const dateLabel = day.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
    for (const hour of [9, 11, 14, 16]) {
      if (slots.length >= 18) break;
      const timeLabel = hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
      const iso = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).toISOString();
      slots.push({ label: dateLabel, date: dateLabel, time: timeLabel, iso });
    }
  }
  return slots;
}

export function BookDemoForm() {
  const [state, setState] = useState<FormState>('calendar');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string>('');
  const slots = useMemo(() => buildSlots(), []);

  const supportEmail = 'help@setugroups.com';

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent('Setu Flow demo request');
    const body = encodeURIComponent('Hi Setu Flow team,\n\nI would like to book a demo.\n\nCompany:\nName:\nEmail:\nPhone:\nPreferred time:\n');
    return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  }, []);

  function handleSlotSelect(slot: { label: string; time: string; iso: string }) {
    setSelectedSlot(slot.iso);
    setSelectedSlotLabel(`${slot.label} at ${slot.time} UTC`);
    setState('form');
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (selectedSlot) formData.set('preferredSlot', selectedSlotLabel);
    setState('idle');
    setMessage('');
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch('/api/book-demo', { method: 'POST', body: formData });
          const payload = await response.json().catch(() => null);
          if (!response.ok) throw new Error(payload?.error || 'Demo request could not be sent.');
          (event.target as HTMLFormElement).reset();
          setState('success');
          setMessage(payload?.message || 'Demo booked. You will receive a calendar invite from help@setugroups.com.');
        } catch (error) {
          setState('error');
          setMessage(error instanceof Error ? error.message : 'Demo request could not be sent.');
        }
      })();
    });
  }

  if (state === 'success') {
    return (
      <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-10 text-center shadow-[0_24px_70px_rgba(5,150,105,0.12)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-3xl">✓</div>
        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.025em] text-slate-950">Demo request confirmed</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-600">{message}</p>
        {selectedSlotLabel && (
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
            <span>📅</span> {selectedSlotLabel}
          </div>
        )}
        <p className="mt-6 text-sm text-slate-500">Questions? Write to <a href={`mailto:${supportEmail}`} className="font-semibold text-[#1F487C] hover:underline">{supportEmail}</a></p>
      </div>
    );
  }

  // Calendar step
  if (state === 'calendar') {
    // Group by date
    const byDate: Record<string, typeof slots> = {};
    slots.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });
    return (
      <div className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_24px_70px_rgba(31,72,124,0.10)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#108477]">Schedule a demo</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Pick a time that works for you.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">30-minute guided walkthrough built around your trade workflow. A calendar invite arrives from <span className="font-semibold text-slate-800">help@setugroups.com</span>.</p>
          </div>
          <a href={mailtoHref} className="shrink-0 text-sm font-semibold text-[#1F487C] underline-offset-4 hover:underline">Prefer email?</a>
        </div>
        <div className="mt-6 space-y-5">
          {Object.entries(byDate).slice(0, 5).map(([date, daySlots]) => (
            <div key={date}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{date}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {daySlots.map(slot => (
                  <button
                    key={slot.iso}
                    type="button"
                    onClick={() => handleSlotSelect(slot)}
                    className="rounded-2xl border border-[#1F487C]/12 bg-[#f8fbff] px-3 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-[#359F91] hover:bg-[#eef6fb] hover:text-[#108477] focus:outline-none focus:ring-2 focus:ring-[#359F91]/30"
                  >
                    {slot.time} <span className="block text-[10px] font-medium text-slate-400">UTC</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setState('form')}
          className="mt-6 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
        >
          Skip — just send a request →
        </button>
      </div>
    );
  }

  // Form step
  return (
    <form
      className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_24px_70px_rgba(31,72,124,0.10)] sm:p-7"
      onSubmit={handleSubmit}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#108477]">Almost done</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Tell us about your trade operation.</h3>
          {selectedSlotLabel && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-[#eef6fb] px-4 py-2 text-sm font-semibold text-[#108477]">
              <span>📅</span> {selectedSlotLabel}
              <button type="button" onClick={() => { setSelectedSlot(''); setSelectedSlotLabel(''); setState('calendar'); }} className="ml-1 text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}
        </div>
        <a href={mailtoHref} className="shrink-0 text-sm font-semibold text-[#1F487C] underline-offset-4 hover:underline">Prefer email?</a>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Your name
          <input name="name" required placeholder="Full name" className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10" />
        </label>
        <label className="text-sm font-medium text-slate-700">Work email
          <input name="email" type="email" required placeholder="you@company.com" className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10" />
        </label>
        <label className="text-sm font-medium text-slate-700">Company
          <input name="company" required placeholder="Company name" className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10" />
        </label>
        <label className="text-sm font-medium text-slate-700">Phone / WhatsApp
          <input name="phone" placeholder="+1 555..." className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10" />
        </label>
        <label className="text-sm font-medium text-slate-700">Team size
          <select name="teamSize" required className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10">
            <option value="">Select team size</option>
            {teamSizes.map((size) => <option key={size}>{size}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Primary interest
          <select name="interest" required className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10">
            <option value="">What should we focus on?</option>
            {interests.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-slate-700">What is currently slowing your team down?
        <textarea name="notes" rows={3} placeholder="Describe your biggest trade workflow challenge..." className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10" />
      </label>

      {(state === 'error') && message && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{message}</p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {!selectedSlotLabel && (
          <button type="button" onClick={() => setState('calendar')} className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            ← Pick a time slot
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#1F487C,#0c7fff)] py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(12,127,255,0.26)] transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {isPending ? 'Sending…' : selectedSlotLabel ? 'Confirm demo booking →' : 'Send demo request →'}
        </button>
      </div>
      <p className="mt-4 text-center text-xs font-medium text-slate-400">
        Replies come from <span className="font-semibold text-slate-500">help@setugroups.com</span> · No spam, ever.
      </p>
    </form>
  );
}
