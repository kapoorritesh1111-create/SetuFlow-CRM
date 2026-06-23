// S36-MOBILE-373 — SMC-native notifications.
// Writes directly to the notifications table (read by the SMC bell with showDerived=false)
// and sends web push. Avoids the CRM per-type preference gating so SMC alerts reliably fire.
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { sendWebPushToUsers } from './web-push';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

type AnyClient = { from: (table: string) => any };
type MemberRow = { user_id: string; full_name: string | null; username: string | null };

function admin(): AnyClient | null {
  return (createAdminSupabaseClient() as AnyClient | null) ?? null;
}

async function loadSmcMembers(client: AnyClient): Promise<MemberRow[]> {
  const { data } = await client.from('organization_members').select('user_id, profiles(full_name, username)').eq('organization_id', INTERNAL_ORG_ID);
  return ((data ?? []) as { user_id: string; profiles: { full_name: string | null; username: string | null } | null }[])
    .map((r) => ({ user_id: r.user_id, full_name: r.profiles?.full_name ?? null, username: r.profiles?.username ?? null }))
    .filter((r) => Boolean(r.user_id));
}

/** All SMC org member user IDs, optionally excluding the actor. */
export async function getSmcRecipientIds(excludeUserId?: string): Promise<string[]> {
  const client = admin();
  if (!client) return [];
  const members = await loadSmcMembers(client);
  return members.map((m) => m.user_id).filter((id) => id && id !== excludeUserId);
}

const initials = (name: string | null) => (name ?? '').split(/\s+/).map((w) => w[0] ?? '').join('').toLowerCase();

/** Resolve @tokens in a comment body to SMC member user IDs (by first name, username, or initials). */
export async function resolveMentionUserIds(body: string, excludeUserId?: string): Promise<string[]> {
  const tokens = Array.from(body.matchAll(/@([A-Za-z][\w-]*)/g)).map((m) => m[1].toLowerCase());
  if (!tokens.length) return [];
  const client = admin();
  if (!client) return [];
  const members = await loadSmcMembers(client);
  const matched = new Set<string>();
  for (const token of tokens) {
    for (const m of members) {
      const first = (m.full_name ?? '').split(/\s+/)[0]?.toLowerCase() ?? '';
      const user = (m.username ?? '').toLowerCase();
      if (token === first || token === user || token === initials(m.full_name)) {
        if (m.user_id && m.user_id !== excludeUserId) matched.add(m.user_id);
      }
    }
  }
  return Array.from(matched);
}

export type SmcNotifyInput = {
  userIds: string[];
  title: string;
  body: string;
  actionUrl?: string;
  type?: string;
  priority?: 'normal' | 'high' | 'critical';
  entityRef?: string | null;
};

/** Insert in-app notification rows for each recipient and deliver web push (best-effort). */
export async function notifySmc(input: SmcNotifyInput): Promise<{ inserted: number; push: { sent: number; pruned: number; skipped?: string } }> {
  const targets = Array.from(new Set(input.userIds.filter(Boolean)));
  if (!targets.length) return { inserted: 0, push: { sent: 0, pruned: 0 } };
  const client = admin();
  if (!client) return { inserted: 0, push: { sent: 0, pruned: 0 } };

  const priority = input.priority ?? 'normal';
  const type = input.type ?? 'smc_event';
  const actionUrl = input.actionUrl ?? '/smc';
  const rows = targets.map((uid) => ({
    organization_id: INTERNAL_ORG_ID,
    user_id: uid,
    type,
    title: input.title,
    body: input.body,
    icon: 'bell-o',
    priority,
    entity_ref: input.entityRef ?? null,
    action_url: actionUrl,
    read: false,
  }));

  let inserted = 0;
  try {
    const { data } = await client.from('notifications').insert(rows).select('id');
    inserted = ((data ?? []) as unknown[]).length;
  } catch { /* in-app insert is best-effort */ }

  let push: { sent: number; pruned: number; skipped?: string } = { sent: 0, pruned: 0 };
  try {
    push = await sendWebPushToUsers(client, targets, { title: input.title, body: input.body, action_url: actionUrl, priority, type });
  } catch { /* push is best-effort */ }

  return { inserted, push };
}
