'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { promoteFinding, setFindingStatus, createShareLink, revokeShareLink, publishSnapshot } from './qa-actions';
import { CopyLinkModal } from '../wiki/docs-sharing';

type Suite = { suite_key: string; title: string; area: string | null; description: string | null; caseCount: number; criticalCount: number };
type Run = { id: string; run_ref: string; suite_filter: string | null; run_type: string | null; verdict: string | null; pass_rate_pct: number | null; total_steps: number | null; steps_failed: number | null; bugs_filed: number | null };
type Finding = { id: string; finding_ref: string | null; title: string; severity: string | null; suite_key: string | null; case_key: string | null; reporter_kind: string | null; reported_by: string | null; status: string | null; promoted_issue_ref: string | null };
type ShareLink = { id: string; token: string; link_type: string; suite_key: string | null; label: string | null; tester_email: string | null; expires_at: string | null; revoked_at: string | null; use_count: number | null };
type Snapshot = { id: string; snapshot_ref: string | null; title: string; release_label: string | null; verdict: string | null; pass_rate_pct: number | null; critical_pass_pct: number | null; published_at: string | null };
type Rollup = { stepsExecuted: number; passRate: number; criticalPassPct: number; suitesCovered: number; suitesTotal: number; casesTotal: number; findingsOpen: number; findingsTotal: number; breakdown: { title: string; total: number; passed: number; pct: number }[] };

const card: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 15 };

function verdictPill(v: string | null) {
  if (v === 'pass' || v === 'release_ready') return <span className="smc-st resolved">{v === 'release_ready' ? 'release-ready' : 'pass'}</span>;
  if (v === 'blocked') return <span className="smc-st blocked">blocked</span>;
  if (v === 'pass_with_issues' || v === 'review') return <span className="smc-st in-progress">{v === 'review' ? 'review' : 'pass w/ issues'}</span>;
  return <span className="smc-st open">{v ?? 'in progress'}</span>;
}

export function QaWorkspace({ suites, runs, findings, links, snapshots, rollup }: { suites: Suite[]; runs: Run[]; findings: Finding[]; links: ShareLink[]; snapshots: Snapshot[]; rollup: Rollup }) {
  const [tab, setTab] = useState<'suites' | 'runs' | 'findings' | 'reports' | 'share'>('suites');
  const [origin, setOrigin] = useState('');
  const [copyUrl, setCopyUrl] = useState<string | null>(null);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const router = useRouter();
  const [pending, start] = useTransition();
  const openFindings = findings.filter((f) => f.status !== 'promoted').length;
  const totalCases = suites.reduce((a, s) => a + s.caseCount, 0);

  // share form
  const [showShare, setShowShare] = useState(false);
  const [slSuite, setSlSuite] = useState(suites[0]?.suite_key ?? '');
  const [slLabel, setSlLabel] = useState('');
  const [slDays, setSlDays] = useState('7');
  // publish form
  const [showPub, setShowPub] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubRelease, setPubRelease] = useState('');

  const tabBtn = (k: typeof tab, label: string, n?: number) => (
    <div onClick={() => setTab(k)} style={{ padding: '11px 14px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', color: tab === k ? '#1f487c' : '#64748b', borderBottom: `2px solid ${tab === k ? '#279491' : 'transparent'}` }}>{label}{n != null ? ` (${n})` : ''}</div>
  );
  const linkUrl = (l: ShareLink) => `${origin}/qa/${l.link_type === 'report_view' ? 'report' : 'run'}/${l.token}`;
  function copy(text: string) { setCopyUrl(text); }
  function promote(id: string) { start(async () => { const r = await promoteFinding(id); router.refresh(); if ('issueRef' in r) alert(`Promoted to tracker issue ${r.issueRef}`); }); }
  function triage(id: string) { start(async () => { await setFindingStatus(id, 'triaged'); router.refresh(); }); }
  function mintShare() { start(async () => { const r = await createShareLink({ linkType: 'tester_run', suiteKey: slSuite, label: slLabel || undefined, expiresInDays: Number(slDays) || undefined }); setShowShare(false); setSlLabel(''); router.refresh(); copy(`${origin}/qa/run/${r.token}`); }); }
  function revoke(id: string) { start(async () => { await revokeShareLink(id); router.refresh(); }); }
  function publish() { start(async () => { const r = await publishSnapshot({ title: pubTitle || 'QA Report', releaseLabel: pubRelease || undefined }); setShowPub(false); setPubTitle(''); setPubRelease(''); router.refresh(); copy(`${origin}/qa/report/${r.token}`); }); }

  return (
    <>
      {copyUrl && <CopyLinkModal url={copyUrl} onClose={() => setCopyUrl(null)} />}
      <div className="smc-ph">
        <div><div className="bc">Delivery · Quality</div><h1>QA Workspace</h1><p>Authored suites, guided runs, structured findings, external-tester links and publishable reports.</p></div>
        <div className="ha"><span className="smc-st in-progress">staging</span></div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{suites.length}</div><div className="l">Suites</div></div>
        <div className="smc-kp"><div className="v">{totalCases}</div><div className="l">Cases</div></div>
        <div className="smc-kp teal"><div className="v">{runs.length}</div><div className="l">Recent Runs</div></div>
        <div className={`smc-kp ${openFindings ? 'amber' : 'green'}`}><div className="v">{openFindings}</div><div className="l">Open Findings</div></div>
        <div className="smc-kp"><div className="v">{rollup.passRate}%</div><div className="l">Pass Rate</div></div>
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', padding: '0 24px', background: '#fff' }}>
        {tabBtn('suites', 'Suites')}{tabBtn('runs', 'Runs', runs.length)}{tabBtn('findings', 'Findings', findings.length)}{tabBtn('reports', 'Reports')}{tabBtn('share', 'Share Links', links.filter((l) => !l.revoked_at).length)}
      </div>
      <div style={{ padding: '18px 24px' }}>
        {tab === 'suites' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {suites.map((s) => (
              <div key={s.suite_key} style={{ ...card, display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 16, alignItems: 'center' }}>
                <div><h4 style={{ fontSize: 13.5 }}>{s.title}</h4><div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'DM Mono', marginTop: 2 }}>{s.suite_key} · {s.area}</div>{s.description && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{s.description}</div>}</div>
                <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 16 }}>{s.caseCount}</div><div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Cases</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 16, color: '#ef4444' }}>{s.criticalCount}</div><div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Critical</div></div>
                <Link href={`/smc/qa/run/${s.suite_key}`} className="smc-btn smc-btn-p" style={{ fontSize: 12 }}>Start run ▷</Link>
              </div>
            ))}
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Suites and steps are editable DB records — the steps are the testing documentation.</div>
          </div>
        )}

        {tab === 'runs' && (
          <div style={{ display: 'grid', gap: 9 }}>
            {runs.map((r) => (
              <div key={r.id} style={{ ...card, display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto', gap: 14, alignItems: 'center' }}>
                <div><div style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#1f487c' }}>{r.run_ref}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{r.suite_filter}</div></div>
                <span className="smc-st open" style={{ fontSize: 9 }}>{r.run_type}</span>
                {verdictPill(r.verdict)}
                <div style={{ textAlign: 'center' }}><b style={{ fontFamily: 'DM Mono' }}>{r.pass_rate_pct ?? 0}%</b><div style={{ fontSize: 9, color: '#94a3b8' }}>PASS</div></div>
                <div style={{ textAlign: 'center' }}><b style={{ fontFamily: 'DM Mono', color: r.steps_failed ? '#ef4444' : '#1e293b' }}>{r.steps_failed ?? 0}</b><div style={{ fontSize: 9, color: '#94a3b8' }}>FAILS</div></div>
                <div style={{ textAlign: 'center' }}><b style={{ fontFamily: 'DM Mono' }}>{r.bugs_filed ?? 0}</b><div style={{ fontSize: 9, color: '#94a3b8' }}>FINDINGS</div></div>
              </div>
            ))}
            {runs.length === 0 && <p style={{ color: '#64748b' }}>No runs recorded yet.</p>}
          </div>
        )}

        {tab === 'findings' && (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['Finding', 'Suite · Case', 'Severity', 'Reported by', 'Status', ''].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', padding: '9px 12px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}><div style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#1f487c' }}>{f.finding_ref}</div>{f.title}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'DM Mono', fontSize: 11 }}>{f.suite_key}{f.case_key ? ` · ${f.case_key}` : ''}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{f.severity}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{f.reported_by} <span style={{ color: '#94a3b8' }}>({f.reporter_kind})</span></td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{f.status === 'promoted' ? <span className="smc-st resolved">promoted → {f.promoted_issue_ref}</span> : f.status === 'triaged' ? <span className="smc-st in-progress">triaged</span> : <span className="smc-st open">new</span>}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {f.status === 'promoted' ? <span style={{ fontSize: 11, color: '#94a3b8' }}>linked ↔ issue</span> : (<>
                        {f.status !== 'triaged' && <button className="smc-btn" style={{ fontSize: 11, marginRight: 6 }} disabled={pending} onClick={() => triage(f.id)}>Triage</button>}
                        <button className="smc-btn smc-btn-p" style={{ fontSize: 11 }} disabled={pending} onClick={() => promote(f.id)}>Promote</button>
                      </>)}
                    </td>
                  </tr>
                ))}
                {findings.length === 0 && <tr><td colSpan={6} style={{ padding: 16, color: '#64748b' }}>No findings yet — run a suite and log failures.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'reports' && (
          <>
            <div style={{ background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', borderRadius: 14, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div><div style={{ fontSize: 11, opacity: .85, textTransform: 'uppercase', letterSpacing: '.06em' }}>Live readiness</div><h2 style={{ fontSize: 20, marginTop: 3 }}>{rollup.stepsExecuted === 0 ? 'No runs recorded yet' : rollup.criticalPassPct >= 100 ? 'Critical path green' : 'Under review'}</h2><div style={{ fontSize: 12, opacity: .9, marginTop: 4 }}>{rollup.suitesCovered}/{rollup.suitesTotal} suites covered · {rollup.stepsExecuted} steps executed</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, opacity: .85 }}>Pass rate</div><b style={{ fontSize: 28, fontFamily: 'DM Mono' }}>{rollup.passRate}%</b></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 14 }}>
              <div style={card}><div style={{ fontSize: 20, fontWeight: 700, color: '#1f487c', fontFamily: 'DM Mono' }}>{rollup.criticalPassPct}%</div><div style={{ fontSize: 11, color: '#64748b' }}>Critical-path pass</div></div>
              <div style={card}><div style={{ fontSize: 20, fontWeight: 700, color: '#1f487c', fontFamily: 'DM Mono' }}>{rollup.casesTotal}</div><div style={{ fontSize: 11, color: '#64748b' }}>Cases authored</div></div>
              <div style={card}><div style={{ fontSize: 20, fontWeight: 700, color: rollup.findingsOpen ? '#d97706' : '#10b981', fontFamily: 'DM Mono' }}>{rollup.findingsOpen}</div><div style={{ fontSize: 11, color: '#64748b' }}>Open findings</div></div>
            </div>
            <div style={{ ...card, marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600 }}>Pass rate by suite</h3>
              <div style={{ marginTop: 10 }}>
                {rollup.breakdown.length === 0 && <p style={{ color: '#64748b', fontSize: 12.5 }}>No executed steps yet — run a suite to populate this.</p>}
                {rollup.breakdown.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}><span style={{ width: 220, fontSize: 12.5, color: '#334155' }}>{b.title}</span><span style={{ flex: 1, height: 14, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${b.pct}%`, background: 'linear-gradient(90deg,#279491,#1f487c)' }} /></span><b style={{ width: 42, textAlign: 'right', fontFamily: 'DM Mono', fontSize: 12.5 }}>{b.pct}%</b></div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              {!showPub ? <button className="smc-btn smc-btn-p" onClick={() => setShowPub(true)}>Publish snapshot</button> : (
                <div style={card}>
                  <input className="smc-input" placeholder="Report title (e.g. Release 2.4 QA Report)" value={pubTitle} onChange={(e) => setPubTitle(e.target.value)} />
                  <input className="smc-input" placeholder="Release label (optional)" value={pubRelease} onChange={(e) => setPubRelease(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="smc-btn smc-btn-p" disabled={pending} onClick={publish}>Freeze &amp; create link</button><button className="smc-btn" onClick={() => setShowPub(false)}>Cancel</button></div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Freezes the current numbers into a read-only, shareable report.</div>
                </div>
              )}
            </div>
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Snapshot', 'Verdict', 'Pass', 'Published', ''].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', padding: '9px 12px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {snapshots.map((s) => {
                    const l = links.find((x) => x.link_type === 'report_view');
                    return <tr key={s.id}><td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}><div style={{ fontFamily: 'DM Mono', fontSize: 11, color: '#1f487c' }}>{s.snapshot_ref}</div>{s.title}</td><td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{verdictPill(s.verdict)}</td><td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'DM Mono' }}>{s.pass_rate_pct ?? 0}%</td><td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}>{s.published_at ? new Date(s.published_at).toLocaleDateString() : ''}</td><td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{l && <button className="smc-btn" style={{ fontSize: 11 }} onClick={() => copy(`${origin}/qa/report/${l.token}`)}>Copy link</button>}</td></tr>;
                  })}
                  {snapshots.length === 0 && <tr><td colSpan={5} style={{ padding: 16, color: '#64748b' }}>No published snapshots yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'share' && (
          <>
            <div style={{ marginBottom: 12 }}>
              {!showShare ? <button className="smc-btn smc-btn-p" onClick={() => setShowShare(true)}>+ New tester link</button> : (
                <div style={card}>
                  <label style={{ fontSize: 12, color: '#475569' }}>Suite<select className="smc-input" value={slSuite} onChange={(e) => setSlSuite(e.target.value)}>{suites.map((s) => <option key={s.suite_key} value={s.suite_key}>{s.title}</option>)}</select></label>
                  <input className="smc-input" placeholder="Label (e.g. Beta tester — A. Rao)" value={slLabel} onChange={(e) => setSlLabel(e.target.value)} />
                  <label style={{ fontSize: 12, color: '#475569' }}>Expires in (days)<input className="smc-input" type="number" value={slDays} onChange={(e) => setSlDays(e.target.value)} /></label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="smc-btn smc-btn-p" disabled={pending || !slSuite} onClick={mintShare}>Create link</button><button className="smc-btn" onClick={() => setShowShare(false)}>Cancel</button></div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Token-scoped to this suite. Testers reach only the guided run and file findings — never the tracker.</div>
                </div>
              )}
            </div>
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Label', 'Type', 'Scope', 'Uses', 'Expires', 'Status', ''].map((h) => <th key={h} style={{ textAlign: 'left', fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', padding: '9px 12px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {links.map((l) => {
                    const expired = l.expires_at && new Date(l.expires_at).getTime() < Date.now();
                    const status = l.revoked_at ? 'revoked' : expired ? 'expired' : 'active';
                    return <tr key={l.id}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{l.label ?? '—'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}><span className="smc-st open" style={{ fontSize: 9 }}>{l.link_type}</span></td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'DM Mono', fontSize: 11 }}>{l.suite_key ?? 'report'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'DM Mono' }}>{l.use_count ?? 0}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8' }}>{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : 'never'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{status === 'active' ? <span className="smc-st resolved">active</span> : <span className="smc-st blocked">{status}</span>}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>{status === 'active' && <><button className="smc-btn" style={{ fontSize: 11, marginRight: 6 }} onClick={() => copy(linkUrl(l))}>Copy</button><button className="smc-btn" style={{ fontSize: 11 }} disabled={pending} onClick={() => revoke(l.id)}>Revoke</button></>}</td>
                    </tr>;
                  })}
                  {links.length === 0 && <tr><td colSpan={7} style={{ padding: 16, color: '#64748b' }}>No share links yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
