export default function SmcIncidentsPage() {
  return (<>
    <div className="smc-ph"><div><div className="bc">Operations</div><h1>Incidents</h1></div>
      <div className="ha"><button className="smc-btn smc-btn-p is-disabled" disabled title="Coming soon — incident reporting will use the governed incident modal">+ Report Incident</button></div>
    </div>
    <div className="smc-kr">
      <div className="smc-kp green"><div className="v">0</div><div className="l">Active</div></div>
      <div className="smc-kp"><div className="v">3</div><div className="l">Total</div></div>
      <div className="smc-kp"><div className="v">12h</div><div className="l">Avg MTTR</div></div>
      <div className="smc-kp green"><div className="v">99.8%</div><div className="l">Uptime</div></div>
    </div>
    <div className="smc-content-page">
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'20px 0'}}><span className="smc-st resolved">All Clear</span><span style={{fontSize:13,color:'#10b981',fontWeight:500}}>No active incidents</span></div>
      <h2>Past Incidents</h2>
      <div className="smc-content-grid">
        {[
          {title:'Service worker CSS cache issue',severity:'P1',resolved:'May 28',mttr:'4h',desc:'Service worker cached stale CSS causing investor pages to render with wrong styles'},
          {title:'Supabase RLS policy gap on sprint_issues',severity:'P2',resolved:'May 15',mttr:'2h',desc:'Anon role could read sprint data via direct API calls'},
          {title:'Onboarding wizard 500 error',severity:'P2',resolved:'Apr 20',mttr:'30h',desc:'Missing nullable check on workspace_domain caused crash for new signups'},
        ].map((inc,i)=>(
          <div key={i} className="smc-content-card">
            <div style={{display:'flex',justifyContent:'space-between'}}><h4>{inc.title}</h4><span className="smc-lb bug">{inc.severity}</span></div>
            <p>{inc.desc}</p>
            <div style={{display:'flex',gap:12,marginTop:8,fontSize:11,color:'#64748b'}}><span>Resolved {inc.resolved}</span><span>MTTR: {inc.mttr}</span></div>
          </div>
        ))}
      </div>
    </div>
  </>);
}
