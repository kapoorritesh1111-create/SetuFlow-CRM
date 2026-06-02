import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { SETU_FLOW_ORG_ID } from '@/lib/queries/workspace';

/**
 * GET /api/workspace/agent
 *
 * Returns the next issue to work on plus a full context packet.
 * Used by AI coding agents: Claude, OpenAI Codex, Cursor.
 *
 * Query params:
 *   ?sprint=23          — filter to a sprint (default: latest)
 *   ?severity=Critical  — filter by minimum severity
 *   ?agent=claude       — agent type for audit logging
 *   ?dry_run=true       — don't mark In Progress, just return context
 *
 * Returns: { issue, context, instructions, db_context }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentType = (searchParams.get('agent') ?? 'claude') as string;
  const dryRun = searchParams.get('dry_run') === 'true';
  const sprintParam = searchParams.get('sprint');

  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  // Get open issues ordered by priority
  let q = (supabase as any)
    .from('sprint_issues')
    .select('*')
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .in('status', ['Open'])
    .order('priority_rank', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (sprintParam) q = q.eq('sprint_number', Number(sprintParam));

  const { data: openIssues } = await q.limit(20);

  // Priority: Critical first, then High, then 7-Day Rescue target
  const sorted = (openIssues ?? []).sort((a: any, b: any) => {
    const sevOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const rescueBonus = (i: any) => i.sprint_target === '7-Day Rescue' ? -0.5 : 0;
    return (sevOrder[a.severity] ?? 2) + rescueBonus(a) - (sevOrder[b.severity] ?? 2) - rescueBonus(b);
  });

  const issue = sorted[0];
  if (!issue) {
    return NextResponse.json({ message: 'No open issues — great work!', issue: null });
  }

  // Get related context: depends_on issues, recent comments
  const dependsOn = issue.depends_on?.length
    ? (await (supabase as any).from('sprint_issues').select('issue_ref,title,status').in('issue_ref', issue.depends_on)).data ?? []
    : [];

  const { data: comments } = await (supabase as any)
    .from('issue_comments')
    .select('*')
    .eq('issue_id', issue.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Mark In Progress unless dry run
  if (!dryRun) {
    await (supabase as any)
      .from('sprint_issues')
      .update({ status: 'In Progress', updated_at: new Date().toISOString() })
      .eq('id', issue.id);

    // Log agent action
    await (supabase as any)
      .from('agent_actions')
      .insert({
        organization_id: SETU_FLOW_ORG_ID,
        issue_id: issue.id,
        issue_ref: issue.issue_ref,
        agent_type: agentType,
        action: 'picked_up_issue',
        payload: { issue_ref: issue.issue_ref, title: issue.title },
        status: 'started',
      });
  }

  const contextPacket = {
    issue: {
      id: issue.id,
      ref: issue.issue_ref,
      title: issue.title,
      severity: issue.severity,
      status: dryRun ? issue.status : 'In Progress',
      area: issue.area ?? issue.workflow_area,
      sprint: issue.sprint_number,
      sprint_target: issue.sprint_target,
      description: issue.description,
      how_to_fix: issue.how_to_fix,
      root_cause: issue.root_cause,
      files_changed_history: issue.files_changed ?? [],
      fix_applied: issue.fix_applied,
      pr_link: issue.pr_link,
      depends_on: dependsOn,
      related_refs: issue.related_refs ?? [],
      parent_ref: issue.parent_ref,
    },
    recent_comments: (comments ?? []).map((c: any) => ({
      author: c.author_name,
      type: c.author_type,
      body: c.body,
      at: c.created_at,
    })),
    db_context: {
      supabase_project: 'sjzfzloggabsmcuxktnl',
      organization_id: SETU_FLOW_ORG_ID,
      organization_name: 'SETU Flow',
      key_tables: ['sprint_issues', 'leads', 'quotes', 'contracts', 'products', 'organizations'],
      tracker_api: {
        patch_issue: `PATCH /api/workspace/issues/${issue.id}`,
        add_comment: 'POST /api/workspace/issues/comments',
        log_action: 'POST /api/workspace/agent/log',
        mark_resolved: `PATCH /api/workspace/issues/${issue.id} { "status": "Resolved", "fix_applied": "...", "pr_link": "..." }`,
      },
    },
    instructions: {
      for_all_agents: [
        `You are working on issue ${issue.issue_ref}: "${issue.title}"`,
        'This issue has been automatically marked In Progress in the tracker.',
        'Read the description and how_to_fix carefully before touching any code.',
        'Make the smallest safe change scoped to this issue.',
        'Do not modify unrelated files, routes, or business logic.',
        'After fixing: PATCH the issue with fix_applied (what you changed), pr_link (commit URL), and status: Resolved.',
        'Add a checkpoint comment via POST /api/workspace/issues/comments for any significant step.',
      ],
      for_claude: [
        'Use the Supabase MCP tool to verify the fix in the DB.',
        'Use the GitHub tool to commit and provide a real commit URL.',
        'Commit message format: `SF-{sprint}-{num}: concise fix title`',
      ],
      for_openai: [
        'Use function calling to PATCH the issue status as you work.',
        'Include the full file path and change summary in fix_applied.',
      ],
      for_cursor: [
        'Read AGENTS.md in the repo root for full context on the codebase.',
        'Use the terminal to run `npm run typecheck` before marking resolved.',
      ],
    },
  };

  return NextResponse.json(contextPacket);
}

/**
 * POST /api/workspace/agent/log
 * Logs an AI agent action/checkpoint to the agent_actions table
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  const { data, error } = await (supabase as any)
    .from('agent_actions')
    .insert({
      organization_id: SETU_FLOW_ORG_ID,
      issue_id: body.issue_id ?? null,
      issue_ref: body.issue_ref ?? null,
      agent_type: body.agent_type ?? 'claude',
      agent_model: body.agent_model ?? null,
      action: body.action ?? 'checkpoint',
      payload: body.payload ?? {},
      commit_ref: body.commit_ref ?? null,
      pr_url: body.pr_url ?? null,
      status: body.status ?? 'completed',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
