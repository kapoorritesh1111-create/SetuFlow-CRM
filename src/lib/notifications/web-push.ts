// S36-MOBILE-371: server-side web push send.
// No-ops safely until WEB_PUSH_PUBLIC_KEY + WEB_PUSH_PRIVATE_KEY are configured.
import webpush from 'web-push';
import { pushScopesFor } from './communication-scope';

export type PushPayload = { title: string; body: string; action_url?: string; priority?: string; id?: string; type?: string; icon?: string; badge?: string };

let configured: boolean | null = null;
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || '';
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY || '';
  const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:ops@setuflowcrm.com';
  if (!publicKey || !privateKey) { configured = false; return false; }
  try { webpush.setVapidDetails(subject, publicKey, privateKey); configured = true; }
  catch { configured = false; }
  return configured;
}

type SubRow = { id: string; endpoint: string; auth_key: string; p256dh: string };
// Loosely typed to accept either the admin or server Supabase client.
type AnyClient = { from: (table: string) => any };

export async function sendWebPushToUsers(supabase: AnyClient, userIds: string[], payload: PushPayload, organizationId?: string): Promise<{ sent: number; pruned: number; skipped?: string }> {
  if (!ensureConfigured()) return { sent: 0, pruned: 0, skipped: 'vapid-not-configured' };
  if (!userIds.length) return { sent: 0, pruned: 0 };

  let query = supabase.from('push_subscriptions').select('id,endpoint,auth_key,p256dh')
    .in('user_id', userIds).in('app_scope', pushScopesFor(payload.type, organizationId));
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data, error } = await query;
  // Fail closed: never fall back to an unscoped device query.
  if (error) return { sent: 0, pruned: 0, skipped: 'subscription-query-failed' };
  const subs = (data ?? []) as SubRow[];
  if (!subs.length) return { sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { auth: s.auth_key, p256dh: s.p256dh } }, body);
      sent += 1;
    } catch (err) {
      const code = (err as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) dead.push(s.id);
    }
  }));
  let pruned = 0;
  if (dead.length) { await supabase.from('push_subscriptions').delete().in('id', dead); pruned = dead.length; }
  return { sent, pruned };
}
