'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { moveLeadToStage } from '@/features/pipeline/server/actions';
import { addLeadNote, scheduleLeadFollowUp } from '@/features/leads/server/actions';
import { getFollowUpBadgeClasses, getFollowUpLabel, getFollowUpVisualState } from '@/lib/lead-status';
import { parseLeadWorkflow } from '@/lib/lead-workflow';
import { computeLeadHealth, compareLeadHealthPriority } from '@/lib/lead-health';
import { isPipelineInJourney, type LeadJourney } from '@/lib/journey';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildStageMoveReadiness, type StageMoveReadiness } from '@/lib/queries/pipeline-stage-gating';
import { cn, formatDateTime } from '@/lib/utils';
import { navigateToLeadCommandCenter } from '@/lib/lead-command-center-navigation';
import { buildLeadCommercialReadiness, getPricingReadinessClasses, getPricingReadinessLabel } from '@/lib/catalog-pricing-model';
import { buildLeadDocumentRequirementState, type DocumentRequirementRule } from '@/lib/document-requirements';
import PipelineLaneSection from './PipelineLaneSection';
import { ToolbarActionButton, ToolbarField, ToolbarSearchInput, ToolbarSelect, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { ICON_CONTAINER_CLASS, getActionIcon, getStageAccent, getStageIcon, getStatusIcon } from '@/features/leads/command-center/ui-system';
import { PipelineAIStrip } from './PipelineAIStrip';
import { WorkspaceWorkflowShell } from '@/features/workspace/components/WorkspaceWorkflowShell';
import { buildTodayLayerState } from '@/features/workspace/today';
import { workspaceInsetClass, workspacePanelClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { workspaceModeToLeadJourney } from '@/features/workspace/mode';
import type { TodayFilterKey, TodayLayerState, WorkspaceMode } from '@/features/workspace/types';

type Stage = { id: string; name: string; sort_order: number; pipeline_id: string; is_closed: boolean; is_won: boolean; is_lost: boolean };
type Lead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  phone_secondary: string | null;
  website: string | null;
  social_handle: string | null;
  lead_type: 'buyer' | 'supplier';
  country: string | null;
  country_id: string | null;
  source_type: string | null;
  source_label: string | null;
  next_follow_up_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_contacted_at: string | null;
  stage_id: string | null;
  next_step_id: string | null;
  owner_user_id: string | null;
  trade_event_id: string | null;
  notes: string | null;
  pipeline_id: string | null;
  intro_sent: boolean;
  deal_value: number | null;
  deal_currency: string | null;
  phone_country_code: string | null;
  phone_secondary_country_code: string | null;
};
type Pipeline = { id: string; name: string; lead_type: 'buyer' | 'supplier' | 'both'; is_default: boolean };
type Option = { id: string; name: string };
// Include an optional `parent_id` field to allow hierarchical product categories.  A
// null or undefined parent_id designates a root category.
type ProductCategory = { id: string; name: string; is_active?: boolean; sort_order?: number; parent_id?: string | null };
type Product = { id: string; name: string; sku: string | null; category_id: string | null };
type Profile = { id: string; full_name: string | null; username: string | null };
type Country = { id: string; name: string; phone_code: string | null; market_id: string | null; iso2_code?: string | null };
type FollowUp = { id: string; lead_id: string | null; scheduled_at: string | null; status: string; created_at?: string | null; completed_at?: string | null; notes?: string | null };
type Activity = { id: string; lead_id: string; kind: string; message: string; occurred_at: string };
type StageHistory = { id: string; lead_id: string; from_stage_id: string | null; to_stage_id: string | null; changed_at: string; note: string | null };
type RfqLineItem = { id: string; rfq_id: string | null; product_id: string | null; product_variant_id?: string | null; catalog_price_id?: string | null; catalog_price_amount?: number | null; unit_price?: number | null; currency?: string | null; is_price_overridden?: boolean | null };
type QuoteLineItem = { id: string; quote_id: string | null; product_id: string | null; product_variant_id?: string | null; catalog_price_id?: string | null; catalog_price_amount?: number | null; unit_price?: number | null; currency?: string | null; is_price_overridden?: boolean | null };
type Rfq = { id: string; lead_id: string | null; status: string; currency: string | null; validity_date: string | null; created_at: string | null; updated_at: string | null; notes?: string | null; lineItems?: RfqLineItem[] };
type Quote = { id: string; lead_id: string; rfq_id: string | null; status: string; currency: string | null; created_at: string; updated_at: string; notes?: string | null; lineItems?: QuoteLineItem[] };
type ComplianceItem = { id: string; lead_id: string; compliance_item_id: string; status: string; created_at: string; submitted_at: string | null; approved_at: string | null };
type ComplianceDefinition = { id: string; code: string; description: string };
type LeadDocument = { id: string; related_entity?: string | null; related_id?: string | null; requirement_code: string | null; status: string | null; expires_at: string | null; uploaded_at?: string | null }
type Variant = { id: string; name: string; product_id: string };
type Price = { id: string; product_variant_id: string; market_id: string | null; price: number; currency: string; effective_from: string; effective_to: string | null };
type PricingRule = { id: string; product_id: string | null; product_variant_id: string | null; effective_from: string | null; effective_to: string | null; ex_factory_usd?: number | null; fob_usd?: number | null; ex_factory_inr?: number | null; fob_inr?: number | null; ex_factory_usd_per_case?: number | null; ex_factory_usd_per_unit?: number | null; fob_usd_per_case?: number | null; fob_usd_per_unit?: number | null; bulk_usd_per_kg?: number | null; pricing_type?: string | null };

// Extract the individual lead card into its own component to reduce the
// complexity of the main PipelineBoard render function.  This component
// encapsulates the drag‑and‑drop behaviour, click handling and UI layout
// for a single lead card.  Splitting the card out makes the board easier
// to maintain and paves the way for further modularisation.
type FollowUpVisualState = ReturnType<typeof getFollowUpVisualState>;

interface LeadCardProps {
  canManageLeads: boolean;
  readOnlyMessage?: string | null;
  lead: Lead;
  state: FollowUpVisualState;
  history: FollowUp[];
  nextStepMap: Map<string, string>;
  handleMove: (leadId: string, stageId: string) => void;
  handleAddNote: (leadId: string, note: string) => Promise<{ error?: string; success?: string } | undefined>;
  handleScheduleFollowUp: (leadId: string, scheduledAt: string) => Promise<{ error?: string; success?: string } | undefined>;
  isPending: boolean;
  commandCenterHref: string;
  setDraggedLeadId: (id: string | null) => void;
  setDragOverStageId: (id: string | null) => void;
  safeFormatDateTime: (value?: string | null) => string;
  health: string;
  ownerLabel: string;
  blockerCount: number;
  pricingLabel: string;
  pricingClassName: string;
  stageLabel: string;
  blockerSummary: string;
  openRfqCount: number;
  activeQuoteCount: number;
  agingLabel: string;
  moveReadiness: StageMoveReadiness;
  moveOptions: Array<{ stageId: string; label: string; disabled: boolean; sortOrder: number }>;
  countryCode?: string | null;
}

function openLeadCommandCenter(router: ReturnType<typeof useRouter>, href: string) {
  navigateToLeadCommandCenter(router, href);
}

function shouldIgnoreLeadNavigationTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, select, textarea, label'));
}

function handleLeadCommandCenterKeyDown(event: KeyboardEvent<HTMLElement>, router: ReturnType<typeof useRouter>, href: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openLeadCommandCenter(router, href);
}

function getHealthTone(health: string) {
  if (health.includes('at_risk')) return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200';
  if (health.includes('stalled') || health.includes('cold')) return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/45 dark:text-emerald-200';
}

function getMoveStatusLabel(readiness: StageMoveReadiness) {
  if (readiness.status === 'blocked') return 'Move blocked';
  if (readiness.status === 'at_risk') return 'Move guarded';
  return 'Move ready';
}

function getMoveTone(readiness: StageMoveReadiness) {
  if (readiness.status === 'blocked') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/45 dark:text-rose-200';
  if (readiness.status === 'at_risk') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/45 dark:text-emerald-200';
}

function getBoardMessageTone(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return 'info' as const;
  if (['updated', 'scheduled', 'added', 'saved'].some((token) => normalized.includes(token))) return 'success' as const;
  if (['blocked', 'cannot', 'missing', 'required', 'failed', 'error', 'not '].some((token) => normalized.includes(token))) return 'error' as const;
  return 'info' as const;
}

function getFollowUpStatus(state: FollowUpVisualState): 'ready' | 'progress' | 'blocked' | 'cold' | 'ontrack' {
  if (state === 'overdue') return 'blocked';
  if (state === 'today') return 'progress';
  if (state === 'unscheduled') return 'cold';
  if (state === 'upcoming') return 'ontrack';
  return 'ready';
}

function countryCodeToFlagEmoji(countryCode?: string | null) {
  if (!countryCode) return '◎';
  const normalized = countryCode.trim().slice(0, 2).toUpperCase();
  if (normalized.length !== 2) return '◎';
  return String.fromCodePoint(...normalized.split('').map((char) => 127397 + char.charCodeAt(0)));
}

function getCountryBadge(country?: string | null, countryCode?: string | null) {
  if (countryCode) return countryCodeToFlagEmoji(countryCode);
  if (!country) return '◎';
  const trimmed = country.trim();
  return trimmed.slice(0, 2).toUpperCase();
}
function shortenCardCopy(value: string, maxLength = 88) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function getQuickMoveLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes('qualified')) return 'Qualify';
  if (normalized.includes('document')) return 'Request docs';
  if (normalized.includes('sample')) return 'Send sample';
  if (normalized.includes('contract')) return 'Contract';
  if (normalized.includes('negoti')) return 'Negotiate';
  if (normalized.includes('approv')) return 'Approve';
  if (normalized.includes('won') || normalized.includes('complete')) return 'Complete';
  return 'Advance';
}

const LeadCard = ({
  canManageLeads,
  readOnlyMessage,
  lead,
  stageLabel,
  state,
  history,
  nextStepMap,
  handleMove,
  handleAddNote,
  handleScheduleFollowUp,
  isPending,
  commandCenterHref,
  setDraggedLeadId,
  setDragOverStageId,
  safeFormatDateTime,
  health,
  ownerLabel,
  blockerCount,
  pricingLabel,
  pricingClassName,
  blockerSummary,
  openRfqCount,
  activeQuoteCount,
  agingLabel,
  moveReadiness,
  moveOptions,
  countryCode,
}: LeadCardProps) => {
  const router = useRouter();
  const stageAccent = getStageAccent(stageLabel);
  const FollowUpIcon = getStatusIcon(getFollowUpStatus(state));
  const OpenIcon = getActionIcon('open');
  const followUpLabel = getFollowUpLabel(state);
  const nextActionSummary = shortenCardCopy(moveReadiness.blockers[0] ?? moveReadiness.warnings[0] ?? moveReadiness.summary, 96);
  const suggestedAction = moveReadiness.status === 'blocked'
    ? 'AI: Clear blockers before moving'
    : state === 'overdue'
      ? 'AI: Follow up today'
      : stageLabel.toLowerCase().includes('new')
        ? 'AI: Ready to qualify'
        : `AI: ${nextActionSummary}`;
  const currentSortOrder = moveOptions.find((option) => option.stageId === lead.stage_id)?.sortOrder ?? 0;
  const quickMoveOption = moveOptions
    .filter((option) => option.stageId !== lead.stage_id && !option.disabled)
    .sort((left, right) => {
      const leftDirectionPenalty = left.sortOrder > currentSortOrder ? 0 : 1000;
      const rightDirectionPenalty = right.sortOrder > currentSortOrder ? 0 : 1000;
      const leftDistance = Math.abs(left.sortOrder - currentSortOrder);
      const rightDistance = Math.abs(right.sortOrder - currentSortOrder);
      return (leftDirectionPenalty + leftDistance) - (rightDirectionPenalty + rightDistance);
    })[0];
  const quickMoveLabel = quickMoveOption ? getQuickMoveLabel(quickMoveOption.label) : 'Open lead';
  const metaSignals = [
    blockerCount ? `${blockerCount} blocked` : '',
    activeQuoteCount ? `${activeQuoteCount} quote${activeQuoteCount === 1 ? '' : 's'}` : '',
    openRfqCount ? `${openRfqCount} RFQ` : '',
    agingLabel !== '—' ? `Aging ${agingLabel}` : '',
  ].filter(Boolean);
  const secondaryMeta = [metaSignals[1], metaSignals[2]].filter(Boolean);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [noteValue, setNoteValue] = useState('');
  const [cardMessage, setCardMessage] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState(() => {
    const nextBusinessDay = new Date();
    nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    nextBusinessDay.setHours(10, 0, 0, 0);
    return nextBusinessDay.toISOString().slice(0, 16);
  });
  const [isCardPending, startCardTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const actionPending = isPending || isCardPending;
  const mutationDisabledReason = canManageLeads ? null : (readOnlyMessage ?? 'This pipeline is read-only for your current role.');

  const submitNote = () => {
    const note = noteValue.trim();
    if (!note || actionPending) return;
    startCardTransition(() => {
      void handleAddNote(lead.id, note).then((result) => {
        if (result?.error) {
          setCardMessage(result.error);
          return;
        }
        setCardMessage(result?.success ?? 'Note added.');
        setNoteValue('');
        setNoteOpen(false);
      });
    });
  };

  const submitFollowUp = () => {
    if (!scheduleValue || actionPending) return;
    const isoValue = new Date(scheduleValue).toISOString();
    startCardTransition(() => {
      void handleScheduleFollowUp(lead.id, isoValue).then((result) => {
        if (result?.error) {
          setCardMessage(result.error);
          return;
        }
        setCardMessage(result?.success ?? 'Follow-up scheduled.');
        setScheduleOpen(false);
      });
    });
  };

  return (
    <article
      role="link"
      tabIndex={0}
      className={cn(
        'snap-start cursor-pointer rounded-[1.25rem] border border-slate-200 bg-white/96 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition duration-150 hover:-translate-y-0.5 hover:bg-slate-50/70 hover:shadow-[0_18px_34px_rgba(15,23,42,0.09)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 dark:border-slate-700/70 dark:bg-slate-900/82 dark:hover:bg-slate-800/78 dark:shadow-[0_16px_34px_rgba(2,6,23,0.34)]',
        isDragging ? 'scale-[1.015] rotate-[0.35deg] opacity-80 shadow-[0_26px_52px_rgba(15,23,42,0.18)] dark:shadow-[0_28px_58px_rgba(2,6,23,0.52)]' : '',
      )}
      style={{ borderLeftWidth: '3px', borderLeftColor: stageAccent }}
      onClick={(event) => {
        if (shouldIgnoreLeadNavigationTarget(event.target)) return;
        openLeadCommandCenter(router, commandCenterHref);
      }}
      onKeyDown={(event) => handleLeadCommandCenterKeyDown(event, router, commandCenterHref)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <span title={lead.country ?? 'No country'} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {getCountryBadge(lead.country, countryCode)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-slate-950">{lead.company_name}</h3>
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', getMoveTone(moveReadiness))}>
                    {getMoveStatusLabel(moveReadiness)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[13px] text-slate-700 dark:text-slate-200">{lead.contact_name ?? 'No contact assigned'}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{lead.country ?? 'No country'} · {ownerLabel}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            draggable
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              setIsDragging(true);
              setDraggedLeadId(lead.id);
              setDragOverStageId(stageLabel);
              event.dataTransfer?.setData('text/plain', lead.id);
              if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => {
              setIsDragging(false);
              setDraggedLeadId(null);
              setDragOverStageId(null);
            }}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-white active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Drag card to another lane"
            aria-label={`Drag ${lead.company_name} to another lane`}
          >
            <span aria-hidden="true">↕</span>
          </button>
        </div>

        <div className={cn('p-2.5', workspaceInsetClass)}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Next action</p>
          <div className="mt-2 flex items-start gap-2">
            <span className={ICON_CONTAINER_CLASS}><FollowUpIcon className="h-4 w-4 text-neutral-600 dark:text-slate-300" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-5 text-slate-950 dark:text-slate-50">{nextActionSummary}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-600 dark:text-slate-300">{followUpLabel} · {lead.next_follow_up_at ? safeFormatDateTime(lead.next_follow_up_at) : 'No follow-up scheduled'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
          <span className={cn('inline-flex rounded-full border px-2.5 py-1 capitalize', getHealthTone(health))}>{health.replace(/_/g, ' ')}</span>
          <span className={`inline-flex rounded-full border px-2.5 py-1 ${pricingClassName}`}>{pricingLabel}</span>
          {metaSignals.slice(0, 1).map((item) => (
            <span key={item} className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{item}</span>
          ))}
        </div>

        <div className="rounded-[0.95rem] border border-amber-100 bg-amber-50/70 px-3 py-2 text-[12px] font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200">
          {shortenCardCopy(suggestedAction, 78)}
        </div>

        <div className="grid grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,0.72fr))] gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            disabled={actionPending}
            onClick={() => {
              if (quickMoveOption) {
                handleMove(lead.id, quickMoveOption.stageId);
                return;
              }
              openLeadCommandCenter(router, commandCenterHref);
            }}
            className={cn('inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold transition disabled:opacity-60', workspacePrimaryButtonClass)}
          >
            <span aria-hidden="true">→</span>
            {quickMoveLabel}
          </button>
          <button
            type="button"
            disabled={!canManageLeads}
            onClick={() => {
              if (!canManageLeads) return;
              setScheduleOpen((current) => !current);
              setNoteOpen(false);
              setMoveMenuOpen(false);
            }}
            title={mutationDisabledReason ?? 'Quick follow-up'}
            className={cn('inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border px-2 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', scheduleOpen ? 'border-slate-900 bg-slate-900 text-white dark:border-sky-400/20 dark:bg-sky-500 dark:text-slate-950' : `${workspaceSecondaryButtonClass} text-slate-700 dark:text-slate-200`)}
          >
            <span aria-hidden="true">📅</span>
            <span className="hidden sm:inline">Date</span>
          </button>
          <button
            type="button"
            disabled={!canManageLeads}
            onClick={() => {
              if (!canManageLeads) return;
              setNoteOpen((current) => !current);
              setScheduleOpen(false);
              setMoveMenuOpen(false);
            }}
            title={mutationDisabledReason ?? 'Quick note'}
            className={cn('inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border px-2 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', noteOpen ? 'border-slate-900 bg-slate-900 text-white dark:border-sky-400/20 dark:bg-sky-500 dark:text-slate-950' : `${workspaceSecondaryButtonClass} text-slate-700 dark:text-slate-200`)}
          >
            <span aria-hidden="true">💬</span>
            <span className="hidden sm:inline">Note</span>
          </button>
          <button
            type="button"
            onClick={() => openLeadCommandCenter(router, commandCenterHref)}
            className={cn('inline-flex min-h-10 items-center justify-center gap-1 rounded-xl px-2 text-[12px] font-semibold transition', workspaceSecondaryButtonClass)}
          >
            <span className={ICON_CONTAINER_CLASS}><OpenIcon className="h-3.5 w-3.5 text-neutral-600" /></span>
            <span className="hidden sm:inline">Open</span>
          </button>
          <button
            type="button"
            disabled={!canManageLeads}
            onClick={() => {
              if (!canManageLeads) return;
              setMoveMenuOpen((current) => !current);
              setScheduleOpen(false);
              setNoteOpen(false);
            }}
            title={mutationDisabledReason ?? 'Move lane options'}
            className={cn('inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border px-2 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', moveMenuOpen ? 'border-slate-900 bg-slate-900 text-white dark:border-sky-400/20 dark:bg-sky-500 dark:text-slate-950' : `${workspaceSecondaryButtonClass} text-slate-700 dark:text-slate-200`)}
          >
            More
          </button>
        </div>

        {moveMenuOpen ? (
          <div className={cn('p-2.5', workspaceInsetClass)} onClick={(event) => event.stopPropagation()}>
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Move lane</p>
            <div className="flex flex-wrap gap-2">
              {moveOptions.map((option) => (
                <button
                  key={option.stageId}
                  type="button"
                  disabled={actionPending || option.disabled || option.stageId === lead.stage_id}
                  onClick={() => {
                    handleMove(lead.id, option.stageId);
                    setMoveMenuOpen(false);
                  }}
                  className={cn(
                    'inline-flex min-h-9 items-center justify-center rounded-xl border px-3 py-2 text-[12px] font-semibold transition',
                    option.stageId === lead.stage_id
                      ? 'border-slate-200 bg-slate-200/70 text-slate-500 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      : option.disabled
                        ? 'border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
                  )}
                >
                  {option.label.replace(' — blocked', '')}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {scheduleOpen ? (
          <div className={cn('p-3', workspaceInsetClass)} onClick={(event) => event.stopPropagation()}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quick follow-up</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="datetime-local"
                value={scheduleValue}
                onChange={(event) => setScheduleValue(event.target.value)}
                className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              />
              <button
                type="button"
                disabled={actionPending}
                onClick={submitFollowUp}
                className={cn('inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60', workspacePrimaryButtonClass)}
              >
                <span aria-hidden="true">✓</span>
                Save
              </button>
            </div>
          </div>
        ) : null}

        {noteOpen ? (
          <div className={cn('p-3', workspaceInsetClass)} onClick={(event) => event.stopPropagation()}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quick note</p>
            <div className="mt-2 space-y-2">
              <textarea
                value={noteValue}
                onChange={(event) => setNoteValue(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault();
                    submitNote();
                  }
                }}
                rows={3}
                placeholder="Add note and press Cmd/Ctrl + Enter"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-300">Saved to lead notes and activity.</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNoteOpen(false);
                      setNoteValue('');
                    }}
                    className={cn('inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-sm font-semibold', workspaceSecondaryButtonClass)}
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionPending || !noteValue.trim()}
                    onClick={submitNote}
                    className={cn('inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60', workspacePrimaryButtonClass)}
                  >
                    <span aria-hidden="true">✓</span>
                    Save note
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!canManageLeads ? (
          <div className="rounded-[0.95rem] border border-dashed border-slate-300 bg-slate-50/90 px-3 py-2 text-[12px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
            Read-only pipeline. Open the lead command center to review details, but stage moves, quick notes, and follow-up scheduling stay disabled here for your role.
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400" onClick={(event) => event.stopPropagation()}>
          <span>{secondaryMeta[0] ?? (blockerCount ? blockerSummary : `${history.length} follow-up${history.length === 1 ? '' : 's'}`)}</span>
          <span>{cardMessage ?? (secondaryMeta[1] ?? '')}</span>
        </div>
      </div>
    </article>
  );
};

function normalizeLeadTypeParam(value: string | null | undefined): '' | LeadJourney {
  if (value === 'buyer' || value === 'buyers') return 'buyer';
  if (value === 'supplier' || value === 'suppliers') return 'supplier';
  return '';
}

export function PipelineBoard({
  currentUserId,
  canManageLeads,
  readOnlyMessage,
  isWorkspaceEmpty,
  isStageConfigurationEmpty,
  stages,
  leads,
  pipelines,
  nextSteps,
  tradeEvents,
  productCategories,
  products,
  markets,
  profiles,
  countries,
  leadMarkets,
  leadProductInterests,
  followUps,
  activities,
  stageHistory = [],
  rfqs = [],
  quotes = [],
  complianceItems = [],
  complianceDefinitions = [],
  documents = [],
  documentRequirementRules = [],
  variants = [],
  prices = [],
  pricingRules = [],
  initialLeadType = '',
  initialMode = 'all',
  initialTodayState,
}: {
  currentUserId: string;
  canManageLeads: boolean;
  readOnlyMessage?: string | null;
  isWorkspaceEmpty: boolean;
  isStageConfigurationEmpty: boolean;
  stages: Stage[];
  leads: Lead[];
  pipelines: Pipeline[];
  nextSteps: Option[];
  tradeEvents: Option[];
  productCategories: ProductCategory[];
  products: Product[];
  markets: Array<{ id: string; name: string }>;
  profiles: Profile[];
  countries: Country[];
  leadMarkets: Array<{ lead_id: string; market_id: string }>;
  leadProductInterests: Array<{ lead_id: string; product_id: string }>;
  followUps: FollowUp[];
  activities: Activity[];
  stageHistory?: StageHistory[];
  rfqs?: Rfq[];
  quotes?: Quote[];
  complianceItems?: ComplianceItem[];
  complianceDefinitions?: ComplianceDefinition[];
  documents?: LeadDocument[];
  documentRequirementRules?: DocumentRequirementRule[];
  variants?: Variant[];
  prices?: Price[];
  pricingRules?: PricingRule[];
  initialLeadType?: '' | LeadJourney;
  initialMode?: WorkspaceMode;
  initialTodayState?: TodayLayerState;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);
  const [todayFilter, setTodayFilter] = useState<TodayFilterKey>(initialTodayState?.activeFilter ?? 'all-open');
  const urlSyncReady = useRef(false);
  const [localLeads, setLocalLeads] = useState(leads);
  const [localLeadMarkets, setLocalLeadMarkets] = useState(leadMarkets);
  const [localLeadProductInterests, setLocalLeadProductInterests] = useState(leadProductInterests);
  const [localFollowUps, setLocalFollowUps] = useState(followUps);

  const activityMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of activities) {
      const current = map.get(item.lead_id);
      if (!current || item.occurred_at > current) map.set(item.lead_id, item.occurred_at);
    }
    return map;
  }, [activities]);

  const stageHistoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of stageHistory) {
      const current = map.get(item.lead_id);
      if (!current || item.changed_at > current) map.set(item.lead_id, item.changed_at);
    }
    return map;
  }, [stageHistory]);

  const stageMetaMap = useMemo(() => {
    const stageCounts = new Map<string, number>();
    for (const stage of stages) {
      stageCounts.set(stage.pipeline_id, (stageCounts.get(stage.pipeline_id) ?? 0) + 1);
    }
    return new Map(stages.map((stage) => [stage.id, { sortOrder: stage.sort_order, stageCount: stageCounts.get(stage.pipeline_id) ?? 0, isClosed: stage.is_closed }]));
  }, [stages]);

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [followUpFilter, setFollowUpFilter] = useState(() => searchParams.get('follow') ?? '');
  // ownerFilter controls whether we show only the current user's leads or all leads.  An empty
  // string means "all leads"; "mine" means only leads owned by the logged‑in user.  This
  // provides a quick way for users to focus on their own portfolio without scrolling through
  // everyone else's deals.
  // ownerFilter holds the user ID to filter leads by owner.  An empty string means
  // all owners.  This general form makes it easy to expand the dropdown in the
  // future, such as when co‑ownership or additional roles are introduced.
  const [ownerFilter, setOwnerFilter] = useState(() => searchParams.get('owner') ?? '');
  // productFilter and marketFilter allow users to narrow the board to leads interested in a
  // specific product category or market.  An empty string means "all".  We use the
  // leadProductsMap and leadMarketsMap computed below to determine membership.
  const [productFilter, setProductFilter] = useState(() => searchParams.get('category') ?? '');
  const [marketFilter, setMarketFilter] = useState(() => searchParams.get('market') ?? '');
  const [message, setMessage] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(() => ['follow','owner','category','market'].some((key) => Boolean(searchParams.get(key))));
  const [isPending, startTransition] = useTransition();
  const [leadTypeFilter, setLeadTypeFilter] = useState<'' | LeadJourney>(() => normalizeLeadTypeParam(searchParams.get('mode')) || initialLeadType);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  useEffect(() => {
    setLocalLeadMarkets(leadMarkets);
  }, [leadMarkets]);

  useEffect(() => {
    setLocalLeadProductInterests(leadProductInterests);
  }, [leadProductInterests]);

  useEffect(() => {
    setLocalFollowUps(followUps);
  }, [followUps]);
  // draggedLeadId holds the ID of the lead currently being dragged.  It is set when a
  // drag operation starts and cleared when the drag ends.  This enables HTML5 drag‑and‑drop
  // between stages without requiring a third‑party DnD library.  If no drag is active the
  // value is null.
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  // dragOverStageId tracks which stage the user is currently hovering over during a drag.  This
  // allows us to add a subtle highlight to the stage to indicate a valid drop target.  It is
  // cleared when the drag leaves or completes.
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);


  const ownerOptions = useMemo(() => {
    return profiles.map((profile) => ({
      id: profile.id,
      label: profile.full_name ?? profile.username ?? 'Unassigned',
    }));
  }, [profiles]);

  const ownerLabelMap = useMemo(() => new Map(ownerOptions.map((option) => [option.id, option.label])), [ownerOptions]);

  const countryById = useMemo(() => new Map(countries.map((country) => [country.id, country])), [countries]);
  const countryCodeByName = useMemo(() => new Map(countries.map((country) => [country.name.trim().toLowerCase(), country.iso2_code ?? null])), [countries]);


  const readinessByLeadId = useMemo(() => {
    return new Map(
      localLeads.map((lead) => {
        const linkedProductIds = new Set(localLeadProductInterests.filter((item) => item.lead_id === lead.id).map((item) => item.product_id));
        const linkedMarketIds = localLeadMarkets.filter((item) => item.lead_id === lead.id).map((item) => item.market_id);
        const linkedLeadDocuments = documents.filter((item) => item.related_entity === 'lead' && item.related_id === lead.id);
        const readiness = buildLeadCommercialReadiness({
          linkedProducts: products.filter((product) => linkedProductIds.has(product.id)).map((product) => ({ id: product.id })),
          variants,
          prices,
          rules: pricingRules,
          rfqLineItems: rfqs.filter((rfq) => rfq.lead_id === lead.id).flatMap((rfq) => rfq.lineItems ?? []),
          quoteLineItems: quotes.filter((quote) => quote.lead_id === lead.id).flatMap((quote) => quote.lineItems ?? []),
          complianceStatuses: complianceItems.filter((item) => item.lead_id === lead.id).map((item) => item.status),
        });
        const documentState = buildLeadDocumentRequirementState({
          rules: documentRequirementRules,
          leadType: lead.lead_type,
          marketIds: linkedMarketIds,
          productIds: Array.from(linkedProductIds),
          documents: linkedLeadDocuments,
          scope: 'quote_send',
        });
        return [lead.id, {
          ...readiness,
          blockerCount: readiness.blockerCount + documentState.blockerCount,
          blockerReasons: [...documentState.blockerReasons, ...readiness.blockerReasons],
        }] as const;
      }),
    );
  }, [localLeads, localLeadMarkets, localLeadProductInterests, products, documents, documentRequirementRules, variants, prices, pricingRules, rfqs, quotes, complianceItems]);

  const getLeadBlockerCount = (leadId: string) => readinessByLeadId.get(leadId)?.blockerCount ?? 0;
  const getLeadBlockerSummary = (leadId: string) => readinessByLeadId.get(leadId)?.blockerReasons[0] ?? 'No active blockers';
  const getLeadPricingReadiness = (leadId: string) => readinessByLeadId.get(leadId)?.pricingReadiness ?? 'missing';

  const getLeadOpenRfqCount = (leadId: string) => rfqs.filter((item) => item.lead_id === leadId && !['won', 'lost', 'closed', 'cancelled'].includes(item.status)).length;

  const getLeadActiveQuoteCount = (leadId: string) => quotes.filter((item) => item.lead_id === leadId && !['won', 'lost', 'closed', 'cancelled'].includes(item.status)).length;

  const stageById = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);

  const getStageMoveReadinessForLead = (lead: Lead, targetStage: Stage) => {
    const workflow = parseLeadWorkflow(lead.notes).workflow;
    const currentStage = lead.stage_id ? stageById.get(lead.stage_id) ?? null : null;
    const complianceStatuses = complianceItems.filter((item) => item.lead_id === lead.id).map((item) => String(item.status ?? '').toLowerCase());
    const overdueFollowUpCount = localFollowUps.filter((item) => {
      if (item.lead_id !== lead.id || !item.scheduled_at) return false;
      if (String(item.status ?? '').toLowerCase() === 'completed') return false;
      return new Date(item.scheduled_at).getTime() < Date.now();
    }).length;
    const quoteStatuses = quotes.filter((item) => item.lead_id === lead.id).map((item) => String(item.status ?? '').toLowerCase());

    return buildStageMoveReadiness({
      currentStageName: currentStage?.name,
      currentStageOrder: currentStage?.sort_order ?? null,
      targetStageName: targetStage.name,
      targetStageOrder: targetStage.sort_order ?? null,
      targetStageIsClosed: targetStage.is_closed,
      targetStageIsWon: targetStage.is_won,
      targetStageIsLost: targetStage.is_lost,
      qualificationStatus: workflow.qualificationStatus,
      mappingComplete: workflow.productMappingStatus === 'ready' && workflow.mappedProductIds.length > 0 && workflow.mappedMarketIds.length > 0,
      complianceGate: complianceStatuses.some((status) => ['blocked', 'missing', 'rejected', 'overdue', 'pending'].includes(status)) ? 'BLOCKED' : 'CLEAR',
      overdueFollowUpCount,
      pricingReadiness: getLeadPricingReadiness(lead.id),
      rfqCount: rfqs.filter((item) => item.lead_id === lead.id).length,
      quoteCount: quoteStatuses.length,
      acceptedQuoteCount: quoteStatuses.filter((status) => ['accepted', 'approved'].includes(status)).length,
      contractCount: 0,
    });
  };

  const getLeadAgingLabel = (lead: Lead) => {
    const source = lead.last_contacted_at ?? lead.updated_at ?? lead.created_at;
    if (!source) return 'Unknown';
    const timestamp = new Date(source).getTime();
    if (Number.isNaN(timestamp)) return 'Unknown';
    const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
    if (days <= 1) return 'Fresh';
    if (days <= 3) return `${days}d`;
    if (days <= 7) return '1w';
    return `${days}d stale`;
  };


  useEffect(() => {
    const nextLeadType = normalizeLeadTypeParam(searchParams.get('mode')) || initialLeadType;
    setWorkspaceMode(nextLeadType === 'buyer' ? 'buyers' : nextLeadType === 'supplier' ? 'suppliers' : 'all');
    setSearch(searchParams.get('q') ?? '');
    setFollowUpFilter(searchParams.get('follow') ?? '');
    setOwnerFilter(searchParams.get('owner') ?? '');
    setProductFilter(searchParams.get('category') ?? '');
    setMarketFilter(searchParams.get('market') ?? '');
    setLeadTypeFilter(nextLeadType);
    setFiltersOpen(['follow', 'owner', 'category', 'market'].some((key) => Boolean(searchParams.get(key))));
    urlSyncReady.current = true;
  }, [searchParams, initialLeadType]);

  useEffect(() => {
    if (!urlSyncReady.current) return;
    const params = new URLSearchParams(searchParams.toString());
    const mappings: Array<[string, string]> = [
      ['q', search],
      ['follow', followUpFilter],
      ['owner', ownerFilter],
      ['category', productFilter],
      ['market', marketFilter],
      ['mode', workspaceMode === 'all' ? '' : workspaceMode],
    ];
    mappings.forEach(([key, value]) => {
      const trimmed = value.trim();
      if (trimmed) params.set(key, trimmed);
      else params.delete(key);
    });
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [pathname, router, search, followUpFilter, ownerFilter, productFilter, marketFilter, searchParams, workspaceMode]);

  const buildPipelineReturnHref = () => {
    const currentQuery = searchParams.toString();
    return currentQuery ? `${pathname}?${currentQuery}` : pathname;
  };

  const buildLeadCommandCenterHref = (leadId: string) => {
    const params = new URLSearchParams();
    if (workspaceMode !== 'all') params.set('mode', workspaceMode);
    const returnTo = buildPipelineReturnHref();
    if (returnTo.startsWith('/pipeline')) params.set('returnTo', returnTo);
    const query = params.toString();
    return query ? `/leads/${leadId}?${query}` : `/leads/${leadId}`;
  };

  const leadMarketsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of localLeadMarkets) map.set(item.lead_id, [...(map.get(item.lead_id) ?? []), item.market_id]);
    return map;
  }, [localLeadMarkets]);

  const leadProductsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of localLeadProductInterests) map.set(item.lead_id, [...(map.get(item.lead_id) ?? []), item.product_id]);
    return map;
  }, [localLeadProductInterests]);

  const leadCategoryMap = useMemo(() => {
    const productCategoryMap = new Map(products.map((product) => [product.id, product.category_id]));
    const map = new Map<string, string[]>();
    for (const item of localLeadProductInterests) {
      const categoryId = productCategoryMap.get(item.product_id);
      if (!categoryId) continue;
      map.set(item.lead_id, [...(map.get(item.lead_id) ?? []), categoryId]);
    }
    return map;
  }, [localLeadProductInterests, products]);

  const leadFollowUpsMap = useMemo(() => {
    const map = new Map<string, FollowUp[]>();
    for (const item of localFollowUps) {
      if (!item.lead_id) continue;
      map.set(item.lead_id, [...(map.get(item.lead_id) ?? []), item]);
    }
    return map;
  }, [localFollowUps]);

  const leadActivitiesMap = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const item of activities) {
      map.set(item.lead_id, [...(map.get(item.lead_id) ?? []), item]);
    }
    return map;
  }, [activities]);

  const nextStepMap = useMemo(() => new Map(nextSteps.map((item) => [item.id, item.name])), [nextSteps]);
  // Group stages by name across all pipelines to avoid duplicate lanes when pipelines
  // share stage names.  Each group aggregates the stages that share the same
  // name, sorts by the lowest sort_order among the group, and carries a
  // representative stage record for closed/won/lost flags.  When moving
  // leads we pick the stage whose pipeline_id matches the lead’s pipeline.
  const orderedStageGroups = useMemo(() => {
    const map = new Map<string, { name: string; stages: Stage[]; sort_order: number; ref: Stage }>();
    for (const stage of stages) {
      const existing = map.get(stage.name);
      if (existing) {
        existing.stages.push(stage);
        if (stage.sort_order < existing.sort_order) {
          existing.sort_order = stage.sort_order;
          existing.ref = stage;
        }
      } else {
        map.set(stage.name, { name: stage.name, stages: [stage], sort_order: stage.sort_order, ref: stage });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.sort_order - b.sort_order);
  }, [stages]);

  // Filter stage groups by the selected lead type.  When leadTypeFilter is empty,
  // return all stage groups.  Otherwise, return only groups that contain at least one
  // stage whose pipeline_id belongs to a pipeline of the selected type.  This
  // prevents buyer and supplier lanes from being mixed when filtering.
  const filteredStageGroups = useMemo(() => {
    if (!leadTypeFilter) return orderedStageGroups;
    const allowedPipelineIds = pipelines.filter((p) => isPipelineInJourney(p.lead_type, leadTypeFilter)).map((p) => p.id);
    return orderedStageGroups.filter((group) => group.stages.some((stage) => allowedPipelineIds.includes(stage.pipeline_id)));
  }, [orderedStageGroups, pipelines, leadTypeFilter]);
  const filteredLeads = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return localLeads.filter((lead) => {
      const followState = getFollowUpVisualState(lead.next_follow_up_at);
      const matchesSearch = !needle || [lead.company_name, lead.contact_name ?? '', lead.country ?? ''].some((item) => item.toLowerCase().includes(needle));
      const matchesFollowUp = !followUpFilter || followState === followUpFilter;
      const matchesOwner = !ownerFilter || lead.owner_user_id === ownerFilter;
      const matchesProduct = !productFilter || (leadCategoryMap.get(lead.id)?.includes(productFilter) ?? false);
      const matchesMarket = !marketFilter || (leadMarketsMap.get(lead.id)?.includes(marketFilter) ?? false);
      const matchesLeadType = !leadTypeFilter || lead.lead_type === leadTypeFilter;
      return matchesSearch && matchesFollowUp && matchesOwner && matchesProduct && matchesMarket && matchesLeadType;
    });
  }, [localLeads, search, followUpFilter, ownerFilter, productFilter, marketFilter, leadTypeFilter, leadCategoryMap, leadMarketsMap]);


  const safeFormatDateTime = (value?: string | null) => {
    if (!value) return '—';
    return formatDateTime(value);
  };

  const handleMove = (leadId: string, stageId: string) => {
    const lead = localLeads.find((item) => item.id === leadId);
    const targetStage = stageById.get(stageId);
    if (!lead || !targetStage) return;

    const readiness = getStageMoveReadinessForLead(lead, targetStage);
    if (!readiness.canMove) {
      setMessage(readiness.blockers[0] ?? readiness.summary);
      return;
    }

    const formData = new FormData();
    formData.append('lead_id', leadId);
    formData.append('stage_id', stageId);
    startTransition(() => {
      void moveLeadToStage(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? '');
        if (!result?.error) {
          const nextLead = result?.lead;
          setLocalLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, stage_id: nextLead?.stage_id ?? stageId, updated_at: nextLead?.updated_at ?? new Date().toISOString() } : lead)));
        }
      });
    });
  };

  const handleAddNote = (leadId: string, note: string) => {
    const formData = new FormData();
    formData.append('lead_id', leadId);
    formData.append('note', note);
    return new Promise<{ error?: string; success?: string } | undefined>((resolve) => {
      startTransition(() => {
        void addLeadNote(undefined, formData).then((result) => {
          setMessage(result?.error ?? result?.success ?? '');
          if (!result?.error) {
            setLocalLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, updated_at: new Date().toISOString() } : lead)));
          }
          resolve(result);
        });
      });
    });
  };

  const handleScheduleFollowUp = (leadId: string, scheduledAt: string) => {
    const formData = new FormData();
    formData.append('lead_id', leadId);
    formData.append('scheduled_at', scheduledAt);
    return new Promise<{ error?: string; success?: string } | undefined>((resolve) => {
      startTransition(() => {
        void scheduleLeadFollowUp(undefined, formData).then((result) => {
          setMessage(result?.error ?? result?.success ?? '');
          if (!result?.error) {
            const createdAt = new Date().toISOString();
            setLocalLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, next_follow_up_at: scheduledAt, updated_at: createdAt } : lead)));
            setLocalFollowUps((current) => [{ id: `local-${leadId}-${createdAt}`, lead_id: leadId, scheduled_at: scheduledAt, status: 'scheduled', created_at: createdAt }, ...current]);
          }
          resolve(result);
        });
      });
    });
  };


  const activeFilterCount = [followUpFilter, ownerFilter, productFilter, marketFilter].filter(Boolean).length;
  const overdueCount = filteredLeads.filter((lead) => getFollowUpVisualState(lead.next_follow_up_at) === 'overdue').length;
  const todayCount = filteredLeads.filter((lead) => getFollowUpVisualState(lead.next_follow_up_at) === 'today').length;
  const atRiskCount = filteredLeads.filter((lead) => {
    const stageMeta = lead.stage_id ? stageMetaMap.get(lead.stage_id) : null;
    return computeLeadHealth({
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      last_contacted_at: lead.last_contacted_at,
      next_follow_up_at: lead.next_follow_up_at,
      lastActivityAt: activityMap.get(lead.id),
      lastStageChangeAt: stageHistoryMap.get(lead.id),
      stageSortOrder: stageMeta?.sortOrder ?? null,
      stageCount: stageMeta?.stageCount ?? null,
      isClosedStage: stageMeta?.isClosed ?? null,
    }).includes('at_risk');
  }).length;

  const renderLane = (group: (typeof filteredStageGroups)[number], stacked = false) => {
    const stageLeads = filteredLeads.filter((lead) => group.stages.some((stage) => stage.id === lead.stage_id)).sort((left, right) => {
      const leftStageMeta = left.stage_id ? stageMetaMap.get(left.stage_id) : null;
      const rightStageMeta = right.stage_id ? stageMetaMap.get(right.stage_id) : null;
      const leftHealth = computeLeadHealth({ created_at: left.created_at, updated_at: left.updated_at, last_contacted_at: left.last_contacted_at, next_follow_up_at: left.next_follow_up_at, lastActivityAt: activityMap.get(left.id), lastStageChangeAt: stageHistoryMap.get(left.id), stageSortOrder: leftStageMeta?.sortOrder ?? null, stageCount: leftStageMeta?.stageCount ?? null, isClosedStage: leftStageMeta?.isClosed ?? null });
      const rightHealth = computeLeadHealth({ created_at: right.created_at, updated_at: right.updated_at, last_contacted_at: right.last_contacted_at, next_follow_up_at: right.next_follow_up_at, lastActivityAt: activityMap.get(right.id), lastStageChangeAt: stageHistoryMap.get(right.id), stageSortOrder: rightStageMeta?.sortOrder ?? null, stageCount: rightStageMeta?.stageCount ?? null, isClosedStage: rightStageMeta?.isClosed ?? null });
      const healthComparison = compareLeadHealthPriority(leftHealth, rightHealth);
      if (healthComparison !== 0) return healthComparison;
      return (left.next_follow_up_at ?? '9999').localeCompare(right.next_follow_up_at ?? '9999');
    });
    const overdueLaneCount = stageLeads.filter((lead) => getFollowUpVisualState(lead.next_follow_up_at) === 'overdue').length;
    const dueTodayCount = stageLeads.filter((lead) => getFollowUpVisualState(lead.next_follow_up_at) === 'today').length;
    const atRiskLaneCount = stageLeads.filter((lead) => {
      const stageMeta = lead.stage_id ? stageMetaMap.get(lead.stage_id) : null;
      return computeLeadHealth({
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        last_contacted_at: lead.last_contacted_at,
        next_follow_up_at: lead.next_follow_up_at,
        lastActivityAt: activityMap.get(lead.id),
        lastStageChangeAt: stageHistoryMap.get(lead.id),
        stageSortOrder: stageMeta?.sortOrder ?? null,
        stageCount: stageMeta?.stageCount ?? null,
        isClosedStage: stageMeta?.isClosed ?? null,
      }).includes('at_risk');
    }).length;
    const blockedCount = stageLeads.reduce((sum, lead) => sum + (getLeadBlockerCount(lead.id) ? 1 : 0), 0);

    return (
      <PipelineLaneSection
        key={`${group.name}-${stacked ? 'stacked' : 'board'}`}
        title={group.name}
        subtitle={group.ref.is_closed || group.ref.is_won || group.ref.is_lost ? 'Closed or completed lane' : 'Active working lane'}
        count={stageLeads.length}
        overdueCount={overdueLaneCount}
        dueTodayCount={dueTodayCount}
        atRiskCount={atRiskLaneCount}
        blockedCount={blockedCount}
        isClosed={group.ref.is_closed || group.ref.is_won || group.ref.is_lost}
        isActiveDropTarget={!stacked && dragOverStageId === group.name}
        stacked={stacked}
        onDragOver={stacked || !canManageLeads ? undefined : (event) => {
          event.preventDefault();
        }}
        onDragEnter={stacked || !canManageLeads ? undefined : () => {
          if (draggedLeadId) setDragOverStageId(group.name);
        }}
        onDragLeave={stacked || !canManageLeads ? undefined : () => {
          if (dragOverStageId === group.name) setDragOverStageId(null);
        }}
        onDrop={stacked || !canManageLeads ? undefined : () => {
          if (draggedLeadId) {
            const draggedLead = localLeads.find((lead) => lead.id === draggedLeadId);
            if (draggedLead) {
              const targetStage = group.stages.find((stage) => stage.pipeline_id === draggedLead.pipeline_id) ?? group.stages[0];
              if (draggedLead.stage_id !== targetStage.id) {
                handleMove(draggedLeadId, targetStage.id);
              }
            }
            setDraggedLeadId(null);
            setDragOverStageId(null);
          }
        }}
      >
        {stageLeads.map((lead) => {
          const isTodayMatch = todayFilter === 'all-open' || todayLeadIdSet.has(lead.id);
          const state = getFollowUpVisualState(lead.next_follow_up_at);
          const history = leadFollowUpsMap.get(lead.id) ?? [];
          return (
            <div key={lead.id} className={isTodayMatch ? '' : 'opacity-45 transition-opacity'}>
            <LeadCard
              key={lead.id}
              canManageLeads={canManageLeads}
              readOnlyMessage={readOnlyMessage}
              lead={lead}
              state={state}
              history={history}
              nextStepMap={nextStepMap}
              stageLabel={group.name}
              handleMove={handleMove}
              handleAddNote={handleAddNote}
              handleScheduleFollowUp={handleScheduleFollowUp}
              isPending={isPending}
              commandCenterHref={buildLeadCommandCenterHref(lead.id)}
              setDraggedLeadId={setDraggedLeadId}
              setDragOverStageId={setDragOverStageId}
              safeFormatDateTime={safeFormatDateTime}
              health={computeLeadHealth({ created_at: lead.created_at, updated_at: lead.updated_at, last_contacted_at: lead.last_contacted_at, next_follow_up_at: lead.next_follow_up_at, lastActivityAt: activityMap.get(lead.id), lastStageChangeAt: stageHistoryMap.get(lead.id), stageSortOrder: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.sortOrder ?? null : null, stageCount: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.stageCount ?? null : null, isClosedStage: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.isClosed ?? null : null })}
              ownerLabel={lead.owner_user_id ? ownerLabelMap.get(lead.owner_user_id) ?? 'Unassigned' : 'Unassigned'}
              blockerCount={getLeadBlockerCount(lead.id)}
              pricingLabel={getPricingReadinessLabel(getLeadPricingReadiness(lead.id))}
              pricingClassName={getPricingReadinessClasses(getLeadPricingReadiness(lead.id))}
              blockerSummary={getLeadBlockerSummary(lead.id)}
              openRfqCount={getLeadOpenRfqCount(lead.id)}
              activeQuoteCount={getLeadActiveQuoteCount(lead.id)}
              agingLabel={getLeadAgingLabel(lead)}
              moveReadiness={(() => {
                const currentStage = lead.stage_id ? stageById.get(lead.stage_id) : null;
                return currentStage
                  ? getStageMoveReadinessForLead(lead, currentStage)
                  : { status: 'ready', summary: 'Stage movement is ready under the current governed workflow.', blockers: [], warnings: [], canMove: true };
              })()}
              countryCode={lead.country_id ? (countryById.get(lead.country_id)?.iso2_code ?? null) : (lead.country ? (countryCodeByName.get(lead.country.trim().toLowerCase()) ?? null) : null)}
              moveOptions={filteredStageGroups
                .map((stageGroup) => {
                  const targetStage = stageGroup.stages.find((stage) => stage.pipeline_id === lead.pipeline_id);
                  if (!targetStage) return null;
                  const readiness = getStageMoveReadinessForLead(lead, targetStage);
                  return {
                    stageId: targetStage.id,
                    label: readiness.canMove || targetStage.id === lead.stage_id ? stageGroup.name : `${stageGroup.name} — blocked`,
                    disabled: !readiness.canMove && targetStage.id !== lead.stage_id,
                    sortOrder: targetStage.sort_order,
                  };
                })
.filter((value): value is { stageId: string; label: string; disabled: boolean; sortOrder: number } => Boolean(value))}
            />
            </div>
          );
        })}
        {!stageLeads.length ? <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">{stacked ? 'No leads match this stage right now.' : 'Drop a lead here or adjust filters to repopulate this stage.'}</div> : null}
      </PipelineLaneSection>
    );
  };

  const todayState = useMemo(() => buildTodayLayerState({
    mode: workspaceMode,
    activeFilter: todayFilter,
    nowIso: new Date().toISOString(),
    leads: localLeads,
    activities,
    complianceItems,
  }), [activities, complianceItems, localLeads, todayFilter, workspaceMode]);
  const todayLeadIdSet = useMemo(() => new Set(todayState.filteredLeadIds), [todayState.filteredLeadIds]);

  const laneSummary = filteredStageGroups.map((group) => {
    const stageLeads = filteredLeads.filter((lead) => group.stages.some((stage) => stage.id === lead.stage_id));
    return {
      key: group.name,
      label: group.name,
      count: stageLeads.length,
      overdue: stageLeads.filter((lead) => getFollowUpVisualState(lead.next_follow_up_at) === 'overdue').length,
      blocked: stageLeads.reduce((sum, lead) => sum + (getLeadBlockerCount(lead.id) ? 1 : 0), 0),
      accent: getStageAccent(group.name),
    };
  });


  const aiMessage = message || (overdueCount > 0
    ? `${overdueCount} lead${overdueCount === 1 ? '' : 's'} need follow-up attention today`
    : todayCount > 0
      ? `${todayCount} lead${todayCount === 1 ? '' : 's'} can be progressed today`
      : `${filteredLeads.length} leads are in view and ready for stage review`);

  const resetFilters = () => {
    setFollowUpFilter('');
    setOwnerFilter('');
    setProductFilter('');
    setMarketFilter('');
    setLeadTypeFilter(initialLeadType);
    setMessage('');
  };

  const showStageConfigurationState = isStageConfigurationEmpty || filteredStageGroups.length === 0;
  const showWorkspaceEmptyState = !showStageConfigurationState && isWorkspaceEmpty && !search && activeFilterCount === 0;
  const showPipelineBoard = !showStageConfigurationState && !showWorkspaceEmptyState;

  return (
    <div className="space-y-4">
      <WorkspaceWorkflowShell
        title="Pipeline"
        description="Keep stage movement visible, actionable, and easy to scan across the full workspace."
        mode={workspaceMode}
        onModeChange={(nextMode) => {
          setWorkspaceMode(nextMode);
          setLeadTypeFilter(workspaceModeToLeadJourney(nextMode));
        }}
        todayState={todayState}
        onTodayFilterChange={setTodayFilter}
        showAllOpen={false}
        todayCompact
        showHeader={false}
        utilities={(
          <>
            <div className="min-w-0 sm:min-w-[18rem] lg:min-w-[24rem]">
              <ToolbarSearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search company, contact, country"
              />
            </div>
            <ToolbarActionButton type="button" onClick={() => setFiltersOpen((current) => !current)} className="min-h-11 rounded-[1rem] px-4 py-2">
              {filtersOpen ? 'Hide filters' : activeFilterCount ? `Filters (${activeFilterCount})` : 'Filters'}
            </ToolbarActionButton>
          </>
        )}
      />
      <section className="sticky top-[73px] z-20 space-y-4">
        <PipelineAIStrip message={aiMessage} />
        {readOnlyMessage ? (
          <StateMessage
            title="Read-only pipeline"
            tone="warning"
            description={`${readOnlyMessage} Stage moves, quick notes, and follow-up scheduling stay disabled here. Open a lead to review details or ask an admin to adjust workspace roles.`}
          />
        ) : null}
        {message ? (
          <StateMessage
            title={message}
            tone={getBoardMessageTone(message) === 'success' ? 'success' : getBoardMessageTone(message) === 'error' ? 'danger' : 'neutral'}
            description={getBoardMessageTone(message) === 'error'
              ? 'The board stayed on the last confirmed state. Clear the blocker in the lead record, then try the move again.'
              : 'The pipeline board reflects the latest confirmed change.'}
          />
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Pipeline summary metrics">
        <ToolbarStat label="Visible leads" value={String(filteredLeads.length)} tone="default" />
        <ToolbarStat label="Move blocked" value={String(filteredLeads.reduce((sum, lead) => sum + (getLeadBlockerCount(lead.id) ? 1 : 0), 0))} tone={filteredLeads.some((lead) => getLeadBlockerCount(lead.id) > 0) ? 'danger' : 'default'} />
        <ToolbarStat label="Overdue follow-ups" value={String(overdueCount)} tone={overdueCount ? 'danger' : 'default'} />
        <ToolbarStat label="Due today" value={String(todayCount)} tone={todayCount ? 'warning' : 'default'} />
        <ToolbarStat label="At risk" value={String(atRiskCount)} tone={atRiskCount ? 'warning' : 'default'} />
      </section>

      {showStageConfigurationState ? (
        <WorkspaceState
          eyebrow="Pipeline setup"
          title={isStageConfigurationEmpty ? 'No pipeline stages configured yet' : 'No stage lanes match this mode yet'}
          description={
            isStageConfigurationEmpty
              ? 'This workspace can load leads, but the /pipeline board cannot render lanes until at least one pipeline and one stage exist in settings.'
              : 'The current mode does not have any configured lanes to render. Switch journey mode or review the pipeline stage setup.'
          }
          primaryActionHref={canManageLeads ? '/settings/lists' : PRODUCT_ROUTES.app.leads}
          primaryActionLabel={canManageLeads ? 'Review pipeline settings' : 'Open leads'}
          secondaryActionHref={!canManageLeads ? '/admin/organization' : undefined}
          secondaryActionLabel={!canManageLeads ? 'Review workspace roles' : undefined}
        />
      ) : null}

      {showWorkspaceEmptyState ? (
        <WorkspaceState
          eyebrow="Pipeline board"
          title="No leads in this pipeline yet"
          description={canManageLeads ? 'Your stages are configured, but there are no leads to place on the board yet. Add the first lead from the leads workspace and return here for stage execution.' : 'This workspace has no pipeline cards yet and your current role is read-only. Ask a workspace admin to add the first lead or grant edit access.'}
          primaryActionHref={PRODUCT_ROUTES.app.leads}
          primaryActionLabel={canManageLeads ? 'Open leads workspace' : 'Open leads'}
          secondaryActionHref={!canManageLeads ? '/admin/organization' : PRODUCT_ROUTES.app.dashboard}
          secondaryActionLabel={!canManageLeads ? 'Review workspace roles' : 'Back to dashboard'}
        />
      ) : null}

      {showPipelineBoard && filtersOpen ? (
        <section className={cn('p-4 sm:p-5', workspacePanelClass)}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
            <ToolbarField label="Follow-up">
              <ToolbarSelect value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)}>
                <option value="">All follow-ups</option>
                <option value="overdue">Overdue</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="unscheduled">Unscheduled</option>
              </ToolbarSelect>
            </ToolbarField>
            <ToolbarField label="Owner">
              <ToolbarSelect value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                <option value="">All owners</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.full_name ?? profile.username ?? 'Unassigned'}</option>
                ))}
              </ToolbarSelect>
            </ToolbarField>
            <ToolbarField label="Category">
              <ToolbarSelect value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                <option value="">All categories</option>
                {productCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </ToolbarSelect>
            </ToolbarField>
            <ToolbarField label="Market">
              <ToolbarSelect value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)}>
                <option value="">All markets</option>
                {markets.map((market) => (
                  <option key={market.id} value={market.id}>{market.name}</option>
                ))}
              </ToolbarSelect>
            </ToolbarField>
            <div className="flex gap-2 xl:justify-end">
              {activeFilterCount ? (
                <ToolbarActionButton type="button" onClick={resetFilters}>
                  Reset filters
                </ToolbarActionButton>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {showPipelineBoard ? (
        <>
          <section className="grid gap-3 lg:grid-cols-5">
            {laneSummary.map((item) => (
              <div key={item.key} className={cn('p-4', workspacePanelClass)}>
                <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: item.accent }} />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50">{item.label}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                      <span className="text-blue-500">{item.overdue} overdue</span>
                      <span className={item.blocked ? 'text-rose-500' : 'text-slate-400'}>{item.blocked} blocked</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">{item.count}</div>
                </div>
              </div>
            ))}
          </section>

          <div className="space-y-3 md:hidden" aria-label="Pipeline stage lists">
            {filteredStageGroups.map((group) => renderLane(group, true))}
          </div>

          <div className="hidden gap-4 overflow-x-auto overscroll-x-contain pb-3 pr-1 [scrollbar-width:thin] md:flex" aria-label="Pipeline stages">
            {filteredStageGroups.map((group) => renderLane(group))}
          </div>

          {!filteredLeads.length ? <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-soft dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">No pipeline cards match the current filters. Reset filters or switch journeys to restore your working board.</div> : null}
        </>
      ) : null}
    </div>
  );
}
