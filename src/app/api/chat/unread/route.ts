import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAuthenticatedChatUser, getUserOrganizationId } from "@/lib/chat/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ unread: {}, total: 0 });

    const params = new URL(request.url).searchParams;
    const orgId = await getUserOrganizationId(admin, user.id, params.get("organization_id"));
    if (!orgId) return NextResponse.json({ unread: {}, total: 0 });

    const { data: parts } = await admin
      .from("chat_participants")
      .select("conversation_id, last_read_at")
      .eq("organization_id", orgId)
      .eq("user_id", user.id);

    const unread: Record<string, number> = {};
    for (const part of parts ?? []) {
      const { count } = await admin
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("conversation_id", (part as any).conversation_id)
        .gt("created_at", (part as any).last_read_at ?? "1970-01-01");
      unread[(part as any).conversation_id] = count ?? 0;
    }

    return NextResponse.json({ unread, total: Object.values(unread).reduce((sum, value) => sum + value, 0), organization_id: orgId });
  } catch (err) {
    console.error("Chat unread error:", err);
    return NextResponse.json({ unread: {}, total: 0 }, { status: 500 });
  }
}
