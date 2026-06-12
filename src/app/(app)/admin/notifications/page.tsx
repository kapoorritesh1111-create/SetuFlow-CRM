import Link from 'next/link';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { StateMessage } from '@/components/ui/state-message';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { saveWorkspaceNotificationSettings } from '@/lib/notifications/preference-actions';
import { getNotificationTypeMeta, normalizePreferenceRows, notificationChannels, type NotificationPreferenceRow } from '@/lib/notifications/preference-options';

function noticeCopy(notice?: string) {
  if (notice === 'saved') return { tone: 'success' as const, title: 'Notification defaults saved', description: 'Workspace defaults were updated for all alert types.' };
  if (notice === 'save-failed') return { tone: 'danger' as const, title: 'Could not save notification defaults', description: 'Check permissions and try again.' };
  if (notice === 'missing-workspace') return { tone: 'warning' as const, title: 'Workspace missing', description: 'Sign in with an active admin workspace to update notification defaults.' };
  return null;
}

function PreferenceMatrix({ rows }: { rows: NotificationPreferenceRow[] }) {
  return (
    <div className="overflow-hidden rounded-[11px] border border-slate-200 bg-white">
      <div className="grid min-w-[700px] grid-cols-[minmax(200px,1.5fr)_repeat(6,minmax(80px,0.6fr))] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[7.5px] font-bold uppercase tracking-[0.13em] text-slate-400">
        <span>Alert type</span>
        {notificationChannels.map((channel) => <span key={channel.key} className="text-center">{channel.label}</span>)}
        <span className="text-center">Locked</span>
      </div>
      <div className="divide-y divide-slate-100 overflow-x-auto">
        {rows.map((row) => {
          const meta = getNotificationTypeMeta(row.notif_type);
          return (
            <div key={row.notif_type} className="grid min-w-[700px] grid-cols-[minmax(200px,1.5fr)_repeat(6,minmax(80px,0.6fr))] items-center gap-1.5 px-3 py-2.5 hover:bg-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-950">{meta.label}</p>
                <p className="mt-0.5 text-[10.5px] leading-[1.45] text-slate-500">{meta.description}</p>
              </div>
              {notificationChannels.map((channel) => (
                <label key={channel.key} className="flex justify-center">
                  <input name={`${row.notif_type}:${channel.key}`} type="checkbox" defaultChecked={Boolean(row[channel.key])} className="h-[17px] w-[17px] rounded-[5px] border-slate-300 text-teal-600 accent-teal-600 focus:ring-teal-500" />
                  <span className="sr-only">{meta.label} {channel.label}</span>
                </label>
              ))}
              <label className="flex justify-center">
                <input name={`${row.notif_type}:is_locked`} type="checkbox" defaultChecked={Boolean(row.is_locked)} className="h-[17px] w-[17px] rounded-[5px] border-slate-300 text-teal-600 accent-teal-600 focus:ring-teal-500" />
                <span className="sr-only">Lock {meta.label}</span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function AdminNotificationsPage({ searchParams }: { searchParams?: Promise<{ notice?: string }> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using notification settings." tone="warning" />;

  const params = await searchParams;
  const workspace = await requireAdminWorkspace();
  if (workspace.missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using notification settings." tone="warning" />;
  if (!workspace.organization) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspace_notification_settings')
    .select('notif_type,in_app,push,email,whatsapp,sms,is_locked')
    .eq('organization_id', workspace.organization.id)
    .order('notif_type');

  if (error) return <StateMessage title="Failed to load notification defaults" description={error.message} tone="danger" />;

  const rows = normalizePreferenceRows((data ?? []) as NotificationPreferenceRow[]);
  const notice = noticeCopy(params?.notice);
  const lockedCount = rows.filter((row) => row.is_locked).length;
  const emailCount = rows.filter((row) => row.email).length;
  const pushCount = rows.filter((row) => row.push).length;

  return (
    <AdminSettingsShell active="notifications" organizationName={workspace.organization.name} sectionTitle="Notification governance" missingCount={0}>
      <AdminPageHero
        title="Notification defaults"
        description="Set organization-level default channels for every CRM alert type. Members can override unlocked preferences on their own settings page."
        badge={workspace.organization.name}
        cta={<Link href="/settings/notifications" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-[#13305a]">Open my overrides</Link>}
        stats={[{ label: 'Alert types', value: rows.length, tone: 'info' }, { label: 'Push defaults', value: pushCount, tone: 'success' }, { label: 'Email defaults', value: emailCount, tone: 'info' }, { label: 'Locked', value: lockedCount, tone: lockedCount > 0 ? 'warning' : 'default' }]}
      />

      {notice ? <StateMessage title={notice.title} description={notice.description} tone={notice.tone} /> : null}

      {/* 5-channel org control grid */}
      <SectionCard title="Organisation channel controls" eyebrow="Workspace defaults" description="Enable or disable entire channels org-wide. In-App is always on.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([
            { icon: '🔔', label: 'In-App',    sub: 'Always on',    locked: true,  on: true },
            { icon: '📱', label: 'Push',       sub: 'Browser/PWA',  locked: false, on: true },
            { icon: '📧', label: 'Email',      sub: 'Via Mailtrap', locked: false, on: true },
            { icon: '💬', label: 'WhatsApp',   sub: 'Tracked links',locked: false, on: true },
            { icon: '⚡', label: 'SMS',         sub: 'Critical only',locked: false, on: false },
          ] as const).map((ch) => (
            <div key={ch.label} className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-center gap-2">
              <span className="text-2xl">{ch.icon}</span>
              <p className="text-xs font-bold text-slate-900">{ch.label}</p>
              <p className="text-[10px] text-slate-400">{ch.sub}</p>
              <span className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${ch.on ? 'bg-slate-900' : 'bg-slate-300'} ${ch.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${ch.on ? 'translate-x-6' : 'translate-x-1'}`} />
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Workspace defaults" title="Alert type defaults" description="These defaults feed the effective preference resolver. Locked rows prevent member overrides.">
        <form action={saveWorkspaceNotificationSettings} className="space-y-5">
          <PreferenceMatrix rows={rows} />
          <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
            <p><strong>Locked</strong> rows prevent member overrides from taking effect in the resolver.</p>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-2 text-sm font-bold text-white hover:bg-[#13305a]">Save workspace defaults</button>
          </div>
        </form>
      </SectionCard>
    </AdminSettingsShell>
  );
}
