'use client';

import Link from 'next/link';
import { type KeyboardEvent } from 'react';
import { useMemo } from 'react';
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
  stageMetaMap,
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
  // ---------------------------------------------------------------------------
  // Enhanced Lead Row Visual Computations (PR03 realignment)
  // Compute due date differences and severity for left border. These are used
  // instead of the pseudo-element severityClass used previously.
  const dueDate = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) : null;
  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / dayMs) : null;
  const overdueDays = diffDays !== null && diffDays < 0 ? Math.abs(diffDays) : null;
  // Build a human-readable due label (fallback to dash when no date)
  const dueLabel = dueDate ? safeFormatDateTime(lead.next_follow_up_at) : '—';
  // Determine severity for the left border: red for overdue or blockers,
  // amber for due today, green for upcoming/other
  const severityBorderClass = blockerCount > 0 || followUpState === 'overdue'
    ? 'border-l-[3px] border-rose-500'
    : followUpState === 'today'
      ? 'border-l-[3px] border-amber-500'
      : 'border-l-[3px] border-emerald-500';
  // Build signal pills for lead type, blocker status, and high-value marker. Use
  // useMemo to avoid unnecessary re-computation on re-renders.
  const signalPills = useMemo(() => {
    const pills: Array<{ label: string; className: string }> = [];
    // Lead type pill
    pills.push({
      label: lead.lead_type === 'supplier' ? 'Supplier' : 'Buyer',
      className: lead.lead_type === 'supplier' ? 'border-violet-100 bg-violet-50 text-violet-700' : 'border-sky-100 bg-sky-50 text-sky-700',
    });
    // Blocker or follow-up status pill
    if (blockerCount > 0) {
      pills.push({ label: `${blockerCount} blocker${blockerCount === 1 ? '' : 's'}`, className: 'border-rose-100 bg-rose-50 text-rose-700' });
    } else if (followUpState === 'overdue') {
      pills.push({ label: 'Overdue', className: 'border-rose-100 bg-rose-50 text-rose-700' });
    } else if (followUpState === 'today') {
      pills.push({ label: 'Due today', className: 'border-amber-100 bg-amber-50 text-amber-700' });
    } else if (followUpState === 'upcoming') {
      pills.push({ label: 'Upcoming', className: 'border-blue-100 bg-blue-50 text-blue-700' });
    } else {
      pills.push({ label: 'Waiting', className: 'border-slate-200 bg-slate-100 text-slate-700' });
    }
    // High-value pill
    if (typeof lead.deal_value === 'number' && lead.deal_value > 0) {
      pills.push({ label: 'High value', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' });
    }
    return pills.slice(0, 2);
  }, [lead.lead_type, blockerCount, followUpState, lead.deal_value]);
  // Avatar initials for company name
  const avatarLabel = getLeadInitials(lead.company_name) || 'L';
  // Stage progress metrics from stageMetaMap
  const stageMeta = stageMetaMap.get(lead.stage_id ?? '') ?? { sortOrder: null, stageCount: null };
  const stageOrder = stageMeta.sortOrder ?? 0;
  const stageCount = stageMeta.stageCount ?? 1;
  const progress = stageCount > 0 ? Math.max(0, Math.min(1, stageOrder / stageCount)) : 0;
  const progressColour = blockerCount > 0 || followUpState === 'overdue'
    ? 'bg-rose-500'
    : followUpState === 'today'
      ? 'bg-amber-500'
      : 'bg-emerald-500';
  // Sub-label for progress bar: show overdue/incoming days or next step
  let progressSubLabel: string;
  if (overdueDays !== null) {
    progressSubLabel = `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
  } else if (diffDays !== null && diffDays > 0) {
    progressSubLabel = `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  } else {
    progressSubLabel = nextStepName;
  }

  // Format deal value for display. If the deal value is not a positive number, show dash.
  const dealValue = typeof lead.deal_value === 'number' && lead.deal_value > 0 ? lead.deal_value : null;
  const dealCurrency = lead.deal_currency ?? 'USD';
  const formattedDealValue = dealValue
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: dealCurrency, maximumFractionDigits: 0 }).format(dealValue)
    : '—';

  return (
    <article
      role="link"
      tabIndex={0}
      className={[
        'relative grid cursor-pointer items-center gap-x-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:shadow-md hover:border-slate-300',
        severityBorderClass,
        selected || isSpotlight ? 'bg-brand-50/35' : '',
      ].join(' ')}
      style={{ gridTemplateColumns: '28px 1fr 130px 110px 110px 100px 100px' }}
      onClick={(event) => {
        if (shouldIgnoreLeadNavigationTarget(event.target)) return;
        openLeadCommandCenter(router, commandCenterHref);
      }}
      onKeyDown={(event) => {
        if (shouldIgnoreLeadNavigationTarget(event.target)) return;
        handleLeadCommandCenterKeyDown(event, router, commandCenterHref);
      }}
    >
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${lead.company_name}`}
          onChange={() => toggleSelect(lead.id)}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
      </div>

      <div className="flex items-start gap-3 overflow-hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
          {avatarLabel}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <h3 className="truncate text-sm font-semibold text-slate-950">{lead.company_name}</h3>
            {signalPills.map((pill) => (
              <span
                key={pill.label}
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pill.className}`}
              >
                {pill.label}
              </span>
            ))}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-600">
            {[lead.contact_name ?? 'No primary contact', lead.job_title, lead.country].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Stage progress column */}
      <div className="hidden md:block">
        <p className="text-xs font-semibold text-slate-500">{stageName}</p>
        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${progressColour}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1 truncate text-[10px] text-slate-500">{progressSubLabel}</p>
      </div>

      {/* Follow-up column */}
      <div className="hidden md:flex flex-col items-start">
        {blockerCount > 0 || followUpState === 'overdue' ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
            ⚠ {overdueDays ?? 0} {overdueDays === 1 ? 'day' : 'days'} overdue
          </span>
        ) : followUpState === 'today' ? (
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
            Today
          </span>
        ) : diffDays !== null && diffDays > 0 ? (
          <span className="text-xs font-semibold text-slate-600">{dueLabel}</span>
        ) : (
          <span className="text-xs font-semibold text-slate-400">—</span>
        )}
      </div>

      {/* Deal value column */}
      <div className="hidden md:flex flex-col items-start">
        <p className="text-sm font-semibold text-slate-900">{formattedDealValue}</p>
        <p className="mt-0.5 text-[10px] text-slate-500">{dealValue ? dealCurrency.toUpperCase() : ''}</p>
      </div>

      {/* Owner and source column */}
      <div className="hidden md:flex flex-col items-start">
        <p className="text-sm font-semibold text-slate-900">{ownerLabel}</p>
        <p className="mt-0.5 text-[10px] text-slate-500">{lead.source_label ?? lead.source_type ?? 'Lead queue'}</p>
      </div>

      {/* Actions column */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openLeadCommandCenter(router, commandCenterHref);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_3px_8px_rgba(16,185,129,0.15)] transition hover:bg-emerald-600"
        >
          Open
          <ExternalLink className="h-3 w-3" />
        </button>
        <Link
          href={quoteBuilderHref}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Create quote
        </Link>
      </div>
    </article>
  );
}
