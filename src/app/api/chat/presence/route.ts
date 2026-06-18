import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAuthenticatedChatUser, getUserOrganizationId } from "@/lib/chat/api-helpers";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { organization_id } = body;
    if (!organization_id) return NextResponse.json({ error: "Missing organization_id" }, { status: 400 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    const validOrg = await getUserOrganizationId(admin, user.id, organization_id);
    if (!validOrg) return NextResponse.json({ error: "No access" }, { status: 403 });

    await admin.from("chat_presence").upsert({
      user_id: user.id,
      organization_id,
      last_seen_at: new Date().toISOString(),
      status: "online",
    }, { onConflict: "user_id" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const orgId = url.searchParams.get("organization_id");
    if (!orgId) return NextResponse.json({ error: "Missing organization_id" }, { status: 400 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    const { data } = await admin.from("chat_presence")
      .select("user_id, last_seen_at, status")
      .eq("organization_id", orgId);

    const now = Date.now();
    const presence: Record<string, boolean> = {};
    for (const row of data ?? []) {
      const diff = now - new Date(row.last_seen_at).getTime();
      presence[row.user_id] = diff < 120000; // online if seen within 2 min
    }

    return NextResponse.json({ presence });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
