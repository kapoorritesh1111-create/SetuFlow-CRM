'use client';
import { useEffect, useState } from 'react';

type Issue = {
  id:string; issue_ref:string; title:string; status:string; severity:string|null;
  issue_type:string|null; issue_category:string|null; story_points:number|null;
  assigned_to:string|null; sprint_number:number; area:string|null;
  description:string|null; fix_applied:string|null; priority:string|null;
  reporter_name:string|null; environment:string|null; customer_impact:string|null;
  git_branch:string|null; target_date:string|null; created_at:string;
  resolved_at:string|null; regression_test:string|null; files_changed:string[]|null;
  steps_to_reproduce:string|null;
};
const ini=(n:string|null)=>n?n.split(' ').map(w=>w[0]??'').join('').slice(0,2).toUpperCase():'';
const typCls=(t:string|null)=>{if(!t)return'feat';const l=t.toLowerCase();return l.includes('bug')?'bug':l.includes('doc')?'doc':l.includes('ux')?'ux':l.includes('enh')?'enhancement':'feat'};
const stCls=(s:string)=>{const l=s.toLowerCase();return l==='resolved'?'resolved':l.includes('progress')?'in-progress':l==='blocked'?'blocked':l==='deferred'?'deferred':'open'};
const ago=(d:string)=>{const days=Math.floor((Date.now()-new Date(d).getTime())/864e5);return days===0?'today':days<30?`${days}d ago`:new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})};

const COLUMNS = [
  { key:'open', label:'Open', color:'#94a3b8', match:(s:string)=>s==='Open'||s==='open' },
  { key:'progress', label:'In Progress', color:'#279491', match:(s:string)=>s.toLowerCase().includes('progress') },
  { key:'review', label:'In Review', color:'#8b5cf6', match:(s:string)=>s.toLowerCase().includes('review') },
  { key:'blocked', label:'Blocked', color:'#ef4444', match:(s:string)=>s.toLowerCase()==='blocked' },
  { key:'done', label:'Done', color:'#10b981', match:(s:string)=>s==='Resolved' },
];

export default function SmcBoardPage() {
  const [issues,setIssues]=useState<Issue[]>([]);
  const [sprint,setSprint]=useState(27);
  const [loading,setLoading]=useState(true);
  const [drawer,setDrawer]=useState<Issue|null>(null);

  useEffect(()=>{
    fetch('/api/smc/issues?limit=1000').then(r=>r.json()).then(d=>{setIssues(d.issues??[]);setLoading(false)}).catch(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    const handleKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setDrawer(null)};
    document.addEventListener('keydown',handleKey);
    return()=>document.removeEventListener('keydown',handleKey);
  },[]);

  const sprintIssues=issues.filter(i=>i.sprint_number===sprint&&i.status!=='Deferred');
  const sprints=Array.from(new Set(issues.map(i=>i.sprint_number))).sort((a,b)=>b-a);

  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#94a3b8'}}>Loading board…</div>;

  return(
    <>
      <div className="smc-ph"><div><div className="bc">Engineering · Sprint {sprint}</div><h1>Sprint Board</h1></div>
        <div className="ha">
          <select className="smc-btn" value={sprint} onChange={e=>setSprint(Number(e.target.value))} style={{fontFamily:'inherit'}}>
            {sprints.map(s=><option key={s} value={s}>Sprint {s}</option>)}
          </select>
        </div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{sprintIssues.length}</div><div className="l">Sprint Total</div></div>
        {COLUMNS.map(col=>{const c=sprintIssues.filter(i=>col.match(i.status)).length;return<div key={col.key} className="smc-kp"><div className="v" style={{color:col.color}}>{c}</div><div className="l">{col.label}</div></div>})}
      </div>
      <div className="smc-board">
        {COLUMNS.map(col=>{
          const colIssues=sprintIssues.filter(i=>col.match(i.status));
          return(
            <div key={col.key} className="smc-board-col">
              <div className="smc-board-col-head"><div className="cd" style={{background:col.color}}/><h4>{col.label}</h4><span className="cc">{colIssues.length}</span></div>
              <div className="smc-board-col-body">
                {colIssues.map(issue=>(
                  <div key={issue.id} className="smc-board-card" onClick={()=>setDrawer(issue)} style={col.key==='blocked'?{borderLeft:`3px solid ${col.color}`}:undefined}>
                    <div className="bc-ref">{issue.issue_ref}</div>
                    <div className="bc-title">{issue.title}</div>
                    <div className="bc-foot">
                      <span className={`smc-lb ${typCls(issue.issue_type)}`}>{issue.issue_type??'Task'}</span>
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

      {/* Detail drawer */}
      <div className={`smc-drawer-bg ${drawer?'open':''}`} onClick={()=>setDrawer(null)}/>
      <div className={`smc-drawer ${drawer?'open':''}`}>
        {drawer&&<>
          <div className="smc-drawer-head">
            <button className="xbtn" onClick={()=>setDrawer(null)}>✕</button>
            <span className="smc-iref" style={{fontSize:12}}>{drawer.issue_ref}</span>
            <span className={`smc-lb ${typCls(drawer.issue_type)}`}>{drawer.issue_type??'Task'}</span>
            <span className={`smc-st ${stCls(drawer.status)}`}>{drawer.status}</span>
          </div>
          <div className="smc-drawer-body">
            <h2>{drawer.title}</h2>
            <p style={{fontSize:11,color:'#94a3b8',marginTop:4}}>By {drawer.reporter_name??'Unknown'} · Sprint {drawer.sprint_number}{drawer.story_points?` · ${drawer.story_points} pts`:''}</p>
            <div className="smc-detail-meta">
              <span className="ml">Status</span><span className="mv"><span className={`smc-st ${stCls(drawer.status)}`}>{drawer.status}</span></span>
              <span className="ml">Severity</span><span className="mv">{drawer.severity??'—'}</span>
              <span className="ml">Priority</span><span className="mv">{drawer.priority??'—'}</span>
              <span className="ml">Assignee</span><span className="mv">{drawer.assigned_to??'Unassigned'}</span>
              <span className="ml">Area</span><span className="mv">{drawer.area??'—'}</span>
              <span className="ml">Environment</span><span className="mv">{drawer.environment??'Production'}</span>
              {drawer.git_branch&&<><span className="ml">Branch</span><span className="mv" style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#279491'}}>{drawer.git_branch}</span></>}
            </div>
            {drawer.description&&<div className="smc-detail-desc">{drawer.description}</div>}
            {drawer.fix_applied&&<><div className="smc-detail-section"><h3>Fix Applied</h3></div><div className="smc-detail-desc">{drawer.fix_applied}</div></>}
            {drawer.regression_test&&<><div className="smc-detail-section"><h3>Regression Test</h3></div><div className="smc-detail-desc">{drawer.regression_test}</div></>}
            {drawer.files_changed&&drawer.files_changed.length>0&&<div className="smc-detail-section"><h3>Files Changed</h3>{drawer.files_changed.map((f,i)=><span key={i} style={{display:'inline-block',padding:'3px 8px',background:'#f1f5f9',borderRadius:4,fontSize:11,fontFamily:"'DM Mono',monospace",margin:'2px 4px 2px 0',color:'#475569'}}>{f}</span>)}</div>}
          </div>
        </>}
      </div>
    </>
  );
}
