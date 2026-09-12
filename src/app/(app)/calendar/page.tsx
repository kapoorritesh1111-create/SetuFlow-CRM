import { redirect } from 'next/navigation';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { CalendarBatchOneWorkspace } from '@/features/calendar/components/calendar-batch1-workspace';
import { MobileCalendarWorkspace } from '@/features/calendar/components/mobile-calendar-workspace';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return <WorkspaceState eyebrow="Calendar" title="Workspace membership needed" description="Your account is signed in, but no active organization workspace could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }
  const contactId = typeof searchParams?.contact === 'string' ? searchParams.contact.trim() : '';
  if (contactId) {
    const next = new URLSearchParams();
    for (const [key, raw] of Object.entries(searchParams ?? {})) {
      if (key === 'contact' || raw == null) continue;
      if (Array.isArray(raw)) raw.forEach((value) => next.append(key, value));
      else next.set(key, raw);
    }
    next.set('lead', contactId);
    redirect(`/calendar?${next.toString()}`);
  }
  const userName = workspace.profile?.full_name ?? workspace.profile?.username ?? workspace.user.email ?? 'Setu Flow user';
  return <>
    <div className="md:hidden"><MobileCalendarWorkspace /></div>
    <div className="hidden h-full md:block"><CalendarBatchOneWorkspace userName={userName} /></div>
  </>;
}
