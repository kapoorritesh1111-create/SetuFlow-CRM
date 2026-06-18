import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/workspace/auth";

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) {
    return NextResponse.json({ error: "Workspace membership required" }, { status: 401 });
  }

  return NextResponse.json({
    organization_id: workspace.organization.id,
    user_id: workspace.user.id,
    user_name: workspace.profile?.full_name ?? workspace.user.email ?? "Team member",
  });
}
