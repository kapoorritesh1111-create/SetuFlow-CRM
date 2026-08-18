'use client';

import { useMemo, useState } from 'react';

type Activity = { id:string; kind:string; note:string; actor_name:string; created_at:string };
type Lead = {
  id:string; company_name:string; primary_admin_name:string|null; primary_admin_email:string|null;
  primary_phone:string|null; headquarters_country:string|null; industry:string|null; pipeline_stage:string|null;
  lead_score:number|null; source:string|null; source_detail:string|null; internal_notes:string|null;
  last_contact_at:string|null; next_follow_up_at:string|null; assigned_to_name:string|null; activity_log:Activity[];
};

function parseGeneratedEmail(value: string, company: string) {
  const lines = value.split('\n');
  const index = lines.findIndex(line => line.toLowerCase().startsWith('subject:'));
  const subject = index >= 0 ? lines[index].replace(/^subject:\s*/i, '').trim() : `SETU Flow CRM for ${company}`;
  const body = (index >= 0 ? [...lines.slice(0,index), ...lines.slice(index+1)] : lines).join('\n').replace(/^\s+/, '');
  return { subject, body };
}

export function OutreachConsole({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const first = leads.find(l => l.primary_admin_email) ?? leads[0] ?? null;
  const [leadId, setLeadId] = useState(first?.id ?? '');
  const selected = useMemo(() => leads.find(l => l.id === leadId) ?? null, [leads, leadId]);
  const [subject, setSubject] = useState(first ? `SETU Flow CRM for ${first.company_name}` : '');
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{kind:'ok'|'error';text:string}|null>(null);

  function choose(id: string) {
    setLeadId(id);
    const lead = leads.find(l => l.id === id);
    setSubject(lead ? `SETU Flow CRM for ${lead.company_name}` : '');
    setMessage('');
    setNotice(null);
  }

  async function generate() {
    if (!selected) return;
    setGenerating(true); setNotice(null);
    try {
      const res = await fetch('/api/smc/suggest-message', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          company_name:selected.company_name,
          contact_name:selected.primary_admin_name,
          pipeline_stage:selected.pipeline_stage ?? 'inquiry',
          source:selected.source,
          source_detail:selected.source_detail,
          internal_notes:selected.internal_notes,
          last_contact_at:selected.last_contact_at,
          next_follow_up_at:selected.next_follow_up_at,
          lead_score:selected.lead_score,
          activity_log:selected.activity_log,
          kind:'email',
          sender_name:selected.assigned_to_name || 'Ritesh Kapoor',
        }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.message) throw new Error(data.error || 'Could not generate email.');
      const parsed = parseGeneratedEmail(data.message, selected.company_name);
      setSubject(parsed.subject); setMessage(parsed.body);
    } catch (error) {
      setNotice({kind:'error',text:error instanceof Error ? error.message : 'Could not generate email.'});
    } finally { setGenerating(false); }
  }

  async function send() {
    if (!selected || !selected.primary_admin_email || !subject.trim() || !message.trim()) return;
    setSending(true); setNotice(null);
    try {
      const res = await fetch(`/api/smc/leads/${selected.id}/outreach`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({subject:subject.trim(), message:message.trim(), sender_name:selected.assigned_to_name || 'Ritesh Kapoor'}),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok && res.status !== 207) throw new Error(data.error || 'Mailtrap send failed.');
      const sentAt = new Date().toISOString();
      setLeads(prev => prev.map(l => l.id===selected.id ? {...l,last_contact_at:sentAt,activity_log:[...(l.activity_log||[]),{id:crypto.randomUUID(),kind:'email',note:`Outbound email sent via Mailtrap — ${subject.trim()}`,actor_name:l.assigned_to_name||'Ritesh Kapoor',created_at:sentAt}]} : l));
      setNotice({kind:'ok',text:data.error ? data.error : `Sent through Mailtrap to ${selected.primary_admin_email}.`});
    } catch (error) {
      setNotice({kind:'error',text:error instanceof Error ? error.message : 'Mailtrap send failed.'});
    } finally { setSending(false); }
  }

  const sendReady = Boolean(selected?.primary_admin_email && subject.trim() && message.trim() && !sending);

  return (
    <div style={{display:'grid',gridTemplateColumns:'minmax(250px,330px) minmax(0,1fr)',gap:14,padding:'0 16px 18px'}}>
      <section style={{background:'#fff',border:'1px solid #dbe6ef',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid #e2e8f0',fontSize:11,fontWeight:800,color:'#475569',textTransform:'uppercase',letterSpacing:'.06em'}}>Prospects ready for outreach</div>
        <div style={{maxHeight:'70vh',overflowY:'auto'}}>
          {leads.map(lead => (
            <button key={lead.id} type="button" onClick={()=>choose(lead.id)} style={{display:'block',width:'100%',textAlign:'left',border:'none',borderBottom:'1px solid #f1f5f9',background:lead.id===leadId?'#eef6ff':'#fff',padding:'11px 13px',cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong style={{fontSize:12.5,color:'#1e293b'}}>{lead.company_name}</strong><span style={{fontSize:11,fontWeight:800,color:(lead.lead_score??0)>=80?'#059669':'#64748b'}}>{lead.lead_score??0}</span></div>
              <div style={{fontSize:10.5,color:lead.primary_admin_email?'#64748b':'#dc2626',marginTop:3}}>{lead.primary_admin_email || 'No email found yet'}</div>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:3}}>{lead.headquarters_country || '—'}{lead.industry?` · ${lead.industry}`:''}</div>
            </button>
          ))}
          {!leads.length && <div style={{padding:20,fontSize:12,color:'#94a3b8'}}>No active leads available.</div>}
        </div>
      </section>

      <section style={{background:'#fff',border:'1px solid #dbe6ef',borderRadius:16,padding:16,minWidth:0}}>
        {!selected ? <div style={{color:'#94a3b8',fontSize:13}}>Select a prospect to compose outreach.</div> : <>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',marginBottom:14}}>
            <div><div style={{fontSize:11,color:'#64748b'}}>To</div><div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>{selected.company_name}</div><div style={{fontSize:11,color:selected.primary_admin_email?'#475569':'#dc2626'}}>{selected.primary_admin_email || 'Add an email address in Lead Manager before sending.'}</div></div>
            <div style={{fontSize:10.5,color:'#64748b',textAlign:'right'}}>Provider<br/><strong style={{color:'#7c3aed'}}>Mailtrap</strong></div>
          </div>

          <label style={{display:'block',fontSize:11,fontWeight:700,color:'#475569',marginBottom:10}}>Subject
            <input value={subject} onChange={e=>setSubject(e.target.value)} style={{width:'100%',boxSizing:'border-box',marginTop:4,border:'1px solid #dbe6ef',borderRadius:9,padding:'9px 10px',fontSize:12.5}} />
          </label>
          <label style={{display:'block',fontSize:11,fontWeight:700,color:'#475569'}}>Email body
            <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={14} placeholder="Generate with Setu Guru or write the email here…" style={{width:'100%',boxSizing:'border-box',marginTop:4,border:'1px solid #dbe6ef',borderRadius:9,padding:'10px',fontSize:12.5,lineHeight:1.55,resize:'vertical',fontFamily:'inherit'}} />
          </label>

          {notice && <div style={{marginTop:10,borderRadius:9,padding:'8px 10px',fontSize:11,fontWeight:600,background:notice.kind==='ok'?'#ecfdf5':'#fef2f2',color:notice.kind==='ok'?'#047857':'#b91c1c'}}>{notice.text}</div>}

          <div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:12}}>
            <button type="button" onClick={generate} disabled={generating} style={{border:'1px solid #c7d2fe',background:'#eef2ff',color:'#4338ca',borderRadius:9,padding:'9px 14px',fontSize:12,fontWeight:800,cursor:generating?'not-allowed':'pointer'}}>{generating?'Generating…':'✨ Generate with Setu Guru'}</button>
            <button type="button" onClick={send} disabled={!sendReady} style={{border:'none',background:sendReady?'#7c3aed':'#e2e8f0',color:sendReady?'#fff':'#94a3b8',borderRadius:9,padding:'9px 18px',fontSize:12,fontWeight:800,cursor:sendReady?'pointer':'not-allowed'}}>{sending?'Sending…':'Send via Mailtrap'}</button>
          </div>
          <div style={{marginTop:9,fontSize:10,color:'#94a3b8'}}>Sending is explicit. Generating an email never sends it. Successful sends are logged to the lead activity timeline automatically.</div>
        </>}
      </section>
    </div>
  );
}
