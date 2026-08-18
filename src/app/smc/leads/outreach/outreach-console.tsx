'use client';

import { useMemo, useState } from 'react';

type Activity = { id:string; kind:string; note:string; actor_name:string; created_at:string };
type MessageMode = 'auto' | 'first_inquiry' | 'follow_up';
type ResolvedMode = Exclude<MessageMode, 'auto'>;
type Lead = {
  id:string; company_name:string; primary_admin_name:string|null; primary_admin_email:string|null;
  primary_phone:string|null; headquarters_country:string|null; industry:string|null; pipeline_stage:string|null;
  lead_score:number|null; source:string|null; source_detail:string|null; internal_notes:string|null;
  last_contact_at:string|null; next_follow_up_at:string|null; assigned_to_name:string|null; activity_log:Activity[];
};
type Draft = { subject:string; body:string; mode:ResolvedMode; status?:'ready'|'sent'|'error'; error?:string };

const MARKETING_SITE = 'https://www.setuflowcrm.com';
const CONTACT_KINDS = new Set(['call','email','whatsapp','demo_completed']);
const MAX_BULK = 25;
const BULK_EXCLUDED_STAGES = new Set(['converted','lost']);

function parseGeneratedEmail(value: string, company: string) {
  const lines = value.split('\n');
  const index = lines.findIndex(line => line.toLowerCase().startsWith('subject:'));
  const subject = index >= 0 ? lines[index].replace(/^subject:\s*/i, '').trim() : `SETU Flow for ${company}`;
  const body = (index >= 0 ? [...lines.slice(0,index), ...lines.slice(index+1)] : lines).join('\n').replace(/^\s+/, '');
  return { subject, body };
}

function hasPriorContact(lead: Lead) {
  if (lead.last_contact_at) return true;
  return Array.isArray(lead.activity_log) && lead.activity_log.some(entry => CONTACT_KINDS.has(String(entry.kind).toLowerCase()));
}

function inferredMode(lead: Lead): ResolvedMode {
  return hasPriorContact(lead) ? 'follow_up' : 'first_inquiry';
}

function modeLabel(mode: ResolvedMode) {
  return mode === 'first_inquiry' ? 'First inquiry' : 'Follow-up';
}

function isBulkEligible(lead: Lead) {
  return Boolean(lead.primary_admin_email) && !BULK_EXCLUDED_STAGES.has(String(lead.pipeline_stage ?? '').toLowerCase());
}

function stageLabel(lead: Lead) {
  const stage = String(lead.pipeline_stage || 'inquiry');
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export function OutreachConsole({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const first = leads.find(l => l.primary_admin_email && !BULK_EXCLUDED_STAGES.has(String(l.pipeline_stage ?? '').toLowerCase())) ?? leads.find(l => l.primary_admin_email) ?? leads[0] ?? null;
  const [leadId, setLeadId] = useState(first?.id ?? '');
  const selected = useMemo(() => leads.find(l => l.id === leadId) ?? null, [leads, leadId]);
  const [subject, setSubject] = useState(first ? `SETU Flow for ${first.company_name}` : '');
  const [message, setMessage] = useState('');
  const [singleMode, setSingleMode] = useState<MessageMode>('auto');
  const [resolvedSingleMode, setResolvedSingleMode] = useState<ResolvedMode>(first ? inferredMode(first) : 'first_inquiry');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{kind:'ok'|'error';text:string}|null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<MessageMode>('auto');
  const [bulkDrafts, setBulkDrafts] = useState<Record<string,Draft>>({});
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  const emailReady = useMemo(() => leads.filter(isBulkEligible), [leads]);
  const bulkTargets = useMemo(() => selectedIds.map(id => leads.find(l => l.id === id)).filter((l): l is Lead => Boolean(l && isBulkEligible(l))), [selectedIds, leads]);
  const readyDrafts = useMemo(() => bulkTargets.filter(l => {
    const d = bulkDrafts[l.id];
    return d?.subject.trim() && d?.body.trim() && d.status !== 'sent';
  }), [bulkTargets, bulkDrafts]);

  function choose(id: string) {
    setLeadId(id);
    const lead = leads.find(l => l.id === id);
    setSubject(lead ? `SETU Flow for ${lead.company_name}` : '');
    setMessage('');
    setResolvedSingleMode(lead ? inferredMode(lead) : 'first_inquiry');
    setNotice(null);
  }

  function toggleBulk(id: string) {
    const lead = leads.find(l => l.id === id);
    if (!lead || !isBulkEligible(lead)) {
      setNotice({kind:'error',text:'Converted/lost leads and leads without an email stay visible for parity but are excluded from bulk prospect campaigns. Use the single composer for intentional one-to-one outreach.'});
      return;
    }
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_BULK) {
        setNotice({kind:'error',text:`Bulk outreach is capped at ${MAX_BULK} recipients per batch for review and delivery safety.`});
        return prev;
      }
      return [...prev,id];
    });
  }

  function selectEmailReady() {
    setSelectedIds(emailReady.slice(0,MAX_BULK).map(l => l.id));
    if (emailReady.length > MAX_BULK) setNotice({kind:'ok',text:`Selected the top ${MAX_BULK} active email-ready prospects. Send another batch for the remainder.`});
  }

  async function generateForLead(lead: Lead, mode: MessageMode): Promise<Draft> {
    const res = await fetch('/api/smc/suggest-message', {
      method:'POST', headers:{'Content-Type':'application/json'},
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
    if (!res.ok || !data.message) throw new Error(data.error || `Could not generate email for ${lead.company_name}.`);
    const parsed = parseGeneratedEmail(data.message, lead.company_name);
    const resolved: ResolvedMode = data.message_mode === 'follow_up' ? 'follow_up' : data.message_mode === 'first_inquiry' ? 'first_inquiry' : (mode === 'auto' ? inferredMode(lead) : mode);
    return {subject:parsed.subject,body:parsed.body,mode:resolved,status:'ready'};
  }

  async function generate() {
    if (!selected) return;
    setGenerating(true); setNotice(null);
    try {
      const draft = await generateForLead(selected, singleMode);
      setSubject(draft.subject); setMessage(draft.body); setResolvedSingleMode(draft.mode);
      setNotice({kind:'ok',text:`Generated as ${modeLabel(draft.mode)}. ${draft.mode==='first_inquiry' ? 'Marketing-site link is required and enforced at send time.' : ''}`});
    } catch (error) {
      setNotice({kind:'error',text:error instanceof Error ? error.message : 'Could not generate email.'});
    } finally { setGenerating(false); }
  }

  async function send() {
    if (!selected || !selected.primary_admin_email || !subject.trim() || !message.trim()) return;
    setSending(true); setNotice(null);
    try {
      const sendMode: MessageMode = singleMode === 'auto' ? resolvedSingleMode : singleMode;
      const res = await fetch(`/api/smc/leads/${selected.id}/outreach`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({subject:subject.trim(), message:message.trim(), message_mode:sendMode, sender_name:selected.assigned_to_name || 'Ritesh Kapoor'}),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok && res.status !== 207) throw new Error(data.error || 'Mailtrap send failed.');
      const sentAt = new Date().toISOString();
      setLeads(prev => prev.map(l => l.id===selected.id ? {...l,last_contact_at:sentAt,activity_log:[...(l.activity_log||[]),{id:crypto.randomUUID(),kind:'email',note:`${modeLabel(data.message_mode || resolvedSingleMode)} email sent via Mailtrap — ${subject.trim()}`,actor_name:l.assigned_to_name||'Ritesh Kapoor',created_at:sentAt}]} : l));
      setResolvedSingleMode('follow_up');
      setNotice({kind:'ok',text:data.error ? data.error : `Sent through Mailtrap to ${selected.primary_admin_email}. Future auto-generated messages will be follow-ups.`});
    } catch (error) {
      setNotice({kind:'error',text:error instanceof Error ? error.message : 'Mailtrap send failed.'});
    } finally { setSending(false); }
  }

  async function generateBulk() {
    if (!bulkTargets.length) {
      setNotice({kind:'error',text:'Select at least one active prospect with an email address.'});
      return;
    }
    setBulkGenerating(true); setNotice(null);
    const next: Record<string,Draft> = {};
    let failures = 0;
    try {
      for (let i=0;i<bulkTargets.length;i+=5) {
        const batch = bulkTargets.slice(i,i+5);
        const results = await Promise.allSettled(batch.map(lead => generateForLead(lead, bulkMode)));
        results.forEach((result,index) => {
          const lead = batch[index];
          if (result.status === 'fulfilled') next[lead.id] = result.value;
          else { failures += 1; next[lead.id] = {subject:`SETU Flow for ${lead.company_name}`,body:'',mode:bulkMode==='follow_up'?'follow_up':bulkMode==='first_inquiry'?'first_inquiry':inferredMode(lead),status:'error',error:result.reason instanceof Error ? result.reason.message : 'Generation failed'}; }
        });
      }
      setBulkDrafts(prev => ({...prev,...next}));
      setNotice({kind:failures?'error':'ok',text:`Generated ${bulkTargets.length-failures} personalized draft${bulkTargets.length-failures===1?'':'s'}${failures?`; ${failures} failed and were not made send-ready.`:'. Review each draft before sending.'}`});
    } finally { setBulkGenerating(false); }
  }

  function updateDraft(id:string, patch:Partial<Draft>) {
    setBulkDrafts(prev => ({...prev,[id]:{...prev[id],...patch}}));
  }

  async function sendBulk() {
    if (!readyDrafts.length) return;
    const ok = window.confirm(`Send ${readyDrafts.length} personalized email${readyDrafts.length===1?'':'s'} individually through Mailtrap? Each send will be logged to its SMC lead.`);
    if (!ok) return;
    setBulkSending(true); setNotice(null);
    let sent = 0;
    let failed = 0;
    for (const lead of readyDrafts) {
      const draft = bulkDrafts[lead.id];
      try {
        const res = await fetch(`/api/smc/leads/${lead.id}/outreach`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({subject:draft.subject.trim(),message:draft.body.trim(),message_mode:draft.mode,sender_name:lead.assigned_to_name || 'Ritesh Kapoor'}),
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok && res.status !== 207) throw new Error(data.error || 'Mailtrap send failed.');
        sent += 1;
        updateDraft(lead.id,{status:'sent',error:undefined});
        const sentAt = new Date().toISOString();
        setLeads(prev => prev.map(l => l.id===lead.id ? {...l,last_contact_at:sentAt,activity_log:[...(l.activity_log||[]),{id:crypto.randomUUID(),kind:'email',note:`${modeLabel(draft.mode)} email sent via Mailtrap — ${draft.subject.trim()}`,actor_name:l.assigned_to_name||'Ritesh Kapoor',created_at:sentAt}]} : l));
      } catch (error) {
        failed += 1;
        updateDraft(lead.id,{status:'error',error:error instanceof Error ? error.message : 'Mailtrap send failed.'});
      }
    }
    setBulkSending(false);
    setNotice({kind:failed?'error':'ok',text:`Bulk outreach complete: ${sent} sent through Mailtrap${failed?`, ${failed} failed and remain available for review/retry.`:'.'}`});
  }

  const sendReady = Boolean(selected?.primary_admin_email && subject.trim() && message.trim() && !sending);
  const selectedBulkEligible = selected ? isBulkEligible(selected) : false;

  return (
    <div style={{padding:'0 16px 18px'}}>
      <div style={{display:'grid',gridTemplateColumns:'minmax(270px,340px) minmax(0,1fr)',gap:14}}>
        <section style={{background:'#fff',border:'1px solid #dbe6ef',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'11px 13px',borderBottom:'1px solid #e2e8f0'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#475569',textTransform:'uppercase',letterSpacing:'.06em'}}>All Growth leads</div>
            <div style={{fontSize:9.5,color:'#94a3b8',marginTop:2}}>Lead Manager parity — converted/lost stay visible but are not auto-selected for prospect bulk campaigns.</div>
            <div style={{display:'flex',gap:6,marginTop:8}}>
              <button type="button" onClick={selectEmailReady} style={{border:'1px solid #dbe6ef',background:'#fff',borderRadius:7,padding:'4px 7px',fontSize:10,fontWeight:700,color:'#475569',cursor:'pointer'}}>Select active email-ready</button>
              <button type="button" onClick={()=>setSelectedIds([])} style={{border:'none',background:'none',fontSize:10,fontWeight:700,color:'#94a3b8',cursor:'pointer'}}>Clear</button>
              <span style={{marginLeft:'auto',fontSize:10,fontWeight:800,color:'#7c3aed'}}>{selectedIds.length}/{MAX_BULK}</span>
            </div>
          </div>
          <div style={{maxHeight:'70vh',overflowY:'auto'}}>
            {leads.map(lead => {
              const bulkEligible = isBulkEligible(lead);
              const excludedStage = BULK_EXCLUDED_STAGES.has(String(lead.pipeline_stage ?? '').toLowerCase());
              return (
              <div key={lead.id} style={{display:'grid',gridTemplateColumns:'26px 1fr',alignItems:'stretch',borderBottom:'1px solid #f1f5f9',background:lead.id===leadId?'#eef6ff':'#fff',opacity:excludedStage?.82:1}}>
                <label style={{display:'flex',alignItems:'center',justifyContent:'center',cursor:bulkEligible?'pointer':'not-allowed'}} title={bulkEligible?'Select for bulk outreach':excludedStage?'Visible for parity; converted/lost leads require intentional one-to-one outreach':'No email address'}>
                  <input type="checkbox" checked={selectedIds.includes(lead.id)} disabled={!bulkEligible} onChange={()=>toggleBulk(lead.id)} />
                </label>
                <button type="button" onClick={()=>choose(lead.id)} style={{display:'block',width:'100%',textAlign:'left',border:'none',background:'transparent',padding:'10px 11px 10px 4px',cursor:'pointer'}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong style={{fontSize:12.5,color:'#1e293b'}}>{lead.company_name}</strong><span style={{fontSize:11,fontWeight:800,color:(lead.lead_score??0)>=80?'#059669':'#64748b'}}>{lead.lead_score??0}</span></div>
                  <div style={{fontSize:10.5,color:lead.primary_admin_email?'#64748b':'#dc2626',marginTop:3}}>{lead.primary_admin_email || 'No email found yet'}</div>
                  <div style={{display:'flex',gap:5,alignItems:'center',marginTop:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:9.5,color:'#94a3b8'}}>{lead.headquarters_country || '—'}{lead.industry?` · ${lead.industry}`:''}</span>
                    <span style={{fontSize:9,fontWeight:800,borderRadius:6,padding:'2px 6px',background:excludedStage?'#f1f5f9':'#eff6ff',color:excludedStage?'#64748b':'#1F487C'}}>{stageLabel(lead)}</span>
                    <span style={{fontSize:9,fontWeight:800,borderRadius:6,padding:'2px 6px',background:inferredMode(lead)==='first_inquiry'?'#ecfeff':'#f5f3ff',color:inferredMode(lead)==='first_inquiry'?'#0f766e':'#6d28d9'}}>{modeLabel(inferredMode(lead))}</span>
                  </div>
                </button>
              </div>
            );})}
            {!leads.length && <div style={{padding:20,fontSize:12,color:'#94a3b8'}}>No Growth leads available.</div>}
          </div>
        </section>

        <section style={{background:'#fff',border:'1px solid #dbe6ef',borderRadius:16,padding:16,minWidth:0}}>
          {!selected ? <div style={{color:'#94a3b8',fontSize:13}}>Select a lead to compose outreach.</div> : <>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',marginBottom:12}}>
              <div><div style={{fontSize:11,color:'#64748b'}}>To</div><div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>{selected.company_name}</div><div style={{fontSize:11,color:selected.primary_admin_email?'#475569':'#dc2626'}}>{selected.primary_admin_email || 'Add an email address in Lead Manager before sending.'}</div></div>
              <div style={{fontSize:10.5,color:'#64748b',textAlign:'right'}}>Provider<br/><strong style={{color:'#7c3aed'}}>Mailtrap</strong></div>
            </div>

            {!selectedBulkEligible && BULK_EXCLUDED_STAGES.has(String(selected.pipeline_stage ?? '').toLowerCase()) && <div style={{marginBottom:10,fontSize:10.5,color:'#92400e',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'7px 9px'}}>This lead is <strong>{stageLabel(selected)}</strong>. It remains available for intentional one-to-one email, but SMC excludes it from bulk prospect selection.</div>}

            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end',marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:'#475569'}}>Message type
                <select value={singleMode} onChange={e=>setSingleMode(e.target.value as MessageMode)} style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:9,padding:'8px 9px',fontSize:12}}>
                  <option value="auto">Auto — first inquiry, then follow-up</option>
                  <option value="first_inquiry">Force first inquiry</option>
                  <option value="follow_up">Force follow-up</option>
                </select>
              </label>
              <div style={{fontSize:10,fontWeight:800,borderRadius:8,padding:'8px 10px',background:(singleMode==='auto'?inferredMode(selected):singleMode)==='first_inquiry'?'#ecfeff':'#f5f3ff',color:(singleMode==='auto'?inferredMode(selected):singleMode)==='first_inquiry'?'#0f766e':'#6d28d9'}}>
                {singleMode==='auto'?'Auto → ':''}{modeLabel(singleMode==='auto'?inferredMode(selected):singleMode)}
              </div>
            </div>

            <label style={{display:'block',fontSize:11,fontWeight:700,color:'#475569',marginBottom:10}}>Subject
              <input value={subject} onChange={e=>setSubject(e.target.value)} style={{width:'100%',boxSizing:'border-box',marginTop:4,border:'1px solid #dbe6ef',borderRadius:9,padding:'9px 10px',fontSize:12.5}} />
            </label>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:'#475569'}}>Email body
              <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={14} placeholder="Generate with Setu Guru or write the email here…" style={{width:'100%',boxSizing:'border-box',marginTop:4,border:'1px solid #dbe6ef',borderRadius:9,padding:'10px',fontSize:12.5,lineHeight:1.55,resize:'vertical',fontFamily:'inherit'}} />
            </label>
            {(singleMode==='first_inquiry' || (singleMode==='auto' && inferredMode(selected)==='first_inquiry')) && <div style={{marginTop:6,fontSize:10,color:'#0f766e'}}>First inquiry rule: {MARKETING_SITE} is always included. The server restores it automatically if removed during editing.</div>}

            {notice && <div style={{marginTop:10,borderRadius:9,padding:'8px 10px',fontSize:11,fontWeight:600,background:notice.kind==='ok'?'#ecfdf5':'#fef2f2',color:notice.kind==='ok'?'#047857':'#b91c1c'}}>{notice.text}</div>}

            <div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:12}}>
              <button type="button" onClick={generate} disabled={generating} style={{border:'1px solid #c7d2fe',background:'#eef2ff',color:'#4338ca',borderRadius:9,padding:'9px 14px',fontSize:12,fontWeight:800,cursor:generating?'not-allowed':'pointer'}}>{generating?'Generating…':'✨ Generate personalized message'}</button>
              <button type="button" onClick={send} disabled={!sendReady} style={{border:'none',background:sendReady?'#7c3aed':'#e2e8f0',color:sendReady?'#fff':'#94a3b8',borderRadius:9,padding:'9px 18px',fontSize:12,fontWeight:800,cursor:sendReady?'pointer':'not-allowed'}}>{sending?'Sending…':'Send via Mailtrap'}</button>
            </div>
            <div style={{marginTop:9,fontSize:10,color:'#94a3b8'}}>Generating never sends. A successful send is logged to this lead and changes future Auto messages to follow-up mode.</div>
          </>}
        </section>
      </div>

      <section style={{marginTop:14,background:'#fff',border:'1px solid #dbe6ef',borderRadius:16,padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:14,fontWeight:900,color:'#1e293b'}}>Bulk personalized email</div>
            <div style={{fontSize:11,color:'#64748b',marginTop:3}}>Select up to {MAX_BULK} active prospects above. Converted/lost leads remain visible for parity but are intentionally excluded from bulk selection. SMC sends one separate Mailtrap email per company — never a shared To/CC blast.</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'end',flexWrap:'wrap'}}>
            <label style={{fontSize:10,fontWeight:700,color:'#64748b'}}>Campaign mode
              <select value={bulkMode} onChange={e=>setBulkMode(e.target.value as MessageMode)} style={{display:'block',marginTop:3,border:'1px solid #dbe6ef',borderRadius:8,padding:'7px 8px',fontSize:11}}>
                <option value="auto">Auto — recommended</option>
                <option value="first_inquiry">First inquiry</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </label>
            <button type="button" onClick={generateBulk} disabled={!bulkTargets.length||bulkGenerating||bulkSending} style={{border:'1px solid #c7d2fe',background:'#eef2ff',color:'#4338ca',borderRadius:9,padding:'8px 12px',fontSize:11,fontWeight:800,cursor:'pointer'}}>{bulkGenerating?'Generating personalized drafts…':`Generate ${bulkTargets.length || ''} drafts`}</button>
            <button type="button" onClick={sendBulk} disabled={!readyDrafts.length||bulkSending||bulkGenerating} style={{border:'none',background:readyDrafts.length&&!bulkSending?'#7c3aed':'#e2e8f0',color:readyDrafts.length&&!bulkSending?'#fff':'#94a3b8',borderRadius:9,padding:'8px 13px',fontSize:11,fontWeight:800,cursor:readyDrafts.length?'pointer':'not-allowed'}}>{bulkSending?'Sending individually…':`Send ${readyDrafts.length || ''} reviewed drafts`}</button>
          </div>
        </div>

        {bulkTargets.length>0 && <div style={{display:'grid',gap:9,marginTop:14}}>
          {bulkTargets.map(lead => {
            const draft = bulkDrafts[lead.id];
            return <details key={lead.id} open={Boolean(draft)} style={{border:'1px solid #e2e8f0',borderRadius:11,overflow:'hidden',background:draft?.status==='sent'?'#f0fdf4':'#fff'}}>
              <summary style={{cursor:'pointer',padding:'9px 11px',display:'flex',gap:8,alignItems:'center',listStyle:'none'}}>
                <strong style={{fontSize:11.5,color:'#1e293b'}}>{lead.company_name}</strong>
                <span style={{fontSize:10,color:'#64748b'}}>{lead.primary_admin_email}</span>
                <span style={{marginLeft:'auto',fontSize:9.5,fontWeight:800,color:draft?.mode==='follow_up'?'#6d28d9':'#0f766e'}}>{draft?modeLabel(draft.mode):`Will use ${bulkMode==='auto'?modeLabel(inferredMode(lead)):modeLabel(bulkMode)}`}</span>
                {draft?.status==='sent'&&<span style={{fontSize:9.5,fontWeight:800,color:'#047857'}}>✓ Sent</span>}
                {draft?.status==='error'&&<span style={{fontSize:9.5,fontWeight:800,color:'#b91c1c'}}>Needs attention</span>}
              </summary>
              {draft && <div style={{padding:'0 11px 11px',display:'grid',gap:7}}>
                {draft.error&&<div style={{fontSize:10,color:'#b91c1c',background:'#fef2f2',borderRadius:7,padding:'6px 8px'}}>{draft.error}</div>}
                <input value={draft.subject} disabled={draft.status==='sent'} onChange={e=>updateDraft(lead.id,{subject:e.target.value,status:'ready',error:undefined})} style={{border:'1px solid #dbe6ef',borderRadius:8,padding:'7px 8px',fontSize:11.5}} />
                <textarea value={draft.body} disabled={draft.status==='sent'} onChange={e=>updateDraft(lead.id,{body:e.target.value,status:'ready',error:undefined})} rows={7} style={{border:'1px solid #dbe6ef',borderRadius:8,padding:'8px',fontSize:11.5,lineHeight:1.5,fontFamily:'inherit',resize:'vertical'}} />
                {draft.mode==='first_inquiry'&&<div style={{fontSize:9.5,color:'#0f766e'}}>Marketing link required: {MARKETING_SITE} — enforced again by the server at send time.</div>}
              </div>}
            </details>;
          })}
        </div>}
        {!bulkTargets.length && <div style={{marginTop:13,border:'1px dashed #dbe6ef',borderRadius:10,padding:14,fontSize:11,color:'#94a3b8',textAlign:'center'}}>Choose active prospects using the checkboxes in the list above to build a personalized bulk outreach batch.</div>}
      </section>
    </div>
  );
}
