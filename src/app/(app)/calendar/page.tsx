import { WorkspaceState } from '@/components/ui/workspace-state';
import { CalendarScheduleWorkspace } from '@/features/calendar/components/calendar-schedule-workspace';
import { MobileCalendarWorkspace } from '@/features/calendar/components/mobile-calendar-workspace';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return <WorkspaceState eyebrow="Calendar" title="Workspace membership needed" description="Your account is signed in, but no active organization workspace could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard"/>;
  }
  const userName = workspace.profile?.full_name ?? workspace.profile?.username ?? workspace.user.email ?? 'Setu Flow user';
  return <>
    <div className="md:hidden"><MobileCalendarWorkspace/></div>
    <div className="hidden h-full md:block"><CalendarScheduleWorkspace userName={userName}/></div>
  </>;
}
