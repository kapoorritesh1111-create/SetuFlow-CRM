'use client';
import { useEffect, useState } from 'react';

type Issue = { id:string; issue_ref:string; title:string; status:string; severity:string|null; issue_type:string|null; story_points:number|null; assigned_to:string|null; sprint_number:number; area:string|null };
const ini=(n:string|null)=>n?n.split(' ').map(w=>w[0]??'').join('').slice(0,2).toUpperCase():'';
const typCls=(t:string|null)=>{if(!t)return'feat';const l=t.toLowerCase();return l.includes('bug')?'bug':l.includes('doc')?'doc':l.includes('ux')?'ux':l.includes('enh')?'enhancement':'feat'};

const COLUMNS = [
  { key: 'open', label: 'Open', color: '#94a3b8', match: (s:string)=>s==='Open'||s==='open' },
  { key: 'progress', label: 'In Progress', color: '#279491', match: (s:string)=>s.toLowerCase().includes('progress') },
  { key: 'review', label: 'In Review', color: '#8b5cf6', match: (s:string)=>s.toLowerCase().includes('review') },
  { key: 'blocked', label: 'Blocked', color: '#ef4444', match: (s:string)=>s.toLowerCase()==='blocked' },
  { key: 'done', label: 'Done', color: '#10b981', match: (s:string)=>s==='Resolved' },
];

export default function SmcBoardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [sprint, setSprint] = useState(26);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch('/api/smc/issues?limit=1000').then(r=>r.json()).then(d=>{setIssues(d.issues??[]);setLoading(false)}).catch(()=>setLoading(false));
  },[]);

  const sprintIssues = issues.filter(i=>i.sprint_number===sprint&&i.status!=='Deferred');

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#94a3b8'}}>Loading board…</div>;

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Engineering · Sprint {sprint}</div><h1>Sprint Board</h1></div>
        <div className="ha">
          <select className="smc-btn" value={sprint} onChange={e=>setSprint(Number(e.target.value))} style={{fontFamily:'inherit'}}>
            {Array.from(new Set(issues.map(i=>i.sprint_number))).sort((a,b)=>b-a).map(s=><option key={s} value={s}>Sprint {s}</option>)}
          </select>
        </div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{sprintIssues.length}</div><div className="l">Sprint Total</div></div>
        {COLUMNS.map(col=>{const c=sprintIssues.filter(i=>col.match(i.status)).length;return <div key={col.key} className="smc-kp"><div className="v" style={{color:col.color}}>{c}</div><div className="l">{col.label}</div></div>})}
      </div>
      <div className="smc-board">
        {COLUMNS.map(col=>{
          const colIssues=sprintIssues.filter(i=>col.match(i.status));
          return(
            <div key={col.key} className="smc-board-col">
              <div className="smc-board-col-head">
                <div className="cd" style={{background:col.color}}/>
                <h4>{col.label}</h4>
                <span className="cc">{colIssues.length}</span>
              </div>
              <div className="smc-board-col-body">
                {colIssues.map(issue=>(
                  <div key={issue.id} className="smc-board-card" style={col.key==='blocked'?{borderLeft:`3px solid ${col.color}`}:undefined}>
                    <div className="bc-ref">{issue.issue_ref}</div>
                    <div className="bc-title">{issue.title}</div>
                    <div className="bc-foot">
                      <div style={{display:'flex',gap:3}}>
                        <span className={`smc-lb ${typCls(issue.issue_type)}`}>{issue.issue_type??'Task'}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        {issue.story_points&&<span className="bc-pts">{issue.story_points}pts</span>}
                        {issue.assigned_to&&<div className="smc-aa" style={{background:'#279491',width:20,height:20,fontSize:8}}>{ini(issue.assigned_to)}</div>}
                      </div>
                    </div>
                  </div>
                ))}
                {colIssues.length===0&&<div style={{textAlign:'center',padding:20,color:'#cbd5e1',fontSize:12}}>No issues</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
