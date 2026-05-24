import { createClient } from '@/lib/supabase/server';
import type { NotifType, NotificationPriority } from './notification-templates';

type EmailAddress = {
  email: string;
  name?: string;
};

type TransactionalEmail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

type MailtrapSendResult = {
  status: 'email_sent' | 'email_failed' | 'email_env_missing' | 'email_skipped';
  error: string | null;
};

type NotificationEmailPayload = {
  organizationId: string;
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  priority: NotificationPriority;
  entityRef?: string | null;
  actionUrl?: string | null;
};

type DigestNotificationRow = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  priority: NotificationPriority;
  entity_ref: string | null;
  action_url: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type SupabaseError = {
  message: string;
};

type ProfilesQuery = {
  select(columns: 'id,email,full_name'): ProfilesQuery;
  in(column: 'id', values: string[]): ProfilesQuery;
  eq(column: 'id', value: string): ProfilesQuery;
  maybeSingle(): Promise<{ data: ProfileRow | null; error: SupabaseError | null }>;
  then<TResult1 = { data: ProfileRow[] | null; error: SupabaseError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: ProfileRow[] | null; error: SupabaseError | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
};

type DigestNotificationsQuery = {
  select(columns: string): DigestNotificationsQuery;
  eq(column: 'organization_id' | 'user_id' | 'read', value: string | boolean): DigestNotificationsQuery;
  is(column: 'archived_at', value: null): DigestNotificationsQuery;
  gte(column: 'created_at', value: string): DigestNotificationsQuery;
  order(column: 'created_at', options?: { ascending?: boolean }): DigestNotificationsQuery;
  limit(count: number): Promise<{ data: DigestNotificationRow[] | null; error: SupabaseError | null }>;
};

type EmailSupabaseClient = {
  from(table: 'profiles'): ProfilesQuery;
  from(table: 'notifications'): DigestNotificationsQuery;
};

type DigestInput = {
  organizationId: string;
  userId: string;
  since?: Date;
  limit?: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseEmailAddress(value: string): EmailAddress {
  const match = value.match(/^(.+?)\s*<([^>]+)>$/);
  if (!match) return { email: value.trim() };
  const name = match[1]?.replace(/^[ '\"]|[ '\"]$/g, '').trim();
  return { email: match[2].trim(), ...(name ? { name } : {}) };
}

function parseRecipientList(value: string): EmailAddress[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(parseEmailAddress);
}

function getFromAddress() {
  return process.env.SETU_NOTIFICATION_FROM_EMAIL ?? process.env.MAILTRAP_FROM_EMAIL;
}

function getSetuFlowBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SETU_APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/$/, '');
  return 'https://www.setuflowcrm.com';
}

function absolutizeActionUrl(actionUrl?: string | null) {
  if (!actionUrl) return getSetuFlowBaseUrl();
  if (/^https?:\/\//.test(actionUrl)) return actionUrl;
  return `${getSetuFlowBaseUrl()}${actionUrl.startsWith('/') ? actionUrl : `/${actionUrl}`}`;
}

async function sendWithMailtrap(email: TransactionalEmail): Promise<MailtrapSendResult> {
  const apiKey = process.env.MAILTRAP_API_KEY;
  const useSandbox = String(process.env.MAILTRAP_USE_SANDBOX ?? '').toLowerCase() === 'true';
  const sandboxId = process.env.MAILTRAP_SANDBOX_ID;

  if (!apiKey) {
    return { status: 'email_env_missing', error: 'MAILTRAP_API_KEY is required for Mailtrap notifications.' };
  }

  if (useSandbox && !sandboxId) {
    return { status: 'email_env_missing', error: 'MAILTRAP_SANDBOX_ID is required when MAILTRAP_USE_SANDBOX is true.' };
  }

  const endpoint = useSandbox
    ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(sandboxId ?? '')}`
    : 'https://send.api.mailtrap.io/api/send';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: parseEmailAddress(email.from),
        to: parseRecipientList(email.to),
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Mailtrap rejected the notification email.');
      return { status: 'email_failed', error: errorText.slice(0, 500) };
    }

    return { status: 'email_sent', error: null };
  } catch (error) {
    return {
      status: 'email_failed',
      error: error instanceof Error ? error.message : 'Unknown Mailtrap notification email error.',
    };
  }
}

async function getProfileById(userId: string) {
  const supabase = (await createClient()) as unknown as EmailSupabaseClient;
  const { data, error } = await supabase.from('profiles').select('id,email,full_name').eq('id', userId).maybeSingle();
  if (error) throw new Error(`Unable to load notification recipient profile: ${error.message}`);
  return data;
}

async function getProfilesByIds(userIds: string[]) {
  if (!userIds.length) return new Map<string, ProfileRow>();

  const supabase = (await createClient()) as unknown as EmailSupabaseClient;
  const { data, error } = await supabase.from('profiles').select('id,email,full_name').in('id', userIds);
  if (error) throw new Error(`Unable to load notification recipient profiles: ${error.message}`);

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

function buildImmediateEmail(input: NotificationEmailPayload, recipientName?: string | null): TransactionalEmail | null {
  const from = getFromAddress();
  if (!from) return null;

  const actionUrl = absolutizeActionUrl(input.actionUrl);
  const subject = `[SETU Flow] ${input.title}`;
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  const entityLine = input.entityRef ? `Reference: ${input.entityRef}` : null;
  const priorityLine = `Priority: ${input.priority}`;

  const text = [greeting, '', input.body, entityLine, priorityLine, `Open in SETU Flow: ${actionUrl}`].filter(Boolean).join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>${escapeHtml(greeting)}</p>
      <h2>${escapeHtml(input.title)}</h2>
      <p>${escapeHtml(input.body)}</p>
      ${entityLine ? `<p><strong>Reference:</strong> ${escapeHtml(input.entityRef ?? '')}</p>` : ''}
      <p><strong>Priority:</strong> ${escapeHtml(input.priority)}</p>
      <p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f172a;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">Open in SETU Flow</a></p>
      <p style="font-size:12px;color:#64748b">You received this because email notifications are enabled for this alert type.</p>
    </div>`;

  return { from, to: '', subject, text, html };
}

export async function sendImmediateNotificationEmails(payloads: NotificationEmailPayload[]) {
  if (!payloads.length) return { sent: 0, skipped: 0, failed: 0 };

  const profiles = await getProfilesByIds(payloads.map((payload) => payload.userId));
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const payload of payloads) {
    const profile = profiles.get(payload.userId);
    if (!profile?.email) {
      skipped += 1;
      continue;
    }

    const email = buildImmediateEmail(payload, profile.full_name);
    if (!email) {
      skipped += 1;
      continue;
    }

    const result = await sendWithMailtrap({ ...email, to: profile.email });
    if (result.status === 'email_sent') sent += 1;
    else if (result.status === 'email_env_missing' || result.status === 'email_skipped') skipped += 1;
    else failed += 1;
  }

  return { sent, skipped, failed };
}

function buildDigestEmail(notifications: DigestNotificationRow[], to: string, recipientName?: string | null): TransactionalEmail | null {
  const from = getFromAddress();
  if (!from) return null;

  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  const subject = `[SETU Flow] Daily notification digest (${notifications.length})`;
  const lines = notifications.map((item, index) => {
    const actionUrl = absolutizeActionUrl(item.action_url);
    return `${index + 1}. ${item.title}\n${item.body}\nPriority: ${item.priority}${item.entity_ref ? `\nReference: ${item.entity_ref}` : ''}\nOpen: ${actionUrl}`;
  });
  const text = [greeting, '', 'Here is your SETU Flow notification digest:', '', ...lines].join('\n');
  const itemsHtml = notifications
    .map((item) => {
      const actionUrl = absolutizeActionUrl(item.action_url);
      return `
        <li style="margin-bottom:18px">
          <strong>${escapeHtml(item.title)}</strong><br />
          <span>${escapeHtml(item.body)}</span><br />
          <span style="font-size:12px;color:#64748b">Priority: ${escapeHtml(item.priority)}${item.entity_ref ? ` · Ref: ${escapeHtml(item.entity_ref)}` : ''}</span><br />
          <a href="${escapeHtml(actionUrl)}">Open in SETU Flow</a>
        </li>`;
    })
    .join('');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>${escapeHtml(greeting)}</p>
      <h2>Your SETU Flow daily notification digest</h2>
      <p>You have ${notifications.length} unread notification${notifications.length === 1 ? '' : 's'} in this digest window.</p>
      <ol>${itemsHtml}</ol>
    </div>`;

  return { from, to, subject, text, html };
}

export async function sendDailyNotificationDigest(input: DigestInput) {
  const since = input.since ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
  const limit = input.limit ?? 25;
  const profile = await getProfileById(input.userId);

  if (!profile?.email) return { status: 'email_skipped' as const, sent: 0, count: 0, error: null };

  const supabase = (await createClient()) as unknown as EmailSupabaseClient;
  const { data, error } = await supabase
    .from('notifications')
    .select('id,type,title,body,priority,entity_ref,action_url,created_at')
    .eq('organization_id', input.organizationId)
    .eq('user_id', input.userId)
    .eq('read', false)
    .is('archived_at', null)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Unable to load digest notifications: ${error.message}`);
  const notifications = data ?? [];
  if (!notifications.length) return { status: 'email_skipped' as const, sent: 0, count: 0, error: null };

  const email = buildDigestEmail(notifications, profile.email, profile.full_name);
  if (!email) return { status: 'email_env_missing' as const, sent: 0, count: notifications.length, error: 'SETU_NOTIFICATION_FROM_EMAIL is required for digest emails.' };

  const result = await sendWithMailtrap(email);
  return { ...result, sent: result.status === 'email_sent' ? 1 : 0, count: notifications.length };
}
