'use client';

import * as React from 'react';

type LeadContactActionLead = {
  id: string;
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
};

function normalizePhone(value?: string | null) {
  return (value ?? '').replace(/[^+0-9]/g, '');
}

function normalizeWhatsApp(value?: string | null) {
  return (value ?? '').replace(/[^0-9]/g, '');
}

function getVisibleText() {
  if (typeof document === 'undefined') return '';
  const workspace = document.getElementById('inline-lead-workspace') ?? document.body;
  return workspace.textContent ?? '';
}

function resolveVisibleLead(leads: LeadContactActionLead[]) {
  const params = new URLSearchParams(window.location.search);
  const leadId = params.get('leadId');
  if (leadId) {
    const fromUrl = leads.find((lead) => lead.id === leadId);
    if (fromUrl) return fromUrl;
  }

  const visibleText = getVisibleText();
  return leads.find((lead) => lead.company_name && visibleText.includes(lead.company_name)) ?? null;
}

export function LeadContactActionOverlay({ leads }: { leads: LeadContactActionLead[] }) {
  const [activeLead, setActiveLead] = React.useState<LeadContactActionLead | null>(null);

  React.useEffect(() => {
    const update = () => setActiveLead(resolveVisibleLead(leads));
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener('popstate', update);
    const interval = window.setInterval(update, 1200);

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', update);
      window.clearInterval(interval);
    };
  }, [leads]);

  if (!activeLead) return null;

  const contactName = activeLead.contact_name?.trim() || 'Primary contact';
  const email = activeLead.email?.trim() || '';
  const phone = activeLead.phone?.trim() || '';
  const whatsappSource = activeLead.whatsapp_number?.trim() || phone;
  const telHref = phone ? `tel:${normalizePhone(phone)}` : '';
  const mailHref = email ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`SETU Flow follow-up: ${activeLead.company_name}`)}` : '';
  const whatsappNumber = normalizeWhatsApp(whatsappSource);
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';

  return (
    <div className="pointer-events-none fixed bottom-5 left-[112px] right-6 z-40 hidden md:block">
      <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-2 rounded-2xl border border-blue-100 bg-white/95 p-3 shadow-[0_18px_50px_rgba(15,23,42,.18)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#0c7fff]">Lead contact actions</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-slate-600">
            <span className="max-w-[260px] truncate text-[13px] font-extrabold text-slate-950">{activeLead.company_name}</span>
            <span>{contactName}</span>
            <span>{email || 'Missing email'}</span>
            <span>{phone || 'Missing phone'}</span>
            {activeLead.whatsapp_number ? <span>WhatsApp: {activeLead.whatsapp_number}</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {phone ? (
            <a href={telHref} className="rounded-xl bg-[#0b2e4a] px-4 py-2 text-center text-xs font-extrabold text-white shadow-sm hover:bg-[#061c2e]">Call</a>
          ) : (
            <a href={`/leads?leadId=${activeLead.id}`} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-center text-xs font-extrabold text-orange-800">Missing phone</a>
          )}
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-2 text-center text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700">WhatsApp</a>
          ) : (
            <a href={`/leads?leadId=${activeLead.id}`} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-center text-xs font-extrabold text-orange-800">Missing phone</a>
          )}
          {email ? (
            <a href={mailHref} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-center text-xs font-extrabold text-[#0b2e4a] hover:bg-blue-50">Email</a>
          ) : (
            <a href={`/leads?leadId=${activeLead.id}`} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-center text-xs font-extrabold text-orange-800">Missing email</a>
          )}
        </div>
      </div>
    </div>
  );
}
