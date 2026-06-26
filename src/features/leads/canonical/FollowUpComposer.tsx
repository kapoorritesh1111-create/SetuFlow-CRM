"use client";

import { useMemo, useState } from 'react';

type Props = {
  leadId: string;
  clientName?: string | null;
  senderName?: string | null;
  senderCompany?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  action: (formData: FormData) => void | Promise<void>;
};

function draftTemplate(kind: string, clientName?: string | null, senderName?: string | null, senderCompany?: string | null) {
  const client = clientName || 'there';
  const sender = senderName || 'Ritesh Kapoor';
  const company = senderCompany || 'Setu Flow';
  const body: Record<string, string> = {
    pricing: `Hi ${client},\n\nThank you for your interest. I wanted to follow up with the pricing, MOQ, and delivery timeline details we discussed. Please confirm the target quantity and expected order window so we can align the quote correctly.\n\nBest regards,\n${sender}\n${company}`,
    sample: `Hi ${client},\n\nFollowing up on the sample request. Please confirm the delivery address, preferred courier timeline, and any specific product variants you would like us to include.\n\nBest regards,\n${sender}\n${company}`,
    documents: `Hi ${client},\n\nI am following up to share the requested documents and confirm whether any compliance, label, or import details are still needed from our side.\n\nBest regards,\n${sender}\n${company}`,
    decision: `Hi ${client},\n\nI wanted to check in on the quote review and confirm the next decision timeline. Please let me know if there are any open questions or blockers we should address.\n\nBest regards,\n${sender}\n${company}`,
  };
  return body[kind] || body.pricing;
}

function cleanPhone(value?: string | null) {
  return String(value || '').replace(/[^+\d]/g, '').replace(/^\+/, '');
}

export default function FollowUpComposer({ leadId, clientName, senderName, senderCompany, email, whatsapp, action }: Props) {
  const [purpose, setPurpose] = useState('pricing');
  const [channel, setChannel] = useState('whatsapp');
  const [notes, setNotes] = useState(() => draftTemplate('pricing', clientName, senderName, senderCompany));
  const encodedNotes = encodeURIComponent(notes);
  const waNumber = cleanPhone(whatsapp);
  const emailHref = useMemo(() => `mailto:${email || ''}?subject=${encodeURIComponent(`Follow-up for ${clientName || 'your request'}`)}&body=${encodedNotes}`, [email, encodedNotes, clientName]);
  const whatsappHref = useMemo(() => waNumber ? `https://wa.me/${waNumber}?text=${encodedNotes}` : '#', [waNumber, encodedNotes]);

  function onPurposeChange(next: string) {
    setPurpose(next);
    setNotes(draftTemplate(next, clientName, senderName, senderCompany));
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
      <textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-6 text-slate-700" />
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
