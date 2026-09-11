import { cookies } from 'next/headers';
import { isMailId } from './organization';

export const ACTIVE_MAILBOX_COOKIE = 'setu_mail_active_mailbox';

type MailboxShape = { id: string; address: string; display_name?: string | null; inbound_enabled?: boolean; status: string };
type Options = { mailboxId?: string | null; permission?: 'read' | 'send' | 'manage' };
export type UserMailbox = MailboxShape & { is_primary: boolean; can_read: boolean; can_send: boolean; can_manage: boolean };

function readActiveMailboxCookie() {
  try {
    const value = cookies().get(ACTIVE_MAILBOX_COOKIE)?.value ?? null;
    return isMailId(value) ? value : null;
  } catch {
    // Some non-request test/background contexts do not expose Next request cookies.
    return null;
  }
}

/** Assignment is authoritative. Never fall back to legacy row ownership or an email address. */
export async function listUserMailboxes(db: any, organizationId: string, userId: string, select = 'id,address,display_name,inbound_enabled,status'): Promise<UserMailbox[]> {
  const access = await db
    .from('mail_mailbox_access')
    .select('mailbox_id,is_primary,can_read,can_send,can_manage')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('can_read', true)
    .order('is_primary', { ascending: false })
    .order('mailbox_id');
  if (access.error) throw new Error('Unable to verify mailbox access.');
  const rows = access.data ?? [];
  const ids = rows.map((row: { mailbox_id: string }) => row.mailbox_id);
  if (!ids.length) return [];
  const mailboxes = await db.from('mail_mailboxes').select(select).in('id', ids).eq('organization_id', organizationId).eq('status', 'active');
  if (mailboxes.error) throw new Error('Unable to load assigned mailboxes.');
  return rows.flatMap((row: any) => {
    const mailbox = (mailboxes.data ?? []).find((item: { id: string }) => item.id === row.mailbox_id);
    return mailbox ? [{ ...mailbox, is_primary: row.is_primary === true, can_read: row.can_read === true, can_send: row.can_send === true, can_manage: row.can_manage === true } as UserMailbox] : [];
  });
}

/** Explicit mailboxId wins. Otherwise the validated active-mailbox cookie wins, then the primary assignment. */
export async function resolveUserMailbox(db: any, organizationId: string, userId: string, select = 'id,address,display_name,inbound_enabled,status', options: Options = {}): Promise<MailboxShape | null> {
  const cookieId = options.mailboxId ? null : readActiveMailboxCookie();
  const mailboxes = await listUserMailboxes(db, organizationId, userId, select);
  const mailbox = options.mailboxId
    ? mailboxes.find((item) => item.id === options.mailboxId) ?? null
    : cookieId
      ? mailboxes.find((item) => item.id === cookieId) ?? mailboxes[0] ?? null
      : mailboxes[0] ?? null;
  if (!mailbox) return null;
  if (options.permission === 'send' && !mailbox.can_send) return null;
  if (options.permission === 'manage' && !mailbox.can_manage) return null;
  return mailbox;
}

export async function resolveSendingMailbox(db: any, organizationId: string, userId: string, select = 'id,address,status', mailboxId?: string | null) {
  // A read-only active/primary mailbox must not silently send from another assignment.
  const target = mailboxId || (await resolveUserMailbox(db, organizationId, userId, select))?.id;
  if (!target) return null;
  return resolveUserMailbox(db, organizationId, userId, select, { permission: 'send', mailboxId: target });
}
