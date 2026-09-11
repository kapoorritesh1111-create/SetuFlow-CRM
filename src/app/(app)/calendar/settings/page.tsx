import { WorkspaceState } from '@/components/ui/workspace-state';
import { CalendarSettingsWorkspace } from '@/features/calendar/components/calendar-settings-workspace';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function CalendarSettingsPage() {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return <WorkspaceState eyebrow="Calendar settings" title="Workspace membership needed" description="Your account is signed in, but no active organization workspace could be loaded." primaryActionHref="/calendar" primaryActionLabel="Back to calendar" />;
  }
  return <CalendarSettingsWorkspace />;
}
