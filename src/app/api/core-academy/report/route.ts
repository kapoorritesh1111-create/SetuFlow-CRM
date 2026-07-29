import { NextResponse } from 'next/server';
import { coreAcademyStepCount } from '@/features/academy/core-academy-content';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resolvedStatuses = new Set(['resolved', 'closed', 'done', 'verified']);
const inProgressStatuses = new Set(['in progress', 'in review', 'testing', 'qa', 'ready for qa', 'ready for retest', 'retest']);
const openStatuses = new Set(['open', 'new', 'backlog', 'reported']);
const deferredStatuses = new Set(['deferred', "won't fix", 'wont fix']);

function statusBucket(status: unknown) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (resolvedStatuses.has(normalized)) return 'resolved';
  if (inProgressStatuses.has(normalized)) return 'inProgress';
  if (deferredStatuses.has(normalized)) return 'deferred';
  if (openStatuses.has(normalized) || !normalized) return 'open';
  return 'inProgress';
}

function latestDate(...values: Array<string | null | undefined>) {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(String(value)))
    .filter((value) => !Number.isNaN(value.getTime()));
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((value) => value.getTime()))).toISOString();
}

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  if (!workspace.canAccessAdmin) {
    return NextResponse.json({ error: 'Owner or admin access is required.' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: 'Admin database access is unavailable.' }, { status: 503 });

  const organizationId = workspace.organization.id;
  const [membersResult, progressResult, runsResult, resultsResult, issuesResult] = await Promise.all([
    (admin as any)
      .from('organization_members')
      .select('id,user_id,created_at,updated_at')
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    (admin as any)
      .from('core_academy_progress')
      .select('user_id,step_id,is_complete,updated_at,last_seen_at,completed_at')
      .eq('organization_id', organizationId),
    (admin as any)
      .from('core_academy_test_runs')
      .select('id,tester_user_id,tester_name,tested_role,status,started_at,updated_at,completed_at')
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false }),
    (admin as any)
      .from('core_academy_test_results')
      .select('id,run_id,tested_by,step_id,result,linked_issue_ref,tested_at,updated_at')
      .eq('organization_id', organizationId)
      .order('tested_at', { ascending: false }),
    (admin as any)
      .from('sprint_issues')
      .select('id,issue_ref,title,status,priority,severity,reported_at,resolved_at,updated_at')
      .eq('client_org_id', organizationId)
      .eq('submitted_via', 'Core Academy')
      .order('reported_at', { ascending: false }),
  ]);

  const queryError = membersResult.error || progressResult.error || runsResult.error || resultsResult.error || issuesResult.error;
  if (queryError) {
    return NextResponse.json({ error: queryError.message || 'Could not load the Core Academy report.' }, { status: 500 });
  }

  const members = membersResult.data ?? [];
  const progress = progressResult.data ?? [];
  const runs = runsResult.data ?? [];
  const results = resultsResult.data ?? [];
  const issues = issuesResult.data ?? [];

  const runById = new Map(runs.map((run: any) => [run.id, run]));
  const userIds = new Set<string>();
  members.forEach((member: any) => member.user_id && userIds.add(member.user_id));
  progress.forEach((row: any) => row.user_id && userIds.add(row.user_id));
  runs.forEach((run: any) => run.tester_user_id && userIds.add(run.tester_user_id));
  results.forEach((row: any) => {
    const run = runById.get(row.run_id) as any;
    const userId = row.tested_by || run?.tester_user_id;
    if (userId) userIds.add(userId);
  });

  let profiles: any[] = [];
  if (userIds.size) {
    const profileResult = await (admin as any)
      .from('profiles')
      .select('id,full_name,email,avatar_url')
      .in('id', [...userIds]);
    profiles = profileResult.data ?? [];
  }

  const profileById = new Map(profiles.map((profile: any) => [profile.id, profile]));
  const latestRunByUser = new Map<string, any>();
  runs.forEach((run: any) => {
    if (run.tester_user_id && !latestRunByUser.has(run.tester_user_id)) latestRunByUser.set(run.tester_user_id, run);
  });

  const progressByUser = new Map<string, Map<string, any>>();
  progress.forEach((row: any) => {
    if (!row.user_id) return;
    const steps = progressByUser.get(row.user_id) ?? new Map<string, any>();
    const current = steps.get(row.step_id);
    if (!current || new Date(row.updated_at ?? 0).getTime() >= new Date(current.updated_at ?? 0).getTime()) {
      steps.set(row.step_id, row);
    }
    progressByUser.set(row.user_id, steps);
  });

  const testsByUser = new Map<string, any[]>();
  results.forEach((row: any) => {
    const run = runById.get(row.run_id) as any;
    const userId = row.tested_by || run?.tester_user_id;
    if (!userId) return;
    const rows = testsByUser.get(userId) ?? [];
    rows.push(row);
    testsByUser.set(userId, rows);
  });

  const issueByRef = new Map(issues.map((issue: any) => [issue.issue_ref, issue]));
  const learners = [...userIds].map((userId) => {
    const profile = profileById.get(userId) as any;
    const latestRun = latestRunByUser.get(userId) as any;
    const stepRows = [...(progressByUser.get(userId)?.values() ?? [])] as any[];
    const completedSteps = new Set(stepRows.filter((row) => row.is_complete).map((row) => row.step_id));
    const tests = testsByUser.get(userId) ?? [];
    const counts = { pass: 0, fail: 0, blocked: 0, na: 0 };
    tests.forEach((row: any) => {
      const value = String(row.result ?? '').toLowerCase();
      if (value === 'pass') counts.pass += 1;
      else if (value === 'fail') counts.fail += 1;
      else if (value === 'blocked') counts.blocked += 1;
      else if (value === 'n/a') counts.na += 1;
    });
    const issueRefs = [...new Set(tests.map((row: any) => row.linked_issue_ref).filter(Boolean))] as string[];
    const linkedIssues = issueRefs.map((ref) => issueByRef.get(ref)).filter(Boolean) as any[];
    const issueCounts = { reported: linkedIssues.length, open: 0, inProgress: 0, resolved: 0, deferred: 0 };
    linkedIssues.forEach((issue) => {
      const bucket = statusBucket(issue.status);
      issueCounts[bucket] += 1;
    });
    const progressPercent = coreAcademyStepCount
      ? Math.min(100, Math.round((completedSteps.size / coreAcademyStepCount) * 100))
      : 0;
    const lastProgress = stepRows.reduce<string | null>((latest, row) => latestDate(latest, row.updated_at, row.last_seen_at, row.completed_at), null);
    const lastTest = tests.reduce<string | null>((latest, row: any) => latestDate(latest, row.tested_at, row.updated_at), null);
    const status = counts.blocked > 0
      ? 'Needs attention'
      : progressPercent === 100
        ? 'Complete'
        : completedSteps.size > 0 || tests.length > 0
          ? 'In progress'
          : 'Not started';

    return {
      userId,
      name: profile?.full_name || latestRun?.tester_name || profile?.email || 'Academy learner',
      email: profile?.email || null,
      avatarUrl: profile?.avatar_url || null,
      testedRole: latestRun?.tested_role || null,
      status,
      completedSteps: completedSteps.size,
      totalSteps: coreAcademyStepCount,
      progressPercent,
      tests: { total: tests.length, ...counts },
      issues: issueCounts,
      lastActivity: latestDate(lastProgress, lastTest, latestRun?.updated_at, latestRun?.started_at),
    };
  }).sort((a, b) => new Date(b.lastActivity ?? 0).getTime() - new Date(a.lastActivity ?? 0).getTime());

  const issueSummary = { reported: issues.length, open: 0, inProgress: 0, resolved: 0, deferred: 0 };
  issues.forEach((issue: any) => {
    const bucket = statusBucket(issue.status);
    issueSummary[bucket] += 1;
  });

  const testSummary = { total: results.length, pass: 0, fail: 0, blocked: 0, na: 0 };
  results.forEach((row: any) => {
    const value = String(row.result ?? '').toLowerCase();
    if (value === 'pass') testSummary.pass += 1;
    else if (value === 'fail') testSummary.fail += 1;
    else if (value === 'blocked') testSummary.blocked += 1;
    else if (value === 'n/a') testSummary.na += 1;
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    organization: { id: workspace.organization.id, name: workspace.organization.name || workspace.organization.slug || 'Organization' },
    totalSteps: coreAcademyStepCount,
    summary: {
      activeLearners: members.length,
      startedLearners: learners.filter((row) => row.status !== 'Not started').length,
      testedLearners: learners.filter((row) => row.tests.total > 0).length,
      completedLearners: learners.filter((row) => row.progressPercent === 100).length,
      tests: testSummary,
      issues: issueSummary,
    },
    learners,
    latestIssues: issues.slice(0, 25).map((issue: any) => ({
      issueRef: issue.issue_ref,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      severity: issue.severity,
      reportedAt: issue.reported_at,
      resolvedAt: issue.resolved_at,
      updatedAt: issue.updated_at,
    })),
  });
}
