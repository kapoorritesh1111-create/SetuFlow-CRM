import type { MailMessage } from './compose-state';
import type { FolderSummary, RuleInput } from '@/lib/mail/organization';

export type OrganizedMessage = MailMessage & { custom_folder_id?: string | null };
export type MailAttachment = { id: string; message_id: string | null; filename: string; content_type: string | null; size_bytes: number | null; created_at: string };
export type MailRule = RuleInput & { id: string; created_at: string };
export type OrganizerSnapshot = { mailboxId: string; folders: FolderSummary[]; rules: MailRule[]; canManage: boolean; canMove: boolean };
export type FolderPage = { folder: { id: string; name: string }; messages: OrganizedMessage[]; attachments: MailAttachment[]; total: number; nextOffset: number | null };
export type OrganizerResult = { ok: boolean; folder?: { id: string; name: string }; rule?: MailRule; message?: OrganizedMessage };

export function organizerUrl(mailboxId: string, folderId?: string, offset = 0) {
  const query = new URLSearchParams({ mailboxId });
  if (folderId) { query.set('folderId', folderId); query.set('offset', String(offset)); }
  return `/api/mail/organizer?${query}`;
}

export async function organizerRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error(payload?.error || 'Unable to update mail. Please try again.');
  return payload as T;
}

export function mergeById<T extends { id: string }>(previous: T[], incoming: T[]): T[] {
  const merged = new Map(previous.map(item => [item.id, item]));
  for (const item of incoming) merged.set(item.id, item);
  return Array.from(merged.values());
}

export function appendFolderPage(previous: FolderPage | null, next: FolderPage): FolderPage {
  if (!previous || previous.folder.id !== next.folder.id) return next;
  return { ...next, messages: mergeById(previous.messages, next.messages), attachments: mergeById(previous.attachments, next.attachments) };
}

export function updateFolderMessage(page: FolderPage, message: OrganizedMessage): FolderPage {
  const existed = page.messages.some(item => item.id === message.id);
  const belongs = message.folder === 'custom' && message.custom_folder_id === page.folder.id;
  if (belongs) return { ...page, messages: mergeById(page.messages, [message]), total: page.total + (existed ? 0 : 1) };
  if (!existed) return page;
  return { ...page, messages: page.messages.filter(item => item.id !== message.id), total: Math.max(0, page.total - 1), nextOffset: page.nextOffset === null ? null : Math.max(0, page.nextOffset - 1) };
}

export function describeRule(rule: Pick<MailRule, 'conditions' | 'actions'>, folders: FolderSummary[]) {
  const c = rule.conditions;
  const conditions = [c.fromAddress && `From ${c.fromAddress}`, c.fromDomain && `Sender domain ${c.fromDomain}`, c.subjectContains && `Subject contains "${c.subjectContains}"`, c.recipient && `To or Cc ${c.recipient}`, c.hasAttachment === true ? 'Has an attachment' : c.hasAttachment === false ? 'No attachments' : ''].filter(Boolean).join(' AND ');
  const a = rule.actions;
  const target = a.moveToFolderId ? folders.find(folder => folder.id === a.moveToFolderId)?.name ?? 'Unavailable folder' : null;
  const actions = [target && `Move to ${target}`, a.archive && 'Archive', a.markRead && 'Mark as read', a.star && 'Star'].filter(Boolean).join(' / ');
  return { conditions, actions };
}
