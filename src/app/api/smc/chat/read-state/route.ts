import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";

type MessageRow = { id: string; sender_id: string | null; created_at: string };
type ParticipantRow = { user_id: string | null; last_read_at: string | null };

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ receipts: {} });

    const conversationId = new URL(request.url).searchParams.get("conversation_id");
    if (!conversationId) return NextResponse.json({ receipts: {} });

    const { data: messages } = await admin
      .from("chat_messages")
      .select("id, sender_id, created_at")
      .eq("organization_id", SETU_ORG_ID)
      .eq("conversation_id", conversationId)
      .eq("sender_id", user.id)
      .limit(50);

    const { data: participants } = await admin
      .from("chat_participants")
      .select("user_id, last_read_at")
      .eq("organization_id", SETU_ORG_ID)
      .eq("conversation_id", conversationId);

    const others = ((participants ?? []) as ParticipantRow[]).filter((participant) => participant.user_id && participant.user_id !== user.id);
    const receipts = Object.fromEntries(((messages ?? []) as MessageRow[]).map((message) => {
      const isRead = others.some((participant) => {
        if (!participant.last_read_at) return false;
        return new Date(participant.last_read_at).getTime() >= new Date(message.created_at).getTime();
      });
      return [message.id, isRead ? "read" : "delivered"];
    }));

    return NextResponse.json({ receipts });
  } catch (err) {
    console.error("Chat read state error:", err);
    return NextResponse.json({ receipts: {} });
  }
}
