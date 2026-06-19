'use server';

import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type TokenRunResult = { caseKey: string; stepTitle: string; status: 'pass' | 'fail' | 'blocked'; isCritical: boolean; expected: string; actual?: string };
export type TokenRunFinding = { caseKey: string; title: string; severity: string; expected: string; actual: string };
export type TokenRunPayload = { appVersion: string; results: TokenRunResult[]; findings: TokenRunFinding[] };

function rnd(n = 3) { return Math.floor(Math.random() * (9 * 10 ** (n - 1))) + 10 ** (n - 1); }
function stamp() { return new Date().toISOString().slice(2, 10).replace(/-/g, ''); }

async function resolveToken(svc: any, token: string) {
  const { data } = await svc.from('qa_share_links').select('*').eq('token', token).eq('link_type', 'tester_run').maybeSingle();
  if (!data) return null;
  if (data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

/** Public, token-gated run submission. Validates the token server-side; writes via service role. */
export async function submitTokenRun(token: string, payload: TokenRunPayload): Promise<{ ref: string } | { error: string }> {
  const svc = createServiceRoleClient() as any;
  const link = await resolveToken(svc, token);
  if (!link) return { error: 'This testing link is invalid, expired, or revoked.' };

  const suiteKey: string = link.suite_key;
  const orgId: string = link.organization_id;
  const tester = link.tester_email || 'External tester';

  const total = payload.results.length;
  const passed = payload.results.filter((r) => r.status === 'pass').length;
  const failed = payload.results.filter((r) => r.status === 'fail').length;
  const blocked = payload.results.filter((r) => r.status === 'blocked').length;
  const criticalFailures = payload.results.filter((r) => r.isCritical && r.status === 'fail').length;
  const passRate = total ? Math.round((passed / total) * 100) : 0;
  const verdict = criticalFailures > 0 ? 'blocked' : failed > 0 ? 'pass_with_issues' : 'pass';
  const runRef = `RUN-${stamp()}-${rnd()}`;
  const now = new Date().toISOString();

  const { data: runRow } = await svc.from('qa_test_runs').insert({
    run_ref: runRef, run_type: 'external', tester_name: tester, tester_email: link.tester_email ?? null,
    environment: 'shared-link', app_version: payload.appVersion || null, suite_filter: suiteKey,
    status: 'completed', verdict, total_steps: total, steps_passed: passed, steps_failed: failed,
    steps_blocked: blocked, pass_rate_pct: passRate, bugs_filed: payload.findings.length,
    critical_failures: criticalFailures, started_at: now, completed_at: now,
  }).select('id, suite_filter').single();
  const runId = runRow?.id ?? null;

  if (total) {
    await svc.from('qa_step_results').insert(payload.results.map((r) => ({
      run_id: runId, step_id: r.caseKey, suite_id: suiteKey, step_title: r.stepTitle, status: r.status,
      is_critical: r.isCritical, expected_result: r.expected, actual_result: r.actual ?? null, tested_at: now,
    })));
  }
  if (payload.findings.length) {
    await svc.from('qa_findings').insert(payload.findings.map((f) => ({
      organization_id: orgId, finding_ref: `QA-F-${rnd()}`, run_id: runId, suite_key: suiteKey, case_key: f.caseKey,
      title: f.title, severity: f.severity, expected_result: f.expected, actual_result: f.actual,
      environment: 'shared-link', reported_by: tester, reporter_kind: 'external', status: 'new',
    })));
  }
  await svc.from('qa_share_links').update({ use_count: (link.use_count ?? 0) + 1, last_used_at: now }).eq('id', link.id);
  return { ref: runRef };
}
