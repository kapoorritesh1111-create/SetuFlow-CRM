import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";

type ChatPayload = {
  content?: unknown;
  sender_id?: unknown;
  sender_name?: unknown;
  channel?: unknown;
  recipient_id?: unknown;
  recipient_name?: unknown;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeChannel(value: unknown) {
  return text(value) === "dm" ? "dm" : "team";
}

async function assertSetuMember() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { userId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", SETU_ORG_ID)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    return { userId: user.id, error: NextResponse.json({ error: "Unable to verify SMC access" }, { status: 500 }) };
  }

  if (!member) {
    return { userId: user.id, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { userId: user.id, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const { error } = await assertSetuMember();
    if (error) return error;

    const service = createServiceRoleClient();
    if (!service) return NextResponse.json({ messages: [] });

    const { searchParams } = new URL(request.url);
    const channel = safeChannel(searchParams.get("channel"));
    const recipientId = text(searchParams.get("recipient_id"));

    let query = (service as any)
      .from("smc_chat_messages")
      .select("*")
      .eq("organization_id", SETU_ORG_ID)
      .eq("channel", channel)
      .order("created_at", { ascending: false })
      .limit(50);

    query = channel === "dm" && recipientId ? query.eq("recipient_id", recipientId) : query.is("recipient_id", null);

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;
    return NextResponse.json({ messages: (data ?? []).reverse() });
  } catch (err) {
    console.error("SMC chat GET error:", err);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await assertSetuMember();
    if (error) return error;

    const service = createServiceRoleClient();
    if (!service) return NextResponse.json({ error: "Chat client unavailable" }, { status: 500 });

    const body = (await request.json()) as ChatPayload;
    const content = text(body.content);
    if (!content) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const channel = safeChannel(body.channel);
    const recipientId = channel === "dm" ? text(body.recipient_id) : null;
    const recipientName = channel === "dm" ? text(body.recipient_name) : null;
    if (channel === "dm" && !recipientId) return NextResponse.json({ error: "Recipient is required" }, { status: 400 });

    const { data, error: insertError } = await (service as any)
      .from("smc_chat_messages")
      .insert({
        organization_id: SETU_ORG_ID,
        content,
        sender_id: text(body.sender_id) ?? userId,
        sender_name: text(body.sender_name) ?? "Ritesh Kapoor",
        channel,
        recipient_id: recipientId,
        recipient_name: recipientName,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err) {
    console.error("SMC chat POST error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
