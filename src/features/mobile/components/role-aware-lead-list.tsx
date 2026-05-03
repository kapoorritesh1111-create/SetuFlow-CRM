'use client';
import { useMemo, useState } from 'react';
import { filterLeadsForRole, mobileLeadDemoData, mobileLeadDemoUsers, type MobileUserRole } from '../lib/role-aware-leads';
import { LeadStatusCard } from './lead-status-card';

export function RoleAwareLeadList() {
  const [role, setRole] = useState<MobileUserRole>('owner');
  const [query, setQuery] = useState('');
  const user = mobileLeadDemoUsers[role];
  const leads = useMemo(() => filterLeadsForRole(mobileLeadDemoData, user, { query }), [query, user]);
  return <section className="space-y-4">
    <div className="rounded-[1.75rem] bg-white/90 p-4 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-sky-300">Role-aware leads</p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Current leads</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{role === 'owner' || role === 'admin' ? 'All workspace leads are visible.' : role === 'manager' ? 'Team and direct-report leads are visible.' : 'Only assigned leads are visible.'}</p>
      <div className="mt-4 grid grid-cols-4 gap-2">{(['owner','admin','manager','member'] as MobileUserRole[]).map((item) => <button key={item} onClick={() => setRole(item)} className={`min-h-11 rounded-2xl text-xs font-black capitalize ${role === item ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{item}</button>)}</div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company, contact, owner, team, status, next action" className="mt-3 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-500/20 focus:ring-4 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Showing {leads.length} lead{leads.length === 1 ? '' : 's'} for {user.name}.</p>
    </div>
    <div className="grid gap-3">{leads.map((lead) => <LeadStatusCard key={lead.id} lead={lead} />)}</div>
  </section>;
}
