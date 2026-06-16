import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

export default async function SmcDeployPage() {
  return (<>
    <div className="smc-ph"><div><div className="bc">Operations</div><h1>Deployments</h1></div>
      <div className="ha"><a href="https://vercel.com/ritesh-kapoors-projects-96baac81/setu-flow-crm" target="_blank" rel="noopener" className="smc-btn">Open Vercel ↗</a></div>
    </div>
    <div className="smc-kr">
      <div className="smc-kp green"><div className="v">✓</div><div className="l">Last Build</div></div>
      <div className="smc-kp"><div className="v">142+</div><div className="l">Total Deploys</div></div>
      <div className="smc-kp"><div className="v">main</div><div className="l">Branch</div></div>
      <div className="smc-kp teal"><div className="v">Next.js 14</div><div className="l">Framework</div></div>
    </div>
    <div className="smc-content-page">
      <h2>Recent Deployments</h2>
      <div className="smc-content-grid">
        {[
          {title:'S25-TS-008 upgrade preview',status:'Ready',time:'2h ago',branch:'main',env:'Production'},
          {title:'Polish trade show trial copy',status:'Ready',time:'3h ago',branch:'main',env:'Production'},
          {title:'S25-TS-007 CSV export',status:'Ready',time:'8h ago',branch:'main',env:'Production'},
          {title:'Auth prefetch race fix',status:'Ready',time:'1d ago',branch:'hotfix/auth-prefetch-race',env:'Production'},
          {title:'S25-TS-006 vCard context',status:'Ready',time:'2d ago',branch:'main',env:'Production'},
          {title:'SMC workspace foundation',status:'Ready',time:'3h ago',branch:'main',env:'Production'},
        ].map((d,i)=>(
          <div key={i} className="smc-content-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h4>{d.title}</h4>
              <span className="smc-st resolved" style={{fontSize:10}}>{d.status}</span>
            </div>
            <p>{d.branch} → {d.env} · {d.time}</p>
          </div>
        ))}
      </div>
    </div>
  </>);
}
