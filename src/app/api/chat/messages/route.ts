import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { handleSourceDeletion } from "@/lib/rag/deletion-handler";
import crypto from "crypto";
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

type AttachmentInput = {
  name?: unknown;
  url?: unknown;
  size?: unknown;
  type?: unknown;
  storage_path?: unknown;
};

function sanitizeAttachments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((item: AttachmentInput) => ({
    name: typeof item?.name === "string" ? item.name.slice(0, 180) : "Attachment",
    url: typeof item?.url === "string" ? item.url : "",
    size: typeof item?.size === "number" ? item.size : 0,
    type: typeof item?.type === "string" ? item.type.slice(0, 120) : "application/octet-stream",
    storage_path: typeof item?.storage_path === "string" ? item.storage_path : "",
  })).filter((item) => item.url && item.storage_path);
}

function uuid(value: string | null) {
  return value && /^[0-9a-fA-F-]{36}$/.test(value) ? value : null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ messages: [], conversation_id: null });

    const { searchParams } = new URL(request.url);
    const conversationIdParam = searchParams.get("conversation_id");
    const parentMessageId = uuid(searchParams.get("parent_message_id"));
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

    let messageQuery = admin
      .from("chat_messages")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (parentMessageId) {
      messageQuery = messageQuery.eq("parent_message_id", parentMessageId);
    }

    const { data } = await messageQuery;
    const messages = (data ?? []).reverse();
    const parentIds = messages.filter((item: any) => !item.parent_message_id).map((item: any) => item.id).filter(Boolean);

    let replyCounts: Record<string, number> = {};
    if (!parentMessageId && parentIds.length > 0) {
      const { data: replies } = await admin
        .from("chat_messages")
        .select("parent_message_id")
        .eq("organization_id", organizationId)
        .eq("conversation_id", conversationId)
        .in("parent_message_id", parentIds);
      replyCounts = (replies ?? []).reduce((acc: Record<string, number>, row: any) => {
        if (row.parent_message_id) acc[row.parent_message_id] = (acc[row.parent_message_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    const { data: conversation } = await admin
      .from("chat_conversations")
      .select("id, conversation_type")
      .eq("id", conversationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    const { data: participants } = await admin
      .from("chat_participants")
      .select("user_id, last_read_at")
      .eq("conversation_id", conversationId)
      .eq("organization_id", organizationId);

    await admin
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    return NextResponse.json({
      messages: messages.map((item: any) => ({ ...item, reply_count: replyCounts[item.id] ?? 0 })),
      conversation_id: conversationId,
      organization_id: organizationId,
      conversation_type: conversation?.conversation_type ?? null,
      participants: participants ?? [],
      parent_message_id: parentMessageId,
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
    const { content, channel, conversation_id, mentions, sender_name, organization_id, parent_message_id } = body;
    const attachments = sanitizeAttachments(body.attachments);
    const trimmedContent = typeof content === "string" ? content.trim() : "";

    if (!trimmedContent && attachments.length === 0) {
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

    const { data: conversation } = await admin
      .from("chat_conversations")
      .select("id, title, conversation_type, channel_key")
      .eq("id", convId)
      .eq("organization_id", orgId)
      .maybeSingle();

    const parentId = uuid(parent_message_id ?? null);
    if (parentId) {
      const { data: parent } = await admin
        .from("chat_messages")
        .select("id")
        .eq("id", parentId)
        .eq("organization_id", orgId)
        .eq("conversation_id", convId)
        .maybeSingle();
      if (!parent) return NextResponse.json({ error: "Parent message not found" }, { status: 404 });
    }

    const validMentions = Array.isArray(mentions)
      ? mentions.filter((id: string) => /^[0-9a-fA-F-]{36}$/.test(id))
      : [];

    const displayName = sender_name ?? getDisplayName(user, "Unknown");
    const { data, error } = await admin
      .from("chat_messages")
      .insert({
        conversation_id: convId,
        organization_id: orgId,
        sender_id: user.id,
        sender_name: displayName,
        content: trimmedContent,
        message_type: "user",
        mentions: validMentions,
        entity_refs: extractIssueRefs(trimmedContent),
        attachments,
        parent_message_id: parentId,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Chat message insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date().toISOString();
    await admin
      .from("chat_conversations")
      .update({ updated_at: now })
      .eq("id", convId);

    await admin
      .from("chat_participants")
      .update({ last_read_at: now })
      .eq("conversation_id", convId)
      .eq("organization_id", orgId)
      .eq("user_id", user.id);

    const notificationUserIds = new Set<string>(validMentions.filter((id: string) => id !== user.id));

    if (conversation?.conversation_type === "dm") {
      const { data: participantRows } = await admin
        .from("chat_participants")
        .select("user_id, muted")
        .eq("conversation_id", convId)
        .eq("organization_id", orgId)
        .neq("user_id", user.id);

      for (const row of participantRows ?? []) {
        if (!row.muted && row.user_id) notificationUserIds.add(row.user_id);
      }
    }

    if (notificationUserIds.size > 0) {
      const notifs = Array.from(notificationUserIds).map((userId) => {
        const isMention = validMentions.includes(userId);
        const isDm = conversation?.conversation_type === "dm";
        return {
          organization_id: orgId,
          user_id: userId,
          conversation_id: convId,
          message_id: data.id,
          type: isDm && !isMention ? "dm" : parentId ? "reply" : "mention",
          title: isDm ? `${displayName} sent you a direct message` : `${displayName} mentioned you in ${conversation?.channel_key ? `#${conversation.channel_key}` : "chat"}`,
          content: trimmedContent ? trimmedContent.slice(0, 140) : "Attachment",
          link: `/chat?conversation_id=${convId}`,
        };
      });
      try { await admin.from("chat_notifications").insert(notifs); } catch (notifyErr) { console.error("Chat notification insert error:", notifyErr); }
    }

    return NextResponse.json({ message: { ...data, reply_count: 0 } }, { status: 201 });
  } catch (err) {
    console.error("Chat messages POST error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const chatUser = await getAuthenticatedChatUser();
    if (!chatUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    const body = await request.json();
    const msgId = uuid(body.id ?? null);
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!msgId) return NextResponse.json({ error: "Message ID required" }, { status: 400 });
    if (!content) return NextResponse.json({ error: "Message content required" }, { status: 400 });

    const { data: msg } = await admin
      .from("chat_messages")
      .select("id, sender_id, content, original_content, conversation_id")
      .eq("id", msgId)
      .maybeSingle();

    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (msg.sender_id !== chatUser.id) return NextResponse.json({ error: "Can only edit your own messages" }, { status: 403 });

    const organizationId = await ensureConversationAccess(admin, chatUser.id, msg.conversation_id);
    if (!organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await admin
      .from("chat_messages")
      .update({
        content,
        original_content: msg.original_content ?? msg.content,
        edited_at: new Date().toISOString(),
      })
      .eq("id", msgId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });
  } catch (err) {
    console.error("Chat messages PATCH error:", err);
    return NextResponse.json({ error: "Failed to edit message" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const chatUser = await getAuthenticatedChatUser();
    if (!chatUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const msgId = uuid(request.nextUrl.searchParams.get("id"));
    if (!msgId) return NextResponse.json({ error: "Message ID required" }, { status: 400 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    // Select attachments to capture uploaded file data
    const { data: msg } = await admin
      .from("chat_messages")
      .select("id, sender_id, conversation_id, attachments")
      .eq("id", msgId)
      .maybeSingle();

    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (msg.sender_id !== chatUser.id) return NextResponse.json({ error: "Can only delete your own messages" }, { status: 403 });

    const organizationId = await ensureConversationAccess(admin, chatUser.id, msg.conversation_id);
    if (!organizationId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // --- RAG EMBEDDINGS TOMBSTONE PROPAGATION ---

    // 1. Delete associated attachments/documents from RAG embeddings
    if (msg.attachments && Array.isArray(msg.attachments)) {
      for (const attachment of msg.attachments) {
        const urlOrPath = (attachment.storage_path || attachment.url || "") as string;
        
        // Extract all UUIDs using the /g flag and pick the LAST ONE.
        // The last UUID is the actual file source_id, preventing org ID deletion mismatch.
        const uuidMatches = urlOrPath.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g);
        const fileSourceId = uuidMatches ? uuidMatches[uuidMatches.length - 1] : null;

        if (fileSourceId) {
          // 1st Try: Delete using 'chat_attachment' source_type
          await handleSourceDeletion({
            organizationId: organizationId,
            sourceType: "chat_attachment", 
            sourceId: fileSourceId,
            idempotencyKey: crypto.randomUUID(),
            actorUserId: chatUser.id,
            dbClient: admin,
          });

          // 2nd Try: Delete using 'documents' source_type (just in case)
          await handleSourceDeletion({
            organizationId: organizationId,
            sourceType: "documents", 
            sourceId: fileSourceId,
            idempotencyKey: crypto.randomUUID(),
            actorUserId: chatUser.id,
            dbClient: admin,
          });
        }
      }
    }

    // 2. Delete the chat message itself from RAG embeddings
    await handleSourceDeletion({
      organizationId: organizationId,
      sourceType: "chat_message",
      sourceId: msgId,
      idempotencyKey: crypto.randomUUID(),
      actorUserId: chatUser.id,
      dbClient: admin,
    });
    // --------------------------------------------

    await admin.from("chat_messages").delete().eq("id", msgId);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Chat messages DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}