import Link from 'next/link';
import type { MobileLead } from '../lib/role-aware-leads';

export function LeadStatusCard({ lead }: { lead: MobileLead }) {
  return <article className="rounded-[1.75rem] border border-white/70 bg-white/90 p-4 shadow-xl shadow-blue-950/5 dark:border-slate-800 dark:bg-slate-900/90">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-black text-slate-950 dark:text-white">{lead.company}</h3><p className="text-sm text-slate-500 dark:text-slate-300">{lead.contact} • {lead.market}</p></div><span className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-black text-blue-700 dark:text-sky-300">{lead.status}</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-300"><p><b className="text-slate-800 dark:text-white">Owner:</b> {lead.ownerName}</p><p><b className="text-slate-800 dark:text-white">Team:</b> {lead.teamName}</p><p><b className="text-slate-800 dark:text-white">Value:</b> ${lead.valueUsd.toLocaleString()}</p><p><b className="text-slate-800 dark:text-white">Updated:</b> {lead.lastActivity}</p></div>
    <p className="mt-3 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Next: {lead.nextAction}</p>
    <div className="mt-3 flex gap-2">
      <Link href={`/leads/${encodeURIComponent(lead.id)}`} className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" aria-label={`Open ${lead.company}`}>Open</Link>
      <Link href={`/leads/${encodeURIComponent(lead.id)}/quote?handoff=mobile-lead-card`} className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-blue-600 px-3 text-sm font-black text-white" aria-label={`Quote ${lead.company}`}>Quote</Link>
    </div>
  </article>;
}
