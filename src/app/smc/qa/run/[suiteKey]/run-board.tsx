'use client';

import { useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { submitRun, type RunResult, type RunFinding } from '../../qa-actions';

type Case = { case_key: string; title: string; instruction: string | null; expected_result: string | null; is_critical: boolean };
type Status = 'pass' | 'fail' | 'blocked';

export function RunBoard({ suiteKey, suiteTitle, environment, cases }: { suiteKey: string; suiteTitle: string; environment: string; cases: Case[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [appVersion, setAppVersion] = useState('');
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [findings, setFindings] = useState<Record<string, { title: string; actual: string }>>({});

  const done = Object.keys(marks).length;
  const pass = Object.values(marks).filter((m) => m === 'pass').length;
  const fail = Object.values(marks).filter((m) => m === 'fail').length;
  const block = Object.values(marks).filter((m) => m === 'blocked').length;
  const pct = cases.length ? Math.round((done / cases.length) * 100) : 0;

  function mark(c: Case, s: Status) {
    setMarks((m) => ({ ...m, [c.case_key]: s }));
    if (s === 'fail') setFindings((f) => f[c.case_key] ? f : { ...f, [c.case_key]: { title: c.title, actual: '' } });
    if (s !== 'fail') setFindings((f) => { const n = { ...f }; delete n[c.case_key]; return n; });
  }
  function setFinding(key: string, patch: Partial<{ title: string; actual: string }>) {
    setFindings((f) => ({ ...f, [key]: { ...f[key], ...patch } }));
  }

  const cssCard: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 10, padding: 13, marginBottom: 9, background: '#fff' };

  function finish() {
    const results: RunResult[] = cases.filter((c) => marks[c.case_key]).map((c) => ({
      caseKey: c.case_key, stepTitle: c.title, status: marks[c.case_key], isCritical: c.is_critical,
      expected: c.expected_result ?? '', actual: findings[c.case_key]?.actual, note: undefined,
    }));
    const runFindings: RunFinding[] = cases.filter((c) => marks[c.case_key] === 'fail').map((c) => ({
      caseKey: c.case_key, title: findings[c.case_key]?.title || c.title,
      severity: c.is_critical ? 'High' : 'Medium', expected: c.expected_result ?? '',
      actual: findings[c.case_key]?.actual ?? '',
    }));
    start(async () => {
      const r = await submitRun({ suiteKey, suiteTitle, environment, appVersion, testerName: 'SETU Flow', results, findings: runFindings });
      router.push('/smc/qa');
      router.refresh();
      alert(`Run saved as ${r.ref}${runFindings.length ? ` · ${runFindings.length} finding(s) filed` : ''}`);
    });
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: '#475569' }}>Build / version <input className="smc-input" style={{ width: 130, marginTop: 0, marginLeft: 6, display: 'inline-block' }} value={appVersion} onChange={(e) => setAppVersion(e.target.value)} placeholder="v2.4.0" /></label>
        <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: '#10b981' }}>{pass}</div><div style={{ fontSize: 9, color: '#94a3b8' }}>PASS</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: '#ef4444' }}>{fail}</div><div style={{ fontSize: 9, color: '#94a3b8' }}>FAIL</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: '#d97706' }}>{block}</div><div style={{ fontSize: 9, color: '#94a3b8' }}>BLOCK</div></div>
        <div style={{ flex: 1, minWidth: 120, height: 9, borderRadius: 6, background: '#e2e8f0', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#279491,#1f487c)' }} /></div>
        <button className="smc-btn smc-btn-p" disabled={pending || done === 0} onClick={finish}>{pending ? 'Saving…' : 'Finish & save run'}</button>
      </div>
      <div style={{ padding: '18px 24px' }}>
        {cases.map((c, i) => (
          <div key={c.case_key} style={cssCard}>
            <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: '#e6f5f4', color: '#1f487c', fontWeight: 700, fontSize: 11, display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'DM Mono' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 13 }}>{c.title} {c.is_critical && <span className="smc-st blocked" style={{ fontSize: 9, marginLeft: 6 }}>critical</span>}</h4>
                {c.instruction && <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>{c.instruction}</div>}
                {c.expected_result && <div style={{ fontSize: 11.5, color: '#0f9d76', marginTop: 6, background: '#ecfdf5', border: '1px solid #cdeede', borderRadius: 7, padding: '6px 9px' }}>Expected: {c.expected_result}</div>}
                <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                  {(['pass', 'fail', 'blocked'] as Status[]).map((st) => {
                    const on = marks[c.case_key] === st;
                    const col = st === 'pass' ? ['#ecfdf5', '#9fe6cd', '#0f9d76'] : st === 'fail' ? ['#fef2f2', '#f3b4b4', '#d33'] : ['#fef3c7', '#f3d9a8', '#d97706'];
                    return <button key={st} onClick={() => mark(c, st)} style={{ font: 'inherit', fontSize: 11.5, fontWeight: 600, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', textTransform: 'capitalize', border: `1px solid ${on ? col[1] : '#e2e8f0'}`, background: on ? col[0] : '#fff', color: on ? col[2] : '#475569' }}>{st}</button>;
                  })}
                </div>
                {marks[c.case_key] === 'fail' && (
                  <div style={{ marginTop: 11, border: '1px dashed #f3b4b4', background: '#fff7f7', borderRadius: 9, padding: 11 }}>
                    <div style={{ fontSize: 10.5, color: '#475569', display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
                      {[`Suite: ${suiteTitle}`, `Case: ${c.case_key}`, `${environment}${appVersion ? ` · ${appVersion}` : ''}`, `Severity: ${c.is_critical ? 'High (critical)' : 'Medium'}`].map((t) => <span key={t} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 7px' }}>{t}</span>)}
                    </div>
                    <input className="smc-input" value={findings[c.case_key]?.title ?? ''} onChange={(e) => setFinding(c.case_key, { title: e.target.value })} placeholder="Finding title" />
                    <input className="smc-input" value={findings[c.case_key]?.actual ?? ''} onChange={(e) => setFinding(c.case_key, { actual: e.target.value })} placeholder="Actual result (what happened)…" />
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Repro = the case steps above — captured automatically when the run is saved.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {cases.length === 0 && <p style={{ color: '#64748b' }}>This suite has no cases yet.</p>}
      </div>
    </>
  );
}
