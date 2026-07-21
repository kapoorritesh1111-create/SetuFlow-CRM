'use client';

import { useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { submitRun, type RunResult, type RunFinding } from '../../qa-actions';

type Case = { case_key: string; title: string; instruction: string | null; expected_result: string | null; is_critical: boolean; target_path: string | null };
type Status = 'pass' | 'fail' | 'blocked';
type F = { title: string; actual: string; evidenceUrl?: string; uploading?: boolean };

export function RunBoard({ suiteKey, suiteTitle, environment, cases }: { suiteKey: string; suiteTitle: string; environment: string; cases: Case[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [appVersion, setAppVersion] = useState('');
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [findings, setFindings] = useState<Record<string, F>>({});
  const [err, setErr] = useState<string | null>(null);

  const done = Object.keys(marks).length;
  const pass = Object.values(marks).filter((m) => m === 'pass').length;
  const fail = Object.values(marks).filter((m) => m === 'fail').length;
  const block = Object.values(marks).filter((m) => m === 'blocked').length;
  const pct = cases.length ? Math.round((done / cases.length) * 100) : 0;
  const needsDetail = (s?: Status) => s === 'fail' || s === 'blocked';

  function mark(c: Case, s: Status) {
    setMarks((m) => ({ ...m, [c.case_key]: s }));
    setFindings((f) => {
      if (needsDetail(s)) return f[c.case_key] ? f : { ...f, [c.case_key]: { title: c.title, actual: '' } };
      const n = { ...f }; delete n[c.case_key]; return n;
    });
  }
  function setFinding(k: string, patch: Partial<F>) { setFindings((f) => ({ ...f, [k]: { ...(f[k] || { title: '', actual: '' }), ...patch } })); }

  async function uploadShot(c: Case, file: File) {
    setErr(null); setFinding(c.case_key, { uploading: true });
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('suite', suiteKey);
      const res = await fetch('/api/public/qa-evidence', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j?.error || 'Upload failed'); setFinding(c.case_key, { uploading: false }); return; }
      setFinding(c.case_key, { evidenceUrl: j.url, uploading: false });
    } catch { setErr('Screenshot upload failed — you can still save the run.'); setFinding(c.case_key, { uploading: false }); }
  }

  const cssCard: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 10, padding: 13, marginBottom: 9, background: '#fff' };

  function finish() {
    const results: RunResult[] = cases.filter((c) => marks[c.case_key]).map((c) => ({
      caseKey: c.case_key, stepTitle: c.title, status: marks[c.case_key], isCritical: c.is_critical,
      expected: c.expected_result ?? '', actual: findings[c.case_key]?.actual, note: undefined,
    }));
    const runFindings: RunFinding[] = cases.filter((c) => needsDetail(marks[c.case_key])).map((c) => ({
      caseKey: c.case_key, title: findings[c.case_key]?.title || ((marks[c.case_key] === 'blocked' ? 'Blocked: ' : '') + c.title),
      severity: marks[c.case_key] === 'fail' && c.is_critical ? 'High' : 'Medium', expected: c.expected_result ?? '',
      actual: findings[c.case_key]?.actual ?? '', evidenceUrl: findings[c.case_key]?.evidenceUrl,
    }));
    start(async () => {
      const r = await submitRun({ suiteKey, suiteTitle, environment, appVersion, testerName: 'SETU Flow', results, findings: runFindings });
      router.push('/smc/qa'); router.refresh();
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
      <div className="smc-cs">
      {err && <div style={{ margin: '12px 24px 0', padding: 10, borderRadius: 8, border: '1px solid #f3b4b4', background: '#fff7f7', color: '#b91c1c', fontSize: 12.5 }}>{err}</div>}
      <div style={{ padding: '18px 24px' }}>
        {cases.map((c, i) => (
          <div key={c.case_key} style={cssCard}>
            <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: '#e6f5f4', color: '#1f487c', fontWeight: 700, fontSize: 11, display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'DM Mono' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 13 }}>{c.title} {c.is_critical && <span className="smc-st blocked" style={{ fontSize: 9, marginLeft: 6 }}>critical</span>}</h4>
                {c.instruction && <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>{c.instruction}</div>}
                {c.target_path && <a href={c.target_path} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#1f487c', fontWeight: 600, textDecoration: 'none', background: '#eef4fb', border: '1px solid #cfe0f0', borderRadius: 7, padding: '3px 9px', marginTop: 6 }}>Where to test: setuflowcrm.com{c.target_path} ↗</a>}
                {c.expected_result && <div style={{ fontSize: 11.5, color: '#0f9d76', marginTop: 6, background: '#ecfdf5', border: '1px solid #cdeede', borderRadius: 7, padding: '6px 9px' }}>Expected: {c.expected_result}</div>}
                <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                  {(['pass', 'fail', 'blocked'] as Status[]).map((stt) => {
                    const on = marks[c.case_key] === stt;
                    const col = stt === 'pass' ? ['#ecfdf5', '#9fe6cd', '#0f9d76'] : stt === 'fail' ? ['#fef2f2', '#f3b4b4', '#d33'] : ['#fef3c7', '#f3d9a8', '#d97706'];
                    return <button key={stt} onClick={() => mark(c, stt)} style={{ font: 'inherit', fontSize: 11.5, fontWeight: 600, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', textTransform: 'capitalize', border: `1px solid ${on ? col[1] : '#e2e8f0'}`, background: on ? col[0] : '#fff', color: on ? col[2] : '#475569' }}>{stt}</button>;
                  })}
                </div>
                {needsDetail(marks[c.case_key]) && (
                  <div style={{ marginTop: 11, border: '1px dashed #f3b4b4', background: '#fff7f7', borderRadius: 9, padding: 11 }}>
                    <div style={{ fontSize: 10.5, color: '#475569', display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
                      {[`Suite: ${suiteTitle}`, `Case: ${c.case_key}`, `${environment}${appVersion ? ` · ${appVersion}` : ''}`, marks[c.case_key] === 'blocked' ? 'Blocked' : `Severity: ${c.is_critical ? 'High (critical)' : 'Medium'}`].map((t) => <span key={t} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 7px' }}>{t}</span>)}
                    </div>
                    <input className="smc-input" value={findings[c.case_key]?.title ?? ''} onChange={(e) => setFinding(c.case_key, { title: e.target.value })} placeholder={marks[c.case_key] === 'blocked' ? 'What blocked you (title)' : 'Finding title'} />
                    <input className="smc-input" value={findings[c.case_key]?.actual ?? ''} onChange={(e) => setFinding(c.case_key, { actual: e.target.value })} placeholder="Actual result (what happened)…" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <label className="smc-btn" style={{ cursor: 'pointer', fontSize: 11 }}>{findings[c.case_key]?.uploading ? 'Uploading…' : '📎 Attach screenshot'}<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadShot(c, f); }} /></label>
                      {findings[c.case_key]?.evidenceUrl && <a href={findings[c.case_key]?.evidenceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: '#0f9d76', fontWeight: 600 }}>✓ Screenshot attached</a>}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Repro = the case steps above — captured automatically when the run is saved.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {cases.length === 0 && <p style={{ color: '#64748b' }}>This suite has no cases yet.</p>}
      </div>
      </div>
    </>
  );
}
