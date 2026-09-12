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

type SubRow = { id: string; user_id: string; endpoint: string; auth_key: string; p256dh: string };
// Loosely typed to accept either the admin or server Supabase client.
type AnyClient = { from: (table: string) => any };

function appOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.setuflowcrm.com';
  try { return new URL(configuredOrigin).origin; } catch { return 'https://www.setuflowcrm.com'; }
}

function safeNavigate(actionUrl: string | undefined) {
  const origin = appOrigin();
  try {
    const url = new URL(actionUrl || '/mail', origin);
    return url.origin === origin ? url.href : `${origin}/mail`;
  } catch { return `${origin}/mail`; }
}

async function unreadMailBadge(supabase: AnyClient, organizationId: string | undefined, userId: string) {
  if (!organizationId) return 1;
  const { count, error } = await supabase.from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('type', 'mail_received')
    .eq('read', false);
  if (error) return 1;
  return Math.max(1, Math.min(Number(count || 1), 999));
}

function declarativePayload(payload: PushPayload, badgeCount: number) {
  const navigate = safeNavigate(payload.action_url);
  return {
    web_push: 8030,
    app_badge: String(badgeCount),
    notification: {
      title: payload.title || 'SETU Mail',
      body: payload.body || 'You have a new Mail or Calendar notification.',
      navigate,
      silent: false,
      tag: payload.id || `${payload.type || 'mail_received'}:${navigate}`,
      icon: payload.icon || '/icons/setu-mail-192.png',
      data: { type: payload.type || 'mail_received', action_url: payload.action_url || '/mail' },
    },
  };
}

export async function sendWebPushToUsers(supabase: AnyClient, userIds: string[], payload: PushPayload, organizationId?: string): Promise<{ sent: number; pruned: number; skipped?: string }> {
  if (!ensureConfigured()) return { sent: 0, pruned: 0, skipped: 'vapid-not-configured' };
  if (!userIds.length) return { sent: 0, pruned: 0 };

  let query = supabase.from('push_subscriptions').select('id,user_id,endpoint,auth_key,p256dh')
    .in('user_id', userIds).in('app_scope', pushScopesFor(payload.type, organizationId));
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data, error } = await query;
  // Fail closed: never fall back to an unscoped device query.
  if (error) return { sent: 0, pruned: 0, skipped: 'subscription-query-failed' };
  const subs = (data ?? []) as SubRow[];
  if (!subs.length) return { sent: 0, pruned: 0 };

  const dead: string[] = [];
  let sent = 0;
  const badgeCounts = new Map<string, number>();
  await Promise.all([...new Set(subs.map(sub => sub.user_id))].map(async userId => {
    badgeCounts.set(userId, await unreadMailBadge(supabase, organizationId, userId));
  }));

  await Promise.all(subs.map(async (s) => {
    try {
      const body = JSON.stringify(declarativePayload(payload, badgeCounts.get(s.user_id) || 1));
      const result = await webpush.sendNotification({ endpoint: s.endpoint, keys: { auth: s.auth_key, p256dh: s.p256dh } }, body);
      sent += 1;
      console.info('[setu-communications:push] accepted', { provider: s.endpoint.includes('web.push.apple.com') ? 'apple' : 'webpush', statusCode: result.statusCode, type: payload.type, userId: s.user_id });
    } catch (err) {
      const code = (err as { statusCode?: number })?.statusCode;
      console.warn('[setu-communications:push] rejected', { provider: s.endpoint.includes('web.push.apple.com') ? 'apple' : 'webpush', statusCode: code ?? null, type: payload.type, userId: s.user_id });
      if (code === 404 || code === 410) dead.push(s.id);
    }
  }));
  let pruned = 0;
  if (dead.length) { await supabase.from('push_subscriptions').delete().in('id', dead); pruned = dead.length; }
  return { sent, pruned };
}
