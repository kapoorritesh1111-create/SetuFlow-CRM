import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ messages: [], conversation_id: null });

    const { searchParams } = new URL(request.url);
    const conversationIdParam = searchParams.get("conversation_id");
    const channelKey = searchParams.get("channel") ?? "general";

    let conversationId: string | null = conversationIdParam;

    if (!conversationId) {
      const { data: conv } = await admin
        .from("chat_conversations")
        .select("id")
        .eq("organization_id", SETU_ORG_ID)
        .eq("channel_key", channelKey)
        .maybeSingle();
      conversationId = conv?.id ?? null;
    } else {
      const { data: conv } = await admin
        .from("chat_conversations")
        .select("id")
        .eq("organization_id", SETU_ORG_ID)
        .eq("id", conversationId)
        .maybeSingle();
      conversationId = conv?.id ?? null;
    }

    if (!conversationId) return NextResponse.json({ messages: [], conversation_id: null });

    const { data } = await admin
      .from("chat_messages")
      .select("*")
      .eq("organization_id", SETU_ORG_ID)
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
    });
  } catch (err) {
    console.error("Chat GET error:", err);
    return NextResponse.json({ messages: [], conversation_id: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

    const body = await request.json();
    const { content, channel, conversation_id, mentions, sender_name } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    let convId = conversation_id;
    if (!convId && channel) {
      const { data: conv } = await admin
        .from("chat_conversations")
        .select("id")
        .eq("organization_id", SETU_ORG_ID)
        .eq("channel_key", channel)
        .maybeSingle();
      convId = conv?.id;
    }
    if (!convId) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const issueRefs = (content.match(/S\d+-[A-Z]+-\d+/g) ?? []).map((ref: string) => ({ type: "issue", ref }));
    const validMentions = Array.isArray(mentions) ? mentions.filter((id: string) => id && id.length > 10) : [];

    const { data, error } = await admin
      .from("chat_messages")
      .insert({
        conversation_id: convId,
        organization_id: SETU_ORG_ID,
        sender_id: user.id,
        sender_name: sender_name ?? user.user_metadata?.full_name ?? user.email ?? "Unknown",
        content: content.trim(),
        message_type: "user",
        mentions: validMentions,
        entity_refs: issueRefs.length > 0 ? issueRefs : [],
      })
      .select("*")
      .single();

    if (error) {
      console.error("Chat insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);

    if (validMentions.length > 0) {
      const notifs = validMentions.map((userId: string) => ({
        organization_id: SETU_ORG_ID,
        user_id: userId,
        conversation_id: convId,
        message_id: data.id,
        type: "mention",
        title: `${data.sender_name} mentioned you in #${channel ?? "chat"}`,
        content: content.trim().slice(0, 100),
        link: "/smc",
      }));
      try { await admin.from("chat_notifications").insert(notifs); } catch { /* ignore */ }
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err) {
    console.error("Chat POST error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
