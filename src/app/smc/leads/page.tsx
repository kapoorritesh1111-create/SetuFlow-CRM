import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type Lead = { id:string; company_name:string; primary_admin_name:string|null; primary_admin_email:string; primary_phone:string|null; headquarters_country:string|null; status:string; requested_seat_count:number; requested_plan:string; pipeline_stage:string|null; lead_score:number|null; is_trial_request:boolean; created_at:string; website:string|null; industry:string|null; source:string|null; source_detail:string|null; internal_notes:string|null; last_contact_at:string|null; next_follow_up_at:string|null; assigned_to_name:string|null };

async function getLeads() {
  const supabase = await createClient();
  const { data } = await supabase.from('client_onboarding_requests').select('*').order('created_at', { ascending: false });
  return (data as Lead[]) ?? [];
}

async function createLead(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { error } = await supabase.from('client_onboarding_requests').insert({
    company_name: String(formData.get('company_name') ?? '').trim(),
    primary_admin_name: String(formData.get('contact_name') ?? '').trim() || null,
    primary_admin_email: String(formData.get('email') ?? '').trim(),
    primary_phone: String(formData.get('phone') ?? '').trim() || null,
    headquarters_country: String(formData.get('country') ?? '').trim() || null,
    website: String(formData.get('website') ?? '').trim() || null,
    industry: String(formData.get('industry') ?? '').trim() || null,
    requested_plan: String(formData.get('plan') ?? 'starter'),
    requested_seat_count: Number(formData.get('seats') ?? 5),
    is_trial_request: formData.get('is_trial') === 'on',
    pipeline_stage: 'inquiry',
    lead_score: 0,
    status: 'new',
    source: String(formData.get('source') ?? 'internal').trim(),
    source_detail: String(formData.get('source_detail') ?? '').trim() || null,
    internal_notes: String(formData.get('notes') ?? '').trim() || null,
  });
  if (error) console.error('Create lead error:', error);
  revalidatePath('/smc/leads');
}

const STAGES = [
  { key:'inquiry', label:'Inquiry', color:'#8b5cf6' },
  { key:'qualified', label:'Qualified', color:'#279491' },
  { key:'trial', label:'Trial', color:'#d97706' },
  { key:'negotiating', label:'Negotiating', color:'#10b981' },
  { key:'converted', label:'Converted', color:'#1F487C' },
];

function waLink(phone: string|null, name: string|null) {
  if (!phone) return null;
  const clean = phone.replace(/[^0-9+]/g, '');
  return `https://wa.me/${clean.startsWith('+') ? clean.slice(1) : clean}?text=${encodeURIComponent(`Hi${name ? ' ' + name : ''}, following up regarding SETU Flow CRM.`)}`;
}

export default async function SmcLeadsPage() {
  const leads = await getLeads();

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Growth</div><h1>Internal Leads</h1></div>
        <div className="ha">
          <span style={{fontSize:11,color:'#64748b'}}>{leads.length} leads in pipeline</span>
        </div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{leads.length}</div><div className="l">Pipeline</div></div>
        {STAGES.map(st=>{const c=leads.filter(l=>l.pipeline_stage===st.key).length;return <div key={st.key} className="smc-kp"><div className="v" style={{color:st.color}}>{c}</div><div className="l">{st.label}</div></div>})}
      </div>

      {/* New Lead Form */}
      <details style={{margin:'0 16px 16px',background:'#fff',border:'1px solid #dbe6ef',borderRadius:18,boxShadow:'0 8px 24px rgba(15,23,42,.05)'}}>
        <summary style={{padding:'14px 18px',cursor:'pointer',fontWeight:700,fontSize:14,color:'#1F487C',listStyle:'none',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:28,height:28,borderRadius:8,background:'#279491',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900}}>+</span>
          New Internal Lead
        </summary>
        <form action={createLead} style={{padding:'0 18px 18px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Company Name *<input name="company_name" required style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="Acme Foods Ltd" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Contact Name<input name="contact_name" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="John Doe" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Email *<input name="email" type="email" required style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="john@acme.com" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Phone / WhatsApp<input name="phone" type="tel" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="+1 555 123 4567" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Country<input name="country" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="United States" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Website<input name="website" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="https://acme.com" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Industry<input name="industry" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="Food Import/Export" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Plan<select name="plan" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}}><option value="starter">Starter</option><option value="growth">Growth</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Seats<input name="seats" type="number" min={1} defaultValue={5} style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Source<select name="source" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}}><option value="internal">Internal / Referral</option><option value="trade_show">Trade Show</option><option value="website">Website</option><option value="cold_outreach">Cold Outreach</option><option value="linkedin">LinkedIn</option></select></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Source Detail<input name="source_detail" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="Gulfood 2026, Booth A12" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600,display:'flex',alignItems:'center',gap:8,marginTop:18}}><input name="is_trial" type="checkbox" /> Trial Request</label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600,gridColumn:'span 3'}}>Internal Notes<textarea name="notes" rows={2} style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12,resize:'vertical'}} placeholder="Context, next steps, urgency..." /></label>
          <div style={{gridColumn:'span 3',display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
            <button type="submit" style={{padding:'10px 24px',background:'#279491',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>Create Lead</button>
          </div>
        </form>
      </details>

      {/* Pipeline */}
      <div className="smc-pipeline">
        {STAGES.map(st=>{
          const stageLeads=leads.filter(l=>l.pipeline_stage===st.key||(st.key==='converted'&&l.status==='live'&&!l.pipeline_stage)||(st.key==='inquiry'&&!l.pipeline_stage&&l.status!=='live'));
          return(
            <div key={st.key} className="smc-pipe-col">
              <div className="smc-pipe-col-head">
                <h4>{st.label}</h4>
                <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:'#94a3b8'}}>{stageLeads.length}</span>
              </div>
              <div className="smc-pipe-col-body">
                {stageLeads.map(lead=>(
                  <div key={lead.id} className="smc-pipe-card" style={st.key==='converted'?{borderLeft:'3px solid #10b981'}:undefined}>
                    <h5>{lead.company_name}</h5>
                    <div className="pm">{lead.primary_admin_name??'—'}</div>
                    <div className="pm" style={{fontSize:10,color:'#64748b'}}>{lead.headquarters_country??'—'}{lead.industry ? ` · ${lead.industry}` : ''}</div>

                    {/* Contact Info */}
                    <div style={{display:'grid',gap:4,marginTop:8,fontSize:11}}>
                      {lead.primary_admin_email && (
                        <a href={`mailto:${lead.primary_admin_email}`} style={{display:'flex',alignItems:'center',gap:6,color:'#1F487C',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          <span style={{fontSize:12}}>✉️</span>{lead.primary_admin_email}
                        </a>
                      )}
                      {lead.primary_phone && (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <a href={`tel:${lead.primary_phone}`} style={{display:'flex',alignItems:'center',gap:6,color:'#1F487C',textDecoration:'none'}}>
                            <span style={{fontSize:12}}>📞</span>{lead.primary_phone}
                          </a>
                          <a href={waLink(lead.primary_phone, lead.primary_admin_name)!} target="_blank" rel="noreferrer" style={{marginLeft:'auto',padding:'2px 8px',background:'#25D366',color:'#fff',borderRadius:6,fontSize:9,fontWeight:700,textDecoration:'none'}}>WhatsApp</a>
                        </div>
                      )}
                      {lead.website && (
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:6,color:'#64748b',textDecoration:'none',fontSize:10}}>
                          <span>🌐</span>{lead.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>

                    {/* Tags */}
                    <div style={{display:'flex',gap:4,marginTop:8,flexWrap:'wrap'}}>
                      <span className="smc-lb" style={{background:'#f1f5f9',color:'#475569'}}>{lead.requested_seat_count} seats</span>
                      <span className="smc-lb" style={{background:'#f5f3ff',color:'#8b5cf6'}}>{lead.requested_plan}</span>
                      {lead.is_trial_request&&<span className="smc-lb" style={{background:'#fef3c7',color:'#d97706'}}>Trial</span>}
                      {lead.source&&<span className="smc-lb" style={{background:'#ecfdf5',color:'#10b981'}}>{lead.source}</span>}
                    </div>
                    <div className="pf">
                      <span style={{fontSize:10,color:'#94a3b8',fontFamily:"'DM Mono',monospace"}}>{new Date(lead.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                      <span className="sc" style={{color:(lead.lead_score??0)>=80?'#10b981':(lead.lead_score??0)>=50?'#279491':'#94a3b8'}}>{lead.lead_score??0}</span>
                    </div>
                  </div>
                ))}
                {stageLeads.length===0&&<div style={{textAlign:'center',padding:20,color:'#cbd5e1',fontSize:12}}>Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
