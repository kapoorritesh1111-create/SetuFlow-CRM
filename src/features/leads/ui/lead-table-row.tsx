'use client';

import { type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getFollowUpVisualState } from '@/lib/lead-status';
import { workspaceInsetClass } from '@/components/ui/workspace-surfaces';
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
  const router = useRouter();
  const stageName = stageMap.get(lead.stage_id ?? '') ?? 'Unstaged';
  const nextStepName = nextStepMap.get(lead.next_step_id ?? '') ?? 'Review next step';
  const ownerLabel = ownerMap.get(lead.owner_user_id ?? '') ?? 'Unassigned';
  const statusLabel =
    (readiness?.blockerCount ?? 0) > 0
      ? 'Blocked'
      : followUpState === 'overdue'
        ? 'Overdue'
        : followUpState === 'today'
          ? 'Due today'
          : followUpState === 'upcoming'
            ? 'Upcoming'
            : 'Waiting';
  const statusClasses =
    (readiness?.blockerCount ?? 0) > 0
      ? 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
      : followUpState === 'overdue'
        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/45 dark:text-rose-200'
        : followUpState === 'today'
          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200'
          : followUpState === 'upcoming'
            ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200';
  const dueLabel =
    followUpState === 'today'
      ? 'Today'
      : lead.next_follow_up_at
        ? safeFormatDateTime(lead.next_follow_up_at)
        : 'No due date';
  const avatarLabel = getLeadInitials(lead.company_name) || 'L';
  const secondaryBadge =
    (readiness?.blockerCount ?? 0) > 0
      ? `${readiness?.blockerCount ?? 0} blocker${(readiness?.blockerCount ?? 0) === 1 ? '' : 's'}`
      : typeof lead.deal_value === 'number' && lead.deal_value > 0
        ? 'High value'
        : null;

  return (
    <article
      key={lead.id}
      role="link"
      tabIndex={0}
      className={[
        'group grid cursor-pointer gap-4 border-b border-slate-200 px-5 py-3.5 transition hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 dark:border-slate-700/70 dark:hover:bg-slate-800/70 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.95fr)_140px_132px]',
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
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {avatarLabel}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold text-slate-950 dark:text-slate-50">{lead.company_name}</h3>
              {secondaryBadge ? (
                <span className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
                  {secondaryBadge}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {[lead.contact_name ?? 'No primary contact', lead.job_title, lead.country].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stageName} · {ownerLabel}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{lead.source_label ?? lead.source_type ?? 'Lead queue'} · {nextStepName}</p>
          </div>
        </div>
      </div>

      <div className={`min-w-0 px-4 py-3 ${workspaceInsetClass}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Next action</p>
        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">{nextStepName}</p>
        {secondaryBadge ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{secondaryBadge}</p> : null}
      </div>

      <div className="flex flex-col justify-center lg:items-end">
        <p className={`text-sm font-semibold ${followUpState === 'overdue' ? 'text-rose-600 dark:text-rose-300' : followUpState === 'today' ? 'text-amber-600 dark:text-amber-300' : 'text-slate-900 dark:text-slate-50'}`}>
          {dueLabel}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due</p>
        <span className={`mt-3 inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center lg:justify-end">
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
      </div>
    </article>
  );
}
