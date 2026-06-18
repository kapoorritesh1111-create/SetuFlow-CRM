import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/workspace/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type MemberRow = { user_id: string; role?: string | null; is_active?: boolean | null; updated_at?: string | null };
type ProfileRow = { id: string; full_name?: string | null; email?: string | null; avatar_url?: string | null; last_seen_at?: string | null; updated_at?: string | null };

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "TM";
}

function isUuid(value: string | null) {
  return !!value && /^[0-9a-fA-F-]{36}$/.test(value);
}

function presenceFrom(profile?: ProfileRow | null) {
  const raw = profile?.last_seen_at ?? profile?.updated_at ?? null;
  if (!raw) return { status: "away", online: false };
  const seen = new Date(raw).getTime();
  const online = Number.isFinite(seen) && Date.now() - seen < 5 * 60 * 1000;
  return { status: online ? "online" : "away", online };
}

export async function GET(request: NextRequest) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) {
    return NextResponse.json({ error: "Workspace membership required" }, { status: 401 });
  }

  const requestedOrgId = request.nextUrl.searchParams.get("organization_id");
  const orgId = isUuid(requestedOrgId) ? requestedOrgId! : workspace.organization.id;
  const userId = workspace.user.id;

  let members: Array<{ id: string; name: string; email: string | null; role: string; initials: string; online: boolean; status: string }> = [];

  try {
    const admin = createServiceRoleClient();
    if (!admin) throw new Error("Service role unavailable");

    const { data: selfMembership } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!selfMembership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: orgMembers } = await admin
      .from("organization_members")
      .select("user_id, role, is_active, updated_at")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    const memberRows = (orgMembers ?? []) as MemberRow[];
    const userIds = Array.from(new Set(memberRows.map((m) => m.user_id).filter(Boolean)));

    const { data: profiles } = userIds.length
      ? await admin.from("profiles").select("id, full_name, email, avatar_url, last_seen_at, updated_at").in("id", userIds)
      : { data: [] as ProfileRow[] };

    const profileRows = (profiles ?? []) as ProfileRow[];
    members = memberRows.map((m) => {
      const profile = profileRows.find((p) => p.id === m.user_id);
      const name = profile?.full_name || profile?.email || "Team Member";
      const presence = presenceFrom(profile);
      return {
        id: m.user_id,
        name,
        email: profile?.email ?? null,
        role: m.role || "member",
        initials: initials(name),
        online: presence.online,
        status: presence.status,
      };
    }).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Chat context error:", err);
  }

  return NextResponse.json({
    organization_id: orgId,
    user_id: userId,
    user_name: workspace.profile?.full_name ?? workspace.user.email ?? "Team member",
    members,
  });
}
