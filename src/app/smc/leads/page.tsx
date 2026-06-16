import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getLeads() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('client_onboarding_requests')
    .select('id, company_name, primary_admin_name, primary_admin_email, headquarters_country, status, requested_seat_count, requested_plan, pipeline_stage, lead_score, source, industry, is_trial_request, created_at')
    .order('created_at', { ascending: false });
  return data ?? [];
}

function stageColor(stage: string | null) {
  switch (stage) {
    case 'inquiry': return { bg: '#f5f3ff', color: '#8b5cf6' };
    case 'qualified': return { bg: '#e6f5f4', color: '#279491' };
    case 'trial': return { bg: '#fef3c7', color: '#d97706' };
    case 'negotiating': return { bg: '#ecfdf5', color: '#10b981' };
    case 'converted': return { bg: '#ecfdf5', color: '#10b981' };
    default: return { bg: '#f1f5f9', color: '#475569' };
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
              const sc = stageColor(lead.pipeline_stage);
              return (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600 }}>{lead.company_name}</td>
                  <td>{lead.primary_admin_name ?? '—'}</td>
                  <td>{lead.headquarters_country ?? '—'}</td>
                  <td><span className="smc-st" style={{ background: sc.bg, color: sc.color }}>{lead.pipeline_stage ?? 'unknown'}</span></td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', textAlign: 'center' }}>{lead.requested_seat_count}</td>
                  <td>{lead.requested_plan}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: (lead.lead_score ?? 0) >= 80 ? '#10b981' : (lead.lead_score ?? 0) >= 50 ? '#279491' : '#94a3b8' }}>{lead.lead_score ?? 0}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '10.5px', color: '#94a3b8' }}>{new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
