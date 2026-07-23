import Link from 'next/link';
import { InAppNotificationCenter } from '@/components/notifications/in-app-notification-center';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export default async function MobileNotificationsPage() {
  const workspace = await getWorkspaceAccess();
  const organizationId = workspace.organization?.id;
  const userId = workspace.user?.id;

  const closeButton = (
    <Link href="/dashboard" aria-label="Close notifications" className="mb-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-content-secondary">✕</Link>
  );

  if (!organizationId || !userId) {
    return <section className="space-y-3">{closeButton}<h1 className="text-xl font-black">Notifications</h1><p className="text-sm text-slate-500">No active workspace alerts are available.</p></section>;
  }

  return <section className="space-y-3">{closeButton}<InAppNotificationCenter organizationId={organizationId} userId={userId} variant="page" /></section>;
}
