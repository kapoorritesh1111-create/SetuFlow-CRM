import { createClient } from '@/lib/supabase/server';
import {
  getNotificationTemplate,
  type NotifType,
  type NotificationChannel,
  type NotificationTemplateContext
} from './notification-templates';

type JsonRecord = Record<string, string | number | boolean | null>;

type NotificationRecipient = {
  userId: string;
  channels?: NotificationChannel[];
};

export type TriggerNotificationInput = {
  organizationId: string;
  type: NotifType;
  recipients?: NotificationRecipient[];
  recipientUserIds?: string[];
  context?: NotificationTemplateContext;
  title?: string;
  body?: string;
  entityId?: string | null;
  entityRef?: string | null;
  actionUrl?: string | null;
  createdBy?: string | null;
  metadata?: JsonRecord;
};

export type NotificationDispatchResult = {
  notificationIds: string[];
  skippedUserIds: string[];
  channelsByUserId: Record<string, NotificationChannel[]>;
};

type SupabaseError = {
  message: string;
};

type MemberRow = {
  user_id: string;
};

type NotificationInsertRow = {
  organization_id: string;
  user_id: string;
  type: NotifType;
  title: string;
  body: string;
  icon: string;
  priority: 'normal' | 'high' | 'critical';
  entity_type: string;
  entity_id: string | null;
  entity_ref: string | null;
  action_url: string | null;
  channels_sent: NotificationChannel[];
};

type InsertedNotificationRow = {
  id: string;
};

type OrganizationMembersQuery = {
  select(columns: 'user_id'): OrganizationMembersQuery;
  eq(column: 'organization_id' | 'is_active', value: string | boolean): Promise<{
    data: MemberRow[] | null;
    error: SupabaseError | null;
  }> & OrganizationMembersQuery;
};

type NotificationsInsertQuery = {
  insert(rows: NotificationInsertRow[]): {
    select(columns: 'id'): Promise<{
      data: InsertedNotificationRow[] | null;
      error: SupabaseError | null;
    }>;
  };
};

type NotificationSupabaseClient = {
  from(table: 'organization_members'): OrganizationMembersQuery;
  from(table: 'notifications'): NotificationsInsertQuery;
  rpc(
    fn: 'get_effective_notif_pref',
    args: {
      p_user_id: string;
      p_org_id: string;
      p_type: NotifType;
      p_channel: NotificationChannel;
    }
  ): Promise<{ data: boolean | null; error: SupabaseError | null }>;
};

const channelOrder: NotificationChannel[] = ['in_app', 'push', 'email', 'whatsapp', 'sms'];

async function createNotificationClient() {
  return (await createClient()) as unknown as NotificationSupabaseClient;
}

function uniqueUserIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function normalizeRequestedChannels(channels?: NotificationChannel[]) {
  if (!channels?.length) {
    return channelOrder;
  }

  const requested = new Set(channels);
  return channelOrder.filter((channel) => requested.has(channel));
}

async function getOrgMemberUserIds(organizationId: string) {
  const supabase = await createNotificationClient();
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Unable to load notification recipients: ${error.message}`);
  }

  return uniqueUserIds((data ?? []).map((member) => member.user_id));
}

async function getEffectiveChannels(
  userId: string,
  organizationId: string,
  type: NotifType,
  requestedChannels: NotificationChannel[]
) {
  const supabase = await createNotificationClient();
  const enabledChannels: NotificationChannel[] = [];

  for (const channel of requestedChannels) {
    const { data, error } = await supabase.rpc('get_effective_notif_pref', {
      p_user_id: userId,
      p_org_id: organizationId,
      p_type: type,
      p_channel: channel
    });

    if (error) {
      throw new Error(`Unable to resolve ${channel} notification preference: ${error.message}`);
    }

    if (data === true) {
      enabledChannels.push(channel);
    }
  }

  return enabledChannels;
}

function buildRecipients(input: TriggerNotificationInput, fallbackUserIds: string[]) {
  if (input.recipients?.length) {
    return input.recipients.map((recipient) => ({
      userId: recipient.userId,
      requestedChannels: normalizeRequestedChannels(recipient.channels)
    }));
  }

  const userIds = input.recipientUserIds?.length ? input.recipientUserIds : fallbackUserIds;
  return uniqueUserIds(userIds).map((userId) => ({
    userId,
    requestedChannels: channelOrder
  }));
}

export async function triggerNotification(
  input: TriggerNotificationInput
): Promise<NotificationDispatchResult> {
  const template = getNotificationTemplate(input.type, input.context);
  const fallbackUserIds = input.recipients?.length ? [] : await getOrgMemberUserIds(input.organizationId);
  const recipients = buildRecipients(input, fallbackUserIds);
  const notificationRows: NotificationInsertRow[] = [];
  const skippedUserIds: string[] = [];
  const channelsByUserId: Record<string, NotificationChannel[]> = {};

  for (const recipient of recipients) {
    const enabledChannels = await getEffectiveChannels(
      recipient.userId,
      input.organizationId,
      input.type,
      recipient.requestedChannels
    );

    channelsByUserId[recipient.userId] = enabledChannels;

    if (!enabledChannels.includes('in_app')) {
      skippedUserIds.push(recipient.userId);
      continue;
    }

    notificationRows.push({
      organization_id: input.organizationId,
      user_id: recipient.userId,
      type: input.type,
      title: input.title || template.title,
      body: input.body || template.body,
      icon: template.icon,
      priority: template.priority,
      entity_type: template.entityType,
      entity_id: input.entityId ?? null,
      entity_ref: input.entityRef ?? input.context?.entityRef ?? null,
      action_url: input.actionUrl ?? null,
      channels_sent: enabledChannels
    });
  }

  if (!notificationRows.length) {
    return {
      notificationIds: [],
      skippedUserIds,
      channelsByUserId
    };
  }

  const supabase = await createNotificationClient();
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationRows)
    .select('id');

  if (error) {
    throw new Error(`Unable to create notification records: ${error.message}`);
  }

  return {
    notificationIds: (data ?? []).map((row) => row.id),
    skippedUserIds,
    channelsByUserId
  };
}

export async function triggerNotificationForOrg(
  input: Omit<TriggerNotificationInput, 'recipients' | 'recipientUserIds'>
) {
  return triggerNotification(input);
}

export async function triggerNotificationForUsers(
  input: Omit<TriggerNotificationInput, 'recipients'> & { recipientUserIds: string[] }
) {
  return triggerNotification(input);
}
