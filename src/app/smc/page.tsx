import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { MODULE_DEFINITIONS } from '@/lib/modules/module-grants';
import { isFeatureEnabled } from '@/lib/flags/feature-flags';

export const dynamic = 'force-dynamic';

const SETU_ORG = INTERNAL_ORG_ID;

type IssueRow = { status: string; sprint_number: number };
type LeadRow = { id: string; pipeline_stage: string | null };
type RecentIssue = { issue_ref: string; title: string; status: string; severity: string | null; sprint_number: number; updated_at: string; assigned_to: string | null };
type SprintMeta = { sprint_number: number; sprint_name: string | null };
type IncidentRow = { status: string | null; detected_at: string | null; resolved_at: string | null };

async function getStats() {
  const supabase = await createClient();
  const [issuesRes, leadsRes, orgsRes, sprintRes, recentRes, incidentsRes] = await Promise.all([
    supabase.from('sprint_issues').select('status, sprint_number').eq('organization_id', SETU_ORG),
    supabase.from('client_onboarding_requests').select('*'),
    supabase.from('organizations').select('id'),
    (supabase as any).from('sprint_meta').select('sprint_number, sprint_name').order('sprint_number', { ascending: false }).limit(1),
    supabase.from('sprint_issues').select('issue_ref, title, status, severity, sprint_number, updated_at, assigned_to').eq('organization_id', SETU_ORG).order('updated_at', { ascending: false }).limit(10),
    (supabase as any).from('smc_incidents').select('status, detected_at, resolved_at'),
  ]);
  const issues = (issuesRes.data as IssueRow[]) ?? [];
  const leads = (leadsRes.data as LeadRow[]) ?? [];
  const latestSprint = (sprintRes.data as SprintMeta[] | null)?.[0]?.sprint_number ?? issues.reduce((m, i) => Math.max(m, i.sprint_number), 0);
  const recent = (recentRes.data as RecentIssue[]) ?? [];
  const sprintIssues = issues.filter(i => i.sprint_number === latestSprint);

  const incidents = (incidentsRes.data as IncidentRow[]) ?? [];
  const activeIncidents = incidents.filter(i => !i.resolved_at).length;
  const resolvedDurations = incidents
    .filter(i => i.detected_at && i.resolved_at)
    .map(i => (new Date(i.resolved_at as string).getTime() - new Date(i.detected_at as string).getTime()) / 3.6e6);
  const mttr = resolvedDurations.length
    ? `${Math.round(resolvedDurations.reduce((a, b) => a + b, 0) / resolvedDurations.length)}h`
    : null;

  return {
    openIssues: issues.filter(i => !['Resolved', 'Deferred'].includes(i.status)).length,
    leads: leads.length,
    clients: orgsRes.data?.length ?? 0,
    qualified: leads.filter(l => l.pipeline_stage === 'qualified').length,
    converted: leads.filter(l => l.pipeline_stage === 'converted').length,
    resolved: issues.filter(i => i.status === 'Resolved').length,
    blocked: issues.filter(i => ['blocked', 'Blocked'].includes(i.status)).length,
    sprint: latestSprint,
    sprintOpen: sprintIssues.filter(i => !['Resolved', 'Deferred'].includes(i.status)).length,
    sprintResolved: sprintIssues.filter(i => i.status === 'Resolved').length,
    sprintTotal: sprintIssues.length,
    incidentsActive: activeIncidents,
    incidentsTotal: incidents.length,
    mttr,
    recent,
  };
}

function ago(d: string) { const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5); return days === 0 ? 'today' : days < 30 ? `${days}d ago` : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function stCls(s: string) { const l = s.toLowerCase(); return l === 'resolved' ? 'resolved' : l.includes('progress') ? 'in-progress' : l === 'blocked' ? 'blocked' : l === 'deferred' ? 'deferred' : 'open'; }

type CardStat = { v: string; l: string; c?: string; nw?: boolean };
type DashCard = { title: string; desc: string; href: string; color: string; iconColor: string; stats: CardStat[] };

export default async function SmcDashboard() {
  const s = await getStats();
  // Enforcement demo (S32-SMC-001): the Revenue tile is gated by a flag. No flag => shown (fail open);
  // create a disabled `revenue_dashboard` flag in /smc/flags to hide it.
  const showRevenue = await isFeatureEnabled('revenue_dashboard', INTERNAL_ORG_ID);

  const cards: DashCard[] = [
    { title: 'Engineering', desc: 'Issues · Sprints · Agents', href: '/smc/issues', color: 'rgba(31,72,124,.08)', iconColor: '#1F487C', stats: [{ v: String(s.openIssues), l: 'Open' }, { v: String(s.blocked), l: 'Blocked', c: '#ef4444' }, { v: String(s.resolved), l: 'Done', c: '#10b981' }] },
    { title: 'Internal Leads', desc: 'SaaS prospect pipeline', href: '/smc/leads', color: 'rgba(245,158,11,.1)', iconColor: '#d97706', stats: [{ v: String(s.leads), l: 'Pipeline' }, { v: String(s.qualified), l: 'Qualified', c: '#279491' }, { v: String(s.converted), l: 'Converted', c: '#10b981' }] },
    { title: 'Client Orgs', desc: 'Active workspaces & health', href: '/smc/clients', color: 'rgba(39,148,145,.08)', iconColor: '#279491', stats: [{ v: String(s.clients), l: 'Orgs' }, { v: String(MODULE_DEFINITIONS.length), l: 'Modules' }, { v: '—', l: 'Health', nw: true }] },
    { title: 'Deployments', desc: 'Vercel · CI/CD · Rollbacks', href: '/smc/deploy', color: 'rgba(16,185,129,.08)', iconColor: '#10b981', stats: [{ v: '—', l: 'Last Build', nw: true }, { v: '—', l: 'Total', nw: true }, { v: '—', l: 'Failed', nw: true }] },
    { title: 'Incidents', desc: 'P0/P1 · Postmortems', href: '/smc/incidents', color: 'rgba(239,68,68,.08)', iconColor: '#ef4444', stats: [{ v: String(s.incidentsActive), l: 'Active', c: s.incidentsActive ? '#ef4444' : '#10b981' }, { v: String(s.incidentsTotal), l: 'Total' }, { v: s.mttr ?? '—', l: 'MTTR', nw: !s.mttr }] },
  ];
  if (showRevenue) {
    cards.push({ title: 'Revenue', desc: 'MRR · Plans · Churn', href: '/smc/revenue', color: 'rgba(139,92,246,.08)', iconColor: '#8b5cf6', stats: [{ v: '—', l: 'MRR', nw: true }, { v: String(s.clients), l: 'Clients' }, { v: '—', l: 'Churn', nw: true }] });
  }

  return (
    <>
      <div className="smc-ph"><div><div className="bc">Setu Mission Control</div><h1>Dashboard</h1></div>
        <div className="ha"><a href="https://setuflowcrm.com/dashboard" target="_blank" rel="noopener" className="smc-btn">{'\u2197'} SaaS App</a></div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{s.openIssues}</div><div className="l">Open Issues</div></div>
        <div className="smc-kp teal"><div className="v">{s.leads}</div><div className="l">Leads</div></div>
        <div className="smc-kp"><div className="v">{s.clients}</div><div className="l">Clients</div></div>
        <div className="smc-kp amber"><div className="v">{s.incidentsActive}</div><div className="l">Incidents</div></div>
        <div className="smc-kp"><div className="v">S{s.sprint}</div><div className="l">Sprint</div></div>
        <div className="smc-kp green"><div className="v">{s.sprintResolved}/{s.sprintTotal}</div><div className="l">Sprint Done</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0, flex: 1, overflow: 'hidden' }}>
        <div className="smc-dg" style={{ overflow: 'auto' }}>
          {cards.map(card => (
            <Link key={card.title} href={card.href} className="smc-dc">
              <div className="smc-dc-t"><div className="smc-dc-i" style={{ background: card.color, color: card.iconColor }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10" /></svg>
              </div><div className="smc-dc-info"><h3>{card.title}</h3><p>{card.desc}</p></div></div>
              <div className="smc-dc-s">{card.stats.map(st => (
                <div key={st.l} className="smc-ds"><div className="dv" style={st.c ? { color: st.c } : undefined}>{st.v}</div><div className="dl">{st.l}{st.nw ? <span style={{ display: 'block', fontSize: 8, color: '#cbd5e1' }}>not wired</span> : null}</div></div>
              ))}</div>
            </Link>
          ))}
        </div>
        <div style={{ borderLeft: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Sprint {s.sprint} Summary</h3>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span><strong style={{ color: '#279491' }}>{s.sprintOpen}</strong> open</span>
              <span><strong style={{ color: '#10b981' }}>{s.sprintResolved}</strong> resolved</span>
              <span><strong>{s.sprintTotal}</strong> total</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>Recent Activity</h3>
            {s.recent.map((issue, i) => (
              <Link key={i} href="/smc/issues" style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: issue.status === 'Resolved' ? '#10b981' : issue.severity?.toLowerCase().includes('critical') ? '#ef4444' : issue.severity?.toLowerCase().includes('high') ? '#f59e0b' : '#94a3b8' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{issue.issue_ref} · <span className={`smc-st ${stCls(issue.status)}`} style={{ fontSize: 9 }}>{issue.status}</span> · {ago(issue.updated_at)}</div>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Quick Links</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[{ label: 'New Issue', href: '/smc/issues' }, { label: 'Docs Hub', href: '/smc/wiki' }, { label: 'Roadmap', href: '/smc/roadmap' }, { label: 'Runbooks', href: '/smc/runbooks' }, { label: 'QA Tests', href: '/smc/qa' }].map(l => (
                <Link key={l.label} href={l.href} className="smc-btn" style={{ fontSize: 10, padding: '4px 10px' }}>{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
