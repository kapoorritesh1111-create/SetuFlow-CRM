import { createClient } from '@/lib/supabase/server';
import { QaWorkspace } from './qa-workspace';

export const dynamic = 'force-dynamic';

export default async function SmcQaPage() {
  const supabase = await createClient();
  const sb = supabase as any;
  const [suitesRes, casesRes, runsRes, findingsRes, linksRes, snapsRes, stepsRes] = await Promise.all([
    sb.from('qa_test_suites').select('suite_key, title, area, description, target_sprint, sort_order').order('sort_order', { ascending: true }),
    sb.from('qa_test_cases').select('suite_key, is_critical'),
    sb.from('qa_test_runs').select('id, run_ref, suite_filter, run_type, verdict, pass_rate_pct, total_steps, steps_failed, bugs_filed, completed_at').order('created_at', { ascending: false }).limit(10),
    sb.from('qa_findings').select('id, finding_ref, title, severity, suite_key, case_key, reporter_kind, reported_by, status, promoted_issue_ref, created_at').order('created_at', { ascending: false }).limit(50),
    sb.from('qa_share_links').select('id, token, link_type, suite_key, label, tester_email, expires_at, revoked_at, use_count, created_at').order('created_at', { ascending: false }),
    sb.from('qa_report_snapshots').select('id, snapshot_ref, title, release_label, verdict, pass_rate_pct, critical_pass_pct, published_at').order('created_at', { ascending: false }).limit(10),
    sb.from('qa_step_results').select('status, is_critical, suite_id, suite_title'),
  ]);

  const cases = (casesRes.data ?? []) as { suite_key: string; is_critical: boolean }[];
  const suites = ((suitesRes.data ?? []) as any[]).map((s) => ({
    ...s,
    caseCount: cases.filter((c) => c.suite_key === s.suite_key).length,
    criticalCount: cases.filter((c) => c.suite_key === s.suite_key && c.is_critical).length,
  }));

  // live report rollup
  const steps = (stepsRes.data ?? []) as { status: string; is_critical: boolean; suite_id: string | null; suite_title: string | null }[];
  const findings = (findingsRes.data ?? []) as any[];
  const total = steps.length;
  const passed = steps.filter((s) => s.status === 'pass').length;
  const crit = steps.filter((s) => s.is_critical);
  const critPassed = crit.filter((s) => s.status === 'pass').length;
  const bd: Record<string, { title: string; total: number; passed: number; pct: number }> = {};
  for (const s of steps) { const k = s.suite_id ?? 'unknown'; const b = bd[k] ?? { title: s.suite_title ?? k, total: 0, passed: 0, pct: 0 }; b.total++; if (s.status === 'pass') b.passed++; bd[k] = b; }
  Object.values(bd).forEach((b) => { b.pct = b.total ? Math.round((b.passed / b.total) * 100) : 0; });
  const rollup = {
    stepsExecuted: total, passRate: total ? Math.round((passed / total) * 100) : 0,
    criticalPassPct: crit.length ? Math.round((critPassed / crit.length) * 100) : 100,
    suitesCovered: Object.keys(bd).length, suitesTotal: suites.length, casesTotal: cases.length,
    findingsOpen: findings.filter((f) => f.status !== 'promoted').length, findingsTotal: findings.length,
    breakdown: Object.values(bd),
  };

  return <QaWorkspace suites={suites} runs={(runsRes.data ?? []) as any[]} findings={findings}
    links={(linksRes.data ?? []) as any[]} snapshots={(snapsRes.data ?? []) as any[]} rollup={rollup} />;
}
