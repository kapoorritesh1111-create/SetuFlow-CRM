import { createServiceRoleClient } from "@/lib/supabase/service-role";

const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000000";
const SYSTEM_BOT_NAME = "SETU Flow";

export async function postSystemMessage(opts: {
  entityType: string;
  entityId: string;
  organizationId: string;
  content: string;
  issueRefs?: string[];
}) {
  const admin = createServiceRoleClient();
  if (!admin) return;

  const { data: conv, error } = await admin
    .from("chat_conversations")
    .select("id")
    .eq("entity_type", opts.entityType)
    .eq("entity_id", opts.entityId)
    .eq("organization_id", opts.organizationId)
    .maybeSingle();

  if (error || !conv) return;

  await admin.from("chat_messages").insert({
    conversation_id: conv.id,
    organization_id: opts.organizationId,
    sender_id: SYSTEM_BOT_ID,
    sender_name: SYSTEM_BOT_NAME,
    content: opts.content,
    message_type: "bot",
    entity_refs: (opts.issueRefs ?? []).map((ref) => ({ type: "issue", ref })),
  });

  await admin
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conv.id);
}

export async function postToChannel(opts: {
  channelKey: string;
  organizationId: string;
  content: string;
}) {
  const admin = createServiceRoleClient();
  if (!admin) return;

  const { data: conv, error } = await admin
    .from("chat_conversations")
    .select("id")
    .eq("channel_key", opts.channelKey)
    .eq("organization_id", opts.organizationId)
    .maybeSingle();

  if (error || !conv) return;

  await admin.from("chat_messages").insert({
    conversation_id: conv.id,
    organization_id: opts.organizationId,
    sender_id: SYSTEM_BOT_ID,
    sender_name: SYSTEM_BOT_NAME,
    content: opts.content,
    message_type: "bot",
  });

  await admin
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conv.id);
}
