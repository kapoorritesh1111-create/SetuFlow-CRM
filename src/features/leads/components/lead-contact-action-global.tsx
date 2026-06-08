'use client';

import * as React from 'react';

type LeadContact = {
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

function contactLinks(lead: LeadContact) {
  const phone = lead.phone?.trim() || '';
  const email = lead.email?.trim() || '';
  const whatsappSource = lead.whatsapp_number?.trim() || phone;
  const whatsappNumber = normalizeWhatsApp(whatsappSource);

  return {
    phoneHref: phone ? `tel:${normalizePhone(phone)}` : '',
    emailHref: email ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`SETU Flow follow-up: ${lead.company_name}`)}` : '',
    whatsappHref: whatsappNumber ? `https://wa.me/${whatsappNumber}` : '',
  };
}

function iconLink(href: string, label: string, icon: string, tone: 'dark' | 'green' | 'blue') {
  const link = document.createElement('a');
  link.href = href;
  link.title = label;
  link.setAttribute('aria-label', label);
  link.textContent = icon;
  if (href.startsWith('https://wa.me/')) {
    link.target = '_blank';
    link.rel = 'noreferrer';
  }

  const bg = tone === 'green' ? '#059669' : tone === 'blue' ? '#eff6ff' : '#0b2e4a';
  const color = tone === 'blue' ? '#0b2e4a' : '#ffffff';
  const border = tone === 'blue' ? '1px solid #bfdbfe' : '1px solid transparent';

  link.style.cssText = [
    'width:30px',
    'height:30px',
    'border-radius:999px',
    `background:${bg}`,
    `color:${color}`,
    `border:${border}`,
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'font-size:13px',
    'font-weight:900',
    'line-height:1',
    'text-decoration:none',
    'box-shadow:0 6px 16px rgba(15,23,42,.10)',
  ].join(';');

  return link;
}

function findLeadRows(lead: LeadContact) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('button, div'));
  return nodes.filter((node) => {
    if (node.dataset.setuContactRow === lead.id) return true;
    if (node.querySelector('[data-setu-contact-actions]')) return false;
    const text = node.textContent ?? '';
    const rect = node.getBoundingClientRect();
    return text.includes(lead.company_name) && rect.width > 700 && rect.height >= 52 && rect.height <= 130;
  });
}

function injectRowActions(leads: LeadContact[]) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!window.location.pathname.startsWith('/leads')) return;

  document.querySelectorAll('[data-setu-contact-actions]').forEach((node) => node.remove());

  const isDetailView = Boolean(document.getElementById('inline-lead-workspace'));

  leads.forEach((lead) => {
    const { phoneHref, whatsappHref, emailHref } = contactLinks(lead);
    if (!phoneHref && !whatsappHref && !emailHref) return;

    const row = findLeadRows(lead)[0];
    if (!row) return;

    row.dataset.setuContactRow = lead.id;
    const computed = window.getComputedStyle(row);
    if (computed.position === 'static') {
      row.style.position = 'relative';
    }

    const dock = document.createElement('div');
    dock.dataset.setuContactActions = lead.id;
    dock.setAttribute('aria-label', `Contact actions for ${lead.company_name}`);
    dock.style.cssText = [
      'position:absolute',
      'left:34%',
      'top:50%',
      'transform:translateY(-50%)',
      'display:flex',
      'align-items:center',
      'gap:7px',
      'z-index:5',
      'pointer-events:auto',
    ].join(';');

    if (emailHref) dock.appendChild(iconLink(emailHref, `Email ${lead.company_name}`, '✉', 'blue'));
    if (whatsappHref) dock.appendChild(iconLink(whatsappHref, `WhatsApp ${lead.company_name}`, '☘', 'green'));
    if (phoneHref) dock.appendChild(iconLink(phoneHref, `Call ${lead.company_name}`, '☎', 'dark'));

    if (!isDetailView || row.id === 'inline-lead-workspace') {
      row.appendChild(dock);
    }
  });
}

export function LeadContactActionGlobal() {
  const [leads, setLeads] = React.useState<LeadContact[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadLeads() {
      if (!window.location.pathname.startsWith('/leads')) return;
      try {
        const response = await fetch('/api/lead-contact-actions', { cache: 'no-store' });
        const json = await response.json();
        if (!cancelled) setLeads(Array.isArray(json.leads) ? json.leads : []);
      } catch {
        if (!cancelled) setLeads([]);
      }
    }

    loadLeads();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const update = () => injectRowActions(leads);
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener('popstate', update);
    const interval = window.setInterval(update, 1400);

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', update);
      window.clearInterval(interval);
      document.querySelectorAll('[data-setu-contact-actions]').forEach((node) => node.remove());
    };
  }, [leads]);

  return null;
}
