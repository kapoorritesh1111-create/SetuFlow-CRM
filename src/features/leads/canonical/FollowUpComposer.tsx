"use client";

import { useMemo, useState } from 'react';

type Props = {
  leadId: string;
  email?: string | null;
  whatsapp?: string | null;
  action: (formData: FormData) => void | Promise<void>;
};

const TEMPLATES: Record<string, string> = {
  pricing: 'Share pricing, MOQ, and delivery timeline. Confirm target quantity and expected order window.',
  sample: 'Confirm sample requirement, delivery address, and preferred courier timeline.',
  documents: 'Share requested documents and confirm if any compliance or label details are still needed.',
  decision: 'Confirm next decision date, decision maker, and remaining blockers before quote acceptance.',
};

function cleanPhone(value?: string | null) {
  return String(value || '').replace(/[^+\d]/g, '').replace(/^\+/, '');
}

export default function FollowUpComposer({ leadId, email, whatsapp, action }: Props) {
  const [purpose, setPurpose] = useState('pricing');
  const [channel, setChannel] = useState('whatsapp');
  const [notes, setNotes] = useState(TEMPLATES.pricing);
  const encodedNotes = encodeURIComponent(notes);
  const waNumber = cleanPhone(whatsapp);
  const emailHref = useMemo(() => `mailto:${email || ''}?subject=${encodeURIComponent('Follow-up from Setu Flow')}&body=${encodedNotes}`, [email, encodedNotes]);
  const whatsappHref = useMemo(() => waNumber ? `https://wa.me/${waNumber}?text=${encodedNotes}` : '#', [waNumber, encodedNotes]);

  function onPurposeChange(next: string) {
    setPurpose(next);
    setNotes(TEMPLATES[next] || TEMPLATES.pricing);
  }

  return (
    <form action={action} className="mt-3 grid gap-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Follow-up for
          <select name="follow_up_type" value={purpose} onChange={(event) => onPurposeChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700">
            <option value="pricing">Pricing / MOQ</option>
            <option value="sample">Samples</option>
            <option value="documents">Documents</option>
            <option value="decision">Decision timeline</option>
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Channel
          <select name="channel" value={channel} onChange={(event) => setChannel(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700">
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="phone">Phone call</option>
          </select>
        </label>
      </div>
      <input name="scheduled_at" type="datetime-local" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700" />
      <textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-6 text-slate-700" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Schedule Follow-up</button>
        <div className="flex gap-2">
          <a aria-disabled={!email} href={email ? emailHref : '#'} className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 ${!email ? 'pointer-events-none opacity-40' : ''}`}>Send Email</a>
          <a aria-disabled={!waNumber} href={waNumber ? whatsappHref : '#'} className={`rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 ${!waNumber ? 'pointer-events-none opacity-40' : ''}`}>Send WhatsApp</a>
        </div>
      </div>
    </form>
  );
}
