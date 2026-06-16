import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Lead = { id:string; company_name:string; primary_admin_name:string|null; primary_admin_email:string; headquarters_country:string|null; status:string; requested_seat_count:number; requested_plan:string; pipeline_stage:string|null; lead_score:number|null; is_trial_request:boolean; created_at:string; website:string|null; industry:string|null };

async function getLeads() {
  const supabase = await createClient();
  const { data } = await supabase.from('client_onboarding_requests').select('*').order('created_at', { ascending: false });
  return (data as Lead[]) ?? [];
}

const STAGES = [
  { key:'inquiry', label:'Inquiry', color:'#8b5cf6' },
  { key:'qualified', label:'Qualified', color:'#279491' },
  { key:'trial', label:'Trial', color:'#d97706' },
  { key:'negotiating', label:'Negotiating', color:'#10b981' },
  { key:'converted', label:'Converted', color:'#1F487C' },
];

export default async function SmcLeadsPage() {
  const leads = await getLeads();

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Growth</div><h1>Internal Leads</h1></div>
        <div className="ha">
          <button className="smc-btn is-disabled" disabled title="Coming soon — CSV export will be wired after lead filters are finalized">Export CSV</button>
          <button className="smc-btn smc-btn-p is-disabled" disabled title="Coming soon — New Lead creation will use the governed onboarding request modal">+ New Lead</button>
        </div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{leads.length}</div><div className="l">Pipeline</div></div>
        {STAGES.map(st=>{const c=leads.filter(l=>l.pipeline_stage===st.key).length;return <div key={st.key} className="smc-kp"><div className="v" style={{color:st.color}}>{c}</div><div className="l">{st.label}</div></div>})}
      </div>
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
                    <div className="pm">{lead.headquarters_country??'—'} · {lead.primary_admin_name??lead.primary_admin_email}</div>
                    <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>
                      <span className="smc-lb" style={{background:'#f1f5f9',color:'#475569'}}>{lead.requested_seat_count} seats</span>
                      <span className="smc-lb" style={{background:'#f5f3ff',color:'#8b5cf6'}}>{lead.requested_plan}</span>
                      {lead.is_trial_request&&<span className="smc-lb" style={{background:'#fef3c7',color:'#d97706'}}>Trial</span>}
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
