import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureConversationAccess, ensureParticipant, getAuthenticatedChatUser } from "@/lib/chat/api-helpers";

export const dynamic = "force-dynamic";

function uuid(value: string | null) {
  return value && /^[0-9a-fA-F-]{36}$/.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    const body = await request.json();
    const conversationId = uuid(body.conversation_id ?? null);
    if (!conversationId) return NextResponse.json({ error: "Conversation required" }, { status: 400 });

    const organizationId = await ensureConversationAccess(admin, user.id, conversationId);
    if (!organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await ensureParticipant(admin, conversationId, organizationId, user.id);
    const lastReadAt = new Date().toISOString();
    const { error } = await admin
      .from("chat_participants")
      .update({ last_read_at: lastReadAt })
      .eq("conversation_id", conversationId)
      .eq("organization_id", organizationId)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, last_read_at: lastReadAt });
  } catch (err) {
    console.error("Chat read-state POST error:", err);
    return NextResponse.json({ error: "Failed to update read state" }, { status: 500 });
  }
}
