import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/workspace/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) {
    return NextResponse.json({ error: "Workspace membership required" }, { status: 401 });
  }

  const orgId = workspace.organization.id;
  const userId = workspace.user.id;

  // Fetch org members for DM picker
  let members: { id: string; name: string; role: string }[] = [];
  try {
    const admin = createServiceRoleClient();
    if (admin) {
      const { data: orgMembers } = await admin
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", orgId);

      if (orgMembers?.length) {
        const userIds = orgMembers.map((m: any) => m.user_id);
        const { data: profiles } = await admin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        members = orgMembers.map((m: any) => {
          const profile = profiles?.find((p: any) => p.id === m.user_id);
          return {
            id: m.user_id,
            name: profile?.full_name || profile?.email || "Team Member",
            role: m.role || "member",
          };
        });
      }
    }
  } catch {}

  return NextResponse.json({
    organization_id: orgId,
    user_id: userId,
    user_name: workspace.profile?.full_name ?? workspace.user.email ?? "Team member",
    members,
  });
}
