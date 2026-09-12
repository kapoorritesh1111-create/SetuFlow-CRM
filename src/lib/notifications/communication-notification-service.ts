import { sendWebPushToUsers } from './web-push';

export type CommunicationNotificationType = 'mail_received' | 'calendar_reminder';

type DeliveryClient = {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null; error: { message?: string } | null }>;
};

type DispatchInput = {
  organizationId: string;
  userIds: string[];
  type: CommunicationNotificationType;
  title: string;
  body: string;
  icon: string;
  entityType: 'mail_message' | 'calendar_event';
  entityId: string;
  entityRef: string;
  actionUrl: string;
  priority?: 'normal' | 'high' | 'critical';
};

const SETU_MAIL_PUSH_ICON = '/icons/setu-mail-192.png';

function unique(values: string[]) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

async function enabled(db: DeliveryClient, input: DispatchInput, userId: string, channel: 'in_app' | 'push') {
  const { data, error } = await db.rpc('get_effective_notif_pref', {
    p_user_id: userId,
    p_org_id: input.organizationId,
    p_type: input.type,
    p_channel: channel,
  });
  if (error) throw new Error(error.message || `Unable to resolve ${channel} notification preference.`);
  return data === true;
}

async function alreadyDelivered(db: DeliveryClient, input: DispatchInput, userId: string) {
  const { data, error } = await db.from('notifications')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('user_id', userId)
    .eq('type', input.type)
    .eq('entity_ref', input.entityRef)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

export async function dispatchCommunicationNotification(db: DeliveryClient, input: DispatchInput) {
  const deliveredUserIds: string[] = [];
  const pushUserIds: string[] = [];

  for (const userId of unique(input.userIds)) {
    if (await alreadyDelivered(db, input, userId)) continue;
    const [inApp, push] = await Promise.all([
      enabled(db, input, userId, 'in_app'),
      enabled(db, input, userId, 'push'),
    ]);

    if (inApp) {
      const { error } = await db.from('notifications').insert({
        organization_id: input.organizationId,
        user_id: userId,
        type: input.type,
        title: input.title,
        body: input.body,
        icon: input.icon,
        priority: input.priority ?? 'normal',
        entity_type: input.entityType,
        entity_id: input.entityId,
        entity_ref: input.entityRef,
        action_url: input.actionUrl,
        channels_sent: [...(inApp ? ['in_app'] : []), ...(push ? ['push'] : [])],
      });
      if (error) throw error;
      deliveredUserIds.push(userId);
    }
    if (push) pushUserIds.push(userId);
  }

  if (pushUserIds.length) {
    try {
      await sendWebPushToUsers(db, pushUserIds, {
        title: input.title,
        body: input.body,
        action_url: input.actionUrl,
        priority: input.priority ?? 'normal',
        type: input.type,
        icon: SETU_MAIL_PUSH_ICON,
        badge: SETU_MAIL_PUSH_ICON,
      }, input.organizationId);
    } catch {
      // Browser/device delivery is best effort. In-app notification remains authoritative.
    }
  }

  return { deliveredUserIds, pushUserIds };
}
