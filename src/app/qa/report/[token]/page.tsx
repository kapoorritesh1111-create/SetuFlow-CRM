import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const STYLE = `
.rwrap{min-height:100vh;background:#f1f5f9;font-family:'DM Sans',system-ui,sans-serif;color:#1e293b}
.rmain{max-width:900px;margin:0 auto;padding:22px 18px}
.rbar{background:linear-gradient(135deg,#1f487c,#279491);color:#fff;border-radius:14px;padding:22px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.rbar h1{font-size:22px;margin-top:4px}.rbar .t{font-size:11px;opacity:.85;text-transform:uppercase;letter-spacing:.06em}
.rbar b{font-size:28px;display:block;line-height:1}
.rk{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}
.rcard{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
.rcard .v{font-size:22px;font-weight:700;color:#1f487c}.rcard .l{font-size:11px;color:#64748b;margin-top:2px}
.rrow{display:flex;align-items:center;gap:10px;margin:7px 0}
.rrow .n{width:200px;font-size:13px;color:#334155}.rrow .bar{flex:1;height:16px;background:#f1f5f9;border-radius:5px;overflow:hidden}
`;

function verdictLabel(v: string | null) {
  if (v === 'release_ready') return 'Release-ready · critical path green';
  if (v === 'blocked') return 'Blocked · critical failures present';
  if (v === 'no_data') return 'No runs recorded yet';
  return 'Under review';
}

export default async function TokenReportPage({ params }: { params: { token: string } }) {
  const svc = createServiceRoleClient() as any;
  const { data: link } = await svc.from('qa_share_links').select('*').eq('token', params.token).eq('link_type', 'report_view').maybeSingle();
  const invalid = !link || link.revoked_at || (link.expires_at && new Date(link.expires_at).getTime() < Date.now());
  let snap: any = null;
  if (!invalid) { const { data } = await svc.from('qa_report_snapshots').select('*').eq('id', link.snapshot_id).maybeSingle(); snap = data; }

  if (invalid || !snap) {
    return <div className="rwrap"><style dangerouslySetInnerHTML={{ __html: STYLE }} /><div className="rmain"><div className="rcard"><h3>This report link isn&rsquo;t available</h3><p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>It may have expired or been revoked.</p></div></div></div>;
  }

  const m = snap.metrics ?? {};
  const breakdown: Record<string, { title: string; total: number; passed: number; pct: number }> = snap.suite_breakdown ?? {};
  const published = snap.published_at ? new Date(snap.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  return (
    <div className="rwrap">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="rmain">
        <div className="rbar">
          <div><div className="t">QA Report{snap.release_label ? ` · ${snap.release_label}` : ''}</div><h1>{verdictLabel(snap.verdict)}</h1><div style={{ fontSize: 12.5, opacity: .9, marginTop: 6 }}>{snap.title} · published {published}</div></div>
          <div style={{ textAlign: 'right' }}><div className="t">Pass rate</div><b>{snap.pass_rate_pct ?? 0}%</b></div>
        </div>
        <div className="rk">
          <div className="rcard"><div className="v">{m.suitesCovered ?? 0}/{m.suitesTotal ?? 0}</div><div className="l">Suites covered</div></div>
          <div className="rcard"><div className="v">{m.casesTotal ?? 0}</div><div className="l">Cases authored</div></div>
          <div className="rcard"><div className="v" style={{ color: (snap.critical_pass_pct ?? 0) >= 100 ? '#10b981' : '#d97706' }}>{snap.critical_pass_pct ?? 0}%</div><div className="l">Critical-path pass</div></div>
          <div className="rcard"><div className="v">{m.stepsExecuted ?? 0}</div><div className="l">Steps executed</div></div>
          <div className="rcard"><div className="v" style={{ color: (m.findingsOpen ?? 0) ? '#d97706' : '#10b981' }}>{m.findingsOpen ?? 0}</div><div className="l">Open findings</div></div>
        </div>
        <div className="rcard">
          <h3 style={{ fontSize: 14 }}>Pass rate by suite</h3>
          <div style={{ marginTop: 10 }}>
            {Object.values(breakdown).length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>No executed steps recorded in this snapshot.</p>}
            {Object.values(breakdown).map((b, i) => (
              <div key={i} className="rrow"><span className="n">{b.title}</span><span className="bar"><span style={{ display: 'block', height: '100%', width: `${b.pct}%`, background: 'linear-gradient(90deg,#279491,#1f487c)' }} /></span><b style={{ width: 44, textAlign: 'right', fontSize: 13 }}>{b.pct}%</b></div>
            ))}
          </div>
        </div>
        <div className="rcard">
          <h3 style={{ fontSize: 14 }}>How we test</h3>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.9, marginTop: 4 }}>Test suites are authored and versioned in SETU Mission Control — the steps are the documentation. Each release runs every in-scope suite on a pinned build, recorded per step with evidence. Failures are logged with full context (reproducible by construction) and promoted to tracked issues with defect-to-test traceability. Release readiness gates on the critical-path pass rate.</p>
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>Read-only snapshot · {snap.snapshot_ref} · numbers frozen at publish time</p>
      </div>
    </div>
  );
}
