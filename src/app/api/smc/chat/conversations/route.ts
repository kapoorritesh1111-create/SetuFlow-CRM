import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get all conversations where user is a participant
    const { data: participations } = await (supabase as any)
      .from("chat_participants")
      .select("conversation_id, last_read_at, muted")
      .eq("user_id", user.id);

    if (!participations?.length) {
      return NextResponse.json({ conversations: [] });
    }

    const convIds = participations.map((p: any) => p.conversation_id);

    const { data: conversations } = await (supabase as any)
      .from("chat_conversations")
      .select("*")
      .in("id", convIds)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });

    // Get last message + unread count for each conversation
    const enriched = await Promise.all(
      (conversations ?? []).map(async (conv: any) => {
        const part = participations.find((p: any) => p.conversation_id === conv.id);

        // Last message
        const { data: lastMsg } = await (supabase as any)
          .from("chat_messages")
          .select("content, sender_name, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Unread count
        const { count } = await (supabase as any)
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .gt("created_at", part?.last_read_at ?? "1970-01-01");

        return {
          ...conv,
          last_message: lastMsg ?? null,
          unread_count: count ?? 0,
          muted: part?.muted ?? false,
        };
      })
    );

    return NextResponse.json({ conversations: enriched });
  } catch (err) {
    console.error("Chat conversations error:", err);
    return NextResponse.json({ conversations: [] });
  }
}
