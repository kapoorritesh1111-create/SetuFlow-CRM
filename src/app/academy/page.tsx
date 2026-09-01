import type { Metadata } from 'next';
import Link from 'next/link';
import { CoreAcademyClient } from '@/features/academy/core-academy-client';
import { CoreAcademyIssueLogger } from '@/features/academy/core-academy-issue-logger';
import { CoreAcademyPassLogger } from '@/features/academy/core-academy-pass-logger';
import { CoreAcademyAdminReport } from '@/features/academy/core-academy-admin-report';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import responsive from '@/features/academy/core-academy-responsive.module.css';

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
    <div className={responsive.page}>
      <div className="border-b border-teal-200 bg-gradient-to-r from-teal-50 via-white to-blue-50 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1650px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-teal-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">New</span>
              <p className="text-sm font-black text-slate-950">Day in the Life</p>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600">Role-based Buyer Lead training for Owner and Sales with detailed click-by-click instructions for every part of the day.</p>
          </div>
          <Link href="/academy/day-in-life" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#041735] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800">Open Day in the Life →</Link>
        </div>
      </div>
      <CoreAcademyClient
        initialProgress={progress}
        isAuthenticated={isAuthenticated}
        viewerName={workspace.profile?.full_name || workspace.user?.email || 'Academy learner'}
      />
      <CoreAcademyPassLogger isAuthenticated={isAuthenticated} />
      <CoreAcademyIssueLogger isAuthenticated={isAuthenticated} />
      <CoreAcademyAdminReport canAccessAdmin={Boolean(workspace.canAccessAdmin)} />
    </div>
  );
}
