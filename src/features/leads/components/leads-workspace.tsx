'use client';

import { useEffect, useMemo, useState, useTransition, type KeyboardEvent, type SVGProps } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LeadDrawerSavePayload } from '@/features/leads/components/lead-drawer';
import LeadsFiltersPanel from '@/features/leads/components/LeadsFiltersPanel';
import { SavedViewsBar, ToolbarActionButton, ToolbarSearchInput, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { batchScheduleLeadFollowUps, batchMoveLeadsToStage } from '@/features/leads/server/actions';
import { getFollowUpBadgeClasses, getFollowUpLabel, getFollowUpVisualState } from '@/lib/lead-status';
import { computeLeadHealth, compareLeadHealthPriority } from '@/lib/lead-health';
import { JOURNEY_COPY, isPipelineInJourney, type LeadJourney } from '@/lib/journey';
import { formatDateTime } from '@/lib/utils';
import { navigateToLeadCommandCenter } from '@/lib/lead-command-center-navigation';
import { buildLeadCommercialReadiness, getPricingReadinessLabel, type LeadCommercialReadiness } from '@/lib/catalog-pricing-model';
import { buildLeadDocumentRequirementState, type DocumentRequirementRule, type LeadRequirementDocument } from '@/lib/document-requirements';
import { AlertTriangle, ArrowUpRight, BadgeCheck, CalendarCheck, CheckCircle, Clock, ExternalLink, Handshake, Package, Phone, Snowflake, Sparkles, Trophy, XCircle } from '@/features/leads/command-center/ui-system';
import { WorkspaceWorkflowShell } from '@/features/workspace/components/WorkspaceWorkflowShell';
import { workspaceInsetClass, workspaceTableShellClass } from '@/components/ui/workspace-surfaces';
import { buildTodayLayerState } from '@/features/workspace/today';
import type {
  TodayFilterKey,
  TodayLayerState,
  WorkspaceMode
} from '@/features/workspace/types';

const LeadDrawer = dynamic(
  () => import('@/features/leads/components/lead-drawer').then((mod) => mod.LeadDrawer),
  {
    ssr: false,
    loading: () => null,
  },
);

/* unchanged type definitions omitted for brevity in explanation, but keep them exactly from current file */
type LeadRow = {
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

type Option = { id: string; name: string };
type ProductCategory = { id: string; name: string; is_active?: boolean; sort_order?: number; parent_id?: string | null };
type Product = { id: string; name: string; sku: string | null; category_id: string | null };
type Profile = { id: string; full_name: string | null; username: string | null };
type Country = { id: string; name: string; phone_code: string | null; market_id: string | null };
type Stage = { id: string; name: string; pipeline_id: string; sort_order: number; is_closed: boolean; is_won: boolean; is_lost: boolean };
type Pipeline = { id: string; name: string; lead_type: 'buyer' | 'supplier' | 'both'; is_default: boolean };
type FollowUp = { id: string; lead_id: string | null; scheduled_at: string | null; status: string; created_at?: string | null };
type Activity = { id: string; lead_id: string; kind: string; message: string; occurred_at: string };
type StageHistory = { id: string; lead_id: string; from_stage_id: string | null; to_stage_id: string | null; changed_at: string; note: string | null };
type RfqLineItem = { id: string; rfq_id: string | null; product_id: string | null; product_variant_id?: string | null; catalog_price_id?: string | null; catalog_price_amount?: number | null; catalog_price_currency?: string | null; quantity?: number | null; unit_price?: number | null; currency?: string | null; is_price_overridden?: boolean | null; override_reason?: string | null; overridden_by?: string | null; overridden_at?: string | null; notes?: string | null };
type QuoteLineItem = { id: string; quote_id: string | null; product_id: string | null; product_variant_id?: string | null; catalog_price_id?: string | null; catalog_price_amount?: number | null; catalog_price_currency?: string | null; quantity?: number | null; unit_price?: number | null; currency?: string | null; is_price_overridden?: boolean | null; override_reason?: string | null; overridden_by?: string | null; overridden_at?: string | null; notes?: string | null };
type Rfq = { id: string; lead_id: string | null; status: string; currency: string | null; validity_date: string | null; created_at: string | null; updated_at: string | null; notes?: string | null; lineItems?: RfqLineItem[] };
type Quote = { id: string; lead_id: string; rfq_id: string | null; status: string; currency: string | null; created_at: string; updated_at: string; notes?: string | null; quote_number?: string | null; current_version_id?: string | null; lineItems?: QuoteLineItem[] };
type QuoteVersion = { id: string; quote_id: string | null; version_no?: number | null; status?: string | null; created_at?: string | null; approved_at?: string | null; sent_at?: string | null; pdf_document_id?: string | null };
type ComplianceItem = { id: string; lead_id: string; compliance_item_id: string; status: string; created_at: string; submitted_at: string | null; approved_at: string | null };
type ComplianceDefinition = { id: string; code: string; description: string };
type LeadDocument = { id: string; related_entity?: string | null; related_id?: string | null; requirement_code: string | null; status: string | null; expires_at: string | null; uploaded_at?: string | null; doc_type?: string | null; file_name?: string | null; linked_quote_id?: string | null; source_related_entity?: string | null; review_notes?: string | null };
type Variant = { id: string; name: string; product_id: string };
type Price = { id: string; product_variant_id: string; market_id: string | null; price: number; currency: string; effective_from: string; effective_to: string | null };
type PricingRule = { id: string; product_id?: string | null; product_variant_id?: string | null; effective_from?: string | null; effective_to?: string | null; ex_factory_usd?: number | null; fob_usd?: number | null; ex_factory_inr?: number | null; fob_inr?: number | null; ex_factory_usd_per_case?: number | null; ex_factory_usd_per_unit?: number | null; fob_usd_per_case?: number | null; fob_usd_per_unit?: number | null; bulk_usd_per_kg?: number | null; pricing_type?: string | null };
type FormState = { error?: string; success?: string };
type SavedView = 'all' | 'mine' | 'overdue' | 'today' | 'trade-event' | 'buyers' | 'suppliers';
type SortMode = 'follow-up' | 'created' | 'company' | 'health';
type DrawerMode = 'quick' | 'full';
type LeadOpenStep = 'basics' | 'workflow' | 'coverage' | 'quotes';

interface LeadTableRowProps {
  lead: LeadRow;
  selected: boolean;
  isSpotlight: boolean;
  toggleSelect: (id: string) => void;
  setSpotlightLead: (id: string) => void;
  stageMap: Map<string, string>;
  nextStepMap: Map<string, string>;
  ownerMap: Map<string, string>;
  safeFormatDateTime: (value?: string | null) => string;
  activityMap: Map<string, string>;
  stageHistoryMap: Map<string, string>;
  stageMetaMap: Map<string, { sortOrder: number; stageCount: number; isClosed: boolean }>;
  readinessMap: Map<string, LeadCommercialReadiness>;
}

function LeadTableRow({
  lead,
  selected,
  isSpotlight,
  stageMap,
  nextStepMap,
  ownerMap,
  safeFormatDateTime,
  readinessMap,
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
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Use Open on any row to move into `/leads/[leadId]` command center. Quick Lead is the fastest entry point, while New Lead opens the full capture flow.</p>
        </div>
      </div>

      <div className={`min-w-0 px-4 py-3 ${workspaceInsetClass}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Next action</p>
        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">{nextStepName}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {lead.source_label ?? lead.source_type ?? ownerLabel}
        </p>
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
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Open
        </button>
      </div>
    </article>
  );
}

/* keep the remainder of the file exactly as it exists in your current repo */