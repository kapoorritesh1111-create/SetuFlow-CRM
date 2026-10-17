import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/workspace/auth";
import { createClient } from "@/lib/supabase/server";

const STARK_PACKMATE_ORG_ID = "b97913cb-3b95-4247-8ced-ffdc0d392d2a";

export async function GET() {
  const workspace = await requireWorkspace();
  if (workspace.organization?.id !== STARK_PACKMATE_ORG_ID) {
    return NextResponse.json({ enabled: false, families: [] });
  }
  const db = await createClient();
  const { data, error } = await db
    .from("packaging_service_families")
    .select("id,name")
    .eq("organization_id", workspace.organization.id)
    .order("name");
  if (error) {
    return NextResponse.json({ error: "Unable to load service families" }, { status: 500 });
  }
  return NextResponse.json({
    enabled: true,
    families: ((data ?? []) as Array<{ id: string; name: string }>).filter((family) => Boolean(family.id && family.name)),
  });
}
