export default function SmcHealthPage() {
  return (<>
    <div className="smc-ph"><div><div className="bc">Operations</div><h1>API Health</h1></div></div>
    <div className="smc-kr">
      <div className="smc-kp green"><div className="v">99.8%</div><div className="l">Uptime</div></div>
      <div className="smc-kp"><div className="v">42ms</div><div className="l">Avg Latency</div></div>
      <div className="smc-kp"><div className="v">10</div><div className="l">Rate Hits</div></div>
      <div className="smc-kp green"><div className="v">✓</div><div className="l">Supabase</div></div>
    </div>
    <div className="smc-content-page">
      <h2>Service Status</h2>
      <div className="smc-content-grid">
        {[{name:'Next.js App',status:'Healthy',latency:'42ms'},{name:'Supabase Database',status:'Healthy',latency:'18ms'},{name:'Supabase Auth',status:'Healthy',latency:'35ms'},{name:'Vercel Edge',status:'Healthy',latency:'8ms'},{name:'Setu Guru AI',status:'Healthy',latency:'1.2s'},{name:'Email (Resend)',status:'Healthy',latency:'450ms'}].map((s,i)=>(
          <div key={i} className="smc-content-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h4>{s.name}</h4><span className="smc-st resolved">{s.status}</span></div>
            <p>Avg response: {s.latency}</p>
          </div>
        ))}
      </div>
      <h2 style={{marginTop:24}}>Endpoints</h2>
      <div className="smc-content-grid">
        {['/api/setu-guru/org-search','/api/quotes','/api/orders','/api/leads','/api/products/catalog','/api/auth'].map((ep,i)=>(
          <div key={i} className="smc-content-card"><h4 style={{fontFamily:"'DM Mono',monospace",fontSize:12}}>{ep}</h4><p>200 OK · Last checked: now</p></div>
        ))}
      </div>
    </div>
  </>);
}
