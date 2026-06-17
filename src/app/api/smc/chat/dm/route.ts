import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";

type DmBody = {
  recipient_id?: string;
  recipient_name?: string;
};

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function displayName(user: Awaited<ReturnType<typeof getUser>>) {
  return user?.user_metadata?.full_name ?? user?.email ?? "SMC User";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

    const body = (await request.json()) as DmBody;
    const recipientId = body.recipient_id;
    const recipientName = body.recipient_name?.trim() || "Team member";

    if (!recipientId || !/^[0-9a-fA-F-]{36}$/.test(recipientId)) {
      return NextResponse.json({ error: "Recipient is required" }, { status: 400 });
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: "Choose another team member" }, { status: 400 });
    }

    const { data: participantRows, error: participantError } = await admin
      .from("chat_participants")
      .select("conversation_id, user_id")
      .eq("organization_id", SETU_ORG_ID)
      .in("user_id", [user.id, recipientId]);

    if (participantError) throw participantError;

    const currentUserConversations = new Set(
      (participantRows ?? [])
        .filter((row) => row.user_id === user.id)
        .map((row) => row.conversation_id),
    );
    const sharedConversationIds = (participantRows ?? [])
      .filter((row) => row.user_id === recipientId && currentUserConversations.has(row.conversation_id))
      .map((row) => row.conversation_id);

    if (sharedConversationIds.length > 0) {
      const { data: existing, error: existingError } = await admin
        .from("chat_conversations")
        .select("id, title")
        .eq("organization_id", SETU_ORG_ID)
        .eq("conversation_type", "dm")
        .in("id", sharedConversationIds)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        return NextResponse.json({ conversation_id: existing.id, title: existing.title });
      }
    }

    const title = `${displayName(user)} / ${recipientName}`;
    const { data: conv, error: createError } = await admin
      .from("chat_conversations")
      .insert({
        organization_id: SETU_ORG_ID,
        conversation_type: "dm",
        title,
        created_by: user.id,
      })
      .select("id, title")
      .single();

    if (createError) throw createError;

    const { error: participantsError } = await admin.from("chat_participants").insert([
      {
        conversation_id: conv.id,
        organization_id: SETU_ORG_ID,
        user_id: user.id,
        role: "member",
      },
      {
        conversation_id: conv.id,
        organization_id: SETU_ORG_ID,
        user_id: recipientId,
        role: "member",
      },
    ]);

    if (participantsError) throw participantsError;

    return NextResponse.json({ conversation_id: conv.id, title: conv.title }, { status: 201 });
  } catch (err) {
    console.error("SMC DM error:", err);
    return NextResponse.json({ error: "Failed to open DM" }, { status: 500 });
  }
}
