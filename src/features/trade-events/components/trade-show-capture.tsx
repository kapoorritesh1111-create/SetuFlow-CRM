'use client';

import { useMemo, useState, useTransition } from 'react';
import RightDrawer, { DrawerActionBar, DrawerSection } from '@/components/RightDrawer';
import { convertTradeEventEntryToLead, saveTradeEventEntry } from '@/features/trade-events/server/actions';

type CaptureDefaults = {
  default_product_label?: string | null;
  default_lead_type?: 'buyer' | 'supplier' | null;
  default_follow_up_days?: number | null;
};

type TradeEventOption = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  starts_on: string | null;
  ends_on: string | null;
  capture_defaults?: CaptureDefaults | null;
};

export function TradeShowCapture({ events }: { events: TradeEventOption[] }) {
  const [open, setOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? '');
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>('buyer');
  const [message, setMessage] = useState('');
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) ?? events[0] ?? null, [events, selectedEventId]);
  const defaults = selectedEvent?.capture_defaults ?? null;
  const defaultProductLabel = typeof defaults?.default_product_label === 'string' ? defaults.default_product_label : '';

  const openForEvent = (eventId: string, fallbackLeadType: 'buyer' | 'supplier') => {
    const event = events.find((item) => item.id === eventId) ?? events[0];
    setSelectedEventId(event?.id ?? '');
    setLeadType(event?.capture_defaults?.default_lead_type === 'buyer' || event?.capture_defaults?.default_lead_type === 'supplier' ? event.capture_defaults.default_lead_type : fallbackLeadType);
    setLastEntryId(null);
    setMessage('');
    setOpen(true);
  };

  const submit = (formData: FormData) => {
    if (selectedEvent) {
      formData.set('trade_event_id', selectedEvent.id);
      formData.set('source_label', selectedEvent.name);
    }
    const notes = String(formData.get('captured_notes') ?? '').trim();
    if (defaultProductLabel && !notes.includes(defaultProductLabel)) {
      formData.set('captured_notes', [notes, `Default product interest: ${defaultProductLabel}`].filter(Boolean).join('\n'));
    }
    startTransition(() => {
      void saveTradeEventEntry(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Entry captured.');
        if (!result?.error && result?.entryId) setLastEntryId(result.entryId);
      });
    });
  };

  return (
    <>
      <section id="capture" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Trade-show lead capture</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Create booth entries, then convert when qualified</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Capture the raw conversation first with event defaults, then use the explicit Convert to lead handoff when the operator confirms it is ready.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => openForEvent(selectedEventId, 'buyer')} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Capture buyer</button>
            <button type="button" onClick={() => openForEvent(selectedEventId, 'supplier')} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Capture supplier</button>
          </div>
        </div>
        {message ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
      </section>

      <RightDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={leadType === 'buyer' ? 'Capture buyer entry' : 'Capture supplier entry'}
        description="This compact flow creates a trade_event_entries record first, then offers a guarded Convert to lead action."
        footer={<DrawerActionBar title="Capture entry" description="Save the booth entry first. Convert to lead appears after capture succeeds."><button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" form="trade-capture-form" disabled={isPending || !selectedEvent} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? 'Saving…' : 'Save entry'}</button></DrawerActionBar>}
      >
        <form id="trade-capture-form" action={submit} className="space-y-5">
          <DrawerSection title="Event context" description="Event source locks attribution and seeds capture defaults.">
            <div className="grid gap-3 md:grid-cols-2">
              <select value={selectedEventId} onChange={(event) => {
                const nextEvent = events.find((item) => item.id === event.target.value);
                setSelectedEventId(event.target.value);
                if (nextEvent?.capture_defaults?.default_lead_type === 'buyer' || nextEvent?.capture_defaults?.default_lead_type === 'supplier') setLeadType(nextEvent.capture_defaults.default_lead_type);
              }}>
                {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
              <input name="source_label" value={selectedEvent?.name ?? ''} readOnly placeholder="Source label" />
              <input type="hidden" name="trade_event_id" value={selectedEvent?.id ?? ''} />
              <input type="hidden" name="lead_type_hint" value={leadType} />
              <input name="default_product_label" value={defaultProductLabel} readOnly placeholder="Default product interest" />
            </div>
          </DrawerSection>
          <DrawerSection title="Booth entry" description="Capture only what is known now. Lead creation remains explicit.">
            <div className="grid gap-3 md:grid-cols-2">
              <input name="captured_company_name" placeholder="Company name" required />
              <input name="captured_contact_name" placeholder="Contact name" />
              <input name="captured_job_title" placeholder="Job title" />
              <input name="captured_email" placeholder="Email" type="email" />
              <input name="captured_phone" placeholder="Phone" />
              <input name="captured_country" placeholder="Country" />
              <textarea name="captured_notes" className="md:col-span-2" rows={3} placeholder="Products discussed, requirements, urgency, and next action" defaultValue={defaultProductLabel ? `Product interest: ${defaultProductLabel}` : ''} />
            </div>
          </DrawerSection>
        </form>
        {lastEntryId ? (
          <form action={convertTradeEventEntryToLead} className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
            <input type="hidden" name="entry_id" value={lastEntryId} />
            <p className="text-sm font-semibold text-emerald-900">Entry captured. Ready to promote?</p>
            <p className="mt-1 text-sm text-emerald-800">Convert creates a lead with trade_event_id and source_type='trade_event'.</p>
            <button type="submit" className="mt-3 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Convert to lead →</button>
          </form>
        ) : null}
      </RightDrawer>
    </>
  );
}
