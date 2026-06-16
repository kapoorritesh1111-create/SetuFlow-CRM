import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const SETU_ORG_ID = "3327b9a7-aadb-44b0-9793-30c4045d3c92";

type ChatPayload = {
  content?: unknown;
  sender_id?: unknown;
  sender_name?: unknown;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

export async function GET() {
  try {
    const { error } = await assertSetuMember();
    if (error) return error;

    const service = createServiceRoleClient();
    if (!service) return NextResponse.json({ messages: [] });

    const { data, error: queryError } = await (service as any)
      .from("smc_chat_messages")
      .select("*")
      .eq("organization_id", SETU_ORG_ID)
      .order("created_at", { ascending: false })
      .limit(50);

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

    const { data, error: insertError } = await (service as any)
      .from("smc_chat_messages")
      .insert({
        organization_id: SETU_ORG_ID,
        content,
        sender_id: text(body.sender_id) ?? userId,
        sender_name: text(body.sender_name) ?? "SMC User",
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
