/** Shared, dependency-free validation and deterministic incoming-mail rules. */
export class MailInputError extends Error {}
export type RuleConditions = { fromAddress?: string; fromDomain?: string; subjectContains?: string; recipient?: string; hasAttachment?: boolean };
export type RuleActions = { moveToFolderId?: string; archive?: boolean; markRead?: boolean; star?: boolean };
export type RuleInput = { name: string; enabled: boolean; priority: number; conditions: RuleConditions; actions: RuleActions; target_folder_id: string | null };
export type StoredRule = RuleInput & { id: string; organization_id: string; mailbox_id: string; created_at?: string };
export type IncomingMail = { organizationId: string; mailboxId: string; direction: string; from: string; to: string[]; cc: string[]; subject: string; hasAttachment: boolean | null };
export type FolderSummary = { id: string; name: string; message_count: number; unread_count: number };
export const isMailId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const plainObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const normalize = (v: string) => v.normalize('NFKC').trim().toLowerCase();
const email = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const domain = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const forbidden = /[\u0000-\u001f\u007f]/;
const reserved = new Set(['inbox', 'sent', 'drafts', 'starred', 'archive', 'trash', 'spam', 'junk', 'all mail']);

export function folderName(value: unknown): { name: string; slug: string } {
  if (typeof value !== 'string' || forbidden.test(value) || /[/\\]/.test(value)) throw new MailInputError('Use a folder name without slashes or control characters.');
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 64) throw new MailInputError('Folder names must contain 1 to 64 characters.');
  const slug = name.toLowerCase();
  if (reserved.has(slug)) throw new MailInputError('That name is reserved for a standard mail folder.');
  return { name, slug };
}

export function validateRule(value: unknown): RuleInput {
  if (!plainObject(value)) throw new MailInputError('Enter the rule details.');
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name || name.length > 100 || forbidden.test(name)) throw new MailInputError('Rule names must contain 1 to 100 characters.');
  if (value.enabled !== undefined && typeof value.enabled !== 'boolean') throw new MailInputError('Choose whether the rule is enabled.');
  const priority = value.priority === undefined ? 100 : value.priority;
  if (typeof priority !== 'number' || !Number.isInteger(priority) || priority < 1 || priority > 10000) throw new MailInputError('Priority must be a whole number from 1 to 10000.');
  if (!plainObject(value.conditions) || !plainObject(value.actions)) throw new MailInputError('Add conditions and actions for the rule.');
  const conditions: RuleConditions = {};
  const allowedConditions = new Set(['fromAddress', 'fromDomain', 'subjectContains', 'recipient', 'hasAttachment']);
  for (const [key, raw] of Object.entries(value.conditions)) {
    if (!allowedConditions.has(key)) throw new MailInputError('This rule condition is not supported.');
    if (key === 'hasAttachment') {
      if (typeof raw !== 'boolean') throw new MailInputError('Choose a valid attachment condition.');
      conditions.hasAttachment = raw;
      continue;
    }
    if (typeof raw !== 'string' || forbidden.test(raw)) throw new MailInputError('Rule conditions must be plain text.');
    const text = normalize(raw);
    if (!text) continue;
    if (text.length > 255) throw new MailInputError('Rule conditions must be 255 characters or shorter.');
    if ((key === 'fromAddress' || key === 'recipient') && !email.test(text)) throw new MailInputError('Enter a complete email address.');
    if (key === 'fromDomain' && !domain.test(text)) throw new MailInputError('Enter a domain such as acme.com, without @.');
    conditions[key as 'fromAddress' | 'fromDomain' | 'subjectContains' | 'recipient'] = text;
  }
  if (!Object.keys(conditions).length) throw new MailInputError('Add at least one condition.');
  const actions: RuleActions = {};
  for (const [key, raw] of Object.entries(value.actions)) {
    if (key === 'moveToFolderId') {
      if (!isMailId(raw)) throw new MailInputError('Choose a valid destination folder.');
      actions.moveToFolderId = raw.toLowerCase();
    } else if (key === 'archive' || key === 'markRead' || key === 'star') {
      if (typeof raw !== 'boolean') throw new MailInputError('Choose a valid rule action.');
      if (raw) actions[key] = true;
    } else throw new MailInputError('This rule action is not supported.');
  }
  if (!Object.keys(actions).length) throw new MailInputError('Choose at least one action.');
  if (actions.archive && actions.moveToFolderId) throw new MailInputError('Choose either Archive or a destination folder, not both.');
  return { name, enabled: value.enabled !== false, priority, conditions, actions, target_folder_id: actions.moveToFolderId ?? null };
}

export function ruleMatches(conditions: RuleConditions, mail: IncomingMail): boolean {
  if (mail.direction !== 'inbound' || !Object.keys(conditions).length) return false;
  const from = normalize(mail.from);
  if (conditions.fromAddress && from !== normalize(conditions.fromAddress)) return false;
  if (conditions.fromDomain && from.split('@')[1] !== normalize(conditions.fromDomain)) return false;
  if (conditions.subjectContains && !normalize(mail.subject).includes(normalize(conditions.subjectContains))) return false;
  if (conditions.recipient && ![...mail.to, ...mail.cc].some(v => normalize(v) === normalize(conditions.recipient!))) return false;
  // Unknown attachment metadata is not equivalent to "no attachment".
  if (conditions.hasAttachment !== undefined && mail.hasAttachment !== conditions.hasAttachment) return false;
  return true;
}

export function incomingRulePatch(rules: StoredRule[], mail: IncomingMail, folderIds: Set<string>, now: string) {
  const result = { folder: 'inbox', custom_folder_id: null as string | null, is_read: false, is_starred: false, archived_at: null as string | null, trashed_at: null, matchedRuleId: null as string | null };
  const ordered = [...rules].sort((a, b) => a.priority - b.priority || String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')) || a.id.localeCompare(b.id));
  for (const raw of ordered) {
    if (raw.organization_id !== mail.organizationId || raw.mailbox_id !== mail.mailboxId || raw.enabled !== true) continue;
    let rule: RuleInput;
    try { rule = validateRule(raw); } catch { continue; }
    if (rule.target_folder_id !== (raw.target_folder_id ?? null)) continue;
    if (rule.actions.moveToFolderId && !folderIds.has(rule.actions.moveToFolderId)) continue;
    if (!ruleMatches(rule.conditions, mail)) continue;
    return { ...result, matchedRuleId: raw.id, is_read: rule.actions.markRead === true, is_starred: rule.actions.star === true,
      folder: rule.actions.moveToFolderId ? 'custom' : rule.actions.archive ? 'archive' : 'inbox',
      custom_folder_id: rule.actions.moveToFolderId ?? null, archived_at: rule.actions.archive ? now : null };
  }
  return result;
}

export function movePatch(message: { status: string; direction: string }, target: string | null) {
  if (message.status === 'draft') throw new MailInputError('Drafts stay in Drafts until they are sent.');
  if (target !== null && !isMailId(target)) throw new MailInputError('Choose a valid destination folder.');
  return { folder: target ? 'custom' : message.direction === 'outbound' ? 'sent' : 'inbox', custom_folder_id: target, archived_at: null, trashed_at: null };
}
