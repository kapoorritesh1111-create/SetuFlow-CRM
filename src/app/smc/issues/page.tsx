'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';

type Issue = {
  id: string; issue_ref: string; title: string; status: string; priority: string | null;
  severity: string | null; issue_type: string | null; issue_category: string | null;
  sprint_number: number; story_points: number | null; assigned_to: string | null;
  reporter_name: string | null; area: string | null; workflow_area: string | null;
  description: string | null; fix_applied: string | null; created_at: string;
  resolved_at: string | null; target_date: string | null; customer_impact: string | null;
  labels: string[] | null; sprint_label: string | null; root_cause: string | null;
  regression_test: string | null; files_changed: string[] | null; git_branch: string | null;
  acceptance_criteria: string | null; steps_to_reproduce: string | null;
  expected_behavior: string | null; actual_behavior: string | null;
  environment: string | null; affected_module: string | null;
};
type SortKey = keyof Pick<Issue,'issue_ref'|'title'|'status'|'severity'|'area'|'sprint_number'|'story_points'|'assigned_to'|'reporter_name'|'created_at'|'issue_type'>;
type SortDir = 'asc'|'desc';
const COLS = [
  {key:'issue_ref',label:'Ref',on:true},{key:'title',label:'Title',on:true},
  {key:'severity',label:'Severity',on:true},{key:'area',label:'Area',on:true},
  {key:'status',label:'Status',on:true},{key:'issue_type',label:'Type',on:true},
  {key:'story_points',label:'Pts',on:true},{key:'assigned_to',label:'Assignee',on:true},
  {key:'reporter_name',label:'Reporter',on:false},{key:'sprint_number',label:'Sprint',on:true},
  {key:'created_at',label:'Added',on:false},{key:'customer_impact',label:'Impact',on:false},
] as const;
const sevCls = (s:string|null)=>{if(!s)return'low';const l=s.toLowerCase();return l.includes('critical')?'critical':l.includes('high')?'high':l.includes('medium')?'medium':'low'};
const stCls = (s:string)=>{const l=s.toLowerCase();return l==='resolved'?'resolved':l.includes('progress')?'in-progress':l==='blocked'?'blocked':l==='deferred'?'deferred':'open'};
const typCls = (t:string|null)=>{if(!t)return'feat';const l=t.toLowerCase();return l.includes('bug')?'bug':l.includes('doc')?'doc':l.includes('ux')?'ux':l.includes('enh')?'enhancement':l.includes('test')?'test':'feat'};
const ini = (n:string|null)=>n?n.split(' ').map(w=>w[0]??'').join('').slice(0,2).toUpperCase():'';
const ago = (d:string)=>{const days=Math.floor((Date.now()-new Date(d).getTime())/864e5);return days===0?'today':days<30?`${days}d ago`:new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})};

export default function SmcIssuesPage(){
  const [issues,setIssues]=useState<Issue[]>([]);
  const [loading,setLoading]=useState(true);
  const [sortKey,setSortKey]=useState<SortKey>('sprint_number');
  const [sortDir,setSortDir]=useState<SortDir>('desc');
  const [hideRes,setHideRes]=useState(true);
  const [hideDef,setHideDef]=useState(true);
  const [search,setSearch]=useState('');
  const [kpiF,setKpiF]=useState<string|null>(null);
  const [sel,setSel]=useState<Set<string>>(new Set());
  const [showCols,setShowCols]=useState(false);
  const [visCols,setVisCols]=useState<Set<string>>(new Set(COLS.filter(c=>c.on).map(c=>c.key)));
  const [drawerIssue,setDrawerIssue]=useState<Issue|null>(null);
  const [showModal,setShowModal]=useState(false);
  const [editIssue,setEditIssue]=useState<Partial<Issue>>({});

  useEffect(()=>{fetch('/api/smc/issues?limit=1000').then(r=>r.json()).then(d=>{setIssues(d.issues??[]);setLoading(false)}).catch(()=>setLoading(false))},[]);

  const counts=useMemo(()=>{const a=issues;return{total:a.length,open:a.filter(i=>i.status==='Open'||i.status==='open').length,critical:a.filter(i=>i.severity?.toLowerCase().includes('critical')).length,high:a.filter(i=>i.severity?.toLowerCase().includes('high')).length,inProgress:a.filter(i=>i.status.toLowerCase().includes('progress')).length,resolved:a.filter(i=>i.status==='Resolved').length,deferred:a.filter(i=>i.status==='Deferred').length,blocked:a.filter(i=>i.status.toLowerCase()==='blocked').length}},[issues]);

  const filtered=useMemo(()=>{
    let list=[...issues];
    if(hideRes&&kpiF!=='resolved')list=list.filter(i=>i.status!=='Resolved');
    if(hideDef&&kpiF!=='deferred')list=list.filter(i=>i.status!=='Deferred');
    if(kpiF==='open')list=list.filter(i=>i.status==='Open'||i.status==='open');
    if(kpiF==='critical')list=list.filter(i=>i.severity?.toLowerCase().includes('critical'));
    if(kpiF==='high')list=list.filter(i=>i.severity?.toLowerCase().includes('high'));
    if(kpiF==='progress')list=list.filter(i=>i.status.toLowerCase().includes('progress'));
    if(kpiF==='resolved')list=issues.filter(i=>i.status==='Resolved');
    if(kpiF==='deferred')list=issues.filter(i=>i.status==='Deferred');
    if(kpiF==='blocked')list=list.filter(i=>i.status.toLowerCase()==='blocked');
    if(search){const q=search.toLowerCase();list=list.filter(i=>i.title.toLowerCase().includes(q)||i.issue_ref.toLowerCase().includes(q)||(i.area??'').toLowerCase().includes(q)||(i.assigned_to??'').toLowerCase().includes(q))}
    list.sort((a,b)=>{const av=a[sortKey]??'';const bv=b[sortKey]??'';if(typeof av==='number'&&typeof bv==='number')return sortDir==='asc'?av-bv:bv-av;return sortDir==='asc'?String(av).localeCompare(String(bv)):-String(av).localeCompare(String(bv))});
    return list;
  },[issues,hideRes,hideDef,kpiF,search,sortKey,sortDir]);

  const handleSort=(k:SortKey)=>{if(sortKey===k)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortKey(k);setSortDir('desc')}};
  const toggleKpi=(k:string)=>setKpiF(v=>v===k?null:k);
  const toggleCol=(k:string)=>setVisCols(p=>{const s=new Set(p);s.has(k)?s.delete(k):s.add(k);return s});
  const SA=({k}:{k:string})=><span className="sort-arrow">{sortKey===k?(sortDir==='asc'?'▲':'▼'):'⇅'}</span>;

  if(loading)return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#94a3b8'}}>Loading issues…</div>;

  return(
    <>
      <div className="smc-ph"><div><div className="bc">Engineering</div><h1>Issues</h1></div>
        <div className="ha">
          {sel.size>0&&<span style={{fontSize:11,color:'#279491',fontWeight:600,padding:'6px 0'}}>{sel.size} selected</span>}
          <div className="smc-col-picker"><button className="smc-btn" onClick={()=>setShowCols(!showCols)}>Columns</button>
            {showCols&&<div className="smc-col-menu">{COLS.map(c=><label key={c.key} className="smc-col-item"><input type="checkbox" checked={visCols.has(c.key)} onChange={()=>toggleCol(c.key)}/>{c.label}</label>)}</div>}
          </div>
          <button className="smc-btn smc-btn-p" onClick={()=>{setEditIssue({});setShowModal(true)}}>+ New Issue</button>
        </div>
      </div>

      <div className="smc-kr">
        {[{k:'',v:counts.total,l:'Total',c:''},{k:'open',v:counts.open,l:'Open',c:'amber'},{k:'critical',v:counts.critical,l:'Critical',c:'red'},{k:'high',v:counts.high,l:'High',c:'amber'},{k:'progress',v:counts.inProgress,l:'In Progress',c:'teal'},{k:'resolved',v:counts.resolved,l:'Done',c:'green'},{k:'deferred',v:counts.deferred,l:'Deferred',c:''}].map(kp=>(
          <div key={kp.l} className={`smc-kp ${kpiF===kp.k?'filter-active':kp.c}`} onClick={()=>kp.k&&toggleKpi(kp.k)}><div className="v">{kp.v}</div><div className="l">{kp.l}</div></div>
        ))}
      </div>

      <div className="smc-tl">
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search issues…" style={{border:'1px solid #e2e8f0',borderRadius:6,padding:'5px 12px',fontSize:12,width:260,outline:'none',fontFamily:'inherit'}}/>
        <div className="smc-sp"/>
        <button className={`smc-chip ${hideRes?'hide-active':''}`} onClick={()=>{setHideRes(!hideRes);setKpiF(null)}}>{hideRes?'Hiding resolved':'Show resolved'}</button>
        <button className={`smc-chip ${hideDef?'hide-active':''}`} onClick={()=>{setHideDef(!hideDef);setKpiF(null)}}>{hideDef?'Hiding deferred':'Show deferred'}</button>
        <span style={{fontSize:11,color:'#64748b',fontFamily:"'DM Mono',monospace"}}>{filtered.length} issues</span>
      </div>

      <div className="smc-cs"><table className="smc-it"><thead><tr>
        <th style={{width:36}}><input type="checkbox" checked={sel.size===filtered.length&&filtered.length>0} onChange={()=>setSel(p=>p.size===filtered.length?new Set():new Set(filtered.map(i=>i.id)))}/></th>
        {visCols.has('issue_ref')&&<th className={sortKey==='issue_ref'?'sorted':''} onClick={()=>handleSort('issue_ref')}>Ref <SA k="issue_ref"/></th>}
        {visCols.has('title')&&<th className={sortKey==='title'?'sorted':''} onClick={()=>handleSort('title')}>Title <SA k="title"/></th>}
        {visCols.has('severity')&&<th className={sortKey==='severity'?'sorted':''} onClick={()=>handleSort('severity')} style={{width:80}}>Severity <SA k="severity"/></th>}
        {visCols.has('area')&&<th className={sortKey==='area'?'sorted':''} onClick={()=>handleSort('area')} style={{width:100}}>Area <SA k="area"/></th>}
        {visCols.has('status')&&<th className={sortKey==='status'?'sorted':''} onClick={()=>handleSort('status')} style={{width:90}}>Status <SA k="status"/></th>}
        {visCols.has('issue_type')&&<th className={sortKey==='issue_type'?'sorted':''} onClick={()=>handleSort('issue_type')} style={{width:90}}>Type <SA k="issue_type"/></th>}
        {visCols.has('story_points')&&<th className={sortKey==='story_points'?'sorted':''} onClick={()=>handleSort('story_points')} style={{width:50}}>Pts <SA k="story_points"/></th>}
        {visCols.has('assigned_to')&&<th className={sortKey==='assigned_to'?'sorted':''} onClick={()=>handleSort('assigned_to')} style={{width:90}}>Assignee <SA k="assigned_to"/></th>}
        {visCols.has('reporter_name')&&<th style={{width:80}}>Reporter</th>}
        {visCols.has('sprint_number')&&<th className={sortKey==='sprint_number'?'sorted':''} onClick={()=>handleSort('sprint_number')} style={{width:60}}>Sprint <SA k="sprint_number"/></th>}
        {visCols.has('created_at')&&<th className={sortKey==='created_at'?'sorted':''} onClick={()=>handleSort('created_at')} style={{width:80}}>Added <SA k="created_at"/></th>}
      </tr></thead><tbody>
        {filtered.map(issue=>(
          <tr key={issue.id} className={sel.has(issue.id)?'selected':''} onClick={()=>setDrawerIssue(issue)}>
            <td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sel.has(issue.id)} onChange={()=>setSel(p=>{const s=new Set(p);s.has(issue.id)?s.delete(issue.id):s.add(issue.id);return s})}/></td>
            {visCols.has('issue_ref')&&<td className="smc-iref">{issue.issue_ref}</td>}
            {visCols.has('title')&&<td><div className="smc-itc"><div className={`smc-pd ${sevCls(issue.severity)}`}/><span className="smc-itn">{issue.title}</span></div></td>}
            {visCols.has('severity')&&<td><span className={`smc-lb ${sevCls(issue.severity)}`} style={sevCls(issue.severity)==='critical'?{background:'#fef2f2',color:'#ef4444'}:sevCls(issue.severity)==='high'?{background:'#fef3c7',color:'#d97706'}:sevCls(issue.severity)==='medium'?{background:'rgba(6,182,212,.1)',color:'#06b6d4'}:{background:'#f1f5f9',color:'#94a3b8'}}>{issue.severity??'Low'}</span></td>}
            {visCols.has('area')&&<td style={{fontSize:11.5,color:'#475569'}}>{issue.area??'\u2014'}</td>}
            {visCols.has('status')&&<td><span className={`smc-st ${stCls(issue.status)}`}>{issue.status}</span></td>}
            {visCols.has('issue_type')&&<td><span className={`smc-lb ${typCls(issue.issue_type)}`}>{issue.issue_type??issue.issue_category??'Task'}</span></td>}
            {visCols.has('story_points')&&<td className="smc-pts">{issue.story_points??'\u2014'}</td>}
            {visCols.has('assigned_to')&&<td>{issue.assigned_to?<div style={{display:'flex',alignItems:'center',gap:5}}><div className="smc-aa" style={{background:'#279491'}}>{ini(issue.assigned_to)}</div><span style={{fontSize:11,color:'#475569'}}>{issue.assigned_to.split(' ')[0]}</span></div>:null}</td>}
            {visCols.has('reporter_name')&&<td style={{fontSize:11,color:'#64748b'}}>{issue.reporter_name??'\u2014'}</td>}
            {visCols.has('sprint_number')&&<td className="smc-pts">{issue.sprint_number}</td>}
            {visCols.has('created_at')&&<td style={{fontSize:10.5,color:'#94a3b8',fontFamily:"'DM Mono',monospace"}}>{ago(issue.created_at)}</td>}
          </tr>
        ))}
      </tbody></table></div>

      {/* ═══ DETAIL DRAWER ═══ */}
      <div className={`smc-drawer-bg ${drawerIssue?'open':''}`} onClick={()=>setDrawerIssue(null)}/>
      <div className={`smc-drawer ${drawerIssue?'open':''}`}>
        {drawerIssue&&<>
          <div className="smc-drawer-head">
            <button className="xbtn" onClick={()=>setDrawerIssue(null)}>✕</button>
            <span className="smc-iref" style={{fontSize:12}}>{drawerIssue.issue_ref}</span>
            <span className={`smc-lb ${typCls(drawerIssue.issue_type)}`}>{drawerIssue.issue_type??'Task'}</span>
            <span className={`smc-st ${stCls(drawerIssue.status)}`}>{drawerIssue.status}</span>
            <div style={{marginLeft:'auto',display:'flex',gap:4}}>
              <button className="smc-btn" style={{fontSize:10,padding:'3px 8px'}} onClick={()=>{setEditIssue(drawerIssue);setShowModal(true);setDrawerIssue(null)}}>Edit</button>
            </div>
          </div>
          <div className="smc-drawer-body">
            <h2>{drawerIssue.title}</h2>
            <p style={{fontSize:11,color:'#94a3b8',marginTop:4}}>Created by {drawerIssue.reporter_name??'Unknown'} · Sprint {drawerIssue.sprint_number}{drawerIssue.story_points?` · ${drawerIssue.story_points} pts`:''}</p>
            <div className="smc-detail-meta">
              <span className="ml">Status</span><span className="mv"><span className={`smc-st ${stCls(drawerIssue.status)}`}>{drawerIssue.status}</span></span>
              <span className="ml">Severity</span><span className="mv">{drawerIssue.severity??'—'}</span>
              <span className="ml">Priority</span><span className="mv">{drawerIssue.priority??'—'}</span>
              <span className="ml">Assignee</span><span className="mv">{drawerIssue.assigned_to??'Unassigned'}</span>
              <span className="ml">Area</span><span className="mv">{drawerIssue.area??'—'}</span>
              <span className="ml">Environment</span><span className="mv">{drawerIssue.environment??'Production'}</span>
              <span className="ml">Impact</span><span className="mv">{drawerIssue.customer_impact??'—'}</span>
              {drawerIssue.target_date&&<><span className="ml">Target</span><span className="mv">{drawerIssue.target_date}</span></>}
              {drawerIssue.git_branch&&<><span className="ml">Branch</span><span className="mv" style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#279491'}}>{drawerIssue.git_branch}</span></>}
            </div>
            {drawerIssue.description&&<div className="smc-detail-desc">{drawerIssue.description}</div>}
            {drawerIssue.steps_to_reproduce&&<><div className="smc-detail-section"><h3>Steps to Reproduce</h3></div><div className="smc-detail-desc">{drawerIssue.steps_to_reproduce}</div></>}
            {drawerIssue.fix_applied&&<><div className="smc-detail-section"><h3>Fix Applied</h3></div><div className="smc-detail-desc">{drawerIssue.fix_applied}</div></>}
            {drawerIssue.regression_test&&<><div className="smc-detail-section"><h3>Regression Test</h3></div><div className="smc-detail-desc">{drawerIssue.regression_test}</div></>}
            {drawerIssue.files_changed&&drawerIssue.files_changed.length>0&&<div className="smc-detail-section"><h3>Files Changed</h3>{drawerIssue.files_changed.map((f,i)=><span key={i} style={{display:'inline-block',padding:'3px 8px',background:'#f1f5f9',borderRadius:4,fontSize:11,fontFamily:"'DM Mono',monospace",margin:'2px 4px 2px 0',color:'#475569'}}>{f}</span>)}</div>}
            <div className="smc-detail-section"><h3>Activity</h3>
              <div className="smc-comment"><div className="smc-comment-av" style={{background:'#279491'}}>RK</div><div className="smc-comment-body"><div className="smc-comment-head"><span className="nm">Ritesh Kapoor</span><span className="tm">{ago(drawerIssue.created_at)}</span></div><div className="smc-comment-text">Created this issue{drawerIssue.assigned_to?` and assigned to ${drawerIssue.assigned_to}`:''}</div></div></div>
              {drawerIssue.resolved_at&&<div className="smc-comment"><div className="smc-comment-av" style={{background:'#10b981'}}>✓</div><div className="smc-comment-body"><div className="smc-comment-head"><span className="nm">System</span><span className="tm">{ago(drawerIssue.resolved_at)}</span></div><div className="smc-comment-text">Issue resolved{drawerIssue.fix_applied?`: ${drawerIssue.fix_applied.slice(0,120)}…`:''}</div></div></div>}
            </div>
          </div>
          <div className="smc-composer"><textarea placeholder="Add a comment… @ to mention teammates"/><div className="smc-composer-bar"><button className="smc-btn smc-btn-p" style={{fontSize:11,padding:'5px 14px'}}>Send</button></div></div>
        </>}
      </div>

      {/* ═══ CREATE/EDIT MODAL ═══ */}
      <div className={`smc-modal-bg ${showModal?'open':''}`} onClick={()=>setShowModal(false)}>
        <div className="smc-modal" onClick={e=>e.stopPropagation()}>
          <div className="smc-modal-head"><h2>{editIssue.id?'Edit Issue':'New Issue'}</h2><button className="xbtn" onClick={()=>setShowModal(false)} style={{width:28,height:28,borderRadius:6,border:'none',background:'none',cursor:'pointer',color:'#64748b',fontSize:18}}>✕</button></div>
          <div className="smc-modal-body">
            <div>
              <div className="smc-fg"><label>Title</label><input type="text" defaultValue={editIssue.title??''} placeholder="Issue title…" style={{fontSize:16,fontWeight:500}}/></div>
              <div className="smc-fg"><label>Description</label><textarea defaultValue={editIssue.description??''} placeholder="Describe the issue in detail. Supports markdown."/></div>
              <div className="smc-sec-div">Acceptance & Testing</div>
              <div className="smc-fg"><label>Acceptance Criteria</label><textarea style={{minHeight:60}} defaultValue={editIssue.acceptance_criteria??''} placeholder="What must be true for this to be done?"/></div>
              <div className="smc-fg"><label>Regression Test</label><textarea style={{minHeight:50}} defaultValue={editIssue.regression_test??''} placeholder="How to verify this doesn't break existing behavior"/></div>
              <div className="smc-sec-div">Details</div>
              <div className="smc-fg"><label>Steps to Reproduce</label><textarea style={{minHeight:60}} defaultValue={editIssue.steps_to_reproduce??''} placeholder="1. Go to…"/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div className="smc-fg"><label>Expected Behavior</label><textarea style={{minHeight:50}} defaultValue={editIssue.expected_behavior??''}/></div>
                <div className="smc-fg"><label>Actual Behavior</label><textarea style={{minHeight:50}} defaultValue={editIssue.actual_behavior??''}/></div>
              </div>
              <div className="smc-fg"><label>Git Branch</label><input type="text" defaultValue={editIssue.git_branch??''} placeholder="fix/branch-name"/></div>
              <div className="smc-fg"><label>Fix Applied</label><textarea style={{minHeight:50}} defaultValue={editIssue.fix_applied??''} placeholder="Description of the fix once resolved"/></div>
            </div>
            <div className="smc-meta-panel">
              <div className="smc-fg"><label>Status</label><select defaultValue={editIssue.status??'Open'}><option>Open</option><option>In Progress</option><option>In Review</option><option>Blocked</option><option>Resolved</option><option>Deferred</option><option>{"Won't Fix"}</option></select></div>
              <div className="smc-fg"><label>Type</label><select defaultValue={editIssue.issue_type??'Bug'}><option>Bug</option><option>Feature</option><option>Enhancement</option><option>Docs</option><option>DevOps</option><option>UX</option><option>Task</option><option>Test</option></select></div>
              <div className="smc-fg"><label>Severity</label><select defaultValue={editIssue.severity??'Medium'}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div>
              <div className="smc-fg"><label>Priority</label><select defaultValue={editIssue.priority??'P2'}><option>P0 — Urgent</option><option>P1 — High</option><option>P2 — Medium</option><option>P3 — Low</option></select></div>
              <div className="smc-fg"><label>Assignee</label><select defaultValue={editIssue.assigned_to??''}><option value="">Unassigned</option><option>Ritesh Kapoor</option><option>Kumar Mayank</option><option>Ankush Arya</option></select></div>
              <div className="smc-fg"><label>Reporter</label><select defaultValue={editIssue.reporter_name??'Ritesh Kapoor'}><option>Ritesh Kapoor</option><option>Kumar Mayank</option><option>Ankush Arya</option></select></div>
              <div className="smc-fg"><label>Sprint</label><select defaultValue={String(editIssue.sprint_number??26)}><option>26</option><option>25</option><option>24</option><option>23</option></select></div>
              <div className="smc-fg"><label>Story Points</label><select defaultValue={String(editIssue.story_points??'')}><option value="">—</option><option>1</option><option>2</option><option>3</option><option>5</option><option>8</option><option>13</option><option>21</option></select></div>
              <div className="smc-fg"><label>Area / Module</label><select defaultValue={editIssue.area??''}><option value="">None</option><option>Admin</option><option>Quotes</option><option>Orders</option><option>Leads</option><option>Setu Guru</option><option>Pipeline</option><option>Mobile</option><option>API</option><option>Workspace</option><option>Marketing</option><option>Pricing</option><option>Documents</option><option>Auth</option></select></div>
              <div className="smc-fg"><label>Environment</label><select defaultValue={editIssue.environment??'Production'}><option>Production</option><option>Staging</option><option>Development</option><option>All</option></select></div>
              <div className="smc-fg"><label>Customer Impact</label><select defaultValue={editIssue.customer_impact??'none'}><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
              <div className="smc-fg"><label>Target Date</label><input type="date" defaultValue={editIssue.target_date??''}/></div>
            </div>
          </div>
          <div className="smc-modal-foot">
            <button className="smc-btn" onClick={()=>setShowModal(false)}>Cancel</button>
            <button className="smc-btn">Save Draft</button>
            <button className="smc-btn smc-btn-p" onClick={()=>setShowModal(false)}>{editIssue.id?'Update Issue':'Create Issue'}</button>
          </div>
        </div>
      </div>
    </>
  );
}
