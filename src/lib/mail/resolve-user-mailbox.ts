type MailboxShape = { id: string; address: string; display_name?: string | null; inbound_enabled?: boolean; status: string };
type Options = { mailboxId?: string | null; permission?: 'read' | 'send' | 'manage' };

/** Assignment is authoritative. Never fall back to legacy row ownership or an email address. */
export async function resolveUserMailbox(db: any, organizationId: string, userId: string, select = 'id,address,display_name,inbound_enabled,status', options: Options = {}): Promise<MailboxShape | null> {
  let query = db.from('mail_mailbox_access').select('mailbox_id,is_primary,can_read,can_send,can_manage').eq('organization_id', organizationId).eq('user_id', userId).eq('can_read', true);
  if (options.mailboxId) query = query.eq('mailbox_id', options.mailboxId);
  if (options.permission === 'send') query = query.eq('can_send', true);
  if (options.permission === 'manage') query = query.eq('can_manage', true);
  const access = await query.order('is_primary', { ascending: false }).order('mailbox_id');
  if (access.error) throw new Error('Unable to verify mailbox access.');
  const ids = (access.data ?? []).map((row: { mailbox_id: string }) => row.mailbox_id);
  if (!ids.length) return null;
  const mailboxes = await db.from('mail_mailboxes').select(select).in('id', ids).eq('organization_id', organizationId).eq('status', 'active');
  if (mailboxes.error) throw new Error('Unable to load assigned mailboxes.');
  for (const id of ids) { const mailbox = (mailboxes.data ?? []).find((row: { id: string }) => row.id === id); if (mailbox) return mailbox as MailboxShape; }
  return null;
}

export async function resolveSendingMailbox(db: any, organizationId: string, userId: string, select = 'id,address,status', mailboxId?: string | null) {
  // A read-only primary mailbox must not silently send from another assignment.
  const target = mailboxId || (await resolveUserMailbox(db, organizationId, userId, select))?.id;
  if (!target) return null;
  return resolveUserMailbox(db, organizationId, userId, select, { permission: 'send', mailboxId: target });
}
