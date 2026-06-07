import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { SETU_FLOW_ORG_ID } from '@/lib/queries/workspace';

function normalizeStoredIssueStatus(status: unknown) {
  const value = String(status ?? '').trim();
  const normalized = value.toLowerCase();
  if (normalized === 'in_review' || normalized === 'in-review' || normalized === 'review' || normalized === 'in review') return 'in_review';
  return value || 'Open';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sprint = searchParams.get('sprint');

  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  let q = (supabase as any)
    .from('sprint_issues')
    .select('*')
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .order('priority_rank', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (sprint) q = q.eq('sprint_number', Number(sprint));

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  // Generate next issue_ref
  const { data: maxRow } = await (supabase as any)
    .from('sprint_issues')
    .select('issue_number')
    .eq('sprint_number', body.sprint_number)
    .not('issue_number', 'is', null)
    .order('issue_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNum = ((maxRow?.issue_number ?? 0) + 1);
  const issue_ref = `SF-${body.sprint_number}-${String(nextNum).padStart(3, '0')}`;

  const payload = {
    ...body,
    organization_id: SETU_FLOW_ORG_ID,
    issue_number: nextNum,
    issue_ref,
    sprint_name: body.sprint_name ?? `Sprint ${body.sprint_number}`,
    status: normalizeStoredIssueStatus(body.status ?? 'Open'),
    severity: body.severity ?? 'Medium',
    category: (body.issue_category ?? body.category ?? 'Bug').toLowerCase(),
    reporter_name: body.reporter_name ?? 'Ritesh Kapoor',
    submitted_via: body.submitted_via ?? 'workspace',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .from('sprint_issues')
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/workspace', 'layout');
  return NextResponse.json(data, { status: 201 });
}
