import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
async function getEntries() {
  const supabase = await createClient();
  const { data } = await (supabase as any).from('smc_changelog').select('*').order('created_at', { ascending: false });
  return (data ?? []) as {id:string;sprint_number:number|null;version:string|null;title:string;content:string;category:string;is_client_facing:boolean;published_at:string|null;created_at:string}[];
}
export default async function SmcChangelogPage() {
  const entries = await getEntries();
  return (<>
    <div className="smc-ph"><div><div className="bc">Product</div><h1>Changelog</h1></div>
      <div className="ha"><button className="smc-btn smc-btn-p is-disabled" disabled title="Coming soon">+ New Entry</button></div>
    </div>
    <div className="smc-content-page">
      {entries.length>0?entries.map(e=>(
        <div key={e.id} className="smc-content-card" style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h4>{e.title}</h4><div style={{display:'flex',gap:4}}>{e.sprint_number&&<span className="smc-lb doc">S{e.sprint_number}</span>}{e.is_client_facing&&<span className="smc-lb" style={{background:'#ecfdf5',color:'#10b981'}}>Client-facing</span>}</div></div>
          <p style={{marginTop:4}}>{e.content}</p>
        </div>
      ))
      :<>
        <h2>Release Notes</h2>
        <p style={{color:'#64748b',marginBottom:20}}>Document what shipped per sprint. Toggle client-facing to generate public release notes.</p>
        <div className="smc-content-grid">
          {[{s:26,title:'S26 — Admin Workspace Rebuild + SMC',items:'Admin IA consolidation, SMC foundation, trade show upgrades'},{s:25,title:'S25 — Trade Show Features',items:'vCard context, CSV export, upgrade preview, trial capture'},{s:24,title:'S24 — Quote Command Center',items:'Quote lifecycle overhaul, five outcome actions, Guru coaching, trial system'}].map(r=>(
            <div key={r.s} className="smc-content-card"><h4>{r.title}</h4><p>{r.items}</p><p style={{marginTop:6}}><button className="smc-btn is-disabled" disabled title="Coming soon" style={{fontSize:10}}>Create Entry</button></p></div>
          ))}
        </div>
      </>}
    </div>
  </>);
}
