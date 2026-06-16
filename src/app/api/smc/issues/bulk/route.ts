import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { ids, updates } = body as { ids: string[]; updates: Record<string, unknown> };

    if (!ids?.length || !updates) {
      return NextResponse.json({ error: "ids and updates required" }, { status: 400 });
    }

    // Add resolved_at if status is being set to Resolved
    const patchData = { ...updates } as Record<string, unknown>;
    if (patchData.status === "Resolved") {
      patchData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("sprint_issues")
      .update(patchData as any)
      .eq("organization_id", SETU_ORG_ID)
      .in("id", ids)
      .select("id");

    if (error) throw error;
    return NextResponse.json({ updated: data?.length ?? 0 });
  } catch (err) {
    console.error("SMC bulk update error:", err);
    return NextResponse.json({ error: "Failed to bulk update" }, { status: 500 });
  }
}
