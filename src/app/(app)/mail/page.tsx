import { WorkspaceState } from '@/components/ui/workspace-state';
import { SetuMailWorkspace } from '@/features/mail/components/setu-mail-workspace';
import { MobileSetuMailWorkspace } from '@/features/mail/components/mobile-setu-mail-workspace';
import { requireWorkspace } from '@/lib/workspace/auth';
import styles from './mail-premium.module.css';

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

  const userName = workspace.profile?.full_name ?? workspace.profile?.username ?? workspace.user.email ?? 'Setu Flow user';
  const userEmail = workspace.profile?.email ?? workspace.user.email ?? '';
  const organizationName = workspace.organization.name ?? 'Setu Flow';

  return (
    <>
      <div className="md:hidden">
        <MobileSetuMailWorkspace userName={userName} userEmail={userEmail} organizationName={organizationName} />
      </div>
      <div className={`hidden md:block ${styles.setuMailPremium}`}>
        <SetuMailWorkspace userName={userName} userEmail={userEmail} organizationName={organizationName} />
      </div>
    </>
  );
}
