'use client';

import { useState, useTransition } from 'react';
import { submitTokenRun, type TokenRunResult, type TokenRunFinding } from './token-actions';

type Case = { case_key: string; suite_key: string; suite_title: string; title: string; instruction: string | null; expected_result: string | null; is_critical: boolean; target_path: string | null };
type Status = 'pass' | 'fail' | 'blocked';
type F = { title: string; actual: string; evidenceUrl?: string; uploading?: boolean };

export function TokenRunBoard({ token, cases, multiSuite }: { token: string; cases: Case[]; multiSuite: boolean }) {
  const [pending, start] = useTransition();
  const [appVersion, setAppVersion] = useState('');
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [findings, setFindings] = useState<Record<string, F>>({});
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const count = Object.keys(marks).length;
  const pct = cases.length ? Math.round((count / cases.length) * 100) : 0;
  const needsDetail = (s?: Status) => s === 'fail' || s === 'blocked';

  function mark(c: Case, s: Status) {
    setMarks((m) => ({ ...m, [c.case_key]: s }));
    setFindings((f) => {
      if (needsDetail(s)) return f[c.case_key] ? f : { ...f, [c.case_key]: { title: c.title, actual: '' } };
      const n = { ...f }; delete n[c.case_key]; return n;
    });
  }
  function setF(k: string, patch: Partial<F>) { setFindings((f) => ({ ...f, [k]: { ...(f[k] || { title: '', actual: '' }), ...patch } })); }

  async function uploadShot(c: Case, file: File) {
    setErr(null); setF(c.case_key, { uploading: true });
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('token', token); fd.append('suite', c.suite_key);
      const res = await fetch('/api/public/qa-evidence', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j?.error || 'Upload failed'); setF(c.case_key, { uploading: false }); return; }
      setF(c.case_key, { evidenceUrl: j.url, uploading: false });
    } catch { setErr('Screenshot upload failed — you can still submit.'); setF(c.case_key, { uploading: false }); }
  }

  function finish() {
    const results: TokenRunResult[] = cases.filter((c) => marks[c.case_key]).map((c) => ({
      caseKey: c.case_key, suiteKey: c.suite_key, stepTitle: c.title, status: marks[c.case_key],
      isCritical: c.is_critical, expected: c.expected_result ?? '', actual: findings[c.case_key]?.actual,
    }));
    const runFindings: TokenRunFinding[] = cases.filter((c) => needsDetail(marks[c.case_key])).map((c) => ({
      caseKey: c.case_key, suiteKey: c.suite_key,
      title: findings[c.case_key]?.title || ((marks[c.case_key] === 'blocked' ? 'Blocked: ' : '') + c.title),
      severity: marks[c.case_key] === 'fail' && c.is_critical ? 'High' : 'Medium',
      expected: c.expected_result ?? '', actual: findings[c.case_key]?.actual ?? '', evidenceUrl: findings[c.case_key]?.evidenceUrl,
    }));
    start(async () => {
      const r = await submitTokenRun(token, { appVersion, results, findings: runFindings });
      if ('error' in r) setErr(r.error); else setDoneRef(r.ref);
    });
  }

  if (doneRef) return <div className="pcard"><h3>Thank you — your test run was recorded</h3><p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>Reference {doneRef}. The SETU Flow team will review any issues you reported. You can close this tab.</p></div>;

  return (
    <>
      <div className="pcard" style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13 }}>Build / version <input className="pinp" style={{ width: 130, display: 'inline-block', marginTop: 0, marginLeft: 6 }} value={appVersion} onChange={(e) => setAppVersion(e.target.value)} placeholder="optional" /></label>
        <div style={{ flex: 1, minWidth: 120, height: 9, borderRadius: 6, background: '#e2e8f0', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#279491,#1f487c)' }} /></div>
        <span style={{ fontSize: 12, color: '#64748b' }}>{count}/{cases.length}</span>
        <button className="pbtn primary" disabled={pending || count === 0} onClick={finish}>{pending ? 'Submitting…' : 'Submit run'}</button>
      </div>
      {err && <div className="pcard" style={{ borderColor: '#f3b4b4', background: '#fff7f7', color: '#b91c1c' }}>{err}</div>}
      {cases.map((c, i) => {
        const showHeader = multiSuite && (i === 0 || cases[i - 1].suite_key !== c.suite_key);
        const st = marks[c.case_key];
        return (
          <div key={c.case_key}>
            {showHeader && <div className="psuite">{c.suite_title}</div>}
            <div className="pcard">
              <div style={{ display: 'flex', gap: 11 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: '#e6f5f4', color: '#1f487c', fontWeight: 700, fontSize: 12, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 14 }}>{c.title} {c.is_critical && <span style={{ fontSize: 10, color: '#d33', border: '1px solid #f3b4b4', borderRadius: 5, padding: '1px 6px', marginLeft: 6 }}>critical</span>}</h4>
                  {c.instruction && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{c.instruction}</div>}
                  {c.target_path && <a className="plink" href={c.target_path} target="_blank" rel="noopener noreferrer">Where to test: setuflowcrm.com{c.target_path} ↗</a>}
                  {c.expected_result && <div style={{ fontSize: 12.5, color: '#0f9d76', marginTop: 8, background: '#ecfdf5', border: '1px solid #cdeede', borderRadius: 7, padding: '6px 9px' }}>Expected: {c.expected_result}</div>}
                  <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                    {(['pass', 'fail', 'blocked'] as Status[]).map((stt) => {
                      const on = st === stt;
                      const col = stt === 'pass' ? ['#ecfdf5', '#9fe6cd', '#0f9d76'] : stt === 'fail' ? ['#fef2f2', '#f3b4b4', '#d33'] : ['#fef3c7', '#f3d9a8', '#d97706'];
                      return <button key={stt} onClick={() => mark(c, stt)} style={{ font: 'inherit', fontSize: 12, fontWeight: 600, padding: '5px 13px', borderRadius: 7, cursor: 'pointer', textTransform: 'capitalize', border: `1px solid ${on ? col[1] : '#e2e8f0'}`, background: on ? col[0] : '#fff', color: on ? col[2] : '#475569' }}>{stt}</button>;
                    })}
                  </div>
                  {needsDetail(st) && (
                    <div style={{ marginTop: 11, border: '1px dashed #f3b4b4', background: '#fff7f7', borderRadius: 9, padding: 11 }}>
                      <input className="pinp" value={findings[c.case_key]?.title ?? ''} onChange={(e) => setF(c.case_key, { title: e.target.value })} placeholder={st === 'blocked' ? 'What blocked you (title)' : 'What went wrong (title)'} />
                      <input className="pinp" value={findings[c.case_key]?.actual ?? ''} onChange={(e) => setF(c.case_key, { actual: e.target.value })} placeholder="What actually happened" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        <label className="pbtn" style={{ cursor: 'pointer' }}>{findings[c.case_key]?.uploading ? 'Uploading…' : '📎 Attach screenshot'}<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadShot(c, f); }} /></label>
                        {findings[c.case_key]?.evidenceUrl && <a href={findings[c.case_key]?.evidenceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0f9d76', fontWeight: 600 }}>✓ Screenshot attached</a>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
