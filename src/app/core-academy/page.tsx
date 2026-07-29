import { WorkspaceState } from '@/components/ui/workspace-state';
import { CoreAcademyClient } from '@/features/academy/core-academy-client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function CoreAcademyPage() {
  const workspace = await getWorkspaceAccess();

  if (!workspace.user || !workspace.organization || !workspace.membership) {
    return (
      <WorkspaceState
        eyebrow="Setu Flow Academy"
        title="Workspace membership needed"
        description="Sign in with an active organization membership to open the Core Platform Academy."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const admin = createAdminSupabaseClient();
  let progress: Array<{ step_id: string; is_complete: boolean }> = [];

  if (admin) {
    const { data } = await (admin as any)
      .from('core_academy_progress')
      .select('step_id,is_complete')
      .eq('organization_id', workspace.organization.id)
      .eq('user_id', workspace.user.id)
      .order('updated_at', { ascending: false });
    progress = data ?? [];
  }

  return (
    <CoreAcademyClient
      initialProgress={progress}
      viewerName={workspace.profile?.full_name || workspace.user.email || 'Academy learner'}
    />
  );
}
