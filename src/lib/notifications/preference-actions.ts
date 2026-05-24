'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace, requireWorkspace } from '@/lib/workspace/auth';
import { notificationChannels, notificationTypes, type NotificationChannelKey } from './preference-options';

const channelKeys = notificationChannels.map((channel) => channel.key);
const typeKeys = notificationTypes.map((type) => type.key);

function isChecked(formData: FormData, name: string) {
  return formData.get(name) === 'on';
}

function redirectWithNotice(path: '/admin/notifications' | '/settings/notifications', notice: string): never {
  redirect(`${path}?${new URLSearchParams({ notice }).toString()}`);
}

function readChannelValues(formData: FormData, notifType: string) {
  return channelKeys.reduce(
    (values, channel) => ({ ...values, [channel]: isChecked(formData, `${notifType}:${channel}`) }),
    {} as Record<NotificationChannelKey, boolean>,
  );
}

export async function saveWorkspaceNotificationSettings(formData: FormData) {
  const workspace = await requireAdminWorkspace();
  if (workspace.missingEnv || !workspace.user || !workspace.organization) redirectWithNotice('/admin/notifications', 'missing-workspace');

  const supabase = await createClient();
  const rows = typeKeys.map((notifType) => ({
    organization_id: workspace.organization!.id,
    notif_type: notifType,
    ...readChannelValues(formData, notifType),
    is_locked: isChecked(formData, `${notifType}:is_locked`),
    updated_by: workspace.user!.id,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('workspace_notification_settings')
    .upsert(rows, { onConflict: 'organization_id,notif_type' });

  if (error) redirectWithNotice('/admin/notifications', 'save-failed');

  revalidatePath('/admin/notifications');
  revalidatePath('/settings/notifications');
  redirectWithNotice('/admin/notifications', 'saved');
}

export async function saveUserNotificationPreferences(formData: FormData) {
  const workspace = await requireWorkspace();
  if (workspace.missingEnv || !workspace.user || !workspace.organization || !workspace.membership) redirectWithNotice('/settings/notifications', 'missing-workspace');

  const supabase = await createClient();
  const rows = typeKeys.map((notifType) => ({
    user_id: workspace.user!.id,
    organization_id: workspace.organization!.id,
    notif_type: notifType,
    ...readChannelValues(formData, notifType),
  }));

  const { error } = await supabase
    .from('user_notification_preferences')
    .upsert(rows, { onConflict: 'user_id,organization_id,notif_type' });

  if (error) redirectWithNotice('/settings/notifications', 'save-failed');

  revalidatePath('/settings/notifications');
  redirectWithNotice('/settings/notifications', 'saved');
}
