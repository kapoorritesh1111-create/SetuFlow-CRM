import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
async function getFlags() {
  const supabase = await createClient();
  const { data } = await (supabase as any).from('smc_feature_flags').select('*').order('created_at', { ascending: false });
  return (data ?? []) as {id:string;flag_key:string;name:string;description:string|null;enabled:boolean;rollout_percentage:number}[];
}
export default async function SmcFlagsPage() {
  const flags = await getFlags();
  return (<>
    <div className="smc-ph"><div><div className="bc">Config</div><h1>Feature Flags</h1></div>
      <div className="ha"><button className="smc-btn smc-btn-p">+ New Flag</button></div>
    </div>
    <div className="smc-kr">
      <div className="smc-kp"><div className="v">{flags.length}</div><div className="l">Total Flags</div></div>
      <div className="smc-kp green"><div className="v">{flags.filter(f=>f.enabled).length}</div><div className="l">Enabled</div></div>
      <div className="smc-kp"><div className="v">{flags.filter(f=>!f.enabled).length}</div><div className="l">Disabled</div></div>
    </div>
    <div className="smc-content-page">
      {flags.length===0?<div style={{textAlign:'center',padding:40,color:'#94a3b8'}}><p>No feature flags yet. Create one to start controlling feature rollouts per client org.</p></div>
      :<div className="smc-content-grid">{flags.map(f=>(
        <div key={f.id} className="smc-content-card">
          <div style={{display:'flex',justifyContent:'space-between'}}><h4>{f.name}</h4><span className={`smc-st ${f.enabled?'resolved':'deferred'}`}>{f.enabled?'ON':'OFF'}</span></div>
          <p style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#64748b'}}>{f.flag_key}</p>
          {f.description&&<p>{f.description}</p>}
          <p style={{marginTop:6,fontSize:11}}>Rollout: {f.rollout_percentage}%</p>
        </div>
      ))}</div>}
    </div>
  </>);
}
