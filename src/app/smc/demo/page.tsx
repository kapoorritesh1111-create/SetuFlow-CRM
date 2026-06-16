export default function SmcDemoPage() {
  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Quality</div><h1>Pre-Demo Checklist</h1></div>
        <div className="ha">
          <a href="/internal/setuflow-demo-checklist.html" target="_blank" rel="noopener" className="smc-btn">Open in new tab ↗</a>
        </div>
      </div>
      <div style={{flex:1,overflow:'hidden'}}>
        <iframe src="/internal/setuflow-demo-checklist.html" style={{width:'100%',height:'100%',border:'none'}} title="Demo Checklist" />
      </div>
    </>
  );
}
