export default function SmcSeoPage() {
  return (<>
    <div className="smc-ph"><div><div className="bc">Intelligence</div><h1>SEO Workspace</h1></div></div>
    <div className="smc-kr">
      <div className="smc-kp teal"><div className="v">72</div><div className="l">SEO Score</div></div>
      <div className="smc-kp"><div className="v">6</div><div className="l">Indexed Pages</div></div>
      <div className="smc-kp"><div className="v">14</div><div className="l">Target Keywords</div></div>
      <div className="smc-kp amber"><div className="v">0</div><div className="l">Backlinks</div></div>
    </div>
    <div className="smc-content-page">
      <h2>Page Health</h2>
      <div className="smc-content-grid">
        {[{page:'/platform',score:88},{page:'/solutions',score:82},{page:'/setu-guru-ai',score:75},{page:'/pricing',score:68},{page:'/compare',score:61},{page:'/field-mobile',score:55}].map((p,i)=>(
          <div key={i} className="smc-content-card">
            <div style={{display:'flex',justifyContent:'space-between'}}><h4>{p.page}</h4><span style={{fontWeight:700,fontFamily:"'DM Mono',monospace",color:p.score>=80?'#10b981':p.score>=65?'#d97706':'#ef4444'}}>{p.score}</span></div>
            <div style={{marginTop:8,height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}><div style={{width:`${p.score}%`,height:'100%',background:p.score>=80?'#10b981':p.score>=65?'#d97706':'#ef4444',borderRadius:3}}/></div>
          </div>
        ))}
      </div>
      <h2 style={{marginTop:24}}>Target Keywords</h2>
      <div className="smc-content-grid">
        {['export CRM software','import export management','trade CRM','B2B food distribution CRM','quote management SaaS','trade show lead capture'].map((kw,i)=>(
          <div key={i} className="smc-content-card"><h4>{kw}</h4><p>Position: — · Volume: est.</p></div>
        ))}
      </div>
    </div>
  </>);
}
