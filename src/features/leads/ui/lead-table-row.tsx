'use client';

import Link from 'next/link';
import { type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getFollowUpVisualState } from '@/lib/lead-status';
import { ExternalLink } from '@/features/leads/command-center/ui-system';
import type { LeadCommercialReadiness } from '@/lib/catalog-pricing-model';
import type { LeadRow } from '@/features/leads/types/workspace';

export interface LeadTableRowProps {
  lead: LeadRow;
  selected: boolean;
  isSpotlight: boolean;
  toggleSelect: (leadId: string) => void;
  setSpotlightLead: (leadId: string | null) => void;
  stageMap: Map<string, string>;
  nextStepMap: Map<string, string>;
  ownerMap: Map<string, string>;
  safeFormatDateTime: (value?: string | null) => string;
  activityMap: Map<string, string>;
  stageHistoryMap: Map<string, string>;
  stageMetaMap: Map<string, { sortOrder: number | null; stageCount: number | null; isClosed: boolean | null | undefined }>;
  readinessMap: Map<string, LeadCommercialReadiness>;
  getLeadCommandCenterHref: (leadId: string) => string;
  openLeadCommandCenter: (router: ReturnType<typeof useRouter>, href: string) => void;
  shouldIgnoreLeadNavigationTarget: (target: EventTarget | null) => boolean;
  handleLeadCommandCenterKeyDown: (event: KeyboardEvent<HTMLElement>, router: ReturnType<typeof useRouter>, href: string) => void;
}

function getLeadInitials(companyName: string) {
  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function LeadTableRow({
  lead,
  selected,
  isSpotlight,
  toggleSelect,
  stageMap,
  nextStepMap,
  ownerMap,
  safeFormatDateTime,
  readinessMap,
  getLeadCommandCenterHref,
  openLeadCommandCenter,
  shouldIgnoreLeadNavigationTarget,
  handleLeadCommandCenterKeyDown,
}: LeadTableRowProps) {
  const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
  const readiness = readinessMap.get(lead.id);
  const commandCenterHref = getLeadCommandCenterHref(lead.id);
  const quoteBuilderHref = `/leads/${lead.id}/quote?source=lead-queue`;
  const router = useRouter();
  const stageName = stageMap.get(lead.stage_id ?? '') ?? 'Unstaged';
  const nextStepName = nextStepMap.get(lead.next_step_id ?? '') ?? 'Review next step';
  const ownerLabel = ownerMap.get(lead.owner_user_id ?? '') ?? 'Unassigned';
  const blockerCount = readiness?.blockerCount ?? 0;
  const statusLabel = blockerCount > 0 ? 'Blocked' : followUpState === 'overdue' ? 'Overdue' : followUpState === 'today' ? 'Due today' : followUpState === 'upcoming' ? 'Upcoming' : 'Waiting';
  const severityClass = blockerCount > 0 || followUpState === 'overdue' ? 'before:bg-rose-500' : followUpState === 'today' ? 'before:bg-amber-500' : 'before:bg-emerald-500';
  const statusClasses = blockerCount > 0
    ? 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
    : followUpState === 'overdue'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/45 dark:text-rose-200'
      : followUpState === 'today'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200'
        : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200';
  const dueLabel = followUpState === 'today' ? 'Today' : lead.next_follow_up_at ? safeFormatDateTime(lead.next_follow_up_at) : 'No due date';
  const avatarLabel = getLeadInitials(lead.company_name) || 'L';
  const signalPills = [
    { label: lead.lead_type === 'supplier' ? 'Supplier' : 'Buyer', className: lead.lead_type === 'supplier' ? 'border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200' : 'border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200' },
    blockerCount > 0
      ? { label: `${blockerCount} blocker${blockerCount === 1 ? '' : 's'}`, className: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200' }
      : { label: statusLabel, className: statusClasses },
    typeof lead.deal_value === 'number' && lead.deal_value > 0
      ? { label: 'High value', className: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200' }
      : null,
  ].filter(Boolean).slice(0, 2) as Array<{ label: string; className: string }>;

  return (
    <article
      role="link"
      tabIndex={0}
      className={[
        'group relative grid cursor-pointer gap-4 border-b border-slate-200 px-5 py-3.5 pl-6 transition before:absolute before:left-0 before:top-0 before:h-full before:w-1 hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 dark:border-slate-700/70 dark:hover:bg-slate-800/70 lg:grid-cols-[44px_minmax(0,1.35fr)_minmax(260px,0.95fr)_132px_230px]',
        severityClass,
        selected || isSpotlight ? 'bg-brand-50/35 dark:bg-sky-500/10' : 'bg-white dark:bg-slate-900/70',
      ].join(' ')}
      onClick={(event) => {
        if (shouldIgnoreLeadNavigationTarget(event.target)) return;
        openLeadCommandCenter(router, commandCenterHref);
      }}
      onKeyDown={(event) => {
        if (shouldIgnoreLeadNavigationTarget(event.target)) return;
        handleLeadCommandCenterKeyDown(event, router, commandCenterHref);
      }}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${lead.company_name}`}
          onChange={() => toggleSelect(lead.id)}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {avatarLabel}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold text-slate-950 dark:text-slate-50">{lead.company_name}</h3>
              {signalPills.map((pill) => (
                <span key={pill.label} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${pill.className}`}>{pill.label}</span>
              ))}
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{[lead.contact_name ?? 'No primary contact', lead.job_title, lead.country].filter(Boolean).join(' · ')}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stageName} · {ownerLabel}</p>
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Next action</p>
        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">{nextStepName}</p>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{lead.source_label ?? lead.source_type ?? 'Lead queue'}</p>
      </div>

      <div className="flex flex-col justify-center lg:items-end">
        <p className={`text-sm font-semibold ${followUpState === 'overdue' ? 'text-rose-600 dark:text-rose-300' : followUpState === 'today' ? 'text-amber-600 dark:text-amber-300' : 'text-slate-900 dark:text-slate-50'}`}>{dueLabel}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openLeadCommandCenter(router, commandCenterHref);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(16,185,129,0.18)] transition hover:bg-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
        >
          Open
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <Link
          href={quoteBuilderHref}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          Create quote
        </Link>
      </div>
    </article>
  );
}
