import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getWorkspaceAccess, isSetuInternalOrganization } from '@/lib/workspace/auth';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { cn } from '@/lib/utils';

const WORKSPACE_TABS = [
  { href: '/workspace',         label: 'Dashboard',      exact: true  },
  { href: '/workspace/issues',  label: 'Issues Board',   exact: false },
  { href: '/workspace/sprints', label: 'Sprint Planning', exact: false },
  { href: '/workspace/agents',  label: 'AI Agents',      exact: false },
  { href: '/workspace/clients', label: 'Clients',        exact: false },
] as const;

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const access = await getWorkspaceAccess();

  if (!access.user) redirect('/login');
  if (!access.membership || !access.organization) {
    return (
      <WorkspaceState
        eyebrow="Internal workspace"
        title="Organization access required"
        description="This workspace requires an active SETU Flow organization membership."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  if (!isSetuInternalOrganization(access.organization)) {
    return (
      <WorkspaceState
        eyebrow="Internal workspace"
        title="SETU Flow team only"
        description="The internal engineering workspace is only accessible to SETU Flow organization members. Switch to your SETU Flow account to continue."
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
      />
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Workspace tab bar */}
      <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-soft dark:border-slate-700/70 dark:bg-slate-900/80">
        <div className="flex items-center gap-0 overflow-x-auto border-b border-slate-200/80 px-4 dark:border-slate-700/70">
          <div className="flex items-center gap-1 py-1 pr-4 border-r border-slate-200/80 dark:border-slate-700/70 mr-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary dark:text-sky-400">
              SETU Workspace
            </span>
          </div>
          {WORKSPACE_TABS.map((tab) => (
            <WorkspaceTabLink key={tab.href} href={tab.href} label={tab.label} exact={tab.exact} />
          ))}
          <div className="ml-auto flex items-center gap-2 py-2 pl-4">
            <a
              href="/internal/setuflow-issue-tracker.html"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              target="_blank"
            >
              Legacy tracker ↗
            </a>
          </div>
        </div>
        <div className="px-4 py-1.5">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Internal engineering workspace · {access.organization.name} · {access.profile?.full_name ?? access.user.email}
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}

function WorkspaceTabLink({ href, label, exact }: { href: string; label: string; exact: boolean }) {
  // Note: active state handled client-side via CSS data attribute in a small client wrapper
  // For SSR we render all tabs equally; the active tab gets highlighted via URL matching
  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors',
        'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
        'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t after:bg-transparent',
        'data-[active]:text-brand-primary data-[active]:after:bg-brand-primary',
        'dark:data-[active]:text-sky-400 dark:data-[active]:after:bg-sky-400',
      )}
    >
      {label}
    </Link>
  );
}
