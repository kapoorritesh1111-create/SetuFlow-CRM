import { WorkspaceState } from '@/components/ui/workspace-state';
import { SetuMailWorkspace } from '@/features/mail/components/setu-mail-workspace';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function MailPage() {
  const workspace = await requireWorkspace();

  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return (
      <WorkspaceState
        eyebrow="Setu Mail"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization workspace could be loaded."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  return (
    <SetuMailWorkspace
      userName={workspace.profile?.full_name ?? workspace.profile?.username ?? workspace.user.email ?? 'Setu Flow user'}
      userEmail={workspace.profile?.email ?? workspace.user.email ?? ''}
      organizationName={workspace.organization.name ?? 'Setu Flow'}
    />
  );
}
