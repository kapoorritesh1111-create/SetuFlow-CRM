'use client';
import { InlineLeadWorkspaceProps, getLeadInitials, InlineQuoteBuilder } from '@/features/leads/components/workspace/leads-workspace-implementation';
// SF-18-007C: LeadsCommandCenter — extracted command center components  
// Extracted from leads-workspace-implementation.tsx to reduce file size.


import { GuruAvatar } from '@/components/ui/guru-avatar';
import { setSetuGuruWorkspaceContext } from '@/lib/setu-guru/page-context';

import Link from 'next/link';
import * as React from 'react';
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type SVGProps } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LeadDrawer } from '@/features/leads/components/lead-drawer';
import LeadsFiltersPanel from '@/features/leads/components/LeadsFiltersPanel';
import { SavedViewsBar, ToolbarActionButton, ToolbarSearchInput, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { NoticeToast } from '@/components/ui/notice-toast';
import { batchScheduleLeadFollowUps, batchMoveLeadsToStage, batchDeleteLeads, deleteLead, scheduleLeadFollowUp, completeLeadFollowUp, openOrCreateLeadQuoteDraft, saveLeadQuoteDraftPreview, recordLeadQuoteApprovalRequest, approveLeadQuoteAdjustment, rejectLeadQuoteAdjustment } from '@/features/leads/server/actions';
import { markQuoteAsDirectOrder } from '@/features/quotes/server/actions';
import { getFollowUpBadgeClasses, getFollowUpLabel, getFollowUpVisualState } from '@/lib/lead-status';
import { computeLeadHealth, compareLeadHealthPriority } from '@/lib/lead-health';
import { JOURNEY_COPY, isPipelineInJourney, type LeadJourney } from '@/lib/journey';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { formatDateTime } from '@/lib/utils';
import { navigateToLeadCommandCenter } from '@/lib/lead-command-center-navigation';
import { buildLeadCommercialReadiness, getPricingReadinessLabel, type LeadCommercialReadiness } from '@/lib/catalog-pricing-model';
import { buildLeadDocumentRequirementState, type DocumentRequirementRule, type LeadRequirementDocument } from '@/lib/document-requirements';
import { AlertTriangle, ArrowUpRight, BadgeCheck, CalendarCheck, CheckCircle, Clock, ExternalLink, Handshake, Package, Phone, Snowflake, Sparkles, Trophy, XCircle } from '@/features/leads/command-center/ui-system';
import { WorkspaceWorkflowShell } from '@/features/workspace/components/WorkspaceWorkflowShell';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { workspaceInsetClass, workspaceTableShellClass } from '@/components/ui/workspace-surfaces';
import { buildTodayLayerState } from '@/features/workspace/today';
import { LeadTableRow, LeadTableHeader, type LeadTableRowProps } from '@/features/leads/ui/lead-table-row';
import { InlineCoverageResolverRuntime, openInlineCoverageResolver } from '@/components/shell/InlineCoverageResolverRuntime';
import type { LeadDrawerLead, LeadDrawerSavePayload, LeadsWorkspaceProps } from '@/features/leads/types/workspace';
import type {
  TodayFilterKey,
  TodayLayerState,
  WorkspaceMode
} from '@/features/workspace/types';

/* unchanged type definitions omitted for brevity in explanation, but keep them exactly from current file */
import type {
  Activity,
  ComplianceDefinition,
  ComplianceItem,
  Country,
  DrawerMode,
  FollowUp,
  FormState,
  IconComponent,
  LeadDocument,
  LeadOpenStep,
  LeadRow,
  Option,
  Pipeline,
  Price,
  PricingRule,
  Product,
  ProductCategory,
  Profile,
  Quote,
  QuoteLineItem,
  QuotePreviewSavePayload,
  QuoteVersion,
  Rfq,
  RfqLineItem,
  SavedView,
  SignalTone,
  SortMode,
  Stage,
  StageHistory,
  Variant,
} from "./leads-workspace-types";
import {
  QUOTE_ADJUSTMENT_OPTIONS,
  applyQuoteAdjustment,
  buildAiLeadBrief,
  countryCurrency,
  defaultQuoteQuantity,
  formatPreviewAmount,
  getHealthIcon,
  getHealthTone,
  getIncotermHelp,
  getReadinessTone,
  getStableFollowUpVisualState,
  getStageIcon,
  getStageTone,
  quoteAdjustmentDeltaPercent,
  uniqueCurrencyOptions,
  variantPackSummary,
  variantPricingUnit,
} from "./leads-workspace-helpers";




function InlineLeadWorkspace({
  activeView,
  lead,
  stageName,
  ownerLabel,
  nextStepLabel,
  selectedProductIds,
  selectedMarketIds,
  selectedProductNames,
  selectedMarketNames,
  products,
  markets,
  variants,
  prices,
  pricingRules,
  readiness,
  rfqs,
  quotes,
  quoteVersions,
  activities,
  followUps,
  complianceItems,
  complianceDefinitions,
  documents,
  safeFormatDateTime,
  stableNowIso,
  stages,
  inlineActionState,
  inlineFollowUpAt,
  setInlineFollowUpAt,
  isInlineActionPending,
  onOpenEditDrawer,
  onScheduleFollowUp,
  onCompleteFollowUp,
  onMoveToStage,
  onOpenOrCreateQuote,
  onRequestQuoteApproval,
  onApproveQuoteAdjustment,
  onRejectQuoteAdjustment,
  onMarkDirectOrder,
  onBackToList,
  onOpenCommandCenter,
  onOpenQuoteBuilder,
}: InlineLeadWorkspaceProps) {
  if (!lead) {
    return (
      <div className="flex min-h-[420px] flex-col gap-3 bg-slate-50 px-6 py-5">
        <button type="button" onClick={onBackToList} className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">← Back to Lead Queue</button>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Select a lead to open the workspace.</div>
      </div>
    );
  }

  return (
    <div id="inline-lead-workspace" className="flex flex-1 flex-col gap-4 bg-slate-50 px-6 py-4">
      {activeView === 'cc' ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onBackToList} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">← Back to Lead Queue</button>
          <button type="button" onClick={onOpenCommandCenter} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm">Command Center</button>
          <button type="button" onClick={() => onOpenOrCreateQuote(lead.id)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Quote Preview</button>
          <span className="ml-auto rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">One page workspace · no nested route</span>
        </div>
      ) : null}
      {activeView === 'quote' ? (
        <InlineQuoteBuilder
          lead={lead}
          stageName={stageName}
          ownerLabel={ownerLabel}
          selectedProductIds={selectedProductIds}
          selectedMarketIds={selectedMarketIds}
          selectedProductNames={selectedProductNames}
          selectedMarketNames={selectedMarketNames}
          products={products}
          markets={markets}
          variants={variants}
          prices={prices}
          pricingRules={pricingRules}
          readiness={readiness}
          rfqs={rfqs}
          quotes={quotes}
          quoteVersions={quoteVersions}
          documents={documents}
          complianceItems={complianceItems}
          complianceDefinitions={complianceDefinitions}
          safeFormatDateTime={safeFormatDateTime}
          stableNowIso={stableNowIso}
          inlineActionState={inlineActionState}
          isInlineActionPending={isInlineActionPending}
          onOpenOrCreateQuote={onOpenOrCreateQuote}
          onRequestQuoteApproval={onRequestQuoteApproval}
          onApproveQuoteAdjustment={onApproveQuoteAdjustment}
          onRejectQuoteAdjustment={onRejectQuoteAdjustment}
          onMarkDirectOrder={onMarkDirectOrder}
          onOpenCommandCenter={onOpenCommandCenter}
          onOpenCoverageManager={() => openInlineCoverageResolver(lead.id)}
        />
      ) : (
        <InlineCommandCenter
          lead={lead}
          stageName={stageName}
          ownerLabel={ownerLabel}
          nextStepLabel={nextStepLabel}
          selectedProductNames={selectedProductNames}
          selectedMarketNames={selectedMarketNames}
          readiness={readiness}
          rfqs={rfqs}
          quotes={quotes}
          activities={activities}
          followUps={followUps}
          complianceItems={complianceItems}
          complianceDefinitions={complianceDefinitions}
          safeFormatDateTime={safeFormatDateTime}
          stableNowIso={stableNowIso}
          stages={stages}
          inlineActionState={inlineActionState}
          inlineFollowUpAt={inlineFollowUpAt}
          setInlineFollowUpAt={setInlineFollowUpAt}
          isInlineActionPending={isInlineActionPending}
          onOpenEditDrawer={onOpenEditDrawer}
          onScheduleFollowUp={onScheduleFollowUp}
          onCompleteFollowUp={onCompleteFollowUp}
          onMoveToStage={onMoveToStage}
          onOpenQuoteBuilder={onOpenQuoteBuilder}
          onOpenOrCreateQuote={onOpenOrCreateQuote}
          onBackToList={onBackToList}
        />
      )}
    </div>
  );
}

function InlineCommandCenter({
  lead,
  stageName,
  ownerLabel,
  nextStepLabel,
  selectedProductNames,
  selectedMarketNames,
  readiness,
  rfqs,
  quotes,
  activities,
  followUps,
  complianceItems,
  complianceDefinitions,
  safeFormatDateTime,
  stableNowIso,
  stages,
  inlineActionState,
  inlineFollowUpAt,
  setInlineFollowUpAt,
  isInlineActionPending,
  onOpenEditDrawer,
  onScheduleFollowUp,
  onCompleteFollowUp,
  onMoveToStage,
  onOpenQuoteBuilder,
  onOpenOrCreateQuote,
  onBackToList,
}: {
  lead: LeadRow;
  stageName: string;
  ownerLabel: string;
  nextStepLabel: string;
  selectedProductNames: string[];
  selectedMarketNames: string[];
  readiness?: LeadCommercialReadiness;
  rfqs: Rfq[];
  quotes: Quote[];
  activities: Activity[];
  followUps: FollowUp[];
  complianceItems: ComplianceItem[];
  complianceDefinitions: ComplianceDefinition[];
  safeFormatDateTime: (value?: string | null) => string;
  stableNowIso: string;
  stages: Stage[];
  inlineActionState: FormState;
  inlineFollowUpAt: string;
  setInlineFollowUpAt: (value: string) => void;
  isInlineActionPending: boolean;
  onOpenEditDrawer: (leadId: string, stepId?: LeadOpenStep) => void;
  onScheduleFollowUp: (leadId: string, scheduledAt: string) => void;
  onCompleteFollowUp: (leadId: string, followUpId?: string | null) => void;
  onMoveToStage: (leadId: string, stageId: string) => void;
  onOpenQuoteBuilder: () => void;
  onOpenOrCreateQuote: (leadId: string, preview?: QuotePreviewSavePayload) => void;
  onBackToList: () => void;
}) {
  const [activePillar, setActivePillar] = React.useState<'follow_up' | 'qualification' | 'coverage' | 'commercial' | null>(null);
  const nextFollowUp = [...followUps].sort((a, b) => String(a.scheduled_at ?? '').localeCompare(String(b.scheduled_at ?? '')))[0] ?? null;
  const latestActivity = [...activities].sort((a, b) => String(b.occurred_at ?? '').localeCompare(String(a.occurred_at ?? '')))[0] ?? null;
  const latestQuote = [...quotes].sort((a, b) => String(b.updated_at ?? b.created_at ?? '').localeCompare(String(a.updated_at ?? a.created_at ?? '')))[0] ?? null;
  const blockerCount = readiness?.blockerCount ?? complianceItems.length;
  const pricingReady = readiness?.pricingReadiness === 'ready';
  const canContinueQuote = Boolean(latestQuote || selectedProductNames.length || rfqs.length);

  // Status chips data
  const chips = [
    { label: pricingReady ? '✓ Pricing ready' : '⚠ Pricing partial', cls: pricingReady ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]' : 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]' },
    { label: blockerCount > 0 ? `⚠ ${blockerCount} compliance item${blockerCount === 1 ? '' : 's'}` : '✓ Compliance clear', cls: blockerCount > 0 ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]' : 'bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]' },
    { label: nextFollowUp?.scheduled_at ? `📅 Next follow-up: ${safeFormatDateTime(nextFollowUp.scheduled_at)}` : '📅 No follow-up set', cls: 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]' },
    { label: lead.lead_type === 'buyer' ? 'Buyer' : 'Supplier', cls: 'bg-[#f0f9ff] border-[#7dd3fc] text-[#0369a1]' },
  ];

  // Pipeline stages use real workspace stages so stage CTAs persist instead of acting as visual-only chips.
  const pipelineStages = (stages.filter((stage) => stage.pipeline_id === lead.pipeline_id).length ? stages.filter((stage) => stage.pipeline_id === lead.pipeline_id) : stages)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((stage) => {
      const isCurrent = stage.id === lead.stage_id || stage.name === stageName;
      const currentOrder = stages.find((entry) => entry.id === lead.stage_id)?.sort_order ?? 0;
      return {
        id: stage.id,
        label: stage.name,
        state: isCurrent ? 'current' : (stage.sort_order ?? 0) < currentOrder ? 'done' : 'upcoming',
      };
    });

  // Workflow pillars
  const pillars = [
    {
      key: 'follow_up' as const,
      icon: '↗',
      title: 'Follow-up',
      state: nextFollowUp ? (new Date(nextFollowUp.scheduled_at ?? '').getTime() < new Date(stableNowIso).getTime() ? 'blocked' : 'needs-action') : 'default',
      stateLabel: nextFollowUp ? safeFormatDateTime(nextFollowUp.scheduled_at) : 'Not scheduled',
      helper: nextFollowUp ? (new Date(nextFollowUp.scheduled_at ?? '').getTime() < new Date(stableNowIso).getTime() ? 'Overdue — reschedule now' : 'Scheduled follow-up active') : 'Set a follow-up date to keep this lead moving.',
      badge: nextFollowUp && new Date(nextFollowUp.scheduled_at ?? '').getTime() < new Date(stableNowIso).getTime() ? { label: 'OVERDUE', cls: 'bg-[#f43f5e]' } : null,
    },
    {
      key: 'qualification' as const,
      icon: '◎',
      title: 'Qualification',
      state: (selectedProductNames.length > 0 ? 'ready' : 'needs-action') as 'ready' | 'needs-action' | 'default',
      stateLabel: selectedProductNames.length > 0 ? 'qualified' : 'not started',
      helper: selectedProductNames.length ? `${selectedProductNames.length} product${selectedProductNames.length === 1 ? '' : 's'} of interest mapped` : '1 input still needs attention',
      badge: selectedProductNames.length === 0 ? { label: 'NEEDS INPUT', cls: 'bg-[#f59e0b]' } : null,
    },
    {
      key: 'coverage' as const,
      icon: '▦',
      title: 'Coverage',
      state: (selectedProductNames.length > 0 && selectedMarketNames.length > 0 ? 'ready' : 'blocked') as 'ready' | 'blocked',
      stateLabel: selectedProductNames.length ? `${selectedProductNames.length} product · ${selectedMarketNames.length || 1} market` : '0 products · 0 markets',
      helper: selectedProductNames.length ? 'Coverage ready for commercial work' : 'Map at least one product and market',
      badge: selectedProductNames.length === 0 ? { label: 'BLOCKED', cls: 'bg-[#f43f5e]' } : null,
    },
    {
      key: 'commercial' as const,
      icon: '◇',
      title: 'Commercial',
      state: latestQuote ? 'ready' : 'default' as 'ready' | 'default',
      stateLabel: latestQuote ? `Quote active` : 'No quote yet',
      helper: latestQuote ? 'Create or review the current quote and pricing basis' : 'Create or review the current quote and pricing basis',
      badge: null,
    },
  ];

  const pillarBg: Record<string, string> = {
    'needs-action': 'bg-[#fffbeb] border-[#fde68a]',
    'blocked': 'bg-[#fff1f2] border-[#fca5a5]',
    'ready': 'bg-[#ecfdf5] border-[#6ee7b7]',
    'default': 'bg-white border-[#e2e8f0]',
  };
  const pillarTitleColor: Record<string, string> = {
    'needs-action': 'text-[#d97706]',
    'blocked': 'text-[#e11d48]',
    'ready': 'text-[#059669]',
    'default': 'text-[#475569]',
  };

  return (
    <div className="flex flex-col gap-3 px-6 py-4" style={{ background: '#f0f4f8' }}>

      {/* Lead header card — spec .lead-header-card */}
      <div className="overflow-hidden rounded-[22px] border border-[#e2e8f0] bg-white shadow-sm">
        <div className="flex flex-col gap-[14px] p-[18px_22px]">

          {/* Status chips — spec .lhc-chips */}
          <div className="flex flex-wrap gap-[6px]">
            {chips.map((chip) => (
              <span key={chip.label} className={`inline-flex items-center gap-[5px] rounded-full border px-[10px] py-[3px] text-[10px] font-bold ${chip.cls}`}>
                {chip.label}
              </span>
            ))}
          </div>

          {/* Hero row — spec .lhc-hero */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-[14px]">
              {/* 48px avatar — spec .lhc-company-avatar */}
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-base font-black text-white" style={{ background: 'linear-gradient(135deg,#061c2e,#0c7fff)' }}>
                {getLeadInitials(lead.company_name) || 'SF'}
              </div>
              <div>
                {/* 26px 800-weight name — spec .lhc-company-name */}
                <div className="text-[26px] font-extrabold leading-tight tracking-tight text-[#0f172a]">{lead.company_name}</div>
                <div className="mt-[3px] text-[12px] text-[#64748b]">
                  {lead.lead_type} · Owner: {ownerLabel} · Source: {lead.source_label ?? lead.source_type ?? 'Trade event'} · {lead.country ?? 'No country set'}
                </div>
              </div>
            </div>
            {/* CTA buttons — spec .lhc-actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onOpenOrCreateQuote(lead.id)}
                className="rounded-[6px] bg-[#0b2e4a] px-[18px] py-[9px] text-[13px] font-bold text-white hover:bg-[#061c2e]">
                🖊 {canContinueQuote ? 'View quote' : 'Create quote'}
              </button>
              <button type="button" onClick={() => setActivePillar('follow_up')}
                className="rounded-[6px] border border-[#e2e8f0] bg-white px-[14px] py-[8px] text-[12px] font-semibold text-[#334155] hover:bg-[#f8fafc]">
                📅 Schedule follow-up
              </button>
              <button type="button" onClick={() => onOpenEditDrawer(lead.id, 'basics')}
                className="rounded-[6px] border border-[#e2e8f0] bg-white px-[14px] py-[8px] text-[12px] font-semibold text-[#334155] hover:bg-[#f8fafc]">
                ✎ Quick edit
              </button>
            </div>
          </div>
        </div>

        {/* Next move bar — spec .next-move-bar */}
        <div className="mx-[22px] mb-[14px] rounded-r-[6px] border-l-[3px] border-[#0c7fff] bg-[#f8fafc] px-[14px] py-[9px] text-[12px] text-[#475569]">
          <strong className="text-[#0f172a]">Next move:</strong> {nextStepLabel || 'Schedule a follow-up call and confirm product interest before opening a quote.'}
          {latestActivity ? ` · Last activity: ${safeFormatDateTime(latestActivity.occurred_at)}` : ''}
        </div>

         {/* Pipeline stage strip — spec .pipeline-strip */}
        <div className="flex items-center gap-0 overflow-x-auto border-t border-[#e2e8f0] px-[22px] py-[12px]">
          {pipelineStages.map((stage, index) => (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => { if (stage.state !== 'current') onMoveToStage(lead.id, stage.id); }}
                disabled={isInlineActionPending || stage.state === 'current'}
                title={stage.state === 'current' ? 'Current stage' : `Move to ${stage.label}`}
                className={`flex flex-col items-center gap-[3px] rounded-[6px] px-[10px] py-[4px] transition-colors disabled:cursor-not-allowed ${stage.state === 'done' ? 'bg-[#ecfdf5]' : stage.state === 'current' ? 'bg-[rgba(12,127,255,.1)]' : 'bg-transparent hover:bg-slate-50'}`}
                style={{ minWidth: '80px' }}
              >
                <div className={`h-[10px] w-[10px] rounded-full ${stage.state === 'done' ? 'bg-[#10b981]' : stage.state === 'current' ? 'bg-[#0c7fff] shadow-[0_0_0_3px_rgba(12,127,255,.2)]' : 'bg-[#cbd5e1]'}`} />
                <div className={`text-center text-[10px] font-bold ${stage.state === 'done' ? 'text-[#059669]' : stage.state === 'current' ? 'text-[#0b2e4a]' : 'text-[#94a3b8]'}`}>
                  {stage.label}
                </div>
              </button>
              {index < pipelineStages.length - 1 ? <div className="flex-shrink-0 px-[2px] pb-[8px] text-[16px] text-[#cbd5e1]">›</div> : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main CC grid — spec .cc-grid */}
      <div className="grid gap-[14px] xl:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-3">

          {/* Workflow pillars — spec .workflow-pillars */}
          <div className="grid gap-[10px] grid-cols-2 xl:grid-cols-4">
            {pillars.map((pillar) => (
              <div key={pillar.key}
                onClick={() => setActivePillar(activePillar === pillar.key ? null : pillar.key)}
                className={`relative cursor-pointer rounded-[16px] border p-[14px_16px] transition-shadow hover:shadow-md ${activePillar === pillar.key ? 'border-[#0c7fff] bg-[rgba(12,127,255,.04)] shadow-[0_0_0_2px_rgba(12,127,255,.2)]' : pillarBg[pillar.state]}`}>
                {pillar.badge ? (
                  <span className={`absolute right-[10px] top-[10px] rounded-full px-[7px] py-[2px] text-[9px] font-extrabold text-white ${pillar.badge.cls}`}>
                    {pillar.badge.label}
                  </span>
                ) : null}
                <div className="mb-2 text-[20px]">{pillar.icon}</div>
                <div className={`mb-1 text-[11px] font-extrabold uppercase tracking-[.06em] ${activePillar === pillar.key ? 'text-[#0c7fff]' : pillarTitleColor[pillar.state]}`}>{pillar.title}</div>
                <div className="mb-[3px] text-[13px] font-bold text-[#0f172a]">{pillar.stateLabel}</div>
                <div className="text-[11px] leading-[1.5] text-[#64748b]">{pillar.helper}</div>
                <button type="button" className={`mt-[10px] rounded-[6px] border px-[10px] py-[4px] text-[10px] font-bold ${activePillar === pillar.key ? 'border-[rgba(12,127,255,.4)] bg-white text-[#0c7fff]' : 'border-[#e2e8f0] bg-white text-[#475569]'}`}>
                  {activePillar === pillar.key ? 'Close panel' : 'Inspect →'}
                </button>
              </div>
            ))}
          </div>

          {/* Inline panel — spec .inline-panel */}
          {activePillar ? (
            <div className="overflow-hidden rounded-[22px] border border-[#e2e8f0] bg-white shadow-md">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-[20px] py-[16px]">
                <div className="text-[14px] font-bold text-[#0f172a]">
                  {activePillar === 'follow_up' ? 'Follow-up — scheduling and cadence' :
                   activePillar === 'qualification' ? 'Qualification — buyer/supplier fit' :
                   activePillar === 'coverage' ? 'Coverage — product and market mapping' :
                   'Commercial — quote and pricing'}
                </div>
                <button type="button" onClick={() => setActivePillar(null)}
                  className="rounded-[6px] border border-[#e2e8f0] bg-white px-[10px] py-[4px] text-[11px] font-semibold text-[#475569]">
                  Close panel
                </button>
              </div>
              <div className="p-[18px_20px]">
                {activePillar === 'follow_up' ? (
                  <div>
                    <p className="text-[12px] text-[#64748b] leading-[1.6] mb-3">Resolve overdue follow-up and keep the lead cadence active.</p>
                    {nextFollowUp ? (
                      <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-[12px]">
                        <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#94a3b8] mb-1">Next follow-up</div>
                        <div className="text-[13px] font-semibold text-[#1e293b]">{safeFormatDateTime(nextFollowUp.scheduled_at)}</div>
                      </div>
                    ) : (
                      <div className="rounded-[12px] border border-dashed border-[#e2e8f0] p-[16px] text-center text-[13px] text-[#94a3b8]">
                        No follow-up scheduled. Use the Schedule follow-up button above.
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[12px] border border-[#e2e8f0] bg-white p-[12px]">
                      <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#64748b]">
                        Follow-up date
                        <input type="datetime-local" value={inlineFollowUpAt} onChange={(event) => setInlineFollowUpAt(event.target.value)} className="rounded-[6px] border border-[#e2e8f0] px-2 py-1 text-[12px] font-semibold text-[#334155]" />
                      </label>
                      <button type="button" disabled={isInlineActionPending} onClick={() => onScheduleFollowUp(lead.id, inlineFollowUpAt)} className="rounded-[6px] bg-[#0b2e4a] px-[12px] py-[7px] text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">Schedule/reschedule</button>
                      <button type="button" disabled={isInlineActionPending || !nextFollowUp} onClick={() => onCompleteFollowUp(lead.id, nextFollowUp?.id)} className="rounded-[6px] border border-[#e2e8f0] bg-white px-[12px] py-[7px] text-[12px] font-bold text-[#334155] disabled:cursor-not-allowed disabled:opacity-60">Complete follow-up</button>
                    </div>
                  </div>
                ) : activePillar === 'qualification' ? (
                  <div>
                    <p className="text-[12px] text-[#64748b] leading-[1.6] mb-3">Keep buyer fit and operator context current before pushing downstream commercial work.</p>
                    <div className="flex flex-col gap-[6px]">
                      {[
                        { label: 'Lead type confirmed', ok: Boolean(lead.lead_type) },
                        { label: 'Country set', ok: Boolean(lead.country) },
                        { label: 'Contact name set', ok: Boolean(lead.contact_name) },
                        { label: 'Products mapped', ok: selectedProductNames.length > 0 },
                      ].map((item) => (
                        <div key={item.label} className={`flex items-center gap-[8px] rounded-[8px] border p-[8px_12px] ${item.ok ? 'border-[#d1fae5] bg-[#ecfdf5]' : 'border-[#fecaca] bg-[#fff1f2]'}`}>
                          <div className={`h-[8px] w-[8px] rounded-full flex-shrink-0 ${item.ok ? 'bg-[#10b981]' : 'bg-[#f43f5e]'}`} />
                          <span className="text-[12px] font-semibold text-[#334155] flex-1">{item.label}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-[.06em] ${item.ok ? 'text-[#059669]' : 'text-[#e11d48]'}`}>{item.ok ? 'OK' : 'MISSING'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activePillar === 'coverage' ? (
                  <div>
                    <p className="text-[12px] text-[#64748b] leading-[1.6] mb-3">Products and markets define the commercial scope of this lead.</p>
                    <button type="button" onClick={() => openInlineCoverageResolver(lead.id)}
                      className="mb-3 rounded-[6px] bg-[#0b2e4a] px-[14px] py-[7px] text-[12px] font-bold text-white">
                      Open coverage manager
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-[12px]">
                        <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#94a3b8] mb-2">Products</div>
                        {selectedProductNames.length ? selectedProductNames.map((p) => (
                          <span key={p} className="inline-flex items-center rounded-full bg-[#f1f5f9] border border-[#e2e8f0] px-[10px] py-[4px] text-[11px] font-semibold text-[#334155] m-[2px]">{p}</span>
                        )) : <div className="text-[12px] text-[#94a3b8]">No products mapped</div>}
                      </div>
                      <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-[12px]">
                        <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#94a3b8] mb-2">Markets</div>
                        {selectedMarketNames.length ? selectedMarketNames.map((m) => (
                          <span key={m} className="inline-flex items-center rounded-full bg-[#f1f5f9] border border-[#e2e8f0] px-[10px] py-[4px] text-[11px] font-semibold text-[#334155] m-[2px]">{m}</span>
                        )) : <div className="text-[12px] text-[#94a3b8]">{lead.country ?? 'No market set'}</div>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[12px] text-[#64748b] leading-[1.6] mb-3">Create or review the current quote and pricing basis.</p>
                    {latestQuote ? (
                      <div className="rounded-[12px] border border-[#d1fae5] bg-[#ecfdf5] p-[12px]">
                        <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#059669] mb-1">Active quote</div>
                        <div className="text-[13px] font-semibold text-[#047857]">{latestQuote.quote_number ?? latestQuote.id?.slice(0, 8) ?? 'Draft quote'}</div>
                        <div className="text-[11px] text-[#64748b] mt-1">{latestQuote.status?.replace(/_/g, ' ') ?? 'draft'}</div>
                      </div>
                    ) : (
                      <div className="rounded-[12px] border border-dashed border-[#e2e8f0] p-[16px] text-center">
                        <div className="text-[13px] text-[#94a3b8] mb-2">No quote yet</div>
                        <button type="button" onClick={() => onOpenOrCreateQuote(lead.id)}
                          className="rounded-[6px] bg-[#0b2e4a] px-[14px] py-[7px] text-[12px] font-bold text-white">
                          Create quote
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Quote prep checklist — spec .qpc-card */}
          <div className="overflow-hidden rounded-[22px] border border-[#e2e8f0] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-[18px] py-[14px]">
              <div className="text-[13px] font-bold text-[#0f172a]">Quote prep checklist</div>
              <button type="button" onClick={() => onOpenOrCreateQuote(lead.id)}
                className="rounded-[6px] bg-[#0b2e4a] px-[14px] py-[7px] text-[11px] font-bold text-white">
                {canContinueQuote ? 'Continue quote →' : 'Create quote →'}
              </button>
            </div>
            <div className="flex flex-col gap-[8px] p-[12px_18px]">
              {[
                { label: 'Buyer qualification', sub: selectedProductNames.length ? 'qualified' : 'not yet qualified', status: selectedProductNames.length > 0 ? 'done' : 'todo' as 'done' | 'todo' },
                { label: 'Coverage mapped', sub: selectedProductNames.length > 0 && selectedMarketNames.length > 0 ? `${selectedProductNames.length} products · ${selectedMarketNames.length} markets` : 'Map at least one product and market', status: (selectedProductNames.length > 0 && selectedMarketNames.length > 0) ? 'done' : 'todo' as 'done' | 'todo' },
                { label: 'Pricing ready', sub: pricingReady ? 'Catalog pricing is ready' : 'Map products to enable pricing', status: pricingReady ? 'done' : 'blocked' as 'done' | 'blocked' },
                { label: 'Quote draft', sub: latestQuote ? `${latestQuote.status?.replace(/_/g, ' ') ?? 'draft'} · ${safeFormatDateTime(latestQuote.updated_at)}` : 'No quote started yet', status: latestQuote ? 'done' : 'todo' as 'done' | 'todo' },
                { label: 'Compliance clear', sub: blockerCount > 0 ? `${blockerCount} item${blockerCount === 1 ? '' : 's'} need attention` : 'No active blockers', status: blockerCount > 0 ? 'blocked' : 'done' as 'done' | 'blocked' },
              ].map((item) => (
                <div key={item.label} className={`flex items-start gap-[10px] rounded-[12px] border p-[10px_12px] ${item.status === 'done' ? 'border-[#d1fae5] bg-[#ecfdf5]' : item.status === 'blocked' ? 'border-[#fecaca] bg-[#fff1f2]' : 'border-[#fde68a] bg-[#fffbeb]'}`}>
                  <div className={`mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${item.status === 'done' ? 'bg-[#10b981] text-white' : item.status === 'blocked' ? 'border-[1.5px] border-[#fca5a5] bg-[#fee2e2] text-[#e11d48]' : 'border-[1.5px] border-[#fcd34d] bg-[#fef3c7] text-[#92400e]'}`}>
                    {item.status === 'done' ? '✓' : item.status === 'blocked' ? '✕' : '!'}
                  </div>
                  <div>
                    <div className={`text-[12px] font-bold ${item.status === 'done' ? 'text-[#047857]' : item.status === 'blocked' ? 'text-[#9f1239]' : 'text-[#334155]'}`}>{item.label}</div>
                    <div className={`text-[11px] leading-[1.5] ${item.status === 'done' ? 'text-[#059669]' : item.status === 'blocked' ? 'text-[#e11d48]' : 'text-[#92400e]'}`}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail — spec .cc-right */}
        <aside className="flex flex-col gap-[10px]">
          {/* Priority action */}
          <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-[14px] shadow-sm">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[.16em] text-[#94a3b8]">Priority action</div>
            <div className="mb-[4px] text-[13px] font-bold text-[#0f172a]">
              {nextFollowUp && new Date(nextFollowUp.scheduled_at ?? '').getTime() < new Date(stableNowIso).getTime() ? 'Follow-up overdue' :
               !pricingReady ? 'Map pricing before quote' :
               !latestQuote ? 'Create first quote' : 'Review quote status'}
            </div>
            <div className="mb-[10px] text-[12px] leading-[1.6] text-[#64748b]">
              {nextFollowUp ? `Next follow-up: ${safeFormatDateTime(nextFollowUp.scheduled_at)}. Keep the commercial thread moving.` : 'Set a follow-up to keep this lead active.'}
            </div>
            <button type="button" onClick={() => setActivePillar('follow_up')}
              className="w-full rounded-[6px] bg-[#0b2e4a] px-[12px] py-[7px] text-center text-[12px] font-bold text-white">
              Open follow-up lane
            </button>
          </div>

          {/* Lead queue hot list */}
          <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-[14px] shadow-sm">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[.16em] text-[#94a3b8]">Lead queue</div>
            <div className="mb-[8px] text-[13px] font-bold text-[#0f172a]">Hot list</div>
            <div className="flex flex-col gap-[5px]">
              {activities.slice(0, 4).map((act, i) => (
                <div key={act.id ?? i} className="flex cursor-pointer items-center gap-[8px] rounded-[6px] border border-[#e2e8f0] px-[10px] py-[7px] hover:bg-[#f8fafc]">
                  <div className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#f43f5e]" />
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold text-[#334155]">{lead.company_name}</span>
                  <span className="text-[9px] text-[#94a3b8]">{stageName}</span>
                </div>
              ))}
              {activities.length === 0 ? (
                <div className="py-2 text-center text-[11px] text-[#94a3b8]">No recent activity</div>
              ) : null}
            </div>
            <button type="button" onClick={onBackToList} className="mt-2 w-full rounded-[6px] border border-[#e2e8f0] bg-white px-[12px] py-[7px] text-center text-[12px] font-semibold text-[#334155]">
              Back to queue
            </button>
          </div>

          {/* Compliance gate */}
          <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-[14px] shadow-sm">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[.16em] text-[#94a3b8]">Compliance</div>
            <div className="mb-[4px] text-[13px] font-bold text-[#0f172a]">Gate status</div>
            <div className="flex flex-col gap-[4px] mt-2">
              {complianceItems.length > 0 ? complianceItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-[8px] text-[11px]">
                  <div className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#f59e0b]" />
                  <span className="flex-1 text-[#475569]">{complianceDefinitions.find((definition) => definition.id === item.compliance_item_id)?.description ?? complianceDefinitions.find((definition) => definition.id === item.compliance_item_id)?.code ?? 'Compliance item'}</span>
                  <span className="text-[9px] font-bold uppercase tracking-[.06em] text-[#d97706]">PENDING</span>
                </div>
              )) : (
                <div className="text-[12px] text-[#059669] font-semibold">Compliance is currently clear.</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky action bar — spec .sticky-bar */}
      <div className="sticky bottom-3 z-10 mx-[-24px] flex items-center justify-between rounded-[22px_22px_0_0] border-t border-[#e2e8f0] bg-white/95 px-[22px] py-[12px] shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur">
        <div className="flex gap-2">
          <button type="button" onClick={() => onOpenOrCreateQuote(lead.id)}
            className="rounded-[10px] bg-[#0b2e4a] px-[16px] py-[9px] text-[13px] font-bold text-white">
            🖊 {canContinueQuote ? 'Continue quote' : 'Create quote'}
          </button>
          <button type="button" onClick={() => setActivePillar("follow_up")}
            className="rounded-[10px] border border-[#e2e8f0] bg-white px-[14px] py-[8px] text-[12px] font-semibold text-[#334155]">
            📅 Schedule follow-up
          </button>
          <button type="button" onClick={() => onOpenEditDrawer(lead.id, "basics")}
            className="rounded-[10px] border border-[#e2e8f0] bg-white px-[14px] py-[8px] text-[12px] font-semibold text-[#334155]">
            ✏ Quick edit
          </button>
        </div>
        <div className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-[12px] py-[6px] text-[10px] font-bold uppercase tracking-[.12em] text-[#94a3b8]">
          COMMAND CENTER · WORKFLOW PILLARS · {stageName.toUpperCase()}
        </div>
      </div>
    </div>
  );
}


export { InlineLeadWorkspace, InlineCommandCenter };
