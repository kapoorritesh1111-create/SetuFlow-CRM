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
  return { workspace, admin };
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { workspace, admin } = ctx;
  const { data: runs, error } = await (admin as any)
    .from('packaging_test_runs')
    .select('*, packaging_test_results(*)')
    .eq('organization_id', workspace.organization.id)
    .order('started_at', { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: runs ?? [] });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { workspace, admin } = ctx;
  const form = await request.formData();
  const action = clean(form.get('action'), 40);

  if (action === 'save_result') {
    const result = clean(form.get('result'), 20);
    if (!allowedResults.has(result)) return NextResponse.json({ error: 'Choose a valid result.' }, { status: 400 });

    let runId = clean(form.get('runId'), 80);
    if (!runId) {
      const { data: run, error } = await (admin as any).from('packaging_test_runs').insert({
        organization_id: workspace.organization.id,
        tester_user_id: workspace.user.id,
        tester_name: clean(form.get('testerName'), 200) || workspace.profile?.full_name || workspace.user.email,
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
      evidencePath = `${workspace.organization.id}/${runId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await (admin as any).storage.from(BUCKET).upload(evidencePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    if ((result === 'Fail' || result === 'Blocked') && !evidencePath) {
      return NextResponse.json({ error: 'Screenshot evidence is required for failed or blocked tests.' }, { status: 400 });
    }

    const payload = {
      run_id: runId,
      organization_id: workspace.organization.id,
      step_id: clean(form.get('stepId'), 120),
      workflow: clean(form.get('workflow'), 160),
      step_title: clean(form.get('stepTitle'), 300),
      result,
      expected_result: clean(form.get('expectedResult'), 4000),
      actual_result: clean(form.get('actualResult'), 8000),
      notes: clean(form.get('notes'), 8000),
      evidence_storage_path: evidencePath,
      evidence_filename: evidenceFilename,
      tested_by: workspace.user.id,
      tested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: saved, error } = await (admin as any)
      .from('packaging_test_results')
      .upsert(payload, { onConflict: 'run_id,step_id' })
      .select('id,run_id,result,evidence_filename,linked_issue_ref')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ result: saved });
  }

  if (action === 'create_issue') {
    const resultId = clean(form.get('resultId'), 80);
    const { data: test, error: readError } = await (admin as any)
      .from('packaging_test_results')
      .select('*')
      .eq('id', resultId)
      .eq('organization_id', workspace.organization.id)
      .single();
    if (readError || !test) return NextResponse.json({ error: 'Test result not found.' }, { status: 404 });
    if (!['Fail', 'Blocked'].includes(test.result)) return NextResponse.json({ error: 'Only failed or blocked tests can create issues.' }, { status: 400 });
    if (test.linked_issue_id) return NextResponse.json({ issueRef: test.linked_issue_ref, alreadyCreated: true });

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
      organization_id: workspace.organization.id,
      client_org_id: workspace.organization.id,
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
      affected_route: '/marketing/guides/setu_flow_packaging_workspace_guide.html',
      environment: 'Production - packaging.setuflowcrm.com',
      description,
      steps_to_reproduce: `Open Packaging Academy Test Mode and execute step ${test.step_id}: ${test.step_title}.`,
      expected_behavior: test.expected_result,
      actual_behavior: test.actual_result,
      qa_notes: test.notes,
      browser_device: clean(form.get('device'), 500),
      reporter_name: workspace.profile?.full_name || workspace.user.email,
      reporter_user_id: workspace.user.id,
      submitted_via: 'Packaging Academy',
      attachments: test.evidence_storage_path ? [{ bucket: BUCKET, path: test.evidence_storage_path, filename: test.evidence_filename }] : [],
      labels: ['packaging', 'academy', 'client-testing'],
      customer_impact: test.result === 'Blocked' ? 'Testing workflow blocked' : 'Client-facing workflow defect',
      reported_at: new Date().toISOString(),
    }).select('id,issue_ref').single();
    if (error || !issue) return NextResponse.json({ error: error?.message ?? 'Could not create issue.' }, { status: 500 });

    await (admin as any).from('packaging_test_results').update({
      linked_issue_id: issue.id,
      linked_issue_ref: issue.issue_ref,
      updated_at: new Date().toISOString(),
    }).eq('id', test.id);
    return NextResponse.json({ issueRef: issue.issue_ref });
  }

  return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
}
