import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = "force-dynamic";

const SETU_ORG_ID = INTERNAL_ORG_ID;
const STATUSES = ["Open", "In Progress", "In Review", "Blocked", "Resolved", "Deferred", "Won't Fix"];
const TYPES = ["Bug", "Feature", "Enhancement", "Docs", "DevOps", "UX", "Task", "Test"];
const SEVERITIES = ["Critical", "High", "Medium", "Low"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];

type IssuePayload = Record<string, unknown>;
type SprintIssueValue = Json | string[] | number[] | null | undefined;
type SprintIssueRow = Record<string, SprintIssueValue> & { id: string; organization_id: string | null };
type SprintIssueInsert = Record<string, SprintIssueValue>;
type SprintIssueUpdate = Partial<SprintIssueInsert>;
type SmcDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      sprint_issues: { Row: SprintIssueRow; Insert: SprintIssueInsert; Update: SprintIssueUpdate; Relationships: [] };
    };
  };
};
type SmcSupabase = SupabaseClient<SmcDatabase>;

function smcClient(supabase: Awaited<ReturnType<typeof createClient>>): SmcSupabase {
  return supabase as unknown as SmcSupabase;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pick(value: unknown, allowed: string[], fallback: string) {
  const cleaned = text(value);
  if (!cleaned) return fallback;
  return allowed.find((item) => item.toLowerCase() === cleaned.toLowerCase()) ?? fallback;
}

function normalizePriority(value: unknown) {
  const cleaned = text(value)?.split(" ")[0] ?? "P2";
  return pick(cleaned, PRIORITIES, "P2");
}

function has(body: IssuePayload, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function jsonSafe(value: unknown): Json | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as Json;
  } catch {
    return null;
  }
}

async function assertSetuMember() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", SETU_ORG_ID)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    return { supabase, error: NextResponse.json({ error: "Unable to verify SMC access" }, { status: 500 }) };
  }

  if (!member) {
    return { supabase, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, error: null };
}

function compact(payload: Record<string, SprintIssueValue>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as SprintIssueUpdate;
}

function buildUpdatePayload(body: IssuePayload): SprintIssueUpdate {
  const area = has(body, "area") ? text(body.area) : undefined;
  return compact({
    title: has(body, "title") ? text(body.title) : undefined,
    description: has(body, "description") ? text(body.description) : undefined,
    status: has(body, "status") ? pick(body.status, STATUSES, "Open") : undefined,
    severity: has(body, "severity") ? pick(body.severity, SEVERITIES, "Medium") : undefined,
    priority: has(body, "priority") ? normalizePriority(body.priority) : undefined,
    issue_type: has(body, "issue_type") ? pick(body.issue_type, TYPES, "Bug") : undefined,
    issue_category: has(body, "issue_category") ? text(body.issue_category) : undefined,
    sprint_number: has(body, "sprint_number") ? numberValue(body.sprint_number) : undefined,
    story_points: has(body, "story_points") ? numberValue(body.story_points) : undefined,
    assigned_to: has(body, "assigned_to") ? text(body.assigned_to) : undefined,
    reporter_name: has(body, "reporter_name") ? text(body.reporter_name) : undefined,
    area,
    workflow_area: has(body, "workflow_area") ? text(body.workflow_area) : typeof area === "string" ? area.toLowerCase().replace(/\s+/g, "_") : undefined,
    acceptance_criteria: has(body, "acceptance_criteria") ? text(body.acceptance_criteria) : undefined,
    regression_test: has(body, "regression_test") ? text(body.regression_test) : undefined,
    steps_to_reproduce: has(body, "steps_to_reproduce") ? text(body.steps_to_reproduce) : undefined,
    expected_behavior: has(body, "expected_behavior") ? text(body.expected_behavior) : undefined,
    actual_behavior: has(body, "actual_behavior") ? text(body.actual_behavior) : undefined,
    environment: has(body, "environment") ? text(body.environment) : undefined,
    customer_impact: has(body, "customer_impact") ? text(body.customer_impact) : undefined,
    target_date: has(body, "target_date") ? text(body.target_date) : undefined,
    git_branch: has(body, "git_branch") ? text(body.git_branch) : undefined,
    fix_applied: has(body, "fix_applied") ? text(body.fix_applied) : undefined,
    attachments: has(body, "attachments") ? jsonSafe(body.attachments) : undefined,
    updated_at: new Date().toISOString(),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });
    }

    const { supabase, error: accessError } = await assertSetuMember();
    if (accessError) return accessError;

    const body = (await request.json()) as IssuePayload;
    const updatePayload = buildUpdatePayload(body);
    if (has(body, "title") && !updatePayload.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data, error } = await smcClient(supabase)
      .from("sprint_issues")
      .update(updatePayload)
      .eq("id", id)
      .eq("organization_id", SETU_ORG_ID)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ issue: data });
  } catch (err) {
    console.error("SMC update issue error:", err);
    return NextResponse.json({ error: "Failed to update issue" }, { status: 500 });
  }
}
