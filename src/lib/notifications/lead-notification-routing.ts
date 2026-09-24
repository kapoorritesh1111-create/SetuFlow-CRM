import 'server-only';

import { sendWebPushToUsers } from '@/lib/notifications/web-push';

const OVERSIGHT_ROLES = new Set(['owner', 'admin']);

type LeadNotificationInput = {
  organizationId: string;
  assignedUserIds?: Array<string | null | undefined>;
  type: string;
  title: string;
  body: string;
  icon: string;
  priority?: 'normal' | 'high' | 'critical';
  entityType?: string;
  entityId?: string | null;
  entityRef: string;
  actionUrl: string;
};

function cleanIds(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

export async function resolveLeadNotificationRecipients(
  db: any,
  organizationId: string,
  assignedUserIds: Array<string | null | undefined> = [],
) {
  const { data: members, error: memberError } = await db
    .from('organization_members')
    .select('id,user_id,is_active,is_internal_support')
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  if (memberError) throw memberError;

  const activeMembers = (members ?? []).filter((member: any) => member.user_id && member.is_internal_support !== true);
  const activeUserIds = new Set(activeMembers.map((member: any) => String(member.user_id)));
  const memberById = new Map(activeMembers.map((member: any) => [String(member.id), String(member.user_id)]));
  const memberIds = [...memberById.keys()];

  const recipients = new Set(cleanIds(assignedUserIds).filter((userId) => activeUserIds.has(userId)));
  if (!memberIds.length) return [...recipients];

  const { data: links, error: linkError } = await db
    .from('user_roles')
    .select('organization_member_id,role_id')
    .in('organization_member_id', memberIds);
  if (linkError) throw linkError;

  const roleIds = [...new Set((links ?? []).map((row: any) => String(row.role_id ?? '')).filter(Boolean))];
  if (!roleIds.length) return [...recipients];

  const { data: roles, error: roleError } = await db.from('roles').select('id,name').in('id', roleIds);
  if (roleError) throw roleError;
  const roleById = new Map((roles ?? []).map((role: any) => [String(role.id), String(role.name ?? '').toLowerCase()]));

  for (const link of links ?? []) {
    if (!OVERSIGHT_ROLES.has(roleById.get(String(link.role_id)) ?? '')) continue;
    const userId = memberById.get(String(link.organization_member_id));
    if (userId) recipients.add(userId);
  }

  return [...recipients];
}

export async function dispatchLeadNotification(db: any, input: LeadNotificationInput) {
  const recipients = await resolveLeadNotificationRecipients(db, input.organizationId, input.assignedUserIds ?? []);
  if (!recipients.length) return { recipients: [], inAppUserIds: [], pushUserIds: [] };

  const { data: existingRows } = await db
    .from('notifications')
    .select('user_id')
    .eq('organization_id', input.organizationId)
    .eq('type', input.type)
    .eq('entity_ref', input.entityRef)
    .in('user_id', recipients);
  const alreadyNotified = new Set((existingRows ?? []).map((row: any) => String(row.user_id)));

  const rows: any[] = [];
  const pushUserIds: string[] = [];
  const inAppUserIds: string[] = [];

  for (const userId of recipients) {
    if (alreadyNotified.has(userId)) continue;
    const [{ data: inApp }, { data: push }] = await Promise.all([
      db.rpc('get_effective_notif_pref', {
        p_user_id: userId,
        p_org_id: input.organizationId,
        p_type: input.type,
        p_channel: 'in_app',
      }),
      db.rpc('get_effective_notif_pref', {
        p_user_id: userId,
        p_org_id: input.organizationId,
        p_type: input.type,
        p_channel: 'push',
      }),
    ]);

    const channels = [...(inApp === true ? ['in_app'] : []), ...(push === true ? ['push'] : [])];
    if (inApp === true) {
      inAppUserIds.push(userId);
      rows.push({
        organization_id: input.organizationId,
        user_id: userId,
        type: input.type,
        title: input.title,
        body: input.body,
        icon: input.icon,
        priority: input.priority ?? 'normal',
        entity_type: input.entityType ?? 'lead',
        entity_id: input.entityId ?? null,
        entity_ref: input.entityRef,
        action_url: input.actionUrl,
        channels_sent: channels,
      });
    }
    if (push === true) pushUserIds.push(userId);
  }

  if (rows.length) {
    const { error } = await db.from('notifications').insert(rows);
    if (error) throw error;
  }

  if (pushUserIds.length) {
    const result = await sendWebPushToUsers(db, pushUserIds, {
      title: input.title,
      body: input.body,
      action_url: input.actionUrl,
      priority: input.priority ?? 'normal',
      type: input.type,
      id: input.entityRef,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    }, input.organizationId);
    if (result.sent === 0) {
      console.warn('[lead-notification:push] no device delivery', {
        type: input.type,
        entityRef: input.entityRef,
        recipients: pushUserIds.length,
        skipped: result.skipped ?? null,
        pruned: result.pruned,
      });
    }
  }

  return { recipients, inAppUserIds, pushUserIds };
}
