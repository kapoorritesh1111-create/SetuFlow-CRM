'use client';

import { useMemo, useState } from 'react';
import {
  filterLeadsForRole,
  mobileLeadDemoData,
  mobileLeadDemoUsers,
  type MobileLead,
  type MobileLeadType,
  type MobileUserContext,
  type MobileUserRole,
} from '../lib/role-aware-leads';
import { LeadStatusCard } from './lead-status-card';

type SignedInSummary = {
  name: string;
  email?: string | null;
  roleLabel: string;
  organizationName?: string | null;
  shareHref?: string;
  avatarUrl?: string | null;
};

// SF-18-118: Priority score for mobile lead cards
function mobilePriorityScore(lead: MobileLead): number {
  const now = Date.now();
  const fuDate = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).getTime() : null;
  const overdueDays = fuDate && fuDate < now ? Math.floor((now - fuDate) / 86400000) : 0;
  const urgency = Math.min(overdueDays / 14, 1) * 45;
  const value = lead.dealValue ? Math.min(lead.dealValue / 50000, 1) * 25 : 0;
  return Math.round(Math.min(Math.max(urgency + value, 0), 99));
}
function followUpState(lead: MobileLead): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!lead.nextFollowUpAt) return 'none';
  const now = Date.now(); const fu = new Date(lead.nextFollowUpAt).getTime();
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  if (fu < today.getTime()) return 'overdue';
  if (fu < tomorrow.getTime()) return 'today';
  return 'upcoming';
}

function leadTypeLabel(leadType: MobileLeadType) {
  if (leadType === 'buyer') return 'Buyer';
  if (leadType === 'supplier') return 'Supplier';
  return 'All';
}

export function RoleAwareLeadList({
  leads: providedLeads,
  user: providedUser,
  signedIn: _signedIn,
  allowRolePreview = true,
  initialLeadType = '',
}: {
  leads?: MobileLead[];
  user?: MobileUserContext;
  signedIn?: SignedInSummary;
  allowRolePreview?: boolean;
  initialLeadType?: MobileLeadType;
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
  const leads = useMemo(() => filterLeadsForRole(sourceLeads, activeUser, { query, status, leadType: initialLeadType }), [activeUser, initialLeadType, query, sourceLeads, status]);

  return (
    <section className="sf-mobile-lead-queue space-y-4">
      <div className="sf-mobile-lead-filter-card rounded-[1.75rem] bg-white/95 p-4 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90">
        <div className="sf-mobile-lead-heading">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-sky-300">Role-aware leads</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{leadTypeLabel(initialLeadType)} lead queue</h1>
          <p className="sf-mobile-lead-helper mt-1 text-sm text-slate-500 dark:text-slate-300">
            {initialLeadType ? `Filtered to ${leadTypeLabel(initialLeadType).toLowerCase()} leads from the global workspace filter.` : activeUser.role === 'owner' || activeUser.role === 'admin'
              ? 'Owner and admin can see every lead in the workspace.'
              : activeUser.role === 'manager'
                ? 'Managers see assigned, direct-report, and managed-team leads.'
                : 'Members only see leads assigned to them.'}
          </p>
        </div>
        {demoMode && allowRolePreview ? (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {(['owner', 'admin', 'manager', 'member'] as MobileUserRole[]).map((item) => (
              <button key={item} onClick={() => setRole(item)} className={`min-h-11 rounded-2xl text-xs font-black capitalize ${role === item ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {item}
              </button>
            ))}
          </div>
        ) : null}
        <div className="sf-mobile-lead-controls">
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
        </div>
        <p className="sf-mobile-lead-count mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Showing {leads.length} lead{leads.length === 1 ? '' : 's'} for {activeUser.name}.
        </p>
      </div>
      {/* SF-18-118: Group banners */}
      {[
        { id: 'critical', label: '⚠ Critical', dot: 'bg-rose-500 animate-pulse', style: 'from-rose-50 to-red-50 border-rose-200', filter: (l: any) => followUpState(l) === 'overdue' },
        { id: 'today', label: '⏰ Due today', dot: 'bg-amber-400 animate-pulse', style: 'from-amber-50 to-yellow-50 border-amber-200', filter: (l: any) => followUpState(l) === 'today' },
        { id: 'active', label: '✓ Active', dot: 'bg-emerald-400', style: 'from-emerald-50 to-green-50 border-emerald-100', filter: (l: any) => followUpState(l) !== 'overdue' && followUpState(l) !== 'today' },
      ].map(group => {
        const groupLeads = leads.filter(group.filter);
        if (!groupLeads.length) return null;
        return (
          <div key={group.id}>
            <div className={`flex items-center gap-2 rounded-2xl border bg-gradient-to-r ${group.style} px-4 py-2.5 mb-2`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${group.dot}`} />
              <span className="text-[10.5px] font-extrabold uppercase tracking-[.1em] text-slate-700">{group.label}</span>
              <span className="ml-auto text-[10px] font-bold text-slate-500">{groupLeads.length} leads</span>
            </div>
            <div className="grid gap-2">
              {groupLeads.map(lead => (
                <div key={lead.id} className="relative">
                  {/* SF-18-118: Urgency rail */}
                  <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full z-10 ${followUpState(lead)==='overdue'?'bg-rose-500':followUpState(lead)==='today'?'bg-amber-400':'bg-emerald-400'}`} />
                  {/* SF-18-118: Priority badge overlay */}
                  <div className="relative">
                    <div className="absolute top-3 right-3 z-10">
                      {(() => { const s = mobilePriorityScore(lead); const cls = s>=75?'bg-rose-100 text-rose-700':s>=50?'bg-amber-100 text-amber-700':'bg-blue-50 text-blue-600'; return <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${cls}`}>{s}</span>; })()}
                    </div>
                    <LeadStatusCard lead={lead} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
