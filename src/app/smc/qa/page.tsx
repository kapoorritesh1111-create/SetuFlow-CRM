import { createClient } from '@/lib/supabase/server';
import { QaWorkspace } from './qa-workspace';

export const dynamic = 'force-dynamic';

export default async function SmcQaPage() {
  const supabase = await createClient();
  const sb = supabase as any;
  const [suitesRes, casesRes, runsRes, findingsRes] = await Promise.all([
    sb.from('qa_test_suites').select('suite_key, title, area, description, target_sprint, sort_order').order('sort_order', { ascending: true }),
    sb.from('qa_test_cases').select('suite_key, is_critical'),
    sb.from('qa_test_runs').select('id, run_ref, suite_filter, verdict, pass_rate_pct, total_steps, steps_failed, bugs_filed, completed_at').order('created_at', { ascending: false }).limit(8),
    sb.from('qa_findings').select('id, finding_ref, title, severity, suite_key, case_key, reporter_kind, reported_by, status, promoted_issue_ref, created_at').order('created_at', { ascending: false }).limit(50),
  ]);

  const cases = (casesRes.data ?? []) as { suite_key: string; is_critical: boolean }[];
  const suites = ((suitesRes.data ?? []) as any[]).map((s) => ({
    ...s,
    caseCount: cases.filter((c) => c.suite_key === s.suite_key).length,
    criticalCount: cases.filter((c) => c.suite_key === s.suite_key && c.is_critical).length,
  }));

  return <QaWorkspace suites={suites} runs={(runsRes.data ?? []) as any[]} findings={(findingsRes.data ?? []) as any[]} />;
}
