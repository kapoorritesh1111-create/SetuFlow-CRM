import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SETU_ORG = '3327b9a7-aadb-44b0-9793-30c4045d3c92';

type IssueRow = { status: string };
type LeadRow = { id: string; pipeline_stage: string | null };

async function getStats() {
  const supabase = await createClient();
  const [issuesRes, leadsRes, orgsRes] = await Promise.all([
    supabase.from('sprint_issues').select('status').eq('organization_id', SETU_ORG),
    supabase.from('client_onboarding_requests').select('*'),
    supabase.from('organizations').select('id'),
  ]);
  const issues = (issuesRes.data as IssueRow[]) ?? [];
  const leads = (leadsRes.data as LeadRow[]) ?? [];
  return {
    totalIssues: issues.length,
    openIssues: issues.filter(i => !['Resolved', 'Deferred'].includes(i.status)).length,
    resolved: issues.filter(i => i.status === 'Resolved').length,
    blocked: issues.filter(i => ['blocked', 'Blocked'].includes(i.status)).length,
    leads: leads.length,
    clients: orgsRes.data?.length ?? 0,
    qualified: leads.filter(l => l.pipeline_stage === 'qualified').length,
    converted: leads.filter(l => l.pipeline_stage === 'converted').length,
  };
}

type CardStat = { v: string; l: string; c?: string };
type DashCard = { title: string; desc: string; href: string; icon: string; color: string; iconColor: string; stats: CardStat[] };

export default async function SmcDashboard() {
  const s = await getStats();

  const cards: DashCard[] = [
    { title: 'Engineering', desc: 'Issues · Sprints · Agents', href: '/smc/issues', icon: 'alert-circle', color: 'rgba(31,72,124,.08)', iconColor: '#1F487C', stats: [{ v: String(s.openIssues), l: 'Open' }, { v: String(s.blocked), l: 'Blocked', c: '#ef4444' }, { v: String(s.resolved), l: 'Done', c: '#10b981' }] },
    { title: 'Internal Leads', desc: 'SaaS prospect pipeline', href: '/smc/leads', icon: 'user-plus', color: 'rgba(245,158,11,.1)', iconColor: '#d97706', stats: [{ v: String(s.leads), l: 'Pipeline' }, { v: String(s.qualified), l: 'Qualified', c: '#279491' }, { v: String(s.converted), l: 'Converted', c: '#10b981' }] },
    { title: 'Client Orgs', desc: 'Active workspaces & health', href: '/smc/clients', icon: 'users', color: 'rgba(39,148,145,.08)', iconColor: '#279491', stats: [{ v: String(s.clients), l: 'Orgs' }, { v: '2', l: 'Active', c: '#10b981' }, { v: '11', l: 'Modules' }] },
    { title: 'Deployments', desc: 'Vercel · CI/CD · Rollbacks', href: '/smc/deploy', icon: 'cloud', color: 'rgba(16,185,129,.08)', iconColor: '#10b981', stats: [{ v: '\u2713', l: 'Last Build', c: '#10b981' }, { v: '\u2014', l: 'Total' }, { v: '0', l: 'Failed' }] },
    { title: 'Incidents', desc: 'P0/P1 · Postmortems', href: '/smc/incidents', icon: 'triangle', color: 'rgba(239,68,68,.08)', iconColor: '#ef4444', stats: [{ v: '0', l: 'Active', c: '#10b981' }, { v: '0', l: 'Total' }, { v: '\u2014', l: 'MTTR' }] },
    { title: 'Revenue', desc: 'MRR · Plans · Churn', href: '/smc/revenue', icon: 'dollar', color: 'rgba(139,92,246,.08)', iconColor: '#8b5cf6', stats: [{ v: '$0', l: 'MRR' }, { v: String(s.clients), l: 'Clients' }, { v: '0%', l: 'Churn' }] },
  ];

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="smc-bc">Setu Mission Control</div>
          <h1>Dashboard</h1>
        </div>
        <div className="smc-ha">
          <a href="https://setuflowcrm.com/dashboard" target="_blank" rel="noopener" className="smc-btn">{'\u2197'} SaaS App</a>
        </div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{s.openIssues}</div><div className="l">Open Issues</div></div>
        <div className="smc-kp teal"><div className="v">{s.leads}</div><div className="l">Leads</div></div>
        <div className="smc-kp"><div className="v">{s.clients}</div><div className="l">Clients</div></div>
        <div className="smc-kp amber"><div className="v">0</div><div className="l">Incidents</div></div>
        <div className="smc-kp"><div className="v">S24</div><div className="l">Sprint</div></div>
        <div className="smc-kp green"><div className="v">99.8%</div><div className="l">Uptime</div></div>
      </div>
      <div className="smc-dg">
        {cards.map(card => (
          <Link key={card.title} href={card.href} className="smc-dc">
            <div className="smc-dc-t">
              <div className="smc-dc-i" style={{ background: card.color, color: card.iconColor }}>
                <CardIcon name={card.icon} />
              </div>
              <div className="smc-dc-info"><h3>{card.title}</h3><p>{card.desc}</p></div>
            </div>
            <div className="smc-dc-s">
              {card.stats.map(st => (
                <div key={st.l} className="smc-ds">
                  <div className="dv" style={st.c ? { color: st.c } : undefined}>{st.v}</div>
                  <div className="dl">{st.l}</div>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function CardIcon({ name }: { name: string }) {
  const p = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 16, height: 16 };
  switch (name) {
    case 'alert-circle': return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    case 'user-plus': return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
    case 'users': return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>;
    case 'cloud': return <svg {...p}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>;
    case 'triangle': return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'dollar': return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="10"/></svg>;
  }
}
