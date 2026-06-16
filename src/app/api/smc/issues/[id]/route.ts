import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";
const STATUSES = [
  "Open",
  "In Progress",
  "In Review",
  "Blocked",
  "Resolved",
  "Deferred",
  "Won't Fix",
] as const;
const TYPES = [
  "Bug",
  "Feature",
  "Enhancement",
  "Docs",
  "DevOps",
  "UX",
  "Task",
  "Test",
] as const;
const SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;

type IssuePayload = Record<string, unknown>;
type IssueStatus = (typeof STATUSES)[number];
type IssueType = (typeof TYPES)[number];
type IssueSeverity = (typeof SEVERITIES)[number];
type IssuePriority = (typeof PRIORITIES)[number];

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

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const cleaned = text(value);
  if (!cleaned) return fallback;
  const match = allowed.find(
    (item) => item.toLowerCase() === cleaned.toLowerCase(),
  );
  return match ?? fallback;
}

function normalizePriority(value: unknown): IssuePriority {
  const cleaned = text(value)?.split(" ")[0] ?? "P2";
  return pick(cleaned, PRIORITIES, "P2");
}

async function assertSetuMember() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    return {
      supabase,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };

  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", SETU_ORG_ID)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError)
    return {
      supabase,
      error: NextResponse.json(
        { error: "Unable to verify SMC access" },
        { status: 500 },
      ),
    };
  if (!member)
    return {
      supabase,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  return { supabase, error: null };
}

function compactUpdatePayload<T extends Record<string, unknown>>(
  payload: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function nullableTextField(
  body: IssuePayload,
  key: string,
): string | null | undefined {
  return Object.prototype.hasOwnProperty.call(body, key)
    ? text(body[key])
    : undefined;
}

function nullableNumberField(
  body: IssuePayload,
  key: string,
): number | null | undefined {
  return Object.prototype.hasOwnProperty.call(body, key)
    ? numberValue(body[key])
    : undefined;
}

function buildUpdatePayload(body: IssuePayload) {
  const area = nullableTextField(body, "area");
  return {
    title: Object.prototype.hasOwnProperty.call(body, "title")
      ? (text(body.title) ?? undefined)
      : undefined,
    description: nullableTextField(body, "description"),
    status:
      body.status === undefined
        ? undefined
        : pick<IssueStatus>(body.status, STATUSES, "Open"),
    severity:
      body.severity === undefined
        ? undefined
        : pick<IssueSeverity>(body.severity, SEVERITIES, "Medium"),
    priority:
      body.priority === undefined
        ? undefined
        : normalizePriority(body.priority),
    issue_type:
      body.issue_type === undefined
        ? undefined
        : pick<IssueType>(body.issue_type, TYPES, "Bug"),
    issue_category: nullableTextField(body, "issue_category"),
    sprint_number: nullableNumberField(body, "sprint_number") ?? undefined,
    story_points: nullableNumberField(body, "story_points"),
    assigned_to: nullableTextField(body, "assigned_to"),
    reporter_name: nullableTextField(body, "reporter_name"),
    area,
    workflow_area:
      nullableTextField(body, "workflow_area") ??
      (typeof area === "string"
        ? area.toLowerCase().replace(/\s+/g, "_")
        : undefined),
    acceptance_criteria: nullableTextField(body, "acceptance_criteria"),
    regression_test: nullableTextField(body, "regression_test"),
    steps_to_reproduce: nullableTextField(body, "steps_to_reproduce"),
    expected_behavior: nullableTextField(body, "expected_behavior"),
    actual_behavior: nullableTextField(body, "actual_behavior"),
    environment: nullableTextField(body, "environment"),
    customer_impact: nullableTextField(body, "customer_impact"),
    target_date: nullableTextField(body, "target_date"),
    git_branch: nullableTextField(body, "git_branch"),
    fix_applied: nullableTextField(body, "fix_applied"),
    updated_at: new Date().toISOString(),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    if (!/^[0-9a-fA-F-]{36}$/.test(id))
      return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });

    const { supabase, error: accessError } = await assertSetuMember();
    if (accessError) return accessError;

    const body = (await request.json()) as IssuePayload;
    const updatePayload = compactUpdatePayload(buildUpdatePayload(body));
    const title = updatePayload.title;
    if (body.title !== undefined && !title)
      return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const { data, error } = await supabase
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
    return NextResponse.json(
      { error: "Failed to update issue" },
      { status: 500 },
    );
  }
}
