import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");
    const channelKey = searchParams.get("channel");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    let convId = conversationId;

    // If channel key provided, look up the conversation
    if (!convId && channelKey) {
      const { data: conv } = await (supabase as any)
        .from("chat_conversations")
        .select("id")
        .eq("organization_id", SETU_ORG_ID)
        .eq("channel_key", channelKey)
        .maybeSingle();
      convId = conv?.id ?? null;
    }

    if (!convId) {
      return NextResponse.json({ messages: [], conversation_id: null });
    }

    const { data, error } = await (supabase as any)
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Update last_read_at for this user in this conversation
    await (supabase as any)
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", convId)
      .eq("user_id", user.id);

    return NextResponse.json({
      messages: (data ?? []).reverse(),
      conversation_id: convId,
    });
  } catch (err) {
    console.error("Chat GET error:", err);
    return NextResponse.json({ messages: [], conversation_id: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { content, conversation_id, channel, mentions, sender_name } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    let convId = conversation_id;

    // If channel key provided instead of conversation_id
    if (!convId && channel) {
      const { data: conv } = await (supabase as any)
        .from("chat_conversations")
        .select("id")
        .eq("organization_id", SETU_ORG_ID)
        .eq("channel_key", channel)
        .maybeSingle();
      convId = conv?.id;
    }

    if (!convId) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Extract issue refs from content
    const issueRefs = (content.match(/S\d+-[A-Z]+-\d+/g) ?? []).map((ref: string) => ({
      type: "issue",
      ref,
    }));

    const { data, error } = await (supabase as any)
      .from("chat_messages")
      .insert({
        conversation_id: convId,
        organization_id: SETU_ORG_ID,
        sender_id: user.id,
        sender_name: sender_name ?? user.user_metadata?.full_name ?? user.email ?? "Unknown",
        content: content.trim(),
        message_type: "user",
        mentions: mentions ?? [],
        entity_refs: issueRefs.length > 0 ? issueRefs : [],
      })
      .select("*")
      .single();

    if (error) throw error;

    // Update conversation's updated_at
    await (supabase as any)
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);

    // Create notifications for mentioned users
    if (mentions?.length) {
      const notifs = mentions.map((userId: string) => ({
        organization_id: SETU_ORG_ID,
        user_id: userId,
        conversation_id: convId,
        message_id: data.id,
        type: "mention",
        title: `${data.sender_name} mentioned you in chat`,
        content: content.trim().slice(0, 100),
        link: "/smc",
      }));
      await (supabase as any).from("chat_notifications").insert(notifs);
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err) {
    console.error("Chat POST error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
