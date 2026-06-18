import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAuthenticatedChatUser, getUserOrganizationId } from "@/lib/chat/api-helpers";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const orgId = url.searchParams.get("organization_id");
    if (!orgId) return NextResponse.json({ error: "Missing organization_id" }, { status: 400 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    const validOrg = await getUserOrganizationId(admin, user.id, orgId);
    if (!validOrg) return NextResponse.json({ error: "No access" }, { status: 403 });

    const { data } = await admin.from("chat_user_prefs")
      .select("conversation_id, is_favorite, is_muted")
      .eq("user_id", user.id)
      .eq("organization_id", orgId);

    return NextResponse.json({ prefs: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { organization_id, conversation_id, is_favorite, is_muted } = body;
    if (!organization_id || !conversation_id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    const validOrg = await getUserOrganizationId(admin, user.id, organization_id);
    if (!validOrg) return NextResponse.json({ error: "No access" }, { status: 403 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof is_favorite === "boolean") updates.is_favorite = is_favorite;
    if (typeof is_muted === "boolean") updates.is_muted = is_muted;

    const { error } = await admin.from("chat_user_prefs").upsert({
      user_id: user.id,
      organization_id,
      conversation_id,
      ...updates,
    }, { onConflict: "user_id,conversation_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
