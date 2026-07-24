import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { notifySmc, getSmcRecipientIds } from '@/lib/notifications/smc-notify';

export const dynamic = "force-dynamic";

const SETU_ORG_ID = INTERNAL_ORG_ID;
const STATUSES = ["Open", "In Progress", "In Review", "Blocked", "Resolved", "Deferred", "Won't Fix"];
const TYPES = ["Bug", "Feature", "Enhancement", "Docs", "DevOps", "UX", "Task", "Test"];
const SEVERITIES = ["Critical", "High", "Medium", "Low"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];

type IssuePayload = Record<string, unknown>;
type SprintIssueValue = Json | string[] | number[] | null | undefined;
type SprintIssueRow = Record<string, SprintIssueValue> & {
  id: string;
  organization_id: string | null;
  issue_ref: string | null;
  issue_number: number | null;
  attachments?: Json | null;
};
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

type RefRow = { issue_ref: string | null; issue_number: number | null };
type EvidenceAttachment = { bucket?: string; path?: string; filename?: string; name?: string; url?: string; type?: string; size?: number };

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

function typeCode(type: string) {
  if (type === "Enhancement") return "ENH";
  if (type === "Feature") return "FEAT";
  if (type === "Docs") return "DOC";
  if (type === "DevOps") return "DEVOPS";
  if (type === "Task") return "TASK";
  if (type === "Test") return "TEST";
  if (type === "UX") return "UX";
  return "BUG";
}

function jsonSafe(value: unknown): Json | null {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as Json;
  } catch {
    return null;
  }
}

async function withSignedEvidence(rows: SprintIssueRow[]): Promise<SprintIssueRow[]> {
  const admin = createAdminSupabaseClient();
  if (!admin) return rows;

  return Promise.all(rows.map(async (row) => {
    if (!Array.isArray(row.attachments)) return row;
    const attachments = await Promise.all((row.attachments as EvidenceAttachment[]).map(async (attachment) => {
      if (attachment.url || !attachment.bucket || !attachment.path) return attachment;
      const { data, error } = await admin.storage.from(attachment.bucket).createSignedUrl(attachment.path, 60 * 60);
      if (error || !data?.signedUrl) return attachment;
      return {
        ...attachment,
        url: data.signedUrl,
        name: attachment.name || attachment.filename || attachment.path.split('/').pop() || 'Evidence',
      };
    }));
    return { ...row, attachments: attachments as unknown as Json };
  }));
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

async function nextIssueRef(supabase: SmcSupabase, sprintNumber: number, issueType: string) {
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
    const candidate = row.issue_number ?? (parsedFromRef ? Number(parsedFromRef) : 0);
    return Number.isFinite(candidate) && candidate > max ? candidate : max;
  }, 0);
  const nextNumber = maxNumber + 1;
  return {
    issueRef: `S${sprintNumber}-${typeCode(issueType)}-${String(nextNumber).padStart(3, "0")}`,
    issueNumber: nextNumber,
  };
}

function buildIssuePayload(body: IssuePayload, issueRef: string, issueNumber: number): SprintIssueInsert {
  const issueType = pick(body.issue_type, TYPES, "Bug");
  const sprintNumber = numberValue(body.sprint_number) ?? 49;
  const area = text(body.area);

  return {
    organization_id: SETU_ORG_ID,
    issue_ref: issueRef,
    issue_number: issueNumber,
    title: text(body.title) ?? "Untitled SMC issue",
    description: text(body.description),
    status: pick(body.status, STATUSES, "Open"),
    severity: pick(body.severity, SEVERITIES, "Medium"),
    priority: normalizePriority(body.priority),
    issue_type: issueType,
    issue_category: text(body.issue_category) ?? issueType,
    category: issueType.toLowerCase(),
    sprint_number: sprintNumber,
    sprint_name: text(body.sprint_name) ?? `Sprint ${sprintNumber}`,
    sprint_label: text(body.sprint_label) ?? `S${sprintNumber}`,
    sprint_target: text(body.sprint_target) ?? `Sprint ${sprintNumber}`,
    story_points: numberValue(body.story_points),
    assigned_to: text(body.assigned_to),
    reporter_name: text(body.reporter_name) ?? "Ritesh Kapoor",
    area,
    workflow_area: text(body.workflow_area) ?? (area ? area.toLowerCase().replace(/\s+/g, "_") : "smc"),
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
    attachments: jsonSafe(body.attachments),
    submitted_via: "smc",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, error: accessError } = await assertSetuMember();
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "1000", 10);

    const { data, error } = await smcClient(supabase)
      .from("sprint_issues")
      .select("*")
      .eq("organization_id", SETU_ORG_ID)
      .order("sprint_number", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Number.isFinite(limit) ? limit : 1000);

    if (error) throw error;
    const issues = await withSignedEvidence((data as SprintIssueRow[]) ?? []);
    const sprintNumbers = Array.from(new Set(issues.map((issue) => numberValue(issue.sprint_number)).filter((value): value is number => value !== null))).sort((a, b) => b - a);
    return NextResponse.json({ issues, sprintNumbers });
  } catch (err) {
    console.error("SMC issues error:", err);
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, error: accessError } = await assertSetuMember();
    if (accessError) return accessError;

    const smcSupabase = smcClient(supabase);
    const body = (await request.json()) as IssuePayload;
    const title = text(body.title);
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const sprintNumber = numberValue(body.sprint_number) ?? 49;
    const issueType = pick(body.issue_type, TYPES, "Bug");
    const explicitRef = text(body.issue_ref);
    const generated = explicitRef
      ? { issueRef: explicitRef, issueNumber: numberValue(body.issue_number) ?? 0 }
      : await nextIssueRef(smcSupabase, sprintNumber, issueType);

    const payload = buildIssuePayload({ ...body, title, sprint_number: sprintNumber, issue_type: issueType }, generated.issueRef, generated.issueNumber);
    const { data, error } = await smcSupabase.from("sprint_issues").insert(payload).select("*").single();

    if (error) throw error;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const recipients = await getSmcRecipientIds(user?.id);
      await notifySmc({
        userIds: recipients,
        title: `New issue · ${data.issue_ref ?? "SMC"}`,
        body: String(data.title ?? "A new SMC issue was created."),
        actionUrl: "/smc/issues",
        type: "smc_issue_new",
        priority: String(data.severity ?? "").toLowerCase().includes("critical") ? "critical" : "normal",
        entityRef: data.issue_ref ? String(data.issue_ref) : null,
      });
    } catch { /* notification is best-effort */ }
    return NextResponse.json({ issue: data }, { status: 201 });
  } catch (err) {
    console.error("SMC create issue error:", err);
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}
