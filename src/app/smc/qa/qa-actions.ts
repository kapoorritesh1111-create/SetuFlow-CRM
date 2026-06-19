'use server';

import { revalidatePath } from 'next/cache';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export type RunResult = { caseKey: string; stepTitle: string; status: 'pass' | 'fail' | 'blocked'; isCritical: boolean; expected: string; actual?: string; note?: string };
export type RunFinding = { caseKey: string; title: string; severity: string; expected: string; actual: string };
export type RunPayload = {
  suiteKey: string; suiteTitle: string; environment: string; appVersion: string; testerName: string;
  results: RunResult[]; findings: RunFinding[];
};

function rnd(n = 3) { return Math.floor(Math.random() * (9 * 10 ** (n - 1))) + 10 ** (n - 1); }
function stamp() { return new Date().toISOString().slice(2, 10).replace(/-/g, ''); }

/** Persist a completed run + its step results + any findings. Returns the run ref. */
export async function submitRun(payload: RunPayload): Promise<{ ref: string }> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;

  const total = payload.results.length;
  const passed = payload.results.filter((r) => r.status === 'pass').length;
  const failed = payload.results.filter((r) => r.status === 'fail').length;
  const blocked = payload.results.filter((r) => r.status === 'blocked').length;
  const criticalFailures = payload.results.filter((r) => r.isCritical && r.status === 'fail').length;
  const passRate = total ? Math.round((passed / total) * 100) : 0;
  const verdict = criticalFailures > 0 ? 'blocked' : failed > 0 ? 'pass_with_issues' : 'pass';
  const runRef = `RUN-${stamp()}-${rnd()}`;
  const now = new Date().toISOString();

  const { data: runRow } = await admin.from('qa_test_runs').insert({
    run_ref: runRef, run_type: 'internal', tester_name: payload.testerName || 'SETU Flow',
    environment: payload.environment || 'staging', app_version: payload.appVersion || null,
    suite_filter: payload.suiteKey, status: 'completed', verdict,
    total_steps: total, steps_passed: passed, steps_failed: failed, steps_blocked: blocked,
    pass_rate_pct: passRate, bugs_filed: payload.findings.length, critical_failures: criticalFailures,
    started_at: now, completed_at: now,
  }).select('id').single();
  const runId = runRow?.id ?? null;

  if (total) {
    await admin.from('qa_step_results').insert(payload.results.map((r) => ({
      run_id: runId, step_id: r.caseKey, suite_id: payload.suiteKey, suite_title: payload.suiteTitle,
      step_title: r.stepTitle, status: r.status, is_critical: r.isCritical,
      expected_result: r.expected, actual_result: r.actual ?? null, tester_note: r.note ?? null, tested_at: now,
    })));
  }
  if (payload.findings.length) {
    await admin.from('qa_findings').insert(payload.findings.map((f) => ({
      organization_id: INTERNAL_ORG_ID, finding_ref: `QA-F-${rnd()}`, run_id: runId,
      suite_key: payload.suiteKey, case_key: f.caseKey, title: f.title, severity: f.severity,
      expected_result: f.expected, actual_result: f.actual, environment: payload.environment || 'staging',
      app_version: payload.appVersion || null, reported_by: payload.testerName || 'SETU Flow',
      reporter_kind: 'internal', status: 'new',
    })));
  }
  revalidatePath('/smc/qa');
  return { ref: runRef };
}

/** Triage state change for a finding. */
export async function setFindingStatus(findingId: string, status: string): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;
  await admin.from('qa_findings').update({ status }).eq('id', findingId);
  revalidatePath('/smc/qa');
}

/** Promote a finding into the tracker as a governed issue, with a two-way backlink. */
export async function promoteFinding(findingId: string): Promise<{ issueRef: string } | { error: string }> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;

  const { data: f } = await admin.from('qa_findings').select('*').eq('id', findingId).single();
  if (!f) return { error: 'finding not found' };
  if (f.promoted_issue_ref) return { issueRef: f.promoted_issue_ref };

  const { data: meta } = await admin.from('sprint_meta').select('sprint_number, sprint_name').order('sprint_number', { ascending: false }).limit(1);
  const sprintNumber = meta?.[0]?.sprint_number ?? null;
  const sprintName = meta?.[0]?.sprint_name ?? 'Backlog';
  const issueRef = `QAB-${stamp()}-${rnd()}`;

  const description = [
    `Promoted from QA finding ${f.finding_ref ?? findingId}.`,
    f.suite_key ? `Suite: ${f.suite_key}${f.case_key ? ` · Case: ${f.case_key}` : ''}` : '',
    f.expected_result ? `Expected: ${f.expected_result}` : '',
    f.actual_result ? `Actual: ${f.actual_result}` : '',
    f.environment ? `Environment: ${f.environment}${f.app_version ? ` · ${f.app_version}` : ''}` : '',
  ].filter(Boolean).join('\n');

  await admin.from('sprint_issues').insert({
    organization_id: INTERNAL_ORG_ID, sprint_number: sprintNumber, sprint_name: sprintName,
    issue_ref: issueRef, title: f.title, description, status: 'open',
    severity: f.severity ?? 'Medium', issue_type: 'Bug', priority: f.severity === 'High' ? 'P1' : 'P2',
    qa_notes: `Source QA finding: ${f.finding_ref ?? findingId}`,
  });
  await admin.from('qa_findings').update({ status: 'promoted', promoted_issue_ref: issueRef }).eq('id', findingId);
  revalidatePath('/smc/qa');
  return { issueRef };
}
