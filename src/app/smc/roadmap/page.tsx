export default function SmcRoadmapPage() {
  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Product</div><h1>Roadmap</h1></div>
        <div className="ha">
          <a href="/internal/setuflow-roadmap.html" target="_blank" rel="noopener" className="smc-btn">Open in new tab ↗</a>
        </div>
      </div>
      <div style={{flex:1,overflow:'hidden'}}>
        <iframe src="/internal/setuflow-roadmap.html" style={{width:'100%',height:'100%',border:'none'}} title="Roadmap" />
      </div>
    </>
  );
}
