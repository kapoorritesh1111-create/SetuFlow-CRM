import { ContactsWorkspace } from '@/features/contacts/components/contacts-workspace';
import { MobilePeopleWorkspace } from '@/features/contacts/components/mobile-people-workspace';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return <WorkspaceState eyebrow="Contacts" title="Workspace membership needed" description="Your account is signed in, but no active organization workspace could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }
  return <>
    <div className="md:hidden"><MobilePeopleWorkspace /></div>
    <div className="hidden h-full md:block"><ContactsWorkspace /></div>
  </>;
}
