import type { Metadata } from 'next';
import { CoreAcademyClient } from '@/features/academy/core-academy-client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Setu Flow Academy',
  description: 'Learn the complete Setu Flow CRM workflow from capture through quote, approval, orders, execution, and growth.',
  alternates: { canonical: 'https://www.setuflowcrm.com/academy' },
};

export default async function AcademyPage() {
  const workspace = await getWorkspaceAccess();
  const isAuthenticated = Boolean(workspace.user && workspace.organization && workspace.membership);
  let progress: Array<{ step_id: string; is_complete: boolean }> = [];

  if (isAuthenticated) {
    const admin = createAdminSupabaseClient();
    if (admin) {
      const { data } = await (admin as any)
        .from('core_academy_progress')
        .select('step_id,is_complete')
        .eq('organization_id', workspace.organization!.id)
        .eq('user_id', workspace.user!.id)
        .order('updated_at', { ascending: false });
      progress = data ?? [];
    }
  }

  return (
    <CoreAcademyClient
      initialProgress={progress}
      isAuthenticated={isAuthenticated}
      viewerName={workspace.profile?.full_name || workspace.user?.email || 'Academy learner'}
    />
  );
}
