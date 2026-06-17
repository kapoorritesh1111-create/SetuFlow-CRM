import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createEntityConversation, getAuthenticatedChatUser, getUserOrganizationId } from "@/lib/chat/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ conversations: [] });

    const params = new URL(request.url).searchParams;
    const orgId = await getUserOrganizationId(admin, user.id, params.get("organization_id"));
    if (!orgId) return NextResponse.json({ conversations: [] });

    const { data: parts } = await admin
      .from("chat_participants")
      .select("conversation_id, last_read_at, muted")
      .eq("organization_id", orgId)
      .eq("user_id", user.id);

    if (!parts?.length) return NextResponse.json({ conversations: [], organization_id: orgId });

    const ids = parts.map((p: any) => p.conversation_id);
    const { data: conversations } = await admin
      .from("chat_conversations")
      .select("*")
      .eq("organization_id", orgId)
      .in("id", ids)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });

    const enriched = await Promise.all((conversations ?? []).map(async (conv: any) => {
      const part = parts.find((p: any) => p.conversation_id === conv.id);
      const { data: lastMsg } = await admin
        .from("chat_messages")
        .select("content, sender_name, created_at")
        .eq("organization_id", orgId)
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { count } = await admin
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("conversation_id", conv.id)
        .gt("created_at", part?.last_read_at ?? "1970-01-01");
      return { ...conv, last_message: lastMsg ?? null, unread_count: count ?? 0, muted: part?.muted ?? false };
    }));

    return NextResponse.json({ conversations: enriched, organization_id: orgId });
  } catch (err) {
    console.error("Chat conversations GET error:", err);
    return NextResponse.json({ conversations: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedChatUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

    const payload = await request.json();
    const orgId = await getUserOrganizationId(admin, user.id, payload.organization_id);
    if (!orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (payload.entity_type && payload.entity_id) {
      const conv = await createEntityConversation(admin, {
        organizationId: orgId,
        entityType: payload.entity_type,
        entityId: payload.entity_id,
        title: payload.title ?? payload.autoCreateTitle ?? `${payload.entity_type} discussion`,
        createdBy: user.id,
        autoEnrollUsers: Array.isArray(payload.auto_enroll_users) ? payload.auto_enroll_users : [],
      });
      return NextResponse.json({ conversation: conv, conversation_id: conv.id, organization_id: orgId }, { status: 201 });
    }

    return NextResponse.json({ error: "entity_type and entity_id are required" }, { status: 400 });
  } catch (err) {
    console.error("Chat conversations POST error:", err);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
