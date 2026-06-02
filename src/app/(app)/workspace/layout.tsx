import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { SmcIcon } from '@/features/workspace/components/smc-shell';

const SMC_TABS = [
  { href: '/workspace', label: 'Dashboard', icon: 'mission', exact: true },
  { href: '/workspace/issues', label: 'Issues', icon: 'board', exact: false },
  { href: '/workspace/sprints', label: 'Sprints', icon: 'sprint', exact: false },
  { href: '/workspace/agents', label: 'AI Queue', icon: 'agent', exact: false },
  { href: '/workspace/clients', label: 'Client Impact', icon: 'client', exact: false },
] as const;

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const access = await getWorkspaceAccess();

  if (!access.user) redirect('/login');

  if (!access.membership || !access.organization) {
    return (
      <WorkspaceState
        eyebrow="Setu Mission Control"
        title="Organization access required"
        description="An active organization membership is needed to access Setu Mission Control."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  if (!access.canAccessAdmin) {
    return (
      <WorkspaceState
        eyebrow="Setu Mission Control"
        title="Admin access required"
        description="Setu Mission Control is available to organization admins and owners."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  const orgName = access.organization.name ?? 'SETU Flow';
  const userName = access.profile?.full_name ?? access.user.email ?? 'Admin';

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03] dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_18px_60px_rgba(2,6,23,0.28)]">
        <div className="flex items-center gap-0 overflow-x-auto border-b border-slate-200/80 px-3 dark:border-white/10">
          <div className="mr-1 flex shrink-0 items-center gap-2 border-r border-slate-200/80 py-2 pr-4 dark:border-white/10">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#0c7fff] text-white shadow-sm">
              <SmcIcon name="mission" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
              SMC
            </span>
          </div>
          {SMC_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
            >
              <SmcIcon name={tab.icon} className="h-4 w-4" />
              {tab.label}
            </Link>
          ))}
          <div className="ml-auto flex shrink-0 items-center gap-3 border-l border-slate-200/80 py-2 pl-3 dark:border-white/10">
            <a href="/internal/setuflow-issue-tracker.html" className="rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-slate-200" target="_blank">
              HTML tracker ↗
            </a>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{userName}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{orgName} · Setu Mission Control · Main org readiness workspace</p>
        </div>
      </div>

      {children}
    </div>
  );
}
