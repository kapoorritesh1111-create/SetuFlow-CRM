import { WorkspaceState } from '@/components/ui/workspace-state';
import { CalendarBookingSettings } from '@/features/calendar/components/calendar-booking-settings';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function CalendarBookingPage() {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return <WorkspaceState eyebrow="Calendar" title="Workspace membership needed" description="Your account is signed in, but no active organization workspace could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }
  return <CalendarBookingSettings />;
}
