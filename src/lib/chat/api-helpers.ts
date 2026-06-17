import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ChatAdmin = NonNullable<ReturnType<typeof createServiceRoleClient>>;
export type ChatUser = { id: string; email?: string | null; user_metadata?: Record<string, any> | null };

export async function getAuthenticatedChatUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user as ChatUser | null;
}

export function getDisplayName(user: ChatUser | null, fallback = "Team member") {
  return user?.user_metadata?.full_name ?? user?.email ?? fallback;
}

export async function getUserOrganizationId(admin: ChatAdmin, userId: string, requestedOrgId?: string | null) {
  let query = admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (requestedOrgId) query = query.eq("organization_id", requestedOrgId);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error || !data?.organization_id) return null;
  return data.organization_id as string;
}

export async function ensureConversationAccess(admin: ChatAdmin, userId: string, conversationId: string) {
  const { data, error } = await admin
    .from("chat_participants")
    .select("organization_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data?.organization_id) return null;
  return data.organization_id as string;
}

export async function ensureParticipant(admin: ChatAdmin, conversationId: string, organizationId: string, userId: string, role = "member") {
  const row = { conversation_id: conversationId, organization_id: organizationId, user_id: userId, role };
  const { error } = await admin.from("chat_participants").upsert(row, { onConflict: "conversation_id,user_id" });
  if (error) {
    await admin.from("chat_participants").insert(row);
  }
}

export function extractIssueRefs(content: string) {
  return (content.match(/S\d+-[A-Z]+-\d+/g) ?? []).map((ref) => ({ type: "issue", ref }));
}

export async function findEntityConversation(admin: ChatAdmin, organizationId: string, entityType: string, entityId: string) {
  const { data, error } = await admin
    .from("chat_conversations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function createEntityConversation(admin: ChatAdmin, opts: {
  organizationId: string;
  entityType: string;
  entityId: string;
  title: string;
  createdBy: string;
  autoEnrollUsers?: string[];
}) {
  const { data: existing } = await admin
    .from("chat_conversations")
    .select("*")
    .eq("organization_id", opts.organizationId)
    .eq("entity_type", opts.entityType)
    .eq("entity_id", opts.entityId)
    .maybeSingle();

  if (existing) return existing;

  const { data: conv, error } = await admin
    .from("chat_conversations")
    .insert({
      organization_id: opts.organizationId,
      conversation_type: "entity_thread",
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      title: opts.title,
      created_by: opts.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;

  const participantIds = Array.from(new Set([opts.createdBy, ...(opts.autoEnrollUsers ?? [])].filter(Boolean)));
  for (const userId of participantIds) {
    await ensureParticipant(admin, conv.id, opts.organizationId, userId);
  }

  return conv;
}

export async function getConversationByChannel(admin: ChatAdmin, organizationId: string, channelKey: string) {
  const { data, error } = await admin
    .from("chat_conversations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("channel_key", channelKey)
    .maybeSingle();

  if (error) return null;
  return data;
}
