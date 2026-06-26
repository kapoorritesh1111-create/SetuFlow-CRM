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

type IconName = 'calendar' | 'mail' | 'message';

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...common}>
      {name === 'calendar' ? <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="m9 16 2 2 4-5" /></> : null}
      {name === 'mail' ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> : null}
      {name === 'message' ? <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.7 8.7 0 0 1-3-.7L3 21l1.8-5.5a8.3 8.3 0 1 1 16.2-4Z" /><path d="M8.5 9.5h7" /><path d="M8.5 13h4.5" /></> : null}
    </svg>
  );
}

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
    <form action={action} className="mt-4 grid gap-3.5">
      <input type="hidden" name="lead_id" value={leadId} />
      <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_1.1fr]">
        <label className="grid gap-2 text-xs font-semibold text-slate-500">
          Follow-up For
          <select name="follow_up_type" value={purpose} onChange={(event) => onPurposeChange(event.target.value)} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm">
            <option value="pricing">Pricing / MOQ</option>
            <option value="sample">Samples</option>
            <option value="documents">Documents</option>
            <option value="decision">Decision timeline</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-semibold text-slate-500">
          Channel
          <select name="channel" value={channel} onChange={(event) => setChannel(event.target.value)} className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm">
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="phone">Phone call</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-semibold text-slate-500">
          Date & Time
          <input name="scheduled_at" type="datetime-local" className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm" />
        </label>
      </div>
      <textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm" />
      <div className="grid gap-3 md:grid-cols-3">
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm"><Icon name="calendar" />Schedule Follow-up</button>
        <a aria-disabled={!email} href={email ? emailHref : '#'} className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm ${!email ? 'pointer-events-none opacity-40' : ''}`}><Icon name="mail" />Send Email</a>
        <a aria-disabled={!waNumber} href={waNumber ? whatsappHref : '#'} className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 shadow-sm ${!waNumber ? 'pointer-events-none opacity-40' : ''}`}><Icon name="message" />Send WhatsApp</a>
      </div>
    </form>
  );
}
