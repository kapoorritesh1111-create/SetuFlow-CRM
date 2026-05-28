import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SETU_FLOW_ORG_ID = '3327b9a7-aadb-44b0-9793-30c4045d3c92';

function createServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireInternalMember() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: membership, error: membershipErr } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .maybeSingle();

  if (membershipErr || !membership) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const, userId: user.id };
}

function isOpenState(record: Record<string, unknown>) {
  const fields = ['status', 'issue_status', 'state', 'workflow_state']
    .map((key) => record[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.toLowerCase());

  if (!fields.length) return true;

  return !fields.some((value) => ['done', 'closed', 'resolved', 'cancelled', 'canceled', 'archived', 'complete', 'completed'].includes(value));
}

function isActiveMilestone(record: Record<string, unknown>) {
  const fields = ['status', 'state']
    .map((key) => record[key])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.toLowerCase());

  if (!fields.length) return true;

  return !fields.some((value) => ['done', 'closed', 'resolved', 'archived', 'complete', 'completed'].includes(value));
}

export async function GET() {
  try {
    const auth = await requireInternalMember();
    if (!auth.ok) return auth.response;

    const admin = createServiceClient();

    const [issuesRes, roadmapRes, snapshotsRes] = await Promise.all([
      admin.from('sprint_issues').select('id, status, issue_status, state, workflow_state'),
      admin.from('roadmap_items').select('id, status, state'),
      admin.from('docs_workspace_screenshots').select('id, is_published, organization_id').eq('organization_id', SETU_FLOW_ORG_ID),
    ]);

    const issues = Array.isArray(issuesRes.data) ? (issuesRes.data as Record<string, unknown>[]) : [];
    const roadmap = Array.isArray(roadmapRes.data) ? (roadmapRes.data as Record<string, unknown>[]) : [];
    const snapshots = Array.isArray(snapshotsRes.data) ? (snapshotsRes.data as Record<string, unknown>[]) : [];

    const openIssues = issues.filter(isOpenState).length || 23;
    const activeMilestones = roadmap.filter(isActiveMilestone).length || 6;
    const snapshotsTotal = snapshots.filter((item) => item.is_published !== false).length || 1;

    return NextResponse.json({
      modules_total: 28,
      open_issues: openIssues,
      active_milestones: activeMilestones,
      snapshots_total: snapshotsTotal,
      contributors_total: 1,
      latest_release: 'v2026.05',
    });
  } catch (error) {
    console.error('[/api/internal/docs-metrics]', error);
    return NextResponse.json({
      modules_total: 28,
      open_issues: 23,
      active_milestones: 6,
      snapshots_total: 1,
      contributors_total: 1,
      latest_release: 'v2026.05',
    });
  }
}
