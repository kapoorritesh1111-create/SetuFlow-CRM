'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LeadsBoard } from './leads-board';

type Activity = { id:string; kind:string; note:string; actor_name:string; created_at:string };
type MessageMode = 'auto' | 'first_inquiry' | 'follow_up';
type ResolvedMode = Exclude<MessageMode, 'auto'>;
type Lead = {
  id:string;
  company_name:string;
  primary_admin_name:string|null;
  primary_admin_email:string|null;
  primary_phone:string|null;
  headquarters_country:string|null;
  industry:string|null;
  pipeline_stage:string|null;
  lead_score:number|null;
  source:string|null;
  source_detail:string|null;
  internal_notes:string|null;
  last_contact_at:string|null;
  next_follow_up_at:string|null;
  assigned_to_name:string|null;
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

const CONTACT_KINDS = new Set(['call','email','whatsapp','demo_completed']);
const MARKETING_SITE = 'https://www.setuflowcrm.com';

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

function hasPriorContact(lead:Lead) {
  if (lead.last_contact_at) return true;
  return Array.isArray(lead.activity_log) && lead.activity_log.some(entry => CONTACT_KINDS.has(String(entry.kind || '').toLowerCase()));
}

function inferredMode(lead:Lead): ResolvedMode {
  return hasPriorContact(lead) ? 'follow_up' : 'first_inquiry';
}

function modeLabel(mode:ResolvedMode) {
  return mode === 'first_inquiry' ? 'First inquiry' : 'Follow-up';
}

function parseGeneratedEmail(value:string, company:string) {
  const lines = value.split('\n');
  const index = lines.findIndex(line => line.toLowerCase().startsWith('subject:'));
  const subject = index >= 0 ? lines[index].replace(/^subject:\s*/i,'').trim() : `SETU Flow for ${company}`;
  const body = (index >= 0 ? [...lines.slice(0,index),...lines.slice(index+1)] : lines).join('\n').replace(/^\s+/, '');
  return { subject, body };
}

function LeadMailtrapComposer({ lead, onClose, onSent }: { lead:Lead; onClose:()=>void; onSent:(lead:Lead)=>void }) {
  const [mode,setMode] = useState<MessageMode>('auto');
  const [resolvedMode,setResolvedMode] = useState<ResolvedMode>(inferredMode(lead));
  const [subject,setSubject] = useState(`SETU Flow for ${lead.company_name}`);
  const [body,setBody] = useState('');
  const [generating,setGenerating] = useState(false);
  const [sending,setSending] = useState(false);
  const [notice,setNotice] = useState<{kind:'ok'|'error';text:string}|null>(null);

  useEffect(() => {
    setMode('auto');
    setResolvedMode(inferredMode(lead));
    setSubject(`SETU Flow for ${lead.company_name}`);
    setBody('');
    setNotice(null);
  }, [lead.id,lead.company_name]);

  const effectiveMode = mode === 'auto' ? resolvedMode : mode;

  async function generate() {
    setGenerating(true); setNotice(null);
    try {
      const res = await fetch('/api/smc/suggest-message', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          company_name:lead.company_name,
          contact_name:lead.primary_admin_name,
          industry:lead.industry,
          pipeline_stage:lead.pipeline_stage ?? 'inquiry',
          source:lead.source,
          source_detail:lead.source_detail,
          internal_notes:lead.internal_notes,
          last_contact_at:lead.last_contact_at,
          next_follow_up_at:lead.next_follow_up_at,
          lead_score:lead.lead_score,
          activity_log:lead.activity_log,
          kind:'email',
          message_mode:mode,
          sender_name:lead.assigned_to_name || 'Ritesh Kapoor',
        }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.message) throw new Error(data.error || 'Could not generate email.');
      const parsed = parseGeneratedEmail(data.message,lead.company_name);
      const resolved:ResolvedMode = data.message_mode === 'follow_up' ? 'follow_up' : data.message_mode === 'first_inquiry' ? 'first_inquiry' : effectiveMode;
      setSubject(parsed.subject);
      setBody(parsed.body);
      setResolvedMode(resolved);
      setNotice({kind:'ok',text:`Generated as ${modeLabel(resolved)}.${resolved==='first_inquiry'?' Marketing-site link is required and enforced at send time.':''}`});
    } catch (error) {
      setNotice({kind:'error',text:error instanceof Error?error.message:'Could not generate email.'});
    } finally { setGenerating(false); }
  }

  async function send() {
    if (!lead.primary_admin_email) {
      setNotice({kind:'error',text:'Add an email address to this lead before sending.'});
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setNotice({kind:'error',text:'Subject and email body are required.'});
      return;
    }
    setSending(true); setNotice(null);
    try {
      const res = await fetch(`/api/smc/leads/${lead.id}/outreach`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          subject:subject.trim(),
          message:body.trim(),
          message_mode:mode === 'auto' ? resolvedMode : mode,
          sender_name:lead.assigned_to_name || 'Ritesh Kapoor',
        }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok && res.status !== 207) throw new Error(data.error || 'Mailtrap send failed.');
      if (data.lead) onSent(data.lead as Lead);
      setResolvedMode('follow_up');
      setNotice({kind:data.error?'error':'ok',text:data.error || `Sent through Mailtrap to ${lead.primary_admin_email}. Future Auto messages will be follow-ups.`});
    } catch (error) {
      setNotice({kind:'error',text:error instanceof Error?error.message:'Mailtrap send failed.'});
    } finally { setSending(false); }
  }

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:10050,background:'rgba(15,23,42,.55)',display:'grid',placeItems:'center',padding:18}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'min(760px,96vw)',maxHeight:'92vh',overflowY:'auto',background:'#fff',borderRadius:18,boxShadow:'0 24px 80px rgba(15,23,42,.28)',border:'1px solid #dbe6ef'}}>
        <div style={{padding:'16px 18px',background:'linear-gradient(135deg,#1f487c,#279491)',color:'#fff',display:'flex',alignItems:'center',gap:12,borderRadius:'18px 18px 0 0'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.08em',opacity:.78}}>SMC Growth · Mailtrap</div>
            <div style={{fontSize:17,fontWeight:800,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lead.company_name}</div>
            <div style={{fontSize:11,opacity:.85,marginTop:2}}>{lead.primary_admin_email || 'No email address on lead'}</div>
          </div>
          <button type="button" onClick={onClose} style={{border:'1px solid rgba(255,255,255,.25)',background:'rgba(255,255,255,.12)',color:'#fff',borderRadius:9,padding:'6px 10px',cursor:'pointer',fontWeight:800}}>✕</button>
        </div>

        <div style={{padding:18,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 170px',gap:10,alignItems:'end'}}>
            <label style={{fontSize:11,fontWeight:700,color:'#475569'}}>Message type
              <select value={mode} onChange={e=>setMode(e.target.value as MessageMode)} style={{width:'100%',marginTop:5,border:'1px solid #cbd5e1',borderRadius:9,padding:'9px 10px',fontSize:12,background:'#fff'}}>
                <option value="auto">Auto — first inquiry, then follow-up</option>
                <option value="first_inquiry">First inquiry</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </label>
            <div style={{border:'1px solid #ddd6fe',background:'#f5f3ff',color:'#6d28d9',borderRadius:9,padding:'9px 10px',fontSize:10.5,fontWeight:800,textAlign:'center'}}>
              {mode === 'auto' ? `Auto → ${modeLabel(resolvedMode)}` : modeLabel(effectiveMode)}
            </div>
          </div>

          <label style={{fontSize:11,fontWeight:700,color:'#475569'}}>Subject
            <input value={subject} onChange={e=>setSubject(e.target.value)} style={{width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid #cbd5e1',borderRadius:9,padding:'9px 10px',fontSize:12.5,fontFamily:'inherit'}} />
          </label>

          <label style={{fontSize:11,fontWeight:700,color:'#475569'}}>Email body
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={13} placeholder="Generate with Setu Guru or write the email here…" style={{width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid #cbd5e1',borderRadius:10,padding:'10px 11px',fontSize:12.5,fontFamily:'inherit',resize:'vertical',lineHeight:1.55}} />
          </label>

          {effectiveMode === 'first_inquiry' && <div style={{fontSize:10.5,color:'#0f766e',background:'#ecfeff',border:'1px solid #a5f3fc',borderRadius:9,padding:'7px 9px'}}>First inquiry emails always include <strong>{MARKETING_SITE}</strong>. The Mailtrap send endpoint enforces this even after manual edits.</div>}
          {notice && <div style={{fontSize:11.5,fontWeight:650,color:notice.kind==='ok'?'#047857':'#b91c1c',background:notice.kind==='ok'?'#ecfdf5':'#fef2f2',border:`1px solid ${notice.kind==='ok'?'#a7f3d0':'#fecaca'}`,borderRadius:10,padding:'8px 10px'}}>{notice.text}</div>}

          <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
            <a href="/smc/leads/outreach" style={{fontSize:10.5,fontWeight:700,color:'#64748b',textDecoration:'none'}}>Open full Mailtrap Outreach →</a>
            <div style={{display:'flex',gap:8}}>
              <button type="button" onClick={generate} disabled={generating} style={{border:'1px solid #c4b5fd',background:'#f5f3ff',color:'#5b21b6',borderRadius:9,padding:'9px 14px',fontSize:12,fontWeight:800,cursor:generating?'wait':'pointer',opacity:generating?.7:1}}>{generating?'Generating…':'✨ Generate with Setu Guru'}</button>
              <button type="button" onClick={send} disabled={sending || !lead.primary_admin_email || !subject.trim() || !body.trim()} style={{border:'none',background:sending?'#94a3b8':'#7c3aed',color:'#fff',borderRadius:9,padding:'9px 15px',fontSize:12,fontWeight:800,cursor:sending?'wait':'pointer',opacity:(!lead.primary_admin_email || !subject.trim() || !body.trim())?.55:1}}>{sending?'Sending…':'Send via Mailtrap'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadsBoardContactState({ initialLeads }: { initialLeads: Lead[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [leads,setLeads] = useState<Lead[]>(initialLeads);
  const [composerLeadId,setComposerLeadId] = useState<string|null>(null);
  const [boardVersion,setBoardVersion] = useState(0);

  useEffect(() => setLeads(initialLeads), [initialLeads]);

  const composerLead = useMemo(() => leads.find(lead => lead.id === composerLeadId) ?? null,[leads,composerLeadId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const leadByCompany = new Map(leads.map(lead => [lead.company_name,lead]));

    const openComposer = (lead:Lead) => setComposerLeadId(lead.id);

    const paint = () => {
      root.querySelectorAll('h5').forEach(title => {
        const company = title.textContent?.trim() || '';
        const lead = leadByCompany.get(company);
        if (!lead) return;
        const state = contactState(lead);
        const card = title.closest('[draggable="true"]') as HTMLElement | null;
        if (!card) return;

        let badge = card.querySelector('[data-smc-contact-state]') as HTMLDivElement | null;
        if (!badge) {
          badge = document.createElement('div');
          badge.dataset.smcContactState = 'true';
          const children = Array.from(card.children);
          const insertBefore = children.length >= 2 ? children[children.length - 2] : null;
          card.insertBefore(badge,insertBefore);
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

        let mail = card.querySelector('[data-smc-card-mailtrap]') as HTMLButtonElement | null;
        if (!mail) {
          mail = document.createElement('button');
          mail.type = 'button';
          mail.dataset.smcCardMailtrap = 'true';
          mail.addEventListener('click',event => event.stopPropagation());
          card.insertBefore(mail,badge);
        }
        mail.textContent = lead.primary_admin_email ? '✉ Mailtrap email' : '✉ Add email to send';
        mail.disabled = !lead.primary_admin_email;
        mail.title = lead.primary_admin_email ? `Generate and send an email to ${lead.primary_admin_email}` : 'Add an email address in Contact before sending';
        mail.onclick = event => { event.stopPropagation(); if (lead.primary_admin_email) openComposer(lead); };
        mail.style.width = '100%';
        mail.style.marginTop = '7px';
        mail.style.padding = '5px 7px';
        mail.style.borderRadius = '7px';
        mail.style.border = '1px solid #ddd6fe';
        mail.style.background = lead.primary_admin_email ? '#f5f3ff' : '#f8fafc';
        mail.style.color = lead.primary_admin_email ? '#6d28d9' : '#94a3b8';
        mail.style.fontSize = '9.5px';
        mail.style.fontWeight = '800';
        mail.style.cursor = lead.primary_admin_email ? 'pointer' : 'not-allowed';

        card.style.borderLeftWidth = state.key === 'untouched' ? '1px' : '3px';
        card.style.borderLeftColor = state.key === 'untouched' ? '#e2e8f0' : state.color;
      });

      // The existing Lead Manager drawer remains the source for editing, WhatsApp,
      // demo and activity. Add a first-class Mailtrap action directly to its header.
      root.querySelectorAll('div').forEach(node => {
        if (node.textContent?.trim() !== 'Internal Lead') return;
        const meta = node.parentElement as HTMLElement | null;
        const header = meta?.parentElement as HTMLElement | null;
        const company = node.nextElementSibling?.textContent?.trim() || '';
        const lead = leadByCompany.get(company);
        if (!header || !lead) return;
        let action = header.querySelector('[data-smc-drawer-mailtrap]') as HTMLButtonElement | null;
        if (!action) {
          action = document.createElement('button');
          action.type = 'button';
          action.dataset.smcDrawerMailtrap = 'true';
          const close = header.lastElementChild;
          if (close) header.insertBefore(action,close); else header.appendChild(action);
        }
        action.textContent = lead.primary_admin_email ? '✉ Mailtrap' : '✉ No email';
        action.disabled = !lead.primary_admin_email;
        action.onclick = event => { event.stopPropagation(); if (lead.primary_admin_email) openComposer(lead); };
        action.title = lead.primary_admin_email ? 'Generate, review and send email through Mailtrap' : 'Add an email address in Contact first';
        action.style.border = '1px solid rgba(255,255,255,.28)';
        action.style.background = 'rgba(255,255,255,.14)';
        action.style.color = '#fff';
        action.style.borderRadius = '8px';
        action.style.padding = '6px 9px';
        action.style.fontSize = '10px';
        action.style.fontWeight = '800';
        action.style.cursor = lead.primary_admin_email ? 'pointer' : 'not-allowed';
        action.style.opacity = lead.primary_admin_email ? '1' : '.55';
      });
    };

    paint();
    const observer = new MutationObserver(() => requestAnimationFrame(paint));
    observer.observe(root,{childList:true,subtree:true});
    return () => observer.disconnect();
  }, [leads]);

  function handleSent(updated:Lead) {
    setLeads(prev => prev.map(lead => lead.id === updated.id ? {...lead,...updated} : lead));
    setBoardVersion(value => value + 1);
  }

  return (
    <div ref={rootRef}>
      <div style={{display:'flex',gap:6,alignItems:'center',padding:'0 16px 8px',fontSize:9.5,color:'#64748b',flexWrap:'wrap'}}>
        <strong style={{fontSize:9.5,color:'#475569'}}>Contact state:</strong>
        <span>○ Not contacted</span><span>✉ Email</span><span>💬 WhatsApp</span><span>📞 Call</span><span>↩ Reply</span><span>🖥 Demo</span>
        <span style={{marginLeft:'auto',color:'#6d28d9',fontWeight:800}}>✉ Mailtrap email is available on every email-ready lead</span>
      </div>
      <LeadsBoard key={boardVersion} initialLeads={leads as any} />
      {composerLead && <LeadMailtrapComposer lead={composerLead} onClose={()=>setComposerLeadId(null)} onSent={handleSent} />}
    </div>
  );
}
