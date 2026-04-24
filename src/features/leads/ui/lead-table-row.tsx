'use client';

import Link from 'next/link';
import { type KeyboardEvent } from 'react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getFollowUpVisualState } from '@/lib/lead-status';
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

/**
 * PR03 spec: Avatar colour assigned from 5 gradients via company-name hash.
 * Matches spec's lr-av-blue / lr-av-teal / lr-av-violet / lr-av-rose / lr-av-amber.
 */
function getAvatarGradient(companyName: string): string {
  const gradients = [
    'linear-gradient(135deg,#0b2e4a,#0c7fff)',  // blue
    'linear-gradient(135deg,#0f766e,#0d9488)',  // teal
    'linear-gradient(135deg,#5b21b6,#7c3aed)', // violet
    'linear-gradient(135deg,#9f1239,#e11d48)', // rose
    'linear-gradient(135deg,#92400e,#d97706)', // amber
  ];
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    hash = (hash * 31 + companyName.charCodeAt(i)) & 0xffff;
  }
  return gradients[hash % gradients.length];
}

/**
 * PR03 spec: Stage pill colour classes.
 * pill-stage-n (amber)  = Negotiation / Quote Sent
 * pill-stage-s (emerald) = Qualified / Sample / Won
 * pill-stage (slate) = default / new lead
 */
function getStagePillClasses(stageName: string): string {
  const lower = stageName.toLowerCase();
  if (lower.includes('quote') || lower.includes('negoti')) {
    return 'border-[#fde68a] bg-[#fef3c7] text-[#92400e]'; // amber — negotiation/quote
  }
  if (lower.includes('sample') || lower.includes('qualif') || lower.includes('won') || lower.includes('close')) {
    return 'border-[#6ee7b7] bg-[#d1fae5] text-[#047857]'; // emerald — qualified/sample/won
  }
  return 'border-slate-300 bg-slate-100 text-slate-600'; // slate — default
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

  // ── Severity left border (spec: .lead-row.critical / .warning / .ok) ──────
  const dueDate = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) : null;
  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / dayMs) : null;
  const overdueDays = diffDays !== null && diffDays < 0 ? Math.abs(diffDays) : null;

  const severityBorderClass =
    blockerCount > 0 || followUpState === 'overdue'
      ? 'border-l-[3px] border-rose-500'
      : followUpState === 'today'
        ? 'border-l-[3px] border-amber-500'
        : 'border-l-[3px] border-emerald-500';

  // ── Signal pills: lead_type + stage (max 2 per spec) ─────────────────────
  const signalPills = useMemo(() => {
    const pills: Array<{ label: string; className: string }> = [];

    // Pill 1: Lead type
    pills.push({
      label: lead.lead_type === 'supplier' ? 'Supplier' : 'Buyer',
      className:
        lead.lead_type === 'supplier'
          ? 'border-[#c4b5fd] bg-[#f5f3ff] text-[#6d28d9]'
          : 'border-[#7dd3fc] bg-[#f0f9ff] text-[#0369a1]',
    });

    // Pill 2: Stage name with spec colours (or blocker if unstaged)
    if (stageName && stageName !== 'Unstaged') {
      pills.push({ label: stageName, className: getStagePillClasses(stageName) });
    } else if (blockerCount > 0) {
      pills.push({ label: `${blockerCount} blocker${blockerCount === 1 ? '' : 's'}`, className: 'border-rose-200 bg-rose-50 text-rose-700' });
    }

    return pills.slice(0, 2);
  }, [lead.lead_type, stageName, blockerCount]);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const avatarLabel = getLeadInitials(lead.company_name) || 'L';
  const avatarGradient = getAvatarGradient(lead.company_name);

  // ── Stage progress bar ───────────────────────────────────────────────────
  const stageMeta = stageMetaMap.get(lead.stage_id ?? '') ?? { sortOrder: null, stageCount: null };
  const stageOrder = stageMeta.sortOrder ?? 0;
  const stageCount = stageMeta.stageCount ?? 1;
  const progress = stageCount > 0 ? Math.max(0.08, Math.min(1, stageOrder / stageCount)) : 0.08;
  const progressBarColour =
    blockerCount > 0 || followUpState === 'overdue'
      ? 'bg-rose-400'
      : followUpState === 'today'
        ? 'bg-amber-400'
        : 'bg-emerald-500';

  let progressSubLabel: string;
  if (overdueDays !== null) {
    progressSubLabel = `${overdueDays} day${overdueDays === 1 ? '' : 's'} no contact`;
  } else if (diffDays === 0) {
    progressSubLabel = 'Follow-up today';
  } else if (diffDays !== null && diffDays > 0) {
    progressSubLabel = `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  } else {
    progressSubLabel = nextStepName;
  }

  const progressSubColour =
    overdueDays !== null ? 'text-rose-600' : followUpState === 'today' ? 'text-amber-600' : 'text-slate-500';

  // ── Deal value ────────────────────────────────────────────────────────────
  const dealValue = typeof lead.deal_value === 'number' && lead.deal_value > 0 ? lead.deal_value : null;
  const dealCurrency = lead.deal_currency ?? 'USD';
  const dueLabel = dueDate ? safeFormatDateTime(lead.next_follow_up_at) : '—';
  const formattedDealValue = dealValue
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: dealCurrency, maximumFractionDigits: 0 }).format(dealValue)
    : '—';

  return (
    <article
      role="link"
      tabIndex={0}
      className={[
        // 7-column grid per spec (.lead-table-header columns)
        'relative grid cursor-pointer items-center gap-x-4 rounded-2xl border border-slate-200 bg-white px-4 py-[11px] mb-[5px] transition hover:shadow-md hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
        severityBorderClass,
        selected || isSpotlight ? 'bg-blue-50/40' : '',
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
      {/* Col 1: Checkbox */}
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${lead.company_name}`}
          onChange={() => toggleSelect(lead.id)}
          onClick={(event) => event.stopPropagation()}
          className="h-[18px] w-[18px] cursor-pointer rounded-[4px] border-slate-300"
        />
      </div>

      {/* Col 2: Company / Contact — avatar + name + pills */}
      <div className="flex items-start gap-2.5 overflow-hidden">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-extrabold text-white"
          style={{ background: avatarGradient }}
        >
          {avatarLabel}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold text-slate-900">{lead.company_name}</div>
          <div className="mt-0.5 truncate text-[11px] text-slate-500">
            {[lead.contact_name, lead.job_title].filter(Boolean).join(' · ') || 'No primary contact'}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {signalPills.map((pill) => (
              <span
                key={pill.label}
                className={`inline-flex items-center rounded-full border px-[7px] py-[1px] text-[9px] font-bold tracking-[0.04em] ${pill.className}`}
              >
                {pill.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Col 3: Stage progress */}
      <div className="hidden lg:block">
        <div className="text-[11px] font-semibold text-slate-700">{stageName}</div>
        <div className="mt-[4px] h-[3px] w-full rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${progressBarColour}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <div className={`mt-1 truncate text-[9px] font-semibold ${progressSubColour}`}>{progressSubLabel}</div>
      </div>

      {/* Col 4: Follow-up */}
      <div className="hidden lg:flex flex-col items-start gap-[2px]">
        {blockerCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-[4px] border border-rose-100 bg-rose-50 px-[7px] py-[2px] text-[10px] font-bold text-rose-600">
            🚫 Dispatch blocked
          </span>
        ) : followUpState === 'overdue' ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-[4px] border border-rose-100 bg-rose-50 px-[7px] py-[2px] text-[10px] font-bold text-rose-600">
              ⚠ {overdueDays ?? 0} {overdueDays === 1 ? 'day' : 'days'} overdue
            </span>
            <span className="text-[10px] text-slate-400">{dueLabel}</span>
          </>
        ) : followUpState === 'today' ? (
          <>
            <span className="inline-flex rounded-[4px] border border-amber-100 bg-amber-50 px-[7px] py-[2px] text-[10px] font-bold text-amber-600">
              Today
            </span>
            <span className="text-[10px] text-slate-400">{dueLabel}</span>
          </>
        ) : dueDate ? (
          <span className="text-[10px] font-semibold text-slate-600">{dueLabel}</span>
        ) : (
          <span className="text-[10px] text-slate-400">No date set</span>
        )}
      </div>

      {/* Col 5: Deal value */}
      <div className="hidden lg:flex flex-col items-start">
        <div className="text-[12px] font-bold text-slate-900">{formattedDealValue}</div>
        {dealValue ? <div className="mt-0.5 text-[10px] text-slate-400">{dealCurrency.toUpperCase()}</div> : null}
      </div>

      {/* Col 6: Owner + source */}
      <div className="hidden lg:flex flex-col items-start">
        <div className="text-[11px] font-semibold text-slate-700">{ownerLabel}</div>
        <div className="mt-0.5 text-[10px] text-slate-400">{lead.source_label ?? lead.source_type ?? '—'}</div>
      </div>

      {/* Col 7: Actions */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openLeadCommandCenter(router, commandCenterHref);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-[#0b2e4a] bg-[#0b2e4a] px-[10px] py-[4px] text-[10px] font-bold text-white transition hover:opacity-90"
        >
          Open →
        </button>
        <Link
          href={quoteBuilderHref}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-[10px] py-[4px] text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
        >
          Quote
        </Link>
      </div>
    </article>
  );
}

/**
 * PR03 spec: 7-column sticky table header matching spec's .lead-table-header class.
 * Rendered once above the grouped lead sections.
 */
export function LeadTableHeader({
  onSelectAll,
  allSelected,
}: {
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
}) {
  return (
    <div
      className="grid items-center gap-x-4 border-b border-slate-200 bg-white px-4 py-2"
      style={{ gridTemplateColumns: '28px 1fr 130px 110px 110px 100px 100px' }}
    >
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="h-[18px] w-[18px] rounded-[4px] border-slate-300"
        />
      </div>
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Company / Contact{' '}
        <span className="font-normal normal-case opacity-60">· stage · type</span>
      </div>
      <div className="hidden lg:block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Stage progress
      </div>
      <div className="hidden lg:block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Follow-up
      </div>
      <div className="hidden lg:block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Deal value
      </div>
      <div className="hidden lg:block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Owner
      </div>
      <div className="hidden lg:block text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Action
      </div>
    </div>
  );
}
