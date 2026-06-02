import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { WorkspaceState } from '@/components/ui/workspace-state';

const WORKSPACE_TABS = [
  { href: '/workspace',         label: '⚡ Dashboard',       exact: true  },
  { href: '/workspace/issues',  label: 'Issues Board',       exact: false },
  { href: '/workspace/sprints', label: 'Sprint Planning',    exact: false },
  { href: '/workspace/agents',  label: 'AI Agents',          exact: false },
  { href: '/workspace/clients', label: 'Clients',            exact: false },
] as const;

// The internal workspace is only accessible to admin/owner roles within any org
// For non-admin users it simply returns 404 via the canAccessAdmin check
export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const access = await getWorkspaceAccess();

  if (!access.user) redirect('/login');

  if (!access.membership || !access.organization) {
    return (
      <WorkspaceState
        eyebrow="Dev Workspace"
        title="Organization access required"
        description="An active organization membership is needed to access the dev workspace."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  // Workspace is admin-only — non-admin users see 404 equivalent
  if (!access.canAccessAdmin) {
    return (
      <WorkspaceState
        eyebrow="Dev Workspace"
        title="Admin access required"
        description="The internal engineering workspace is only available to organization admins and owners."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  const orgName = access.organization.name ?? 'your organization';
  const userName = access.profile?.full_name ?? access.user.email ?? 'Admin';

  return (
    <div className="flex flex-col gap-0">
      {/* Workspace header bar */}
      <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-soft dark:border-slate-700/70 dark:bg-slate-900/80">
        {/* Tab row */}
        <div className="flex items-center gap-0 overflow-x-auto border-b border-slate-200/80 px-3 dark:border-slate-700/70">
          {/* Brand badge */}
          <div className="flex items-center gap-2 border-r border-slate-200/80 py-2 pr-4 dark:border-slate-700/70 mr-1 flex-shrink-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-primary text-[10px] font-black text-white">W</div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Dev Workspace
            </span>
          </div>
          {WORKSPACE_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-shrink-0 items-center px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {tab.label}
            </Link>
          ))}
          {/* Right side: legacy link + user context */}
          <div className="ml-auto flex flex-shrink-0 items-center gap-3 py-2 pl-3 border-l border-slate-200/80 dark:border-slate-700/70">
            <a
              href="/internal/setuflow-issue-tracker.html"
              className="rounded-lg px-2 py-1 text-[11px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              target="_blank"
            >
              HTML tracker ↗
            </a>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {userName}
            </span>
          </div>
        </div>
        {/* Org context strip */}
        <div className="flex items-center gap-2 px-4 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {orgName} · Internal engineering workspace · Admin only · Not visible in main navigation
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}
