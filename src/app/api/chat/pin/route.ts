import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getAuthenticatedChatUser, ensureConversationAccess } from "@/lib/chat/api-helpers";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { message_id, conversation_id } = body;
    if (!message_id || !conversation_id) return NextResponse.json({ error: "Missing message_id or conversation_id" }, { status: 400 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    const orgId = await ensureConversationAccess(admin, user.id, conversation_id);
    if (!orgId) return NextResponse.json({ error: "No access" }, { status: 403 });

    const { data: msg } = await admin.from("chat_messages").select("pinned_at").eq("id", message_id).single();
    const isPinned = !!msg?.pinned_at;

    const { error } = await admin.from("chat_messages").update({
      pinned_at: isPinned ? null : new Date().toISOString(),
      pinned_by: isPinned ? null : user.id,
    }).eq("id", message_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ pinned: !isPinned });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
