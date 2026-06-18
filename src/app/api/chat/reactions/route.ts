import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureConversationAccess, getAuthenticatedChatUser, getDisplayName } from "@/lib/chat/api-helpers";

export const dynamic = "force-dynamic";

function uuid(value: string | null) {
  return value && /^[0-9a-fA-F-]{36}$/.test(value) ? value : null;
}

function cleanEmoji(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 16) : "";
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ reactions: [] });

    const conversationId = uuid(request.nextUrl.searchParams.get("conversation_id"));
    if (!conversationId) return NextResponse.json({ error: "Conversation required" }, { status: 400 });

    const organizationId = await ensureConversationAccess(admin, user.id, conversationId);
    if (!organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: messages } = await admin
      .from("chat_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("organization_id", organizationId);

    const messageIds = (messages ?? []).map((item: any) => item.id).filter(Boolean);
    if (messageIds.length === 0) return NextResponse.json({ reactions: [] });

    const { data, error } = await admin
      .from("chat_reactions")
      .select("*")
      .in("message_id", messageIds)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reactions: data ?? [] });
  } catch (err) {
    console.error("Chat reactions GET error:", err);
    return NextResponse.json({ reactions: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    const body = await request.json();
    const messageId = uuid(body.message_id ?? null);
    const emoji = cleanEmoji(body.emoji);

    if (!messageId || !emoji) return NextResponse.json({ error: "Message and emoji required" }, { status: 400 });

    const { data: msg } = await admin
      .from("chat_messages")
      .select("id, conversation_id, organization_id")
      .eq("id", messageId)
      .maybeSingle();

    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const organizationId = await ensureConversationAccess(admin, user.id, msg.conversation_id);
    if (!organizationId || organizationId !== msg.organization_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: existing } = await admin
      .from("chat_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin.from("chat_reactions").delete().eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ toggled: "removed", reaction_id: existing.id });
    }

    const { data, error } = await admin
      .from("chat_reactions")
      .insert({ message_id: messageId, user_id: user.id, user_name: body.user_name ?? getDisplayName(user), emoji })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ toggled: "added", reaction: data }, { status: 201 });
  } catch (err) {
    console.error("Chat reactions POST error:", err);
    return NextResponse.json({ error: "Failed to toggle reaction" }, { status: 500 });
  }
}
