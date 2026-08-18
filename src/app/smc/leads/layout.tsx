import type { ReactNode } from 'react';

export default function SmcLeadsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div style={{display:'flex',gap:6,padding:'10px 16px 0',background:'#f8fafc'}}>
        <a href="/smc/leads" style={{textDecoration:'none',fontSize:11,fontWeight:800,color:'#1F487C',background:'#fff',border:'1px solid #dbe6ef',borderRadius:9,padding:'7px 11px'}}>Lead Manager</a>
        <a href="/smc/leads/outreach" style={{textDecoration:'none',fontSize:11,fontWeight:800,color:'#7c3aed',background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:9,padding:'7px 11px'}}>Mailtrap Outreach</a>
        <a href="/smc/leads/followups" style={{textDecoration:'none',fontSize:11,fontWeight:800,color:'#475569',background:'#fff',border:'1px solid #dbe6ef',borderRadius:9,padding:'7px 11px'}}>Follow-up Queue</a>
      </div>
      {children}
    </>
  );
}
