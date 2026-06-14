import { createClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const SETU_FLOW_ORG_ID = '3327b9a7-aadb-44b0-9793-30c4045d3c92';

const CLOSED_STATUSES = ['Resolved', "Won't Fix", 'Deferred'] as const;

export type SprintIssue = {
  id: string;
  issue_ref: string | null;
  issue_number: number | null;
  sprint_number: number;
  sprint_name: string;
  title: string;
  description: string | null;
  category: string;
  issue_category: string | null;
  issue_type?: string | null;
  severity: string;
  status: string;
  area: string | null;
  workflow_area: string | null;
  sprint_target: string | null;
  assigned_to: string | null;
  reporter_name: string | null;
  priority_rank: number | null;
  priority?: string | null;
  rank_order?: number | null;
  kanban_order?: number | null;
  table_order?: number | null;
  blocked_by?: string[] | null;
  affected_route?: string | null;
  affected_module?: string | null;
  environment?: string | null;
  browser_device?: string | null;
  regression_risk?: string | null;
  steps_to_reproduce?: string | null;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  acceptance_criteria?: string | null;
  qa_notes?: string | null;
  commit_url?: string | null;
  target_date?: string | null;
  owner?: string | null;
  effort: string | null;
  story_points: number | null;
  labels: string[] | null;
  milestone: string | null;
  client_org_id: string | null;
  related_refs: string[] | null;
  depends_on: string[] | null;
  parent_ref: string | null;
  pr_link: string | null;
  fix_applied: string | null;
  files_changed: string[] | null;
  db_migrations: string[] | null;
  regression_test: string | null;
  attachments: unknown[] | Record<string, unknown> | null;
  how_to_fix: string | null;
  gpt_prompt?: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SprintMeta = {
  id: string;
  sprint_number: number;
  sprint_name: string;
  goal: string | null;
  started_at: string | null;
  closed_at: string | null;
  capacity_points: number | null;
  retro_notes: string | null;
};

export type TrackerPrompt = {
  id: string;
  prompt_key: string | null;
  title: string | null;
  prompt_text: string | null;
  version: number | null;
  is_active: boolean | null;
};

export type WorkspaceStats = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  deferred: number;
  critical: number;
  high: number;
  activeSprint: number;
  sprintMeta: SprintMeta | null;
};

export function displayIssueStatus(status?: string | null) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'in_review' || normalized === 'in-review' || normalized === 'review' || normalized === 'in review') return 'In Review';
  if (!status) return 'Open';
  return status;
}

function isOpenIssue(issue: Pick<SprintIssue, 'status'>) {
  return !CLOSED_STATUSES.includes(displayIssueStatus(issue.status) as (typeof CLOSED_STATUSES)[number]);
}

export async function getWorkspaceIssues(sprintNumber?: number): Promise<SprintIssue[]> {
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();

  let q = (supabase as any)
    .from('sprint_issues')
    .select('*')
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .order('kanban_order', { ascending: true, nullsFirst: false })
    .order('priority_rank', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (sprintNumber) {
    q = q.eq('sprint_number', sprintNumber);
  }

  const { data, error } = await q;
  if (error) return [];
  return ((data ?? []) as SprintIssue[]).map((issue) => ({
    ...issue,
    status: displayIssueStatus(issue.status),
  }));
}

export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  const issues = await getWorkspaceIssues();
  const sprints = [...new Set(issues.map((i) => i.sprint_number))].sort((a, b) => b - a);
  const activeSprint = sprints[0] ?? 23;

  const openIssues = issues.filter(isOpenIssue);
  const open = openIssues.length;
  const inProgress = issues.filter((i) => ['In Progress', 'In Review'].includes(displayIssueStatus(i.status))).length;
  const resolved = issues.filter((i) => ['Resolved', "Won't Fix"].includes(displayIssueStatus(i.status))).length;
  const deferred = issues.filter((i) => displayIssueStatus(i.status) === 'Deferred').length;
  const critical = openIssues.filter((i) => i.severity?.toLowerCase() === 'critical').length;
  const high = openIssues.filter((i) => i.severity?.toLowerCase() === 'high').length;

  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();
  const { data: sprintMetaData } = await (supabase as any)
    .from('sprint_meta')
    .select('*')
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .eq('sprint_number', activeSprint)
    .maybeSingle();

  return {
    total: issues.length,
    open,
    inProgress,
    resolved,
    deferred,
    critical,
    high,
    activeSprint,
    sprintMeta: sprintMetaData ?? null,
  };
}

export async function getSprintList(): Promise<SprintMeta[]> {
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();
  const { data } = await (supabase as any)
    .from('sprint_meta')
    .select('*')
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .order('sprint_number', { ascending: false });
  return (data ?? []) as SprintMeta[];
}

export async function getIssueComments(issueId: string) {
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();
  const { data } = await (supabase as any)
    .from('issue_comments')
    .select('*')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function getActiveTrackerPrompt(promptKey = 'chatgpt_fix_protocol'): Promise<TrackerPrompt | null> {
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();
  const { data, error } = await (supabase as any)
    .from('tracker_prompts')
    .select('id,prompt_key,title,prompt_text,version,is_active')
    .eq('prompt_key', promptKey)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as TrackerPrompt;
}

export type AgentAction = {
  id: string;
  issue_id: string | null;
  issue_ref: string | null;
  agent_type: string;
  agent_model: string | null;
  action: string;
  payload: Record<string, unknown>;
  commit_ref: string | null;
  pr_url: string | null;
  status: string;
  created_at: string;
};

export async function getAgentActions(limit = 20): Promise<AgentAction[]> {
  const admin = createAdminSupabaseClient();
  const supabase = admin ?? await createClient();
  const { data } = await (supabase as any)
    .from('agent_actions')
    .select('*')
    .eq('organization_id', SETU_FLOW_ORG_ID)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
