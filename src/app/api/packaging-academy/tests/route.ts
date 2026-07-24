import { NextResponse } from 'next/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'packaging-test-evidence';
const allowedResults = new Set(['Pass', 'Fail', 'Blocked', 'N/A']);
const clean = (value: FormDataEntryValue | null, max = 4000) => String(value ?? '').trim().slice(0, max);

async function context() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization || !workspace.membership) return null;
  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  return {
    admin,
    organization: workspace.organization,
    membership: workspace.membership,
    user: workspace.user,
    profile: workspace.profile,
    currentRoles: workspace.currentRoles,
    canAccessAdmin: workspace.canAccessAdmin,
  };
}

async function createSprint49Issue(ctx: NonNullable<Awaited<ReturnType<typeof context>>>, resultId: string, device = '') {
  const { admin, organization, user, profile } = ctx;
  const { data: test, error: readError } = await (admin as any)
    .from('packaging_test_results')
    .select('*')
    .eq('id', resultId)
    .eq('organization_id', organization.id)
    .single();

  if (readError || !test) throw new Error('Test result not found.');
  if (!['Fail', 'Blocked'].includes(test.result)) return { issueRef: null };
  if (test.linked_issue_id) return { issueRef: test.linked_issue_ref, alreadyCreated: true };

  const { data: latest } = await (admin as any)
    .from('sprint_issues')
    .select('issue_number')
    .eq('sprint_number', 49)
    .order('issue_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const issueNumber = Number(latest?.issue_number ?? 0) + 1;
  const issueRef = `S49-PKG-${String(issueNumber).padStart(3, '0')}`;
  const severity = test.result === 'Blocked' ? 'P1' : 'P2';
  const description = [
    `Packaging Academy test failed during ${test.workflow}: ${test.step_title}.`,
    test.actual_result ? `Actual: ${test.actual_result}` : '',
    test.notes ? `Notes: ${test.notes}` : '',
  ].filter(Boolean).join('\n\n');

  const { data: issue, error } = await (admin as any).from('sprint_issues').insert({
    organization_id: organization.id,
    client_org_id: organization.id,
    sprint_number: 49,
    sprint_name: 'Sprint 49 - Packaging Academy QA',
    sprint_target: 'Sprint 49',
    sprint_label: 'Sprint 49',
    issue_number: issueNumber,
    issue_ref: issueRef,
    title: `[Packaging Academy] ${test.step_title}`,
    category: 'QA / Training',
    issue_category: 'Bug',
    issue_type: 'Bug',
    severity,
    priority: severity,
    status: 'Open',
    workflow_area: test.workflow,
    affected_module: 'Packaging Academy',
    affected_route: '/academy',
    environment: 'Production - packaging.setuflowcrm.com',
    description,
    steps_to_reproduce: `Open Packaging Academy Test Mode and execute step ${test.step_id}: ${test.step_title}.`,
    expected_behavior: test.expected_result,
    actual_behavior: test.actual_result,
    qa_notes: test.notes,
    browser_device: device,
    reporter_name: profile?.full_name || user.email,
    reporter_user_id: user.id,
    submitted_via: 'Packaging Academy',
    attachments: test.evidence_storage_path ? [{ bucket: BUCKET, path: test.evidence_storage_path, filename: test.evidence_filename }] : [],
    labels: ['packaging', 'academy', 'client-testing'],
    customer_impact: test.result === 'Blocked' ? 'Testing workflow blocked' : 'Client-facing workflow defect',
    reported_at: new Date().toISOString(),
  }).select('id,issue_ref').single();

  if (error || !issue) throw new Error(error?.message ?? 'Could not create issue.');

  await (admin as any).from('packaging_test_results').update({
    linked_issue_id: issue.id,
    linked_issue_ref: issue.issue_ref,
    updated_at: new Date().toISOString(),
  }).eq('id', test.id);

  return { issueRef: issue.issue_ref };
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { admin, organization, user, membership, currentRoles, canAccessAdmin } = ctx;

  const [{ data: runs, error: runError }, { data: progress, error: progressError }] = await Promise.all([
    (admin as any)
      .from('packaging_test_runs')
      .select('*, packaging_test_results(*)')
      .eq('organization_id', organization.id)
      .eq('tester_user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(20),
    (admin as any)
      .from('packaging_learning_progress')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ]);

  if (runError || progressError) {
    return NextResponse.json({ error: runError?.message ?? progressError?.message }, { status: 500 });
  }

  let organizationRuns: unknown[] = [];
  let organizationProgress: unknown[] = [];
  if (canAccessAdmin) {
    const [{ data: allRuns }, { data: allProgress }] = await Promise.all([
      (admin as any)
        .from('packaging_test_runs')
        .select('*, packaging_test_results(*)')
        .eq('organization_id', organization.id)
        .order('started_at', { ascending: false })
        .limit(100),
      (admin as any)
        .from('packaging_learning_progress')
        .select('*')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false })
        .limit(1000),
    ]);
    organizationRuns = allRuns ?? [];
    organizationProgress = allProgress ?? [];
  }

  return NextResponse.json({
    viewer: {
      userId: user.id,
      email: user.email,
      name: ctx.profile?.full_name || user.email,
      membershipId: membership.id,
      roles: currentRoles,
      canAccessAdmin,
    },
    runs: runs ?? [],
    progress: progress ?? [],
    organizationRuns,
    organizationProgress,
  });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { admin, organization, membership, user, profile } = ctx;
  const form = await request.formData();
  const action = clean(form.get('action'), 40);

  if (action === 'sync_progress') {
    let entries: Array<{ stepId?: string; workflow?: string; stepTitle?: string; roleName?: string; isComplete?: boolean }> = [];
    try {
      const parsed = JSON.parse(clean(form.get('progress'), 50000));
      if (Array.isArray(parsed)) entries = parsed;
    } catch {
      return NextResponse.json({ error: 'Progress payload is invalid.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const rows = entries
      .filter((entry) => entry?.stepId && entry?.roleName)
      .map((entry) => ({
        organization_id: organization.id,
        user_id: user.id,
        membership_id: membership.id,
        role_name: String(entry.roleName).slice(0, 80),
        step_id: String(entry.stepId).slice(0, 120),
        workflow: String(entry.workflow || '').slice(0, 160),
        step_title: String(entry.stepTitle || '').slice(0, 300),
        is_complete: Boolean(entry.isComplete),
        completed_at: entry.isComplete ? now : null,
        last_seen_at: now,
        updated_at: now,
      }));

    if (rows.length) {
      const { error } = await (admin as any)
        .from('packaging_learning_progress')
        .upsert(rows, { onConflict: 'organization_id,user_id,role_name,step_id' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved: rows.length });
  }

  if (action === 'save_result') {
    const result = clean(form.get('result'), 20);
    if (!allowedResults.has(result)) return NextResponse.json({ error: 'Choose a valid result.' }, { status: 400 });

    let runId = clean(form.get('runId'), 80);
    if (!runId) {
      const { data: run, error } = await (admin as any).from('packaging_test_runs').insert({
        organization_id: organization.id,
        tester_user_id: user.id,
        tester_name: clean(form.get('testerName'), 200) || profile?.full_name || user.email,
        tested_role: clean(form.get('testedRole'), 80) || 'sales',
        device: clean(form.get('device'), 300),
        browser: request.headers.get('user-agent')?.slice(0, 500) ?? null,
        status: 'in_progress',
        app_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      }).select('id').single();
      if (error || !run) return NextResponse.json({ error: error?.message ?? 'Could not start test run.' }, { status: 500 });
      runId = run.id;
    }

    let evidencePath: string | null = null;
    let evidenceFilename: string | null = null;
    const file = form.get('evidence');
    if (file instanceof File && file.size > 0) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        return NextResponse.json({ error: 'Evidence must be PNG, JPG, or WebP.' }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Evidence must be under 10 MB.' }, { status: 400 });
      const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      evidenceFilename = file.name.slice(0, 240);
      evidencePath = `${organization.id}/${runId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await (admin as any).storage.from(BUCKET).upload(evidencePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    if ((result === 'Fail' || result === 'Blocked') && !evidencePath) {
      return NextResponse.json({ error: 'Screenshot evidence is required for failed or blocked tests.' }, { status: 400 });
    }

    const { data: saved, error } = await (admin as any)
      .from('packaging_test_results')
      .upsert({
        run_id: runId,
        organization_id: organization.id,
        step_id: clean(form.get('stepId'), 120),
        workflow: clean(form.get('workflow'), 160),
        step_title: clean(form.get('stepTitle'), 300),
        result,
        expected_result: clean(form.get('expectedResult'), 4000),
        actual_result: clean(form.get('actualResult'), 8000),
        notes: clean(form.get('notes'), 8000),
        evidence_storage_path: evidencePath,
        evidence_filename: evidenceFilename,
        tested_by: user.id,
        tested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'run_id,step_id' })
      .select('id,run_id,result,evidence_filename,linked_issue_ref')
      .single();

    if (error || !saved) return NextResponse.json({ error: error?.message ?? 'Could not save test result.' }, { status: 500 });

    let issueRef = saved.linked_issue_ref || null;
    if (result === 'Fail' || result === 'Blocked') {
      try {
        const issue = await createSprint49Issue(ctx, saved.id, clean(form.get('device'), 500));
        issueRef = issue.issueRef;
      } catch (issueError) {
        return NextResponse.json({
          error: issueError instanceof Error ? issueError.message : 'Result saved, but Sprint 49 issue creation failed.',
          resultSaved: true,
          result: saved,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ result: { ...saved, linked_issue_ref: issueRef } });
  }

  if (action === 'create_issue') {
    try {
      return NextResponse.json(await createSprint49Issue(ctx, clean(form.get('resultId'), 80), clean(form.get('device'), 500)));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create issue.' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
}
