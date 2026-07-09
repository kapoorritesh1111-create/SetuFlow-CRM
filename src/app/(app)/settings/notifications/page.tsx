import Link from 'next/link';
import { WorkspaceHeader, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';
import { saveUserNotificationPreferences } from '@/lib/notifications/preference-actions';
import { getNotificationTypeMeta, normalizePreferenceRows, notificationChannels, type NotificationPreferenceRow } from '@/lib/notifications/preference-options';

function noticeCopy(notice?: string) {
  if (notice === 'saved') return { tone: 'success' as const, title: 'Notification preferences saved', description: 'Your personal notification overrides were updated.' };
  if (notice === 'save-failed') return { tone: 'danger' as const, title: 'Could not save preferences', description: 'Check your workspace access and try again.' };
  if (notice === 'missing-workspace') return { tone: 'warning' as const, title: 'Workspace missing', description: 'Sign in with an active workspace to update notification preferences.' };
  return null;
}

function channelEnabled(row: NotificationPreferenceRow, channel: (typeof notificationChannels)[number]['key']) {
  return Boolean(row[channel]);
}

function UserPreferenceMatrix({ workspaceRows, userRows }: { workspaceRows: NotificationPreferenceRow[]; userRows: NotificationPreferenceRow[] }) {
  const userByType = new Map(userRows.map((row) => [row.notif_type, row]));

  return (
    <div className="overflow-hidden rounded-panel border border-slate-200 bg-white">
      <div className="grid min-w-[760px] grid-cols-[minmax(240px,1.5fr)_repeat(5,minmax(96px,0.6fr))] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
        <span>Alert type</span>
        {notificationChannels.map((channel) => <span key={channel.key} className="text-center">{channel.label}</span>)}
      </div>
      <div className="divide-y divide-slate-100 overflow-x-auto">
        {workspaceRows.map((workspaceRow) => {
          const meta = getNotificationTypeMeta(workspaceRow.notif_type);
          const userRow = userByType.get(workspaceRow.notif_type);
          const locked = Boolean(workspaceRow.is_locked);
          return (
            <div key={workspaceRow.notif_type} className="grid min-w-[760px] grid-cols-[minmax(240px,1.5fr)_repeat(5,minmax(96px,0.6fr))] items-center gap-2 px-4 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-950">{meta.label}</p>
                  {locked ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">Workspace locked</span> : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{meta.description}</p>
              </div>
              {notificationChannels.map((channel) => {
                const defaultChecked = channelEnabled(userRow ?? workspaceRow, channel.key);
                const disabled = locked;
                return (
                  <label key={channel.key} className="flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <input name={`${workspaceRow.notif_type}:${channel.key}`} type="checkbox" defaultChecked={defaultChecked} disabled={disabled} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40" />
                    <span>{channelEnabled(workspaceRow, channel.key) ? 'Default on' : 'Default off'}</span>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function UserNotificationSettingsPage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using notification settings." tone="warning" />;

  const params = await searchParams;
  const workspace = await requireWorkspace();
  if (workspace.missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using notification settings." tone="warning" />;
  if (!workspace.user || !workspace.organization || !workspace.membership) return null;

  const supabase = await createClient();
  const [workspaceResult, userResult] = await Promise.all([
    supabase
      .from('workspace_notification_settings')
      .select('notif_type,in_app,push,email,whatsapp,sms,is_locked')
      .eq('organization_id', workspace.organization.id)
      .order('notif_type'),
    supabase
      .from('user_notification_preferences')
      .select('notif_type,in_app,push,email,whatsapp,sms')
      .eq('organization_id', workspace.organization.id)
      .eq('user_id', workspace.user.id)
      .order('notif_type'),
  ]);

  const error = workspaceResult.error ?? userResult.error;
  if (error) return <StateMessage title="Failed to load notification preferences" description={error.message} tone="danger" />;

  const workspaceRows = normalizePreferenceRows((workspaceResult.data ?? []) as NotificationPreferenceRow[]);
  const userRows = normalizePreferenceRows((userResult.data ?? []) as NotificationPreferenceRow[]);
  const notice = noticeCopy(params?.notice);
  const lockedCount = workspaceRows.filter((row) => row.is_locked).length;
  const overrideCount = userResult.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Personal settings"
        title="Notification preferences"
        description="Control your own delivery channels for CRM alerts. Locked workspace defaults are shown but cannot be overridden."
        badge={workspace.organization.name}
        actions={<Link href="/admin/notifications" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Workspace defaults</Link>}
        meta={[
          <ToolbarStat key="types" label="Alert types" value={String(workspaceRows.length)} tone="info" />,
          <ToolbarStat key="overrides" label="Saved overrides" value={String(overrideCount)} tone="success" />,
          <ToolbarStat key="locked" label="Locked" value={String(lockedCount)} tone={lockedCount > 0 ? 'warning' : 'default'} />,
        ]}
      />

      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}

      <SectionCard eyebrow="My overrides" title="Choose delivery channels" description="These preferences feed the same effective preference resolver used by in-app, push, and email notification triggers.">
        <form action={saveUserNotificationPreferences} className="space-y-5">
          <UserPreferenceMatrix workspaceRows={workspaceRows} userRows={userRows} />
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <p>Unchecked channels are disabled for your account unless the workspace row is locked.</p>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800">Save my preferences</button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
