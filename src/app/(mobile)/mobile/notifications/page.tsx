import { InAppNotificationCenter } from '@/components/notifications/in-app-notification-center';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export default async function MobileNotificationsPage() {
  const workspace = await getWorkspaceAccess();
  const organizationId = workspace.organization?.id;
  const userId = workspace.user?.id;

  if (!organizationId || !userId) {
    return <section className="space-y-3"><h1 className="text-xl font-black">Notifications</h1><p className="text-sm text-slate-500">No active workspace alerts are available.</p></section>;
  }

  return <section className="space-y-3"><InAppNotificationCenter organizationId={organizationId} userId={userId} variant="page" /></section>;
}
