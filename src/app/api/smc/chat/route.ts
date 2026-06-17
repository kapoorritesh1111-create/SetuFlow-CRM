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
    const channelKey = searchParams.get("channel") ?? "general";

    // Look up conversation by channel key
    const { data: conv } = await admin
      .from("chat_conversations")
      .select("id")
      .eq("organization_id", SETU_ORG_ID)
      .eq("channel_key", channelKey)
      .maybeSingle();

    if (!conv) return NextResponse.json({ messages: [], conversation_id: null });

    // Fetch messages
    const { data } = await admin
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Update last_read_at
    await admin
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conv.id)
      .eq("user_id", user.id);

    return NextResponse.json({
      messages: (data ?? []).reverse(),
      conversation_id: conv.id,
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

    // Resolve conversation ID
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
    if (!convId) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    // Extract issue refs
    const issueRefs = (content.match(/S\d+-[A-Z]+-\d+/g) ?? []).map((ref: string) => ({ type: "issue", ref }));

    // Insert message with service role (bypasses RLS)
    const { data, error } = await admin
      .from("chat_messages")
      .insert({
        conversation_id: convId,
        organization_id: SETU_ORG_ID,
        sender_id: user.id,
        sender_name: sender_name ?? user.user_metadata?.full_name ?? user.email ?? "Unknown",
        content: content.trim(),
        message_type: "user",
        mentions: (mentions ?? []).filter((id: string) => id && id.length > 10),
        entity_refs: issueRefs.length > 0 ? issueRefs : [],
      })
      .select("*")
      .single();

    if (error) {
      console.error("Chat insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update conversation timestamp
    await admin
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);

    // Create notifications for mentions
    if (mentions?.length) {
      const validMentions = mentions.filter((id: string) => id && id.length > 10);
      if (validMentions.length > 0) {
        const notifs = validMentions.map((userId: string) => ({
          organization_id: SETU_ORG_ID,
          user_id: userId,
          conversation_id: convId,
          message_id: data.id,
          type: "mention",
          title: `${data.sender_name} mentioned you in #${channel ?? 'chat'}`,
          content: content.trim().slice(0, 100),
          link: "/smc",
        }));
        try { await admin.from("chat_notifications").insert(notifs); } catch { /* ignore */ }
      }
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err) {
    console.error("Chat POST error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
