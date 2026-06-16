export default function SmcLoading() {
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'14px 24px',display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:120,height:14,background:'#f1f5f9',borderRadius:4,animation:'pulse 1.5s infinite'}}/>
      </div>
      <div style={{display:'flex',borderBottom:'1px solid #e2e8f0',background:'#fff'}}>
        {[1,2,3,4,5,6].map(i=>(
          <div key={i} style={{flex:1,padding:'12px 16px',textAlign:'center',borderRight:'1px solid #f1f5f9'}}>
            <div style={{width:40,height:20,background:'#f1f5f9',borderRadius:4,margin:'0 auto',animation:'pulse 1.5s infinite'}}/>
            <div style={{width:50,height:8,background:'#f8fafc',borderRadius:3,margin:'6px auto 0',animation:'pulse 1.5s infinite'}}/>
          </div>
        ))}
      </div>
      <div style={{padding:24}}>
        {[1,2,3,4].map(i=>(
          <div key={i} style={{height:48,background:'#f8fafc',borderRadius:8,marginBottom:8,animation:'pulse 1.5s infinite'}}/>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
