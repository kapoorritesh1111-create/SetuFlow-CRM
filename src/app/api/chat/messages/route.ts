import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createEntityConversation,
  ensureConversationAccess,
  ensureParticipant,
  extractIssueRefs,
  getAuthenticatedChatUser,
  getConversationByChannel,
  getDisplayName,
  getUserOrganizationId,
} from "@/lib/chat/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ messages: [], conversation_id: null });

    const { searchParams } = new URL(request.url);
    const conversationIdParam = searchParams.get("conversation_id");
    const channelKey = searchParams.get("channel");
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const requestedOrgId = searchParams.get("organization_id");

    let organizationId: string | null = null;
    let conversationId: string | null = conversationIdParam;

    if (conversationId) {
      organizationId = await ensureConversationAccess(admin, user.id, conversationId);
      if (!organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else {
      organizationId = await getUserOrganizationId(admin, user.id, requestedOrgId);
      if (!organizationId) return NextResponse.json({ error: "No active organization" }, { status: 403 });

      if (entityType && entityId) {
        const title = searchParams.get("auto_create_title") ?? `${entityType} discussion`;
        const enroll = searchParams.getAll("auto_enroll_users");
        const conv = await createEntityConversation(admin, {
          organizationId,
          entityType,
          entityId,
          title,
          createdBy: user.id,
          autoEnrollUsers: enroll,
        });
        conversationId = conv.id;
      } else {
        const conv = await getConversationByChannel(admin, organizationId, channelKey ?? "general");
        conversationId = conv?.id ?? null;
      }
    }

    if (!conversationId || !organizationId) {
      return NextResponse.json({ messages: [], conversation_id: null });
    }

    await ensureParticipant(admin, conversationId, organizationId, user.id);

    const { data } = await admin
      .from("chat_messages")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(50);

    await admin
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    return NextResponse.json({
      messages: (data ?? []).reverse(),
      conversation_id: conversationId,
      organization_id: organizationId,
    });
  } catch (err) {
    console.error("Chat messages GET error:", err);
    return NextResponse.json({ messages: [], conversation_id: null }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

    const body = await request.json();
    const { content, channel, conversation_id, mentions, sender_name, organization_id } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    let orgId: string | null = null;
    let convId = conversation_id as string | undefined;

    if (convId) {
      orgId = await ensureConversationAccess(admin, user.id, convId);
    } else {
      orgId = await getUserOrganizationId(admin, user.id, organization_id);
      if (orgId && channel) {
        const conv = await getConversationByChannel(admin, orgId, channel);
        convId = conv?.id;
      }
    }

    if (!orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!convId) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    await ensureParticipant(admin, convId, orgId, user.id);

    const validMentions = Array.isArray(mentions)
      ? mentions.filter((id: string) => /^[0-9a-fA-F-]{36}$/.test(id))
      : [];

    const { data, error } = await admin
      .from("chat_messages")
      .insert({
        conversation_id: convId,
        organization_id: orgId,
        sender_id: user.id,
        sender_name: sender_name ?? getDisplayName(user, "Unknown"),
        content: content.trim(),
        message_type: "user",
        mentions: validMentions,
        entity_refs: extractIssueRefs(content),
      })
      .select("*")
      .single();

    if (error) {
      console.error("Chat message insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);

    if (validMentions.length > 0) {
      const notifs = validMentions.map((userId: string) => ({
        organization_id: orgId,
        user_id: userId,
        conversation_id: convId,
        message_id: data.id,
        type: "mention",
        title: `${data.sender_name} mentioned you in ${channel ? `#${channel}` : "chat"}`,
        content: content.trim().slice(0, 100),
        link: "/chat",
      }));
      try { await admin.from("chat_notifications").insert(notifs); } catch { /* best effort */ }
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err) {
    console.error("Chat messages POST error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await getAuthenticatedChatUser();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const msgId = request.nextUrl.searchParams.get("id");
    if (!msgId) return NextResponse.json({ error: "Message ID required" }, { status: 400 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    // Only allow deleting own messages
    const { data: msg } = await admin
      .from("chat_messages")
      .select("id, sender_id")
      .eq("id", msgId)
      .maybeSingle();

    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (msg.sender_id !== userId) return NextResponse.json({ error: "Can only delete your own messages" }, { status: 403 });

    await admin.from("chat_messages").delete().eq("id", msgId);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Chat messages DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
