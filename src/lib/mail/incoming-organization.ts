import { incomingRulePatch, type IncomingMail, type StoredRule } from './organization';

/** Runs before the inbound row is inserted. A replay never re-runs rules over a user's manual move. */
export async function prepareIncomingOrganization(db: any, mail: IncomingMail, now: string) {
  const fallback = incomingRulePatch([], mail, new Set(), now);
  try {
    const [rules, folders] = await Promise.all([
      db.from('mail_rules').select('id,organization_id,mailbox_id,name,enabled,priority,conditions,actions,target_folder_id,created_at').eq('organization_id', mail.organizationId).eq('mailbox_id', mail.mailboxId).eq('enabled', true).order('priority').order('created_at').order('id').limit(100),
      db.from('mail_folders').select('id').eq('organization_id', mail.organizationId).eq('mailbox_id', mail.mailboxId).limit(50),
    ]);
    if (rules.error || folders.error) throw rules.error || folders.error;
    const applied = incomingRulePatch((rules.data ?? []) as StoredRule[], mail, new Set((folders.data ?? []).map((f: { id: string }) => f.id)), now);
    const { matchedRuleId, ...placement } = applied;
    return { placement, audit: { rule_status: matchedRuleId ? 'matched' : 'no_match', matched_rule_id: matchedRuleId, rule_evaluated_at: now } };
  } catch (error) {
    // Receiving takes priority over organization. Do not drop mail or retry a manual move.
    console.error('mail.rules.unavailable', { mailboxId: mail.mailboxId, code: (error as { code?: string })?.code ?? 'unknown' });
    const { matchedRuleId: _, ...placement } = fallback;
    return { placement, audit: { rule_status: 'unavailable', matched_rule_id: null, rule_evaluated_at: now } };
  }
}
