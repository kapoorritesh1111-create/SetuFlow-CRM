import type { OrganizedMessage } from './organizer-client';

export type MailFolder = 'inbox' | 'sent' | 'drafts' | 'starred' | 'archive' | 'trash';
export type MailCounts = Record<MailFolder, number>;
export type MailAction = 'read' | 'star' | 'archive' | 'trash';
export const EMPTY_MAIL_COUNTS: MailCounts = { inbox: 0, sent: 0, drafts: 0, starred: 0, archive: 0, trash: 0 };

export function countMailFolders(messages: OrganizedMessage[]): MailCounts {
  const result = { ...EMPTY_MAIL_COUNTS };
  for (const message of messages) {
    if (message.folder === 'inbox' && !message.is_read) result.inbox++;
    if (message.folder === 'sent') result.sent++;
    if (message.folder === 'drafts' && message.status === 'draft') result.drafts++;
    if (message.is_starred && message.folder !== 'trash') result.starred++;
    if (message.folder === 'archive') result.archive++;
    if (message.folder === 'trash') result.trash++;
  }
  return result;
}

export function adjustMailCounts(counts: MailCounts, before: OrganizedMessage | null, after: OrganizedMessage | null): MailCounts {
  const old = countMailFolders(before ? [before] : []);
  const next = countMailFolders(after ? [after] : []);
  return Object.fromEntries(Object.keys(counts).map(key => [key, Math.max(0, counts[key as MailFolder] - old[key as MailFolder] + next[key as MailFolder])])) as MailCounts;
}

export async function persistMessageAction(mailboxId: string, message: OrganizedMessage, action: MailAction, value: boolean): Promise<OrganizedMessage> {
  const response = await fetch(`/api/mail/messages/${encodeURIComponent(message.id)}?mailboxId=${encodeURIComponent(mailboxId)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, value }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.message || result.message.id !== message.id) throw new Error(result.error || 'Unable to update message. Please try again.');
  return { ...message, ...result.message };
}

/** Explicit results prevent partially successful bulk actions being reported as all done. */
export async function runMailBatch(messages: OrganizedMessage[], update: (message: OrganizedMessage) => Promise<OrganizedMessage>, onUpdated: (before: OrganizedMessage, after: OrganizedMessage) => void) {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const message of [...new Map(messages.map(item => [item.id, item])).values()]) {
    try { const updated = await update(message); onUpdated(message, updated); succeeded.push(message.id); }
    catch (error) { failed.push({ id: message.id, error: error instanceof Error ? error.message : 'Unable to update message.' }); }
  }
  return { succeeded, failed };
}
