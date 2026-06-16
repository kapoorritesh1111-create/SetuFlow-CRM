export default function SmcRevenuePage() {
  return (<>
    <div className="smc-ph"><div><div className="bc">Business</div><h1>Revenue & Billing</h1></div></div>
    <div className="smc-kr">
      <div className="smc-kp"><div className="v">$0</div><div className="l">MRR</div></div>
      <div className="smc-kp"><div className="v">4</div><div className="l">Orgs</div></div>
      <div className="smc-kp green"><div className="v">0%</div><div className="l">Churn</div></div>
      <div className="smc-kp"><div className="v">Pre-revenue</div><div className="l">Stage</div></div>
    </div>
    <div className="smc-content-page">
      <h2>Plan Distribution</h2>
      <div className="smc-content-grid">
        {[{plan:'Trial',count:2,desc:'Free 30-day trial workspaces'},{plan:'Starter',count:0,desc:'$49/mo — up to 5 users'},{plan:'Growth',count:0,desc:'$149/mo — up to 20 users'},{plan:'Enterprise',count:0,desc:'Custom pricing — unlimited'}].map((p,i)=>(
          <div key={i} className="smc-content-card"><h4>{p.plan}</h4><p>{p.desc}</p><div className="cc-stat">{p.count}</div></div>
        ))}
      </div>
    </div>
  </>);
}
