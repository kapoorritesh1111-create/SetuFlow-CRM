import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("sprint_issues")
      .select("status, issue_type, issue_category, sprint_number")
      .eq("organization_id", INTERNAL_ORG_ID);

    const issues = (data as { status: string; issue_type: string | null; issue_category: string | null; sprint_number: number }[]) ?? [];
    const total = issues.length;
    const open = issues.filter(i => i.status === "Open" || i.status === "open").length;
    const t = (type: string) => issues.filter(i => (i.issue_type ?? i.issue_category ?? "").toLowerCase().includes(type)).length;
    const backlog = issues.filter(i => !["Resolved", "Deferred"].includes(i.status) && i.sprint_number < 27).length;

    return NextResponse.json({ total, open, bugs: t("bug"), enhancement: t("enh"), ux: t("ux"), backlog });
  } catch {
    return NextResponse.json({ total: 0, open: 0, bugs: 0, enhancement: 0, ux: 0, backlog: 0 });
  }
}
