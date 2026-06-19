'use server';

import { revalidatePath } from 'next/cache';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { randomUUID } from 'crypto';

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

// ---- S33-QA-003: share links (mint / revoke) ----
export type ShareLinkInput = { linkType: 'tester_run' | 'report_view'; suiteKey?: string; snapshotId?: string; label?: string; testerEmail?: string; expiresInDays?: number };

export async function createShareLink(input: ShareLinkInput): Promise<{ token: string }> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;
  const token = randomUUID().replace(/-/g, '');
  const expires_at = input.expiresInDays && input.expiresInDays > 0
    ? new Date(Date.now() + input.expiresInDays * 864e5).toISOString() : null;
  await admin.from('qa_share_links').insert({
    organization_id: INTERNAL_ORG_ID, token, link_type: input.linkType,
    suite_key: input.suiteKey ?? null, snapshot_id: input.snapshotId ?? null,
    label: input.label ?? null, tester_email: input.testerEmail ?? null,
    created_by: 'SETU Flow', expires_at,
  });
  revalidatePath('/smc/qa');
  return { token };
}

export async function revokeShareLink(id: string): Promise<void> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;
  await admin.from('qa_share_links').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/smc/qa');
}

// ---- S33-QA-004: freeze a publishable report snapshot ----
export async function publishSnapshot(input: { title: string; releaseLabel?: string; scope?: string }): Promise<{ token: string }> {
  await requireSetuInternalAdminWorkspace();
  const admin = createAdminSupabaseClient() as any;

  const [{ data: steps }, { data: findings }, { data: suites }, { data: cases }] = await Promise.all([
    admin.from('qa_step_results').select('status, is_critical, suite_id, suite_title'),
    admin.from('qa_findings').select('status'),
    admin.from('qa_test_suites').select('suite_key, title'),
    admin.from('qa_test_cases').select('suite_key'),
  ]);
  const st = (steps ?? []) as { status: string; is_critical: boolean; suite_id: string | null; suite_title: string | null }[];
  const total = st.length;
  const passed = st.filter((s) => s.status === 'pass').length;
  const crit = st.filter((s) => s.is_critical);
  const critPassed = crit.filter((s) => s.status === 'pass').length;
  const passRate = total ? Math.round((passed / total) * 100) : 0;
  const critPassPct = crit.length ? Math.round((critPassed / crit.length) * 100) : 100;
  const verdict = total === 0 ? 'no_data' : crit.length && critPassed < crit.length ? 'blocked' : passRate >= 90 ? 'release_ready' : 'review';

  const breakdown: Record<string, { title: string; total: number; passed: number; pct: number }> = {};
  for (const s of st) {
    const key = s.suite_id ?? 'unknown';
    const b = breakdown[key] ?? { title: s.suite_title ?? key, total: 0, passed: 0, pct: 0 };
    b.total++; if (s.status === 'pass') b.passed++;
    breakdown[key] = b;
  }
  Object.values(breakdown).forEach((b) => { b.pct = b.total ? Math.round((b.passed / b.total) * 100) : 0; });

  const metrics = {
    suitesTotal: (suites ?? []).length, suitesCovered: Object.keys(breakdown).length,
    casesTotal: (cases ?? []).length, stepsExecuted: total, passed,
    findingsTotal: (findings ?? []).length, findingsOpen: ((findings ?? []) as { status: string }[]).filter((f) => f.status !== 'promoted').length,
  };

  const snapRef = `QAR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
  const { data: snap } = await admin.from('qa_report_snapshots').insert({
    organization_id: INTERNAL_ORG_ID, snapshot_ref: snapRef, title: input.title,
    release_label: input.releaseLabel ?? null, scope: input.scope ?? null, verdict,
    pass_rate_pct: passRate, critical_pass_pct: critPassPct,
    metrics, suite_breakdown: breakdown, published_at: new Date().toISOString(), created_by: 'SETU Flow',
  }).select('id').single();

  const { token } = await createShareLink({ linkType: 'report_view', snapshotId: snap?.id, label: input.title });
  revalidatePath('/smc/qa');
  return { token };
}
