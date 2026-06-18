'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

type Issue = {
  id: string; issue_ref: string; title: string; status: string; severity: string | null;
  issue_type: string | null; issue_category: string | null; story_points: number | null;
  assigned_to: string | null; sprint_number: number; area: string | null; description: string | null;
  fix_applied: string | null; priority: string | null; reporter_name: string | null;
  environment: string | null; customer_impact: string | null; git_branch: string | null;
  target_date: string | null; created_at: string; resolved_at: string | null;
  regression_test: string | null; files_changed: string[] | null;
  attachments?: string[] | { url?: string; name?: string }[] | null;
  steps_to_reproduce: string | null;
};

type SprintMeta = { sprint_number: number; sprint_name: string };

const ini = (n: string | null) => n ? n.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() : '';
const typCls = (t: string | null) => { if (!t) return 'feat'; const l = t.toLowerCase(); return l.includes('bug') ? 'bug' : l.includes('doc') ? 'doc' : l.includes('ux') ? 'ux' : l.includes('enh') ? 'enhancement' : 'feat'; };
const stCls = (s: string) => { const l = s.toLowerCase(); return l === 'resolved' ? 'resolved' : l.includes('progress') ? 'in-progress' : l.includes('review') ? 'in-review' : l === 'blocked' ? 'blocked' : l === 'deferred' ? 'deferred' : 'open'; };

const COLUMNS = [
  { key: 'open', label: 'Open', color: '#94a3b8', match: (s: string) => s.toLowerCase() === 'open' },
  { key: 'progress', label: 'In Progress', color: '#279491', match: (s: string) => s.toLowerCase().includes('progress') },
  { key: 'review', label: 'In Review', color: '#8b5cf6', match: (s: string) => s.toLowerCase().includes('review') },
  { key: 'blocked', label: 'Blocked', color: '#ef4444', match: (s: string) => s.toLowerCase() === 'blocked' },
  { key: 'done', label: 'Done', color: '#10b981', match: (s: string) => ['resolved', 'done', 'verified'].includes(s.toLowerCase()) },
];

export default function SmcBoardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [sprint, setSprint] = useState<number | 'backlog'>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Issue | null>(null);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadBoard() {
      try {
        setLoading(true); setError(null);
        const res = await fetch('/api/smc/issues?limit=1000', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Board fetch failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setIssues(Array.isArray(data.issues) ? data.issues : []);
      } catch (err) {
        if (!cancelled) setError('Board data could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBoard();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawer(null); setShowNewSprint(false); } };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const sprints = useMemo(() => {
    return Array.from(new Set(issues.map(i => Number(i.sprint_number)).filter(Number.isFinite))).sort((a, b) => b - a);
  }, [issues]);

  // View: active sprint or backlog (deferred issues across all sprints)
  const viewIssues = sprint === 'backlog'
    ? issues.filter(i => i.status?.toLowerCase() === 'deferred')
    : issues.filter(i => Number(i.sprint_number) === sprint && i.status?.toLowerCase() !== 'deferred');

  const deferredCount = issues.filter(i => i.status?.toLowerCase() === 'deferred').length;
  const resolvedPts = viewIssues.filter(i => ['resolved','done','verified'].includes(i.status?.toLowerCase())).reduce((s, i) => s + (i.story_points ?? 0), 0);
  const totalPts = viewIssues.reduce((s, i) => s + (i.story_points ?? 0), 0);

  async function createSprint(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const num = Number(fd.get('sprint_number'));
    const name = String(fd.get('sprint_name') ?? '').trim();
    if (!num || !name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/smc/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_ref: `S${num}-PLAN-001`,
          title: `Sprint ${num} kickoff`,
          description: `${name} — sprint planning and goal setting.`,
          sprint_number: num,
          sprint_name: name,
          status: 'Open',
          priority: 'Medium',
          story_points: 0,
          reporter_name: 'Ritesh Kapoor',
          organization_id: '3327b9a7-aadb-44b0-9793-30c4045d3c92',
          labels: ['sprint-planning'],
        }),
      });
      if (res.ok) {
        setSprint(num);
        setShowNewSprint(false);
        // Reload issues
        const reload = await fetch('/api/smc/issues?limit=1000', { cache: 'no-store' });
        const data = await reload.json();
        setIssues(Array.isArray(data.issues) ? data.issues : []);
      }
    } catch {} finally { setCreating(false); }
  }

  async function deferIssue(issue: Issue) {
    await fetch('/api/smc/issues', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: issue.id, status: 'Deferred' }),
    });
    setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: 'Deferred' } : i));
    setDrawer(null);
  }

  async function reopenIssue(issue: Issue) {
    await fetch('/api/smc/issues', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: issue.id, status: 'Open' }),
    });
    setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: 'Open' } : i));
    setDrawer(null);
  }

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Engineering · {sprint === 'backlog' ? 'Backlog' : `Sprint ${sprint}`}</div>
          <h1>{sprint === 'backlog' ? 'Backlog' : 'Sprint Board'}</h1>
        </div>
        <div className="ha" style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="smc-btn" value={String(sprint)} onChange={e => setSprint(e.target.value === 'backlog' ? 'backlog' : Number(e.target.value))} style={{ fontFamily: 'inherit' }}>
            {sprints.map(s => <option key={s} value={s}>Sprint {s}</option>)}
            <option value="backlog">📋 Backlog ({deferredCount})</option>
          </select>
          <button className="smc-btn smc-btn-p" onClick={() => setShowNewSprint(true)}>+ New Sprint</button>
        </div>
      </div>

      {/* New Sprint Modal */}
      {showNewSprint && <>
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.3)',zIndex:100}} onClick={() => setShowNewSprint(false)} />
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'#fff',borderRadius:20,padding:24,width:420,zIndex:101,boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
          <h3 style={{margin:0,fontSize:18}}>Create New Sprint</h3>
          <p style={{fontSize:12,color:'#64748b',margin:'6px 0 16px'}}>Start a new sprint with a number and name. Issues can be moved here from the backlog.</p>
          <form onSubmit={createSprint} style={{display:'grid',gap:12}}>
            <label style={{fontSize:12,fontWeight:600,color:'#475569'}}>Sprint Number<input name="sprint_number" type="number" required min={1} defaultValue={(sprints[0] ?? 30) + 1} style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'10px 12px',fontSize:13}} /></label>
            <label style={{fontSize:12,fontWeight:600,color:'#475569'}}>Sprint Name<input name="sprint_name" required style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'10px 12px',fontSize:13}} placeholder="Sprint 31 — Feature Name" /></label>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
              <button type="button" className="smc-btn" onClick={() => setShowNewSprint(false)}>Cancel</button>
              <button type="submit" className="smc-btn smc-btn-p" disabled={creating}>{creating ? 'Creating...' : 'Create Sprint'}</button>
            </div>
          </form>
        </div>
      </>}

      {error && <div style={{ margin: '12px 16px 0', padding: '10px 12px', border: '1px solid #fecaca', borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 12 }}>{error}</div>}
      {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#94a3b8' }}>Loading board…</div>}

      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{viewIssues.length}</div><div className="l">{sprint === 'backlog' ? 'Deferred' : 'Sprint Total'}</div></div>
        {sprint !== 'backlog' && <div className="smc-kp"><div className="v" style={{color:'#279491'}}>{resolvedPts}/{totalPts}</div><div className="l">Points</div></div>}
        {COLUMNS.map(col => { const c = viewIssues.filter(i => col.match(i.status)).length; return c > 0 || sprint !== 'backlog' ? <div key={col.key} className="smc-kp"><div className="v" style={{ color: col.color }}>{c}</div><div className="l">{col.label}</div></div> : null; })}
        {sprint !== 'backlog' && <div className="smc-kp"><div className="v" style={{color:'#d97706'}}>{deferredCount}</div><div className="l">Backlog</div></div>}
      </div>

      {/* Kanban Board */}
      <div className="smc-board">
        {(sprint === 'backlog' ? [{ key: 'deferred', label: 'Deferred / Backlog', color: '#d97706', match: () => true }] : COLUMNS).map(col => {
          const colIssues = viewIssues.filter(i => col.match(i.status));
          return (
            <div key={col.key} className="smc-board-col">
              <div className="smc-board-col-head"><div className="cd" style={{ background: col.color }} /><h4>{col.label}</h4><span className="cc">{colIssues.length}</span></div>
              <div className="smc-board-col-body">
                {colIssues.map(issue => (
                  <button key={issue.id} type="button" className="smc-board-card" onClick={() => setDrawer(issue)} style={{ textAlign: 'left' }}>
                    <div className="bc-ref">{issue.issue_ref}</div>
                    <div className="bc-title">{issue.title}</div>
                    <div className="bc-foot">
                      <span className={`smc-lb ${typCls(issue.issue_type)}`}>{issue.issue_type ?? 'Task'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {sprint === 'backlog' && <span style={{fontSize:9,color:'#94a3b8'}}>S{issue.sprint_number}</span>}
                        {issue.story_points ? <span className="bc-pts">{issue.story_points}pts</span> : null}
                        {issue.assigned_to ? <div className="smc-aa" style={{ background: '#279491', width: 20, height: 20, fontSize: 8 }}>{ini(issue.assigned_to)}</div> : null}
                      </div>
                    </div>
                  </button>
                ))}
                {colIssues.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#cbd5e1', fontSize: 12 }}>No issues</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Drawer */}
      <div className={`smc-drawer-bg ${drawer ? 'open' : ''}`} onClick={() => setDrawer(null)} />
      <div className={`smc-drawer ${drawer ? 'open' : ''}`}>
        {drawer && <>
          <div className="smc-drawer-head">
            <button className="xbtn" onClick={() => setDrawer(null)}>✕</button>
            <span className="smc-iref" style={{ fontSize: 12 }}>{drawer.issue_ref}</span>
            <span className={`smc-lb ${typCls(drawer.issue_type)}`}>{drawer.issue_type ?? 'Task'}</span>
            <span className={`smc-st ${stCls(drawer.status)}`}>{drawer.status}</span>
          </div>
          <div className="smc-drawer-body">
            <h2>{drawer.title}</h2>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>By {drawer.reporter_name ?? 'Unknown'} · Sprint {drawer.sprint_number}{drawer.story_points ? ` · ${drawer.story_points} pts` : ''}</p>
            
            {/* Action buttons */}
            <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
              {drawer.status?.toLowerCase() !== 'deferred' && (
                <button type="button" className="smc-btn" onClick={() => deferIssue(drawer)} style={{fontSize:11}}>↓ Defer to Backlog</button>
              )}
              {drawer.status?.toLowerCase() === 'deferred' && (
                <button type="button" className="smc-btn smc-btn-p" onClick={() => reopenIssue(drawer)} style={{fontSize:11}}>↑ Reopen Issue</button>
              )}
            </div>

            <div className="smc-detail-meta">
              <span className="ml">Status</span><span className="mv"><span className={`smc-st ${stCls(drawer.status)}`}>{drawer.status}</span></span>
              <span className="ml">Severity</span><span className="mv">{drawer.severity ?? '—'}</span>
              <span className="ml">Priority</span><span className="mv">{drawer.priority ?? '—'}</span>
              <span className="ml">Assignee</span><span className="mv">{drawer.assigned_to ?? 'Unassigned'}</span>
              <span className="ml">Area</span><span className="mv">{drawer.area ?? '—'}</span>
              <span className="ml">Environment</span><span className="mv">{drawer.environment ?? 'Production'}</span>
              {drawer.git_branch && <><span className="ml">Branch</span><span className="mv" style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: '#279491' }}>{drawer.git_branch}</span></>}
            </div>
            {drawer.description && <div className="smc-detail-desc">{drawer.description}</div>}
            {drawer.fix_applied && <><div className="smc-detail-section"><h3>Fix Applied</h3></div><div className="smc-detail-desc">{drawer.fix_applied}</div></>}
            {drawer.files_changed && drawer.files_changed.length > 0 && <div className="smc-detail-section"><h3>Files Changed</h3>{drawer.files_changed.map((f, i) => <span key={i} style={{ display: 'inline-block', padding: '3px 8px', background: '#f1f5f9', borderRadius: 4, fontSize: 11, fontFamily: "'DM Mono',monospace", margin: '2px 4px 2px 0', color: '#475569' }}>{f}</span>)}</div>}
          </div>
        </>}
      </div>
    </>
  );
}
