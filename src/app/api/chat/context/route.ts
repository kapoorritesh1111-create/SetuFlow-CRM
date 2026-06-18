import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/workspace/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workspace = await getWorkspaceAccess();
    if (!workspace?.user || !workspace?.organization) {
      return NextResponse.json({ error: "Workspace membership required" }, { status: 401 });
    }

    const orgId = workspace.organization.id;
    const userId = workspace.user.id;

    let members: { id: string; name: string; role: string }[] = [];
    const admin = createServiceRoleClient();
    if (admin) {
      // organization_members has: id, organization_id, user_id, is_active
      const { data: orgMembers, error: omErr } = await admin
        .from("organization_members")
        .select("user_id, is_active")
        .eq("organization_id", orgId);

      if (omErr) console.error("Chat context org_members error:", omErr.message);

      if (orgMembers?.length) {
        const userIds = orgMembers.map((m: any) => m.user_id);
        // profiles has: id, full_name, email, avatar_url
        const { data: profiles, error: pErr } = await admin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (pErr) console.error("Chat context profiles error:", pErr.message);

        members = orgMembers.map((m: any) => {
          const profile = profiles?.find((p: any) => p.id === m.user_id);
          return {
            id: m.user_id,
            name: profile?.full_name || profile?.email || "Team Member",
            role: m.is_active === false ? "inactive" : "member",
          };
        });
      }
    }

    return NextResponse.json({
      organization_id: orgId,
      user_id: userId,
      user_name: (workspace as any).profile?.full_name ?? workspace.user.email ?? "Team member",
      members,
    });
  } catch (err) {
    console.error("Chat context error:", err);
    return NextResponse.json({ error: "Failed to load context" }, { status: 500 });
  }
}
