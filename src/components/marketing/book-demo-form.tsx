'use client';

import { useMemo, useState, useTransition } from 'react';

type FormState = 'idle' | 'success' | 'error';

const interests = ['Lead capture', 'Quote workflow', 'Order execution', 'Trade events', 'Digital vCard', 'Full platform'];
const teamSizes = ['1–5 users', '6–10 users', '11–25 users', '25+ users'];

export function BookDemoForm() {
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const supportEmail = 'help@setugroups.com';

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent('Setu Flow demo request');
    const body = encodeURIComponent('Hi Setu Flow team,\n\nI would like to book a demo.\n\nCompany:\nName:\nEmail:\nPhone:\nTeam size:\nWhat I want to improve:\n');
    return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  }, []);

  return (
    <form
      className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-5 shadow-[0_24px_70px_rgba(31,72,124,0.10)] sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setState('idle');
        setMessage('');
        startTransition(() => {
          void (async () => {
            try {
              const response = await fetch('/api/book-demo', { method: 'POST', body: formData });
              const payload = await response.json().catch(() => null);
              if (!response.ok) throw new Error(payload?.error || 'Demo request could not be sent.');
              event.currentTarget.reset();
              setState('success');
              setMessage(payload?.message || 'Demo request sent. We will follow up from help@setugroups.com.');
            } catch (error) {
              setState('error');
              setMessage(error instanceof Error ? error.message : 'Demo request could not be sent.');
            }
          })();
        });
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#108477]">Book a demo</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Tell us where trade work is getting stuck.</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">A short form for serious teams. It sends to admin@setugroups.com and replies come from help@setugroups.com.</p>
        </div>
        <a href={mailtoHref} className="text-sm font-semibold text-[#1F487C] underline-offset-4 hover:underline">Prefer email?</a>
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

      <label className="mt-4 block text-sm font-medium text-slate-700">What are you trying to fix first?
        <textarea name="notes" rows={4} placeholder="Example: quotes take too long, follow-ups are missed, orders get blocked by documents..." className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10" />
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">No free trial flow. We use guided demos so we can map your workflow correctly.</p>
        <button type="submit" disabled={isPending} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#06263f] px-7 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(6,38,63,0.22)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">
          {isPending ? 'Sending…' : 'Send demo request'}
        </button>
      </div>

      {state !== 'idle' ? (
        <div className={state === 'success' ? 'mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800' : 'mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'}>
          {message} {state === 'error' ? <a className="font-semibold underline" href={mailtoHref}>Email help@setugroups.com instead.</a> : null}
        </div>
      ) : null}
    </form>
  );
}
