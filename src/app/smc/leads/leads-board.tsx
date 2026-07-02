'use client';

import { useState, useEffect, type CSSProperties } from 'react';

type Lead = { id:string; company_name:string; company_slug:string|null; workspace_domain:string|null; primary_admin_name:string|null; primary_admin_email:string; primary_phone:string|null; headquarters_country:string|null; status:string; requested_seat_count:number; requested_plan:string; trial_template_key:string|null; pipeline_stage:string|null; lead_score:number|null; is_trial_request:boolean; created_at:string; website:string|null; industry:string|null; source:string|null; source_detail:string|null; internal_notes:string|null; last_contact_at:string|null; next_follow_up_at:string|null; assigned_to_name:string|null; demo_scheduled_at:string|null; demo_completed_at:string|null; demo_outcome:string|null; demo_notes:string|null; activity_log:Array<{id:string;kind:string;note:string;actor_name:string;created_at:string}> };

const STAGES = [
  { key:'inquiry',     label:'Inquiry',     color:'#8b5cf6', border:'#c4b5fd' },
  { key:'qualified',   label:'Qualified',   color:'#279491', border:'#99e6e3' },
  { key:'trial',       label:'Trial',       color:'#d97706', border:'#fcd34d' },
  { key:'negotiating', label:'Negotiating', color:'#10b981', border:'#6ee7b7' },
  { key:'converted',   label:'Converted',   color:'#1F487C', border:'#93c5fd' },
  { key:'lost',        label:'Lost',        color:'#dc2626', border:'#fca5a5' },
];
// ASSIGNEES: loaded dynamically from /api/smc/team in the board component
// Fallback list for initial render before API responds
const ASSIGNEES_FALLBACK = ['Ritesh Kapoor','Kumar Mayank','Ankush Arya'];

const CLIENT_ORG_STAGES = new Set(['qualified','trial','negotiating','converted']);

function waLink(phone: string|null, name: string|null) {
  if (!phone) return null;
  const clean = phone.replace(/[^0-9+]/g, '');
  return `https://wa.me/${clean.startsWith('+') ? clean.slice(1) : clean}?text=${encodeURIComponent(`Hi${name ? ' ' + name : ''}, following up regarding SETU Flow CRM.`)}`;
}
function clientHref(lead: Lead) { return `/smc/clients${lead.company_slug ? `?org=${encodeURIComponent(lead.company_slug)}` : ''}`; }
function stageOf(l: Lead) {
  if (l.pipeline_stage) return l.pipeline_stage;
  if (l.status === 'live') return 'converted';
  return 'inquiry';
}

export function LeadsBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads]         = useState<Lead[]>(initialLeads);
  const [assignees, setAssignees] = useState<string[]>(ASSIGNEES_FALLBACK);
  // Fetch dynamic team members
  useEffect(() => {
    fetch('/api/smc/team').then(r => r.json()).then(d => {
      if (Array.isArray(d.team) && d.team.length > 0) {
        setAssignees(d.team.map((m: any) => m.display_name));
      }
    }).catch(() => {});
  }, []);
  const [dragId, setDragId]       = useState<string|null>(null);
  const [dragOver, setDragOver]   = useState<string|null>(null);
  const [sel, setSel]             = useState<Lead|null>(null);
  const [saving, setSaving]       = useState(false);
  // drawer edit state
  const [dStage,     setDStage]   = useState('');
  const [dNotes,     setDNotes]   = useState('');
  const [dScore,     setDScore]   = useState('');
  const [dFollowUp,  setDFollowUp]= useState('');
  const [dAssignee,  setDAssignee]= useState('');
  // Sprint B: activity log in drawer
  const [logKind,    setLogKind]    = useState('note');
  const [logNote,    setLogNote]    = useState('');
  const [logSaving,  setLogSaving]  = useState(false);
  const [provState,  setProvState]  = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [provMsg,    setProvMsg]    = useState('');
  // Sprint C: demo fields
  const [dDemoDate,  setDDemoDate]  = useState('');
  const [dDemoNotes, setDDemoNotes] = useState('');
  const [dDemoOutcome, setDDemoOutcome] = useState('');

  function openDrawer(lead: Lead) {
    setSel(lead);
    setDStage(stageOf(lead));
    setDNotes(lead.internal_notes ?? '');
    setDScore(lead.lead_score != null ? String(lead.lead_score) : '');
    setDFollowUp(lead.next_follow_up_at ? lead.next_follow_up_at.slice(0,10) : '');
    setDAssignee(lead.assigned_to_name ?? '');
    setDDemoDate(lead.demo_scheduled_at ? lead.demo_scheduled_at.slice(0,10) : '');
    setDDemoNotes(lead.demo_notes ?? '');
    setDDemoOutcome(lead.demo_outcome ?? '');
    setLogNote(''); setLogKind('note'); setProvState('idle'); setProvMsg('');
  }

  async function patch(id: string, payload: Record<string,unknown>) {
    const res = await fetch(`/api/smc/leads/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const d = await res.json().catch(()=>({}));
    if (res.ok && d.lead) setLeads(prev => prev.map(l => l.id === id ? d.lead : l));
    return res.ok;
  }

  // ── Drag handlers ──────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, id: string) { e.dataTransfer.effectAllowed='move'; setDragId(id); }
  function onDragEnd()                                  { setDragId(null); setDragOver(null); }
  function onDragOver(e: React.DragEvent, key: string)  { e.preventDefault(); e.dataTransfer.dropEffect='move'; setDragOver(key); }
  async function onDrop(e: React.DragEvent, stageKey: string) {
    e.preventDefault(); setDragOver(null);
    if (!dragId) return;
    const current = leads.find(l => l.id === dragId);
    if (!current || stageOf(current) === stageKey) { setDragId(null); return; }
    setLeads(prev => prev.map(l => l.id === dragId ? { ...l, pipeline_stage: stageKey } : l));
    setDragId(null);
    await patch(dragId, { pipeline_stage: stageKey });
  }

  // ── Drawer save ─────────────────────────────────────────────────
  async function saveDrawer() {
    if (!sel) return;
    setSaving(true);
    const ok = await patch(sel.id, {
      pipeline_stage: dStage || null,
      lead_score: dScore ? Number(dScore) : null,
      demo_scheduled_at: dDemoDate ? new Date(dDemoDate).toISOString() : null,
      demo_notes: dDemoNotes || null,
      demo_outcome: dDemoOutcome || null,
      internal_notes: dNotes || null,
      next_follow_up_at: dFollowUp || null,
      assigned_to_name: dAssignee || null,
    });
    if (ok) { setSel(null); }
    setSaving(false);
  }

  // Sprint D: provision trial workspace
  async function provisionTrial() {
    if (!sel) return;
    setProvState('loading'); setProvMsg('');
    try {
      const res = await fetch('/api/smc/leads/' + sel.id + '/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: sel.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setProvState('done');
        setProvMsg(d.message ?? 'Workspace provisioned. Check Client Orgs.');
        if (d.lead) { setLeads(prev => prev.map(l => l.id === sel.id ? d.lead : l)); setSel(d.lead); }
      } else {
        setProvState('error');
        setProvMsg(d.error ?? 'Provisioning failed. Check admin logs.');
      }
    } catch (err) {
      setProvState('error');
      setProvMsg(String(err));
    }
  }

  // Sprint B: log activity from drawer
  async function logActivity() {
    if (!sel || !logNote.trim()) return;
    setLogSaving(true);
    const res = await fetch(`/api/smc/leads/${sel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _activity: { kind: logKind, note: logNote.trim(), actor_name: dAssignee || 'Team' } }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.lead) {
      setLeads(prev => prev.map(l => l.id === sel.id ? d.lead : l));
      setSel(d.lead);
    }
    setLogNote(''); setLogSaving(false);
  }

  async function markLost() {
    if (!sel) return;
    setSaving(true);
    await patch(sel.id, { pipeline_stage:'lost', status:'rejected' });
    setSaving(false); setSel(null);
  }

  // ── Styles ──────────────────────────────────────────────────────
  const colStyle = (key: string): CSSProperties => ({
    minWidth: 280, flex:'0 0 280px', display:'flex', flexDirection:'column', borderRadius:12,
    border:`1.5px solid ${dragOver===key?'#279491':'#e2e8f0'}`,
    background: dragOver===key ? '#f0fafa' : '#f8fafc',
    transition:'border-color .15s, background .15s',
  });
  const cardStyle = (id: string): CSSProperties => ({
    background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:12, marginBottom:8,
    cursor:'grab', opacity: dragId===id ? .5 : 1, transition:'opacity .15s, box-shadow .15s',
    boxShadow: dragId===id ? 'none' : '0 1px 3px rgba(15,23,42,.06)',
  });
  const inp: CSSProperties = { width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:12.5, fontFamily:'inherit', outline:'none', marginTop:4 };
  const lbl: CSSProperties = { fontSize:11, color:'#475569', fontWeight:600, display:'block', marginBottom:12 };

  return (
    <>
      {/* KPI strip */}
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{leads.length}</div><div className="l">Pipeline</div></div>
        {STAGES.map(st=>{
          const c=leads.filter(l=>stageOf(l)===st.key).length;
          return <div key={st.key} className="smc-kp"><div className="v" style={{color:st.color}}>{c}</div><div className="l">{st.label}</div></div>;
        })}
      </div>

      {/* Pipeline board */}
      <div className="smc-pipeline" style={{overflowX:'auto',flex:1,padding:'0 16px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
        {STAGES.map(st=>{
          const stageLeads = leads.filter(l => stageOf(l) === st.key);
          return (
            <div key={st.key} style={colStyle(st.key)}
              onDragOver={(e) => onDragOver(e, st.key)}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(e, st.key)}>
              {/* Column header */}
              <div style={{padding:'10px 12px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:8,borderRadius:'10px 10px 0 0',background:st.key==='lost'?'#fff5f5':st.key==='converted'?'#f0fdf4':undefined}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:st.color,flexShrink:0}} />
                <h4 style={{fontSize:12,fontWeight:700,color:'#1e293b',margin:0}}>{st.label}</h4>
                <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:'#94a3b8',marginLeft:'auto'}}>{stageLeads.length}</span>
              </div>
              {/* Cards */}
              <div style={{flex:1,padding:10,overflowY:'auto',minHeight:120}}>
                {stageLeads.map(lead=>(
                  <div key={lead.id} style={cardStyle(lead.id)}
                    draggable
                    onDragStart={(e)=>onDragStart(e,lead.id)}
                    onDragEnd={onDragEnd}
                    onClick={()=>openDrawer(lead)}>
                    {/* Stage accent */}
                    <div style={{width:'100%',height:3,borderRadius:2,background:st.color,marginBottom:8,opacity:.6}} />
                    <h5 style={{fontSize:13,fontWeight:700,color:'#1e293b',margin:'0 0 2px'}}>{lead.company_name}</h5>
                    <div style={{fontSize:11,color:'#64748b'}}>{lead.primary_admin_name??'—'}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{lead.headquarters_country??'—'}{lead.industry?` · ${lead.industry}`:''}</div>
                    {/* Contact */}
                    <div style={{display:'grid',gap:3,marginTop:8,fontSize:11}}>
                      {lead.primary_admin_email&&<a href={`mailto:${lead.primary_admin_email}`} onClick={e=>e.stopPropagation()} style={{color:'#1F487C',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>✉️ {lead.primary_admin_email}</a>}
                      {lead.primary_phone&&(
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <a href={`tel:${lead.primary_phone}`} onClick={e=>e.stopPropagation()} style={{color:'#1F487C',textDecoration:'none'}}>📞 {lead.primary_phone}</a>
                          <a href={waLink(lead.primary_phone,lead.primary_admin_name)!} onClick={e=>e.stopPropagation()} target="_blank" rel="noreferrer" style={{marginLeft:'auto',padding:'2px 7px',background:'#25D366',color:'#fff',borderRadius:5,fontSize:9,fontWeight:700,textDecoration:'none'}}>WhatsApp</a>
                        </div>
                      )}
                    </div>
                    {/* Tags */}
                    <div style={{display:'flex',gap:4,marginTop:8,flexWrap:'wrap'}}>
                      <span className="smc-lb" style={{background:'#f1f5f9',color:'#475569'}}>{lead.requested_seat_count} seats</span>
                      <span className="smc-lb" style={{background:'#f5f3ff',color:'#8b5cf6'}}>{lead.requested_plan}</span>
                      {lead.is_trial_request&&<span className="smc-lb" style={{background:'#fef3c7',color:'#d97706'}}>Trial</span>}
                      {lead.source&&<span className="smc-lb" style={{background:'#ecfdf5',color:'#10b981'}}>{lead.source}</span>}
                    </div>
                    {/* Client Orgs link for Qualified+ stages */}
                    {CLIENT_ORG_STAGES.has(st.key)&&lead.company_slug&&(
                      <a href={`/smc/clients?org=${encodeURIComponent(lead.company_slug)}`} onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:5,marginTop:8,fontSize:10.5,fontWeight:700,color:'#1f487c',textDecoration:'none',background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:7,padding:'4px 9px'}}>
                        Manage in Client Orgs →
                      </a>
                    )}
                    {/* Footer */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                      <span style={{fontSize:10,color:'#94a3b8',fontFamily:"'DM Mono',monospace"}}>{new Date(lead.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                      <span style={{fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",color:(lead.lead_score??0)>=80?'#10b981':(lead.lead_score??0)>=50?'#279491':'#94a3b8'}}>{lead.lead_score??0}</span>
                    </div>
                    <div style={{fontSize:10,color:'#94a3b8',marginTop:4,textAlign:'center'}}>Click to edit · drag to move</div>
                  </div>
                ))}
                {stageLeads.length===0&&<div style={{textAlign:'center',padding:20,color:'#cbd5e1',fontSize:12,borderRadius:8,border:'2px dashed #f1f5f9'}}>Drop here</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit drawer backdrop */}
      {sel&&<div onClick={()=>setSel(null)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,.3)',zIndex:9998}} />}

      {/* Edit drawer */}
      {sel&&(
        <div style={{position:'fixed',top:0,right:0,bottom:0,width:'min(440px,100vw)',background:'#fff',boxShadow:'-8px 0 40px rgba(15,23,42,.15)',zIndex:9999,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Header */}
          <div style={{padding:'14px 16px',background:'linear-gradient(135deg,#1f487c,#279491)',color:'#fff',display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,opacity:.8}}>Internal Lead</div>
              <div style={{fontSize:16,fontWeight:700}}>{sel.company_name}</div>
            </div>
            <button onClick={()=>setSel(null)} style={{border:'none',background:'rgba(255,255,255,.15)',color:'#fff',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:16}}>✕</button>
          </div>

          {/* Body */}
          <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
            {/* Stage */}
            <label style={lbl}>Pipeline Stage
              <select value={dStage} onChange={e=>setDStage(e.target.value)} style={inp}>
                {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>

            {/* Assignee */}
            <label style={lbl}>Assigned To
              <select value={dAssignee} onChange={e=>setDAssignee(e.target.value)} style={inp}>
                <option value="">Unassigned</option>
                {(assignees.length ? assignees : ASSIGNEES_FALLBACK).map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </label>

            {/* Score + Follow-up side by side */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <label style={lbl}>Lead Score (0–100)
                <input type="number" min={0} max={100} value={dScore} onChange={e=>setDScore(e.target.value)} style={inp} placeholder="0" />
              </label>
              <label style={lbl}>Next Follow-up
                <input type="date" value={dFollowUp} onChange={e=>setDFollowUp(e.target.value)} style={inp} />
              </label>
            </div>

            {/* Internal notes */}
            <label style={lbl}>Internal Notes
              <textarea value={dNotes} onChange={e=>setDNotes(e.target.value)} rows={4} style={{...inp,resize:'vertical'}} placeholder="Context, next steps, blockers…" />
            </label>

            {/* Sprint B: Log activity */}
            <div style={{marginBottom:12,border:'1px solid #e2e8f0',borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'8px 12px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',fontSize:11,fontWeight:700,color:'#475569'}}>+ Log Activity</div>
              <div style={{padding:10,display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {[{k:'note',l:'📝 Note'},{k:'call',l:'📞 Call'},{k:'whatsapp',l:'💬 WA'},{k:'email',l:'✉ Email'},{k:'demo_completed',l:'🖥 Demo'}].map(({k,l})=>(
                    <button key={k} type="button" onClick={()=>setLogKind(k)} style={{border:`2px solid ${logKind===k?'#1F487C':'#e2e8f0'}`,background:logKind===k?'#eef4ff':'#fff',color:logKind===k?'#1F487C':'#64748b',borderRadius:8,padding:'3px 9px',fontSize:10,fontWeight:700,cursor:'pointer'}}>{l}</button>
                  ))}
                </div>
                <textarea value={logNote} onChange={e=>setLogNote(e.target.value)} rows={2} placeholder="What happened..." style={{...inp,resize:'vertical',fontSize:12}} />
                <button onClick={logActivity} disabled={!logNote.trim()||logSaving} style={{border:'none',background:logNote.trim()?'#1F487C':'#e2e8f0',color:logNote.trim()?'#fff':'#94a3b8',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:700,cursor:'pointer',alignSelf:'flex-end'}}>{logSaving?'Saving…':'Log'}</button>
              </div>
              {/* Activity history */}
              {sel.activity_log && sel.activity_log.length > 0 && (
                <div style={{borderTop:'1px solid #f1f5f9',maxHeight:180,overflowY:'auto'}}>
                  {[...sel.activity_log].reverse().map(entry=>(
                    <div key={entry.id} style={{padding:'7px 12px',borderBottom:'1px solid #f8fafc',fontSize:11}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                        <span style={{fontWeight:700,color:'#1F487C',textTransform:'uppercase',fontSize:9,letterSpacing:'.06em'}}>{entry.kind}</span>
                        <span style={{color:'#94a3b8',fontSize:9}}>{new Date(entry.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {entry.actor_name}</span>
                      </div>
                      <p style={{margin:0,color:'#334155',whiteSpace:'pre-wrap'}}>{entry.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Read-only info */}
            <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:12,fontSize:12,color:'#475569',display:'grid',gap:6}}>
              {sel.primary_admin_email&&<div>✉️ {sel.primary_admin_email}</div>}
              {sel.primary_phone&&<div>📞 {sel.primary_phone}</div>}
              {sel.website&&<a href={sel.website.startsWith('http')?sel.website:`https://${sel.website}`} target="_blank" rel="noreferrer" style={{color:'#1f487c',textDecoration:'none'}}>🌐 {sel.website}</a>}
              <div style={{marginTop:2,display:'flex',gap:6,flexWrap:'wrap'}}>
                <span style={{background:'#f5f3ff',color:'#8b5cf6',padding:'2px 7px',borderRadius:5,fontSize:10,fontWeight:600}}>{sel.requested_plan}</span>
                <span style={{background:'#f1f5f9',color:'#475569',padding:'2px 7px',borderRadius:5,fontSize:10,fontWeight:600}}>{sel.requested_seat_count} seats</span>
                {sel.source&&<span style={{background:'#ecfdf5',color:'#10b981',padding:'2px 7px',borderRadius:5,fontSize:10,fontWeight:600}}>{sel.source}</span>}
              </div>
            </div>

            {/* Mark as lost */}
            {dStage!=='lost'&&(
              <div style={{marginTop:14,padding:12,border:'1px dashed #fca5a5',borderRadius:10,background:'#fff5f5'}}>
                <div style={{fontSize:11.5,color:'#7f1d1d',marginBottom:8}}>
                  <strong>Mark as Lost</strong> — move to Lost column and close this lead. This cannot automatically be undone but you can drag them back.
                </div>
                <button onClick={markLost} disabled={saving} style={{border:'none',background:'#dc2626',color:'#fff',borderRadius:8,padding:'7px 16px',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                  Mark as Lost
                </button>
              </div>
            )}

            {/* Full details link */}
            {/* Client Orgs link (for Qualified+ that have an org) */}
            {/* Sprint D: Provision Trial Workspace */}
            {dStage === 'trial' && !(sel as any).linked_organization_id && (
              <div style={{marginTop:14,padding:13,border:'1px solid #bbf7d0',borderRadius:10,background:'#f0fdf4'}}>
                <p style={{margin:'0 0 6px',fontSize:11.5,fontWeight:700,color:'#14532d'}}>🚀 Provision Trial Workspace</p>
                <p style={{margin:'0 0 10px',fontSize:11,color:'#166534'}}>Create the client org, seed trial data, and prepare the first admin invite link. This runs the same provisioning flow as the Admin panel.</p>
                {provMsg && <p style={{margin:'0 0 8px',fontSize:11,fontWeight:600,color:provState==='done'?'#047857':'#991b1b',background:provState==='done'?'#dcfce7':'#fee2e2',borderRadius:7,padding:'5px 8px'}}>{provMsg}</p>}
                <button onClick={provisionTrial} disabled={provState==='loading'||provState==='done'} style={{width:'100%',border:'none',background:provState==='done'?'#6b7280':'#15803d',color:'#fff',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,cursor:provState==='loading'||provState==='done'?'not-allowed':'pointer'}}>
                  {provState==='loading'?'Provisioning…':provState==='done'?'✓ Done':'Provision Now'}
                </button>
              </div>
            )}

            {CLIENT_ORG_STAGES.has(dStage)&&sel.company_slug?(
              <a href={clientHref(sel)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:14,border:'1px solid #c7d2fe',background:'#eef2ff',color:'#1F487C',borderRadius:10,padding:'9px',fontSize:11.5,fontWeight:700,textDecoration:'none'}}>
                Manage in Client Orgs (SMC) ↗
              </a>
            ):(
              <a href={clientHref(sel)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:14,border:'1px solid #c7d2fe',background:'#eef2ff',color:'#1F487C',borderRadius:10,padding:'9px',fontSize:11.5,fontWeight:700,textDecoration:'none'}}>
                View in Client Orgs (SMC) ↗
              </a>
            )}
          </div>

          {/* Footer actions */}
          <div style={{padding:'12px 16px',borderTop:'1px solid #e2e8f0',display:'flex',gap:8,background:'#fafafa'}}>
            <button onClick={()=>setSel(null)} style={{flex:1,border:'1px solid #e2e8f0',background:'#fff',borderRadius:9,padding:'9px',fontSize:13,fontWeight:600,cursor:'pointer',color:'#475569'}}>Cancel</button>
            <button onClick={saveDrawer} disabled={saving} style={{flex:2,border:'none',background:'linear-gradient(135deg,#1f487c,#279491)',color:'#fff',borderRadius:9,padding:'9px',fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving?0.7:1}}>
              {saving?'Saving…':'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
