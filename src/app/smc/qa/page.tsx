export default function SmcQaPage() {
  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Quality</div><h1>QA & Testing</h1></div>
        <div className="ha">
          <a href="/internal/setuflow-e2e-testing.html" target="_blank" rel="noopener" className="smc-btn">Open in new tab ↗</a>
        </div>
      </div>
      <div style={{flex:1,overflow:'hidden'}}>
        <iframe src="/internal/setuflow-e2e-testing.html" style={{width:'100%',height:'100%',border:'none'}} title="QA Testing" />
      </div>
    </>
  );
}
