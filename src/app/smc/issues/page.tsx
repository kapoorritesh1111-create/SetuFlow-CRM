import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SETU_ORG = '3327b9a7-aadb-44b0-9793-30c4045d3c92';

type IssueRow = {
  id: string;
  issue_ref: string;
  title: string;
  status: string;
  priority: string | null;
  severity: string | null;
  issue_type: string | null;
  sprint_number: number;
  story_points: number | null;
  assigned_to: string | null;
  reporter_name: string | null;
  area: string | null;
  created_at: string;
};

function priorityClass(p: string | null) {
  if (!p) return 'low';
  const l = p.toLowerCase();
  if (l.includes('urgent') || l === 'p0') return 'urgent';
  if (l.includes('high') || l === 'p1') return 'high';
  if (l.includes('medium') || l === 'p2') return 'medium';
  return 'low';
}

function statusClass(s: string) {
  const l = s.toLowerCase();
  if (l === 'resolved' || l === 'done') return 'done';
  if (l.includes('progress')) return 'progress';
  if (l.includes('review')) return 'review';
  if (l === 'blocked') return 'blocked';
  if (l === 'deferred') return 'deferred';
  return 'open';
}

function typeClass(t: string | null) {
  if (!t) return 'feat';
  const l = t.toLowerCase();
  if (l.includes('bug')) return 'bug';
  if (l.includes('doc')) return 'doc';
  if (l.includes('ux')) return 'ux';
  if (l.includes('devops') || l.includes('infra')) return 'devops';
  return 'feat';
}

function initials(name: string | null): string {
  if (!name) return '??';
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

async function getIssues() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sprint_issues')
    .select('id, issue_ref, title, status, priority, severity, issue_type, sprint_number, story_points, assigned_to, reporter_name, area, created_at')
    .eq('organization_id', SETU_ORG)
    .order('sprint_number', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);
  return (data as IssueRow[]) ?? [];
}

export default async function SmcIssuesPage() {
  const issues = await getIssues();
  const counts = {
    total: issues.length,
    open: issues.filter(i => !['Resolved', 'Deferred'].includes(i.status)).length,
    progress: issues.filter(i => i.status.toLowerCase().includes('progress')).length,
    blocked: issues.filter(i => i.status.toLowerCase() === 'blocked').length,
    done: issues.filter(i => i.status === 'Resolved').length,
    deferred: issues.filter(i => i.status === 'Deferred').length,
  };

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="smc-bc">Engineering</div>
          <h1>Issues</h1>
        </div>
        <div className="smc-ha">
          <button className="smc-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filter
          </button>
          <button className="smc-btn smc-btn-p">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Issue
          </button>
        </div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{counts.total}</div><div className="l">Total</div></div>
        <div className="smc-kp amber"><div className="v">{counts.open}</div><div className="l">Open</div></div>
        <div className="smc-kp teal"><div className="v">{counts.progress}</div><div className="l">In Progress</div></div>
        <div className="smc-kp red"><div className="v">{counts.blocked}</div><div className="l">Blocked</div></div>
        <div className="smc-kp green"><div className="v">{counts.done}</div><div className="l">Done</div></div>
        <div className="smc-kp"><div className="v">{counts.deferred}</div><div className="l">Deferred</div></div>
      </div>
      <div className="smc-tl">
        <span className="smc-chip active">All</span>
        <span className="smc-chip">Sprint 24</span>
        <span className="smc-chip">Sprint 23</span>
        <span className="smc-chip">Bugs</span>
        <span className="smc-chip">Features</span>
        <div className="smc-sp" />
      </div>
      <div className="smc-cs">
        <table className="smc-it">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th style={{ width: 90 }}>Ref</th>
              <th>Title</th>
              <th style={{ width: 80 }}>Status</th>
              <th style={{ width: 50 }}>Pts</th>
              <th style={{ width: 70 }}>Assignee</th>
              <th style={{ width: 50 }}>Sprint</th>
            </tr>
          </thead>
          <tbody>
            {issues.map(issue => (
              <tr key={issue.id}>
                <td><input type="checkbox" /></td>
                <td className="smc-iref">{issue.issue_ref}</td>
                <td>
                  <div className="smc-itc">
                    <div className={`smc-pd ${priorityClass(issue.priority)}`} />
                    <span className="smc-itn">{issue.title}</span>
                    <span className={`smc-lb ${typeClass(issue.issue_type)}`}>{issue.issue_type ?? 'Task'}</span>
                  </div>
                </td>
                <td><span className={`smc-st ${statusClass(issue.status)}`}>{issue.status}</span></td>
                <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#64748b', textAlign: 'center' }}>{issue.story_points ?? '\u2014'}</td>
                <td>
                  {issue.assigned_to ? (
                    <div className="smc-as">
                      <div className="smc-aa" style={{ background: '#279491' }}>
                        {initials(issue.assigned_to)}
                      </div>
                    </div>
                  ) : null}
                </td>
                <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: '#64748b', textAlign: 'center' }}>{issue.sprint_number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
