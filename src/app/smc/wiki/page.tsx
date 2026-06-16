export default function SmcWikiPage() {
  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Knowledge</div><h1>Documentation Hub</h1></div>
        <div className="ha">
          <a href="/internal/setuflow-docs.html" target="_blank" rel="noopener" className="smc-btn">Open in new tab ↗</a>
        </div>
      </div>
      <div style={{flex:1,overflow:'hidden'}}>
        <iframe src="/internal/setuflow-docs.html" style={{width:'100%',height:'100%',border:'none'}} title="Documentation Hub" />
      </div>
    </>
  );
}
