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

type IssueStatus = (typeof STATUSES)[number];
type IssueType = (typeof TYPES)[number];
type IssueSeverity = (typeof SEVERITIES)[number];
type IssuePriority = (typeof PRIORITIES)[number];
type IssuePayload = Record<string, unknown>;

type RefRow = {
  issue_ref: string | null;
  issue_number: number | null;
};

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

function typeCode(type: IssueType): string {
  if (type === "Enhancement") return "ENH";
  if (type === "Feature") return "FEAT";
  if (type === "Docs") return "DOC";
  if (type === "DevOps") return "DEVOPS";
  if (type === "Task") return "TASK";
  if (type === "Test") return "TEST";
  if (type === "UX") return "UX";
  return "BUG";
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

function buildIssuePayload(
  body: IssuePayload,
  issueRef: string,
  issueNumber: number,
) {
  const issueType = pick<IssueType>(body.issue_type, TYPES, "Bug");
  const sprintNumber = numberValue(body.sprint_number) ?? 27;
  const area = text(body.area);

  return {
    organization_id: SETU_ORG_ID,
    issue_ref: issueRef,
    issue_number: issueNumber,
    title: text(body.title) ?? "Untitled SMC issue",
    description: text(body.description),
    status: pick<IssueStatus>(body.status, STATUSES, "Open"),
    severity: pick<IssueSeverity>(body.severity, SEVERITIES, "Medium"),
    priority: normalizePriority(body.priority),
    issue_type: issueType,
    issue_category: text(body.issue_category) ?? issueType,
    category: issueType.toLowerCase(),
    sprint_number: sprintNumber,
    sprint_name: text(body.sprint_name) ?? `Sprint ${sprintNumber}`,
    sprint_label: text(body.sprint_label) ?? `S${sprintNumber}`,
    story_points: numberValue(body.story_points),
    assigned_to: text(body.assigned_to),
    reporter_name: text(body.reporter_name) ?? "Ritesh Kapoor",
    area,
    workflow_area:
      text(body.workflow_area) ??
      (area ? area.toLowerCase().replace(/\s+/g, "_") : "smc"),
    acceptance_criteria: text(body.acceptance_criteria),
    regression_test: text(body.regression_test),
    steps_to_reproduce: text(body.steps_to_reproduce),
    expected_behavior: text(body.expected_behavior),
    actual_behavior: text(body.actual_behavior),
    environment: text(body.environment) ?? "Production",
    customer_impact: text(body.customer_impact) ?? "none",
    target_date: text(body.target_date),
    git_branch: text(body.git_branch),
    fix_applied: text(body.fix_applied),
    submitted_via: "smc",
  };
}

async function nextIssueRef(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sprintNumber: number,
  issueType: IssueType,
) {
  const { data, error } = await supabase
    .from("sprint_issues")
    .select("issue_ref, issue_number")
    .eq("organization_id", SETU_ORG_ID)
    .eq("sprint_number", sprintNumber)
    .limit(1000);

  if (error) throw error;
  const rows = (data as RefRow[]) ?? [];
  const maxNumber = rows.reduce((max, row) => {
    const parsedFromRef = row.issue_ref?.match(/-(\d+)$/)?.[1];
    const parsed = parsedFromRef ? Number(parsedFromRef) : null;
    const candidate = row.issue_number ?? parsed ?? 0;
    return Number.isFinite(candidate) && candidate > max ? candidate : max;
  }, 0);
  const nextNumber = maxNumber + 1;
  return {
    issueRef: `S${sprintNumber}-${typeCode(issueType)}-${String(nextNumber).padStart(3, "0")}`,
    issueNumber: nextNumber,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, error: accessError } = await assertSetuMember();
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "1000", 10);

    const { data, error } = await supabase
      .from("sprint_issues")
      .select("*")
      .eq("organization_id", SETU_ORG_ID)
      .order("sprint_number", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Number.isFinite(limit) ? limit : 1000);

    if (error) throw error;
    return NextResponse.json({ issues: data ?? [] });
  } catch (err) {
    console.error("SMC issues error:", err);
    return NextResponse.json(
      { error: "Failed to fetch issues" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, error: accessError } = await assertSetuMember();
    if (accessError) return accessError;

    const body = (await request.json()) as IssuePayload;
    const title = text(body.title);
    if (!title)
      return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const sprintNumber = numberValue(body.sprint_number) ?? 27;
    const issueType = pick<IssueType>(body.issue_type, TYPES, "Bug");
    const explicitRef = text(body.issue_ref);
    const generated = explicitRef
      ? {
          issueRef: explicitRef,
          issueNumber: numberValue(body.issue_number) ?? 0,
        }
      : await nextIssueRef(supabase, sprintNumber, issueType);

    const payload = buildIssuePayload(
      { ...body, title, sprint_number: sprintNumber, issue_type: issueType },
      generated.issueRef,
      generated.issueNumber,
    );
    const { data, error } = await supabase
      .from("sprint_issues")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ issue: data }, { status: 201 });
  } catch (err) {
    console.error("SMC create issue error:", err);
    return NextResponse.json(
      { error: "Failed to create issue" },
      { status: 500 },
    );
  }
}
