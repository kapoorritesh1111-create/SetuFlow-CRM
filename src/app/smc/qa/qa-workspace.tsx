'use client';

import Link from 'next/link';
import { useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { promoteFinding, setFindingStatus } from './qa-actions';

type Suite = { suite_key: string; title: string; area: string | null; description: string | null; caseCount: number; criticalCount: number };
type Run = { id: string; run_ref: string; suite_filter: string | null; verdict: string | null; pass_rate_pct: number | null; total_steps: number | null; steps_failed: number | null; bugs_filed: number | null; completed_at: string | null };
type Finding = { id: string; finding_ref: string | null; title: string; severity: string | null; suite_key: string | null; case_key: string | null; reporter_kind: string | null; reported_by: string | null; status: string | null; promoted_issue_ref: string | null };

const card: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 15 };

function verdictPill(v: string | null) {
  if (v === 'pass') return <span className="smc-st resolved">pass</span>;
  if (v === 'blocked') return <span className="smc-st blocked">blocked</span>;
  if (v === 'pass_with_issues') return <span className="smc-st in-progress">pass w/ issues</span>;
  return <span className="smc-st open">{v ?? 'in progress'}</span>;
}

export function QaWorkspace({ suites, runs, findings }: { suites: Suite[]; runs: Run[]; findings: Finding[] }) {
  const [tab, setTab] = useState<'suites' | 'findings' | 'runs'>('suites');
  const router = useRouter();
  const [pending, start] = useTransition();
  const openFindings = findings.filter((f) => f.status !== 'promoted').length;
  const totalCases = suites.reduce((a, s) => a + s.caseCount, 0);

  const tabBtn = (k: typeof tab, label: string, n?: number) => (
    <div onClick={() => setTab(k)} style={{ padding: '11px 14px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', color: tab === k ? '#1f487c' : '#64748b', borderBottom: `2px solid ${tab === k ? '#279491' : 'transparent'}` }}>{label}{n != null ? ` (${n})` : ''}</div>
  );

  function promote(id: string) {
    start(async () => { const r = await promoteFinding(id); router.refresh(); if ('issueRef' in r) alert(`Promoted to tracker issue ${r.issueRef}`); });
  }
  function triage(id: string, status: string) { start(async () => { await setFindingStatus(id, status); router.refresh(); }); }

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Delivery · Quality</div><h1>QA Workspace</h1><p>Authored suites, guided runs, and structured findings. Internal-first; external tester sharing and reporting are next.</p></div>
        <div className="ha"><span className="smc-st in-progress">staging</span></div>
      </div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{suites.length}</div><div className="l">Suites</div></div>
        <div className="smc-kp"><div className="v">{totalCases}</div><div className="l">Cases</div></div>
        <div className="smc-kp teal"><div className="v">{runs.length}</div><div className="l">Recent Runs</div></div>
        <div className={`smc-kp ${openFindings ? 'amber' : 'green'}`}><div className="v">{openFindings}</div><div className="l">Open Findings</div></div>
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', padding: '0 24px', background: '#fff' }}>
        {tabBtn('suites', 'Suites')}{tabBtn('findings', 'Findings', findings.length)}{tabBtn('runs', 'Runs', runs.length)}
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
            {suites.length === 0 && <p style={{ color: '#64748b' }}>No suites yet.</p>}
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Suites and their steps are editable DB records — the steps are the testing documentation.</div>
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
                      {f.status === 'promoted' ? <span style={{ fontSize: 11, color: '#94a3b8' }}>linked ↔ issue</span> : (
                        <>
                          {f.status !== 'triaged' && <button className="smc-btn" style={{ fontSize: 11, marginRight: 6 }} disabled={pending} onClick={() => triage(f.id, 'triaged')}>Triage</button>}
                          <button className="smc-btn smc-btn-p" style={{ fontSize: 11 }} disabled={pending} onClick={() => promote(f.id)}>Promote</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {findings.length === 0 && <tr><td colSpan={6} style={{ padding: 16, color: '#64748b' }}>No findings yet — run a suite and log failures.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'runs' && (
          <div style={{ display: 'grid', gap: 9 }}>
            {runs.map((r) => (
              <div key={r.id} style={{ ...card, display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 14, alignItems: 'center' }}>
                <div><div style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#1f487c' }}>{r.run_ref}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{r.suite_filter}</div></div>
                <div>{verdictPill(r.verdict)}</div>
                <div style={{ textAlign: 'center' }}><b style={{ fontFamily: 'DM Mono' }}>{r.pass_rate_pct ?? 0}%</b><div style={{ fontSize: 9, color: '#94a3b8' }}>PASS</div></div>
                <div style={{ textAlign: 'center' }}><b style={{ fontFamily: 'DM Mono', color: r.steps_failed ? '#ef4444' : '#1e293b' }}>{r.steps_failed ?? 0}</b><div style={{ fontSize: 9, color: '#94a3b8' }}>FAILS</div></div>
                <div style={{ textAlign: 'center' }}><b style={{ fontFamily: 'DM Mono' }}>{r.bugs_filed ?? 0}</b><div style={{ fontSize: 9, color: '#94a3b8' }}>FINDINGS</div></div>
              </div>
            ))}
            {runs.length === 0 && <p style={{ color: '#64748b' }}>No runs recorded yet.</p>}
          </div>
        )}
      </div>
    </>
  );
}
