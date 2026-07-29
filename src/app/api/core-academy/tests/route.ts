import { NextResponse } from 'next/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'core-academy-test-evidence';
const ACADEMY_REPORTER_NAME = 'Test User';
const ACADEMY_REPORTER_EMAIL = 'test@test.com';
const ACADEMY_REPORTER_USER_ID = '7e9e2b7a-faf2-49c2-91d1-88699d23c737';
const SPRINT_NUMBER = 51;
const SPRINT_NAME = 'Sprint 51 - Core Academy QA';
const ISSUE_PREFIX = 'S51-ACA-';
const ALLOWED_RESULTS = new Set(['Pass', 'Fail', 'Blocked', 'N/A']);
const clean = (value: FormDataEntryValue | null, max = 4000) => String(value ?? '').trim().slice(0, max);

type Context = NonNullable<Awaited<ReturnType<typeof context>>>;

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
  };
}

async function createIssue(ctx: Context, resultId: string, device = '') {
  const { admin, organization, user, profile, currentRoles } = ctx;
  const { data: test, error: readError } = await (admin as any)
    .from('core_academy_test_results')
    .select('*')
    .eq('id', resultId)
    .eq('organization_id', organization.id)
    .single();

  if (readError || !test) throw new Error('Core Academy test result not found.');
  if (!['Fail', 'Blocked'].includes(test.result)) return { issueRef: null };
  if (test.linked_issue_id) return { issueRef: test.linked_issue_ref, alreadyCreated: true };

  const { data: latest } = await (admin as any)
    .from('sprint_issues')
    .select('issue_number')
    .eq('organization_id', INTERNAL_ORG_ID)
    .eq('sprint_number', SPRINT_NUMBER)
    .order('issue_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const issueNumber = Number(latest?.issue_number ?? 0) + 1;
  const issueRef = `${ISSUE_PREFIX}${String(issueNumber).padStart(3, '0')}`;
  const priority = test.result === 'Blocked' ? 'P1' : 'P2';
  const severity = test.result === 'Blocked' ? 'High' : 'Medium';
  const actualTesterName = profile?.full_name || user.email || 'Unknown tester';
  const actualTesterEmail = user.email || 'Unknown email';
  const testedRole = Array.isArray(currentRoles) && currentRoles.length ? currentRoles.join(', ') : 'Unknown role';
  const testerDetails = [
    `SMC reporter: ${ACADEMY_REPORTER_NAME} <${ACADEMY_REPORTER_EMAIL}>`,
    `Actual Academy tester: ${actualTesterName} <${actualTesterEmail}>`,
    `Tester role: ${testedRole}`,
    `Test run ID: ${test.run_id}`,
    `Test result ID: ${test.id}`,
    `Tested at: ${test.tested_at || new Date().toISOString()}`,
  ];
  const description = [
    `Core Academy test ${test.result.toLowerCase()} during ${test.module_title}: ${test.step_title}.`,
    test.actual_result ? `Actual result: ${test.actual_result}` : '',
    test.notes ? `Notes: ${test.notes}` : '',
    testerDetails.join('\n'),
  ].filter(Boolean).join('\n\n');
  const qaNotes = [test.notes, ...testerDetails].filter(Boolean).join('\n');

  const { data: issue, error } = await (admin as any).from('sprint_issues').insert({
    organization_id: INTERNAL_ORG_ID,
    client_org_id: organization.id,
    sprint_number: SPRINT_NUMBER,
    sprint_name: SPRINT_NAME,
    sprint_target: SPRINT_NAME,
    sprint_label: 'S51',
    issue_number: issueNumber,
    issue_ref: issueRef,
    title: `[Core Academy] ${test.step_title}`,
    category: 'bug',
    issue_category: 'Bug',
    issue_type: 'Bug',
    severity,
    priority,
    status: 'Open',
    workflow_area: test.module_title,
    affected_module: 'Core Academy',
    affected_route: test.route || '/academy',
    environment: test.environment || 'Production - www.setuflowcrm.com',
    description,
    steps_to_reproduce: test.reproduction_steps || `Open Core Academy Test Center and execute ${test.step_title}.`,
    expected_behavior: test.expected_result,
    actual_behavior: test.actual_result,
    qa_notes: qaNotes,
    browser_device: device,
    reporter_name: ACADEMY_REPORTER_NAME,
    reporter_user_id: ACADEMY_REPORTER_USER_ID,
    submitted_via: 'Core Academy',
    attachments: test.evidence_storage_path ? [{ bucket: BUCKET, path: test.evidence_storage_path, filename: test.evidence_filename }] : [],
    labels: ['core', 'academy', 'client-testing', `result:${String(test.result).toLowerCase()}`, `reporter:${ACADEMY_REPORTER_EMAIL}`, `tester:${actualTesterEmail}`],
    customer_impact: test.result === 'Blocked' ? 'Testing workflow blocked' : 'Client-facing workflow defect',
    reported_at: new Date().toISOString(),
  }).select('id,issue_ref').single();

  if (error || !issue) throw new Error(error?.message ?? 'Could not create Core Academy issue.');

  await (admin as any).from('core_academy_test_results').update({
    linked_issue_id: issue.id,
    linked_issue_ref: issue.issue_ref,
    updated_at: new Date().toISOString(),
  }).eq('id', test.id);

  return { issueRef: issue.issue_ref };
}

export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: 'Sign in before saving a Core Academy test.' }, { status: 401 });

  const { admin, organization, membership, user, profile } = ctx;
  const form = await request.formData();
  const action = clean(form.get('action'), 40);

  if (action !== 'save_result') {
    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  }

  const result = clean(form.get('result'), 20);
  if (!ALLOWED_RESULTS.has(result)) {
    return NextResponse.json({ error: 'Choose Pass, Fail, Blocked, or N/A.' }, { status: 400 });
  }

  const requiresIssue = result === 'Fail' || result === 'Blocked';
  const actualResult = clean(form.get('actualResult'), 8000);
  if (requiresIssue && !actualResult) {
    return NextResponse.json({ error: 'Describe what actually happened.' }, { status: 400 });
  }

  const file = form.get('evidence');
  let evidencePath: string | null = null;
  let evidenceFilename: string | null = null;

  if (requiresIssue && (!(file instanceof File) || file.size <= 0)) {
    return NextResponse.json({ error: 'Screenshot evidence is required for failed or blocked tests.' }, { status: 400 });
  }
  if (file instanceof File && file.size > 0) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Evidence must be PNG, JPG, or WebP.' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Evidence must be under 10 MB.' }, { status: 400 });
    }
  }

  let runId = clean(form.get('runId'), 80);
  if (!runId) {
    const { data: run, error } = await (admin as any).from('core_academy_test_runs').insert({
      organization_id: organization.id,
      tester_user_id: user.id,
      tester_name: profile?.full_name || user.email,
      tested_role: clean(form.get('testedRole'), 160) || 'academy_tester',
      device: clean(form.get('device'), 500),
      browser: request.headers.get('user-agent')?.slice(0, 500) ?? null,
      status: 'in_progress',
      app_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    }).select('id').single();
    if (error || !run) return NextResponse.json({ error: error?.message ?? 'Could not start Core Academy test run.' }, { status: 500 });
    runId = run.id;
  }

  if (file instanceof File && file.size > 0) {
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    evidenceFilename = file.name.slice(0, 240);
    evidencePath = `${organization.id}/${runId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await (admin as any).storage.from(BUCKET).upload(evidencePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const moduleId = clean(form.get('moduleId'), 120);
  const moduleTitle = clean(form.get('moduleTitle'), 300);
  const stepId = clean(form.get('stepId'), 120);
  const stepTitle = clean(form.get('stepTitle'), 300);
  const route = clean(form.get('route'), 500);
  const now = new Date().toISOString();

  const { data: saved, error } = await (admin as any)
    .from('core_academy_test_results')
    .upsert({
      run_id: runId,
      organization_id: organization.id,
      module_id: moduleId,
      module_title: moduleTitle,
      step_id: stepId,
      step_title: stepTitle,
      route,
      start_route: clean(form.get('startRoute'), 500) || null,
      result,
      expected_result: clean(form.get('expectedResult'), 8000),
      actual_result: actualResult || null,
      reproduction_steps: clean(form.get('reproductionSteps'), 12000),
      notes: clean(form.get('notes'), 8000),
      environment: clean(form.get('environment'), 500),
      evidence_storage_path: evidencePath,
      evidence_filename: evidenceFilename,
      tested_by: user.id,
      tested_at: now,
      updated_at: now,
    }, { onConflict: 'run_id,step_id' })
    .select('id,run_id,result,evidence_filename,linked_issue_ref')
    .single();

  if (error || !saved) {
    return NextResponse.json({ error: error?.message ?? 'Could not save Core Academy test result.' }, { status: 500 });
  }

  if (result === 'Pass') {
    const { error: progressError } = await (admin as any).from('core_academy_progress').upsert({
      organization_id: organization.id,
      user_id: user.id,
      membership_id: membership.id,
      module_id: moduleId,
      module_title: moduleTitle,
      step_id: stepId,
      step_title: stepTitle,
      route,
      screenshot_filename: clean(form.get('screenshotFilename'), 300) || null,
      academy_version: clean(form.get('academyVersion'), 40) || null,
      is_complete: true,
      completed_at: now,
      last_seen_at: now,
      updated_at: now,
    }, { onConflict: 'organization_id,user_id,step_id' });
    if (progressError) {
      return NextResponse.json({ error: progressError.message, resultSaved: true, result: saved, runId }, { status: 500 });
    }
  }

  if (!requiresIssue) {
    return NextResponse.json({ result: saved, issueRef: null, runId, stepCompleted: result === 'Pass' });
  }

  try {
    const issue = await createIssue(ctx, saved.id, clean(form.get('device'), 500));
    return NextResponse.json({ result: { ...saved, linked_issue_ref: issue.issueRef }, issueRef: issue.issueRef, runId, stepCompleted: false });
  } catch (issueError) {
    return NextResponse.json({
      error: issueError instanceof Error ? issueError.message : 'Result saved, but Core Academy issue creation failed.',
      resultSaved: true,
      result: saved,
      runId,
    }, { status: 500 });
  }
}
