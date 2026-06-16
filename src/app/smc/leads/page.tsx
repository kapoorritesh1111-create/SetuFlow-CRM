import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type LeadRow = {
  id: string;
  company_name: string;
  primary_admin_name: string | null;
  primary_admin_email: string;
  headquarters_country: string | null;
  status: string;
  requested_seat_count: number;
  requested_plan: string;
  pipeline_stage: string | null;
  lead_score: number | null;
  source: string | null;
  industry: string | null;
  is_trial_request: boolean;
  created_at: string;
};

async function getLeads() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('client_onboarding_requests')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as LeadRow[]) ?? [];
}

function stageStyle(stage: string | null) {
  switch (stage) {
    case 'inquiry': return { background: '#f5f3ff', color: '#8b5cf6' };
    case 'qualified': return { background: '#e6f5f4', color: '#279491' };
    case 'trial': return { background: '#fef3c7', color: '#d97706' };
    case 'negotiating': return { background: '#ecfdf5', color: '#10b981' };
    case 'converted': return { background: '#ecfdf5', color: '#10b981' };
    default: return { background: '#f1f5f9', color: '#475569' };
  }
}

export default async function SmcLeadsPage() {
  const leads = await getLeads();

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="smc-bc">Growth</div>
          <h1>Internal Leads</h1>
        </div>
        <div className="smc-ha">
          <button className="smc-btn">Export CSV</button>
          <button className="smc-btn smc-btn-p">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Lead
          </button>
        </div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{leads.length}</div><div className="l">Pipeline</div></div>
        <div className="smc-kp teal"><div className="v">{leads.filter(l => l.pipeline_stage === 'qualified').length}</div><div className="l">Qualified</div></div>
        <div className="smc-kp amber"><div className="v">{leads.filter(l => l.pipeline_stage === 'trial').length}</div><div className="l">Trial</div></div>
        <div className="smc-kp green"><div className="v">{leads.filter(l => l.pipeline_stage === 'converted').length}</div><div className="l">Converted</div></div>
      </div>
      <div className="smc-cs" style={{ padding: 20 }}>
        <table className="smc-it">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Country</th>
              <th>Stage</th>
              <th>Seats</th>
              <th>Plan</th>
              <th>Score</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => {
              const sc = stageStyle(lead.pipeline_stage);
              const scoreColor = (lead.lead_score ?? 0) >= 80 ? '#10b981' : (lead.lead_score ?? 0) >= 50 ? '#279491' : '#94a3b8';
              return (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600 }}>{lead.company_name}</td>
                  <td>{lead.primary_admin_name ?? '\u2014'}</td>
                  <td>{lead.headquarters_country ?? '\u2014'}</td>
                  <td><span className="smc-st" style={sc}>{lead.pipeline_stage ?? 'unknown'}</span></td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, textAlign: 'center' }}>{lead.requested_seat_count}</td>
                  <td>{lead.requested_plan}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: scoreColor }}>{lead.lead_score ?? 0}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: '#94a3b8' }}>{new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
