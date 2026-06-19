import { createClient } from '@/lib/supabase/server';
import { resolveIncident } from './actions';
import { IncidentForm } from './incident-form';

export const dynamic = 'force-dynamic';

type Incident = {
  id: string; incident_ref: string | null; title: string; severity: string | null;
  status: string | null; description: string | null; impact_summary: string | null;
  resolution: string | null; detected_at: string | null; resolved_at: string | null;
};

async function getIncidents(): Promise<Incident[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any).from('smc_incidents').select('*').order('detected_at', { ascending: false });
  return (data ?? []) as Incident[];
}

function fmt(d: string | null) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'; }
function hours(a: string | null, b: string | null) { return a && b ? `${Math.round((new Date(b).getTime() - new Date(a).getTime()) / 3.6e6)}h` : '—'; }

export default async function SmcIncidentsPage() {
  const incidents = await getIncidents();
  const active = incidents.filter(i => !i.resolved_at);
  const durations = incidents.filter(i => i.detected_at && i.resolved_at)
    .map(i => (new Date(i.resolved_at as string).getTime() - new Date(i.detected_at as string).getTime()) / 3.6e6);
  const mttr = durations.length ? `${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)}h` : '—';

  return (
    <>
      <div className="smc-ph"><div><div className="bc">Operations</div><h1>Incidents</h1></div>
        <IncidentForm />
      </div>
      <div className="smc-kr">
        <div className={`smc-kp ${active.length ? 'amber' : 'green'}`}><div className="v">{active.length}</div><div className="l">Active</div></div>
        <div className="smc-kp"><div className="v">{incidents.length}</div><div className="l">Total</div></div>
        <div className="smc-kp"><div className="v">{mttr}</div><div className="l">Avg MTTR</div></div>
      </div>
      <div className="smc-content-page">
        {incidents.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0' }}>
            <span className="smc-st resolved">All Clear</span>
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>No incidents recorded</span>
          </div>
        ) : (
          <div className="smc-content-grid">
            {incidents.map(inc => (
              <div key={inc.id} className="smc-content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h4>{inc.title}</h4>
                  <span className="smc-lb bug">{inc.severity ?? 'P?'}</span>
                </div>
                {inc.description && <p>{inc.description}</p>}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#64748b' }}>
                  <span>{inc.incident_ref}</span>
                  <span className={`smc-st ${inc.resolved_at ? 'resolved' : 'in-progress'}`}>{inc.resolved_at ? 'Resolved' : (inc.status ?? 'open')}</span>
                  <span>Detected {fmt(inc.detected_at)}</span>
                  <span>MTTR: {hours(inc.detected_at, inc.resolved_at)}</span>
                </div>
                {!inc.resolved_at && (
                  <form action={resolveIncident} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input type="hidden" name="id" value={inc.id} />
                    <input name="resolution" placeholder="Resolution note" className="smc-input" style={{ flex: 1 }} />
                    <button type="submit" className="smc-btn" style={{ fontSize: 11 }}>Resolve</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
