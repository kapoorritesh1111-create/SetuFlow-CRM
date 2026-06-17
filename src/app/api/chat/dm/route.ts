import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureParticipant, getAuthenticatedChatUser, getDisplayName, getUserOrganizationId } from "@/lib/chat/api-helpers";

export const dynamic = "force-dynamic";

type DmPayload = { recipient_id?: string; recipient_name?: string; organization_id?: string };

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

    const payload = (await request.json()) as DmPayload;
    const recipientId = payload.recipient_id;
    const recipientName = payload.recipient_name?.trim() || "Team member";

    if (!recipientId || !/^[0-9a-fA-F-]{36}$/.test(recipientId)) {
      return NextResponse.json({ error: "Recipient is required" }, { status: 400 });
    }
    if (recipientId === user.id) {
      return NextResponse.json({ error: "Choose another team member" }, { status: 400 });
    }

    const orgId = await getUserOrganizationId(admin, user.id, payload.organization_id);
    if (!orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const recipientOrgId = await getUserOrganizationId(admin, recipientId, orgId);
    if (!recipientOrgId) return NextResponse.json({ error: "Recipient is not in this organization" }, { status: 403 });

    const { data: rows, error: participantError } = await admin
      .from("chat_participants")
      .select("conversation_id, user_id")
      .eq("organization_id", orgId)
      .in("user_id", [user.id, recipientId]);
    if (participantError) throw participantError;

    const mine = new Set((rows ?? []).filter((row: any) => row.user_id === user.id).map((row: any) => row.conversation_id));
    const sharedIds = (rows ?? [])
      .filter((row: any) => row.user_id === recipientId && mine.has(row.conversation_id))
      .map((row: any) => row.conversation_id);

    if (sharedIds.length > 0) {
      const { data: existing, error: existingError } = await admin
        .from("chat_conversations")
        .select("id, title")
        .eq("organization_id", orgId)
        .eq("conversation_type", "dm")
        .in("id", sharedIds)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return NextResponse.json({ conversation_id: existing.id, title: existing.title });
    }

    const title = `${getDisplayName(user, "User")} / ${recipientName}`;
    const { data: conv, error: createError } = await admin
      .from("chat_conversations")
      .insert({ organization_id: orgId, conversation_type: "dm", title, created_by: user.id })
      .select("id, title")
      .single();
    if (createError) throw createError;

    await ensureParticipant(admin, conv.id, orgId, user.id);
    await ensureParticipant(admin, conv.id, orgId, recipientId);

    return NextResponse.json({ conversation_id: conv.id, title: conv.title }, { status: 201 });
  } catch (err) {
    console.error("Chat DM error:", err);
    return NextResponse.json({ error: "Failed to open DM" }, { status: 500 });
  }
}
