import Link from 'next/link';
import type { MobileLead } from '../lib/role-aware-leads';

function normalizePhone(value?: string | null) {
  return (value ?? '').replace(/[^+0-9]/g, '');
}

function normalizeWhatsApp(value?: string | null) {
  return (value ?? '').replace(/[^0-9]/g, '');
}

function MailIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>;
}

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.18 2 2 0 0 1 4.11 1h2a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.8a2 2 0 0 1-.45 2.11L7.1 8.85a16 16 0 0 0 6 6l1.22-1.22a2 2 0 0 1 2.11-.45c.9.31 1.84.53 2.8.66A2 2 0 0 1 22 16.92Z" /></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 32 32" className="h-[18px] w-[18px]" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#25D366" /><path fill="#fff" d="M23.1 18.8c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.7-.2-1 .2-.3.4-1.1 1.3-1.4 1.6-.3.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-1-2.4-1.3-3.2-.3-.8-.7-.7-1-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.5 1.5-1.5 3.6s1.6 4.2 1.8 4.5c.2.3 3.1 4.8 7.6 6.7 1.1.5 1.9.7 2.5.9 1.1.3 2 .3 2.8.2.9-.1 2.4-1 2.8-2 .3-1 .3-1.8.2-2-.1-.2-.4-.3-.8-.5Z" /><path fill="#fff" d="M8.2 26.5 9.4 22A10.9 10.9 0 1 1 13.9 24l-5.7 2.5Zm5.9-4.5.3.1a8.9 8.9 0 1 0-3.1-2.3l.2.3-.7 2.7 3.3-.8Z" /></svg>;
}

function MobileContactIcon({ href, label, tone, children }: { href: string; label: string; tone: 'mail' | 'whatsapp' | 'phone'; children: React.ReactNode }) {
  const toneClass = tone === 'whatsapp'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : tone === 'phone'
      ? 'border-slate-200 bg-white text-slate-700'
      : 'border-blue-200 bg-blue-50 text-blue-700';

  return (
    <a
      href={href}
      target={href.startsWith('https://wa.me/') ? '_blank' : undefined}
      rel={href.startsWith('https://wa.me/') ? 'noreferrer' : undefined}
      className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm ${toneClass}`}
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}

export function LeadStatusCard({ lead }: { lead: MobileLead }) {
  const emailHref = lead.email ? `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(`SETU Flow follow-up: ${lead.company}`)}` : '';
  const phoneHref = lead.phone ? `tel:${normalizePhone(lead.phone)}` : '';
  const whatsappSource = lead.whatsappNumber || lead.phone || '';
  const whatsappNumber = normalizeWhatsApp(whatsappSource);
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';
  const hasContactAction = Boolean(emailHref || whatsappHref || phoneHref);

  return <article className="rounded-hero border border-white/70 bg-white/90 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-black text-slate-950 dark:text-white">{lead.company}</h3><p className="text-sm text-slate-500 dark:text-slate-300">{lead.contact} • {lead.market}</p></div><span className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-black text-blue-700 dark:text-sky-300">{lead.status}</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-300"><p><b className="text-slate-800 dark:text-white">Owner:</b> {lead.ownerName}</p><p><b className="text-slate-800 dark:text-white">Team:</b> {lead.teamName}</p><p><b className="text-slate-800 dark:text-white">Value:</b> ${lead.valueUsd.toLocaleString()}</p><p><b className="text-slate-800 dark:text-white">Updated:</b> {lead.lastActivity}</p></div>
    <p className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Next: {lead.nextAction}</p>
    {hasContactAction ? (
      <div className="mt-3 flex items-center gap-2" aria-label={`Contact ${lead.company}`}>
        {emailHref ? <MobileContactIcon href={emailHref} label={`Email ${lead.company}`} tone="mail"><MailIcon /></MobileContactIcon> : null}
        {whatsappHref ? <MobileContactIcon href={whatsappHref} label={`WhatsApp ${lead.company}`} tone="whatsapp"><WhatsAppIcon /></MobileContactIcon> : null}
        {phoneHref ? <MobileContactIcon href={phoneHref} label={`Call ${lead.company}`} tone="phone"><PhoneIcon /></MobileContactIcon> : null}
      </div>
    ) : null}
    <div className="mt-3 flex gap-2">
      <Link href={`/leads/${encodeURIComponent(lead.id)}`} className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" aria-label={`Open ${lead.company}`}>Open</Link>
      <Link href={`/leads/${encodeURIComponent(lead.id)}/quote?handoff=mobile-lead-card`} className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-blue-600 px-3 text-sm font-black text-white" aria-label={`Quote ${lead.company}`}>Quote</Link>
    </div>
  </article>;
}
