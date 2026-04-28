'use client';

import { useState, useTransition } from 'react';
import RightDrawer, { DrawerActionBar, DrawerSection } from '@/components/RightDrawer';
import { saveLead } from '@/features/leads/server/actions';

type TradeEventOption = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  starts_on: string | null;
  ends_on: string | null;
};

export function TradeShowCapture({ events }: { events: TradeEventOption[] }) {
  const [open, setOpen] = useState(false);
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>('buyer');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(() => {
      void saveLead(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Lead captured.');
        if (!result?.error) setOpen(false);
      });
    });
  };

  return (
    <>
      <section id="capture" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Trade-show lead capture</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Create floor-ready buyer and supplier leads fast</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Capture a real lead with next follow-up, event linkage, and notes from the booth without opening the full lead workspace.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => { setLeadType('buyer'); setOpen(true); }} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Capture buyer</button>
            <button type="button" onClick={() => { setLeadType('supplier'); setOpen(true); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Capture supplier</button>
          </div>
        </div>
        {message ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
      </section>

      <div className="fixed inset-x-4 bottom-4 z-30 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-soft backdrop-blur md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setLeadType('buyer'); setOpen(true); }} className="rounded-2xl bg-slate-900 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white">Capture buyer</button>
          <button type="button" onClick={() => { setLeadType('supplier'); setOpen(true); }} className="rounded-2xl border border-slate-200 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">Capture supplier</button>
        </div>
      </div>

      <RightDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={leadType === 'buyer' ? 'Capture buyer lead' : 'Capture supplier lead'}
        description="This compact flow is optimized for phone and tablet use during trade events."
        footer={<DrawerActionBar title="Create lead" description="A next follow-up is still required so the lead enters the operating system cleanly."><button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="trade-capture-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : 'Save lead'}</button></DrawerActionBar>}
      >
        <form id="trade-capture-form" action={submit} className="space-y-5">
          <DrawerSection title="Lead capture" description="Keep the flow short so reps can capture leads between booth conversations.">
            <div className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="lead_type" value={leadType} />
              <input type="hidden" name="source_type" value="trade_event" />
              <input name="company_name" placeholder="Company name" required />
              <input name="contact_name" placeholder="Contact name" />
              <input name="email" placeholder="Email" type="email" />
              <input name="phone" placeholder="Phone" />
              <input name="next_follow_up_at" type="datetime-local" defaultValue={new Date(Date.now() + 24 * 3600_000).toISOString().slice(0,16)} required />
              <select name="trade_event_id" defaultValue="">
                <option value="">Select trade event</option>
                {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
              <input name="source_label" placeholder="Booth / hall / source note" />
              <textarea name="notes" className="md:col-span-2" rows={3} placeholder="Products discussed, requirements, urgency, and next action" />
            </div>
          </DrawerSection>
        </form>
      </RightDrawer>
    </>
  );
}
