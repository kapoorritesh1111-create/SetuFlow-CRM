'use client';

import { useMemo, useState } from 'react';
import {
  filterLeadsForRole,
  mobileLeadDemoData,
  mobileLeadDemoUsers,
  type MobileLead,
  type MobileUserContext,
  type MobileUserRole,
} from '../lib/role-aware-leads';
import { LeadStatusCard } from './lead-status-card';
import { UserAvatar } from '@/components/ui/user-avatar';

type SignedInSummary = {
  name: string;
  email?: string | null;
  roleLabel: string;
  organizationName?: string | null;
  shareHref?: string;
  avatarUrl?: string | null;
};

function SignedInCard({ signedIn }: { signedIn?: SignedInSummary }) {
  if (!signedIn) return null;
  const initials = signedIn.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'SF';

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/95 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-3">
        <UserAvatar name={signedIn.name} email={signedIn.email} avatarUrl={signedIn.avatarUrl} initials={initials} size="md" className="h-12 w-12 shadow-lg ring-1 ring-white/20" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-sky-300">Signed in</p>
          <h2 className="truncate text-base font-black text-slate-950 dark:text-white">{signedIn.name}</h2>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-300">
            {signedIn.roleLabel}{signedIn.organizationName ? ` · ${signedIn.organizationName}` : ''}
          </p>
          {signedIn.email ? <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{signedIn.email}</p> : null}
        </div>
        <a
          href={signedIn.shareHref ?? '/card'}
          className="rounded-2xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-lg shadow-blue-600/20"
          aria-label="Share my vCard"
        >
          Share vCard
        </a>
      </div>
    </section>
  );
}

export function RoleAwareLeadList({
  leads: providedLeads,
  user: providedUser,
  signedIn,
  allowRolePreview = true,
}: {
  leads?: MobileLead[];
  user?: MobileUserContext;
  signedIn?: SignedInSummary;
  allowRolePreview?: boolean;
}) {
  const demoMode = !providedLeads || !providedUser;
  const [role, setRole] = useState<MobileUserRole>(providedUser?.role ?? 'owner');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');

  const activeUser = useMemo(() => {
    if (providedUser && (!demoMode || !allowRolePreview)) return providedUser;
    return mobileLeadDemoUsers[role];
  }, [allowRolePreview, demoMode, providedUser, role]);

  const sourceLeads = providedLeads ?? mobileLeadDemoData;
  const statuses = useMemo(() => ['All', ...Array.from(new Set(sourceLeads.map((lead) => lead.status)))], [sourceLeads]);
  const leads = useMemo(() => filterLeadsForRole(sourceLeads, activeUser, { query, status }), [activeUser, query, sourceLeads, status]);

  return (
    <section className="space-y-4">
      <div className="rounded-[1.75rem] bg-white/95 p-4 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-sky-300">Role-aware leads</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Lead queue</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          {activeUser.role === 'owner' || activeUser.role === 'admin'
            ? 'Owner and admin can see every lead in the workspace.'
            : activeUser.role === 'manager'
              ? 'Managers see assigned, direct-report, and managed-team leads.'
              : 'Members only see leads assigned to them.'}
        </p>
        {demoMode && allowRolePreview ? (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {(['owner', 'admin', 'manager', 'member'] as MobileUserRole[]).map((item) => (
              <button
                key={item}
                onClick={() => setRole(item)}
                className={`min-h-11 rounded-2xl text-xs font-black capitalize ${role === item ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company, contact, owner, team, status, next action"
          className="mt-3 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-500/20 focus:ring-4 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="mt-3 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none ring-blue-500/20 focus:ring-4 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          aria-label="Filter by lead status"
        >
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Showing {leads.length} lead{leads.length === 1 ? '' : 's'} for {activeUser.name}.
        </p>
      </div>
      <div className="grid gap-3">{leads.map((lead) => <LeadStatusCard key={lead.id} lead={lead} />)}</div>
    </section>
  );
}
