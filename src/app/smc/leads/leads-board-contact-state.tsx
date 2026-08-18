'use client';

import { useEffect, useRef } from 'react';
import { LeadsBoard } from './leads-board';

type Activity = { id:string; kind:string; note:string; actor_name:string; created_at:string };
type Lead = {
  id:string;
  company_name:string;
  last_contact_at:string|null;
  demo_scheduled_at:string|null;
  demo_completed_at:string|null;
  activity_log:Activity[];
  [key:string]: unknown;
};

type ContactState = {
  key:string;
  label:string;
  icon:string;
  color:string;
  background:string;
  border:string;
  at:string|null;
};

const STATE_STYLE: Record<string, Omit<ContactState,'key'|'label'|'icon'|'at'>> = {
  untouched: { color:'#64748b', background:'#f8fafc', border:'#e2e8f0' },
  email:     { color:'#4f46e5', background:'#eef2ff', border:'#c7d2fe' },
  whatsapp:  { color:'#15803d', background:'#dcfce7', border:'#bbf7d0' },
  call:      { color:'#1F487C', background:'#eff6ff', border:'#bfdbfe' },
  reply:     { color:'#0f766e', background:'#ccfbf1', border:'#99f6e4' },
  demo:      { color:'#b45309', background:'#fef3c7', border:'#fde68a' },
  contacted: { color:'#475569', background:'#f1f5f9', border:'#cbd5e1' },
};

function dateValue(value:string|null|undefined) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function contactState(lead:Lead): ContactState {
  if (lead.demo_scheduled_at && !lead.demo_completed_at) {
    const s = STATE_STYLE.demo;
    return { key:'demo', label:'Demo scheduled', icon:'🖥', at:lead.demo_scheduled_at, ...s };
  }

  const activities = Array.isArray(lead.activity_log) ? lead.activity_log : [];
  const communication = activities
    .filter(a => ['email','whatsapp','call','demo_completed','reply','email_reply','whatsapp_reply','inbound_email','inbound_whatsapp'].includes(String(a.kind || '').toLowerCase()))
    .sort((a,b) => dateValue(b.created_at) - dateValue(a.created_at));
  const latest = communication[0];

  if (latest) {
    const kind = String(latest.kind || '').toLowerCase();
    if (kind.includes('reply') || kind.startsWith('inbound_')) {
      const s = STATE_STYLE.reply;
      return { key:'reply', label:'Customer replied', icon:'↩', at:latest.created_at, ...s };
    }
    if (kind === 'email') {
      const s = STATE_STYLE.email;
      return { key:'email', label:'Email sent', icon:'✉', at:latest.created_at, ...s };
    }
    if (kind === 'whatsapp') {
      const s = STATE_STYLE.whatsapp;
      return { key:'whatsapp', label:'WhatsApp sent', icon:'💬', at:latest.created_at, ...s };
    }
    if (kind === 'call') {
      const s = STATE_STYLE.call;
      return { key:'call', label:'Called', icon:'📞', at:latest.created_at, ...s };
    }
    if (kind === 'demo_completed') {
      const s = STATE_STYLE.demo;
      return { key:'demo', label:'Demo completed', icon:'🖥', at:latest.created_at, ...s };
    }
  }

  if (lead.last_contact_at) {
    const s = STATE_STYLE.contacted;
    return { key:'contacted', label:'Contacted', icon:'✓', at:lead.last_contact_at, ...s };
  }

  const s = STATE_STYLE.untouched;
  return { key:'untouched', label:'Not contacted', icon:'○', at:null, ...s };
}

function shortDate(value:string|null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

export function LeadsBoardContactState({ initialLeads }: { initialLeads: Lead[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const stateByCompany = new Map(initialLeads.map(lead => [lead.company_name, contactState(lead)]));

    const paint = () => {
      root.querySelectorAll('h5').forEach(title => {
        const company = title.textContent?.trim() || '';
        const state = stateByCompany.get(company);
        if (!state) return;
        const card = title.closest('[draggable="true"]') as HTMLElement | null;
        if (!card) return;

        let badge = card.querySelector('[data-smc-contact-state]') as HTMLDivElement | null;
        if (!badge) {
          badge = document.createElement('div');
          badge.dataset.smcContactState = 'true';
          const children = Array.from(card.children);
          const insertBefore = children.length >= 2 ? children[children.length - 2] : null;
          card.insertBefore(badge, insertBefore);
        }

        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'space-between';
        badge.style.gap = '8px';
        badge.style.marginTop = '8px';
        badge.style.padding = '5px 7px';
        badge.style.borderRadius = '7px';
        badge.style.border = `1px solid ${state.border}`;
        badge.style.background = state.background;
        badge.style.color = state.color;
        badge.style.fontSize = '9.5px';
        badge.style.fontWeight = '800';
        badge.style.lineHeight = '1.2';
        badge.title = state.at ? `${state.label} · ${new Date(state.at).toLocaleString()}` : state.label;
        badge.innerHTML = `<span>${state.icon} ${state.label}</span><span style="font-family:'DM Mono',monospace;font-weight:600;opacity:.78">${shortDate(state.at)}</span>`;

        card.style.borderLeftWidth = state.key === 'untouched' ? '1px' : '3px';
        card.style.borderLeftColor = state.key === 'untouched' ? '#e2e8f0' : state.color;
      });
    };

    paint();
    const observer = new MutationObserver(() => requestAnimationFrame(paint));
    observer.observe(root, { childList:true, subtree:true });
    return () => observer.disconnect();
  }, [initialLeads]);

  return (
    <div ref={rootRef}>
      <div style={{display:'flex',gap:6,alignItems:'center',padding:'0 16px 8px',fontSize:9.5,color:'#64748b',flexWrap:'wrap'}}>
        <strong style={{fontSize:9.5,color:'#475569'}}>Contact state:</strong>
        <span>○ Not contacted</span><span>✉ Email</span><span>💬 WhatsApp</span><span>📞 Call</span><span>↩ Reply</span><span>🖥 Demo</span>
      </div>
      <LeadsBoard initialLeads={initialLeads as any} />
    </div>
  );
}
