import { GuruAvatar } from '@/components/ui/guru-avatar';
import { setSetuGuruWorkspaceContext } from '@/lib/setu-guru/page-context';
'use client';

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


function SignalPill({ label, tone, icon: Icon }: { label: string; tone: SignalTone; icon: IconComponent }) {
  const classes =
    tone === 'blue'
      ? 'border-blue-100 bg-blue-50 text-blue-700'
      : tone === 'emerald'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
        : tone === 'amber'
          ? 'border-amber-100 bg-amber-50 text-amber-700'
          : tone === 'rose'
            ? 'border-rose-100 bg-rose-50 text-rose-700'
            : tone === 'violet'
              ? 'border-violet-100 bg-violet-50 text-violet-700'
              : 'border-slate-200 bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

type DrawerState = {
  open: boolean;
  mode: DrawerMode;
  leadId: string | null;
  initialStepId?: LeadOpenStep;
};

function getDefaultFollowUpLocalValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setSeconds(0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function getPreferredTodayFilter(state?: TodayLayerState) {
  if (!state) return 'overdue' as TodayFilterKey;
  if (state.counts.overdue > 0) return 'overdue' as TodayFilterKey;
  if (state.counts.dueToday > 0) return 'due-today' as TodayFilterKey;
  if (state.counts.waiting > 0) return 'waiting' as TodayFilterKey;
  if (state.counts.blocked > 0) return 'blocked' as TodayFilterKey;
  return 'all-open' as TodayFilterKey;
}

function getLeadInitials(companyName: string) {
  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function labelForProfile(profile?: Profile) {
  if (!profile) return 'Unassigned';
  return profile.full_name ?? profile.username ?? 'Unassigned';
}

function getLeadCommandCenterHref(leadId: string, initialStepId: LeadOpenStep = 'basics') {
  const focus = initialStepId === 'quotes' ? '?focus=commercial' : '';
  return `/leads/${leadId}${focus}`;
}


function normalizeContactNumber(value?: string | null) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits.length >= 7 ? digits : '';
}

function getLeadEmailHref(lead: Pick<LeadRow, 'email' | 'company_name' | 'contact_name'>) {
  const email = String(lead.email ?? '').trim();
  if (!email || !email.includes('@')) return '';
  const subject = `Follow-up from SETU Flow`;
  const greeting = lead.contact_name ? `Hi ${lead.contact_name},` : 'Hello,';
  const body = `${greeting}\n\nIt was good connecting with you. I am following up from SETU Flow regarding ${lead.company_name}.\n\nBest regards`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function getLeadWhatsAppHref(lead: Pick<LeadRow, 'whatsapp_number' | 'phone' | 'company_name' | 'contact_name'>) {
  const number = normalizeContactNumber(lead.whatsapp_number || lead.phone);
  if (!number) return '';
  const greeting = lead.contact_name ? `Hi ${lead.contact_name},` : 'Hello,';
  const message = `${greeting}\n\nIt was good connecting with you. I am following up from SETU Flow regarding ${lead.company_name}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function openLeadCommandCenter(router: ReturnType<typeof useRouter>, href: string) {
  navigateToLeadCommandCenter(router, href);
}

function shouldIgnoreLeadNavigationTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('a, button, input, select, textarea, label'));
}

function handleLeadCommandCenterKeyDown(event: KeyboardEvent<HTMLElement>, router: ReturnType<typeof useRouter>, href: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openLeadCommandCenter(router, href);
}

export function LeadsWorkspace({
  currentUserId,
  leads,
  stages,
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
  quoteVersions = [],
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
  storageKey = 'leads-filters',
  canManageLeads = true,
  readOnlyMessage = null,
  isWorkspaceEmpty = false,
  initialQuickCapture = null,
  initialEventId = null,
  initialFastField = false,
}: LeadsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = React.useState<string>('list');
  const [activeLeadId, setActiveLeadId] = React.useState<string | null>(null);
  const [hydratedNowIso, setHydratedNowIso] = React.useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);
  const [todayFilter, setTodayFilter] = useState<TodayFilterKey>(initialTodayState?.activeFilter ?? getPreferredTodayFilter(initialTodayState));
  const [workspaceLeads, setWorkspaceLeads] = useState<LeadRow[]>(leads);
  const [workspaceLeadMarkets, setWorkspaceLeadMarkets] = useState<Array<{ lead_id: string; market_id: string }>>(leadMarkets);
  const [workspaceLeadProductInterests, setWorkspaceLeadProductInterests] = useState<Array<{ lead_id: string; product_id: string }>>(leadProductInterests);
  const [workspaceFollowUps, setWorkspaceFollowUps] = useState<FollowUp[]>(followUps);
  const [savedView, setSavedView] = useState<SavedView>(
    initialLeadType === 'buyer' ? 'buyers' : initialLeadType === 'supplier' ? 'suppliers' : 'all',
  );
  const [localSearch, setLocalSearch] = useState('');
  const [search, setSearch] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState<'' | LeadJourney>(initialLeadType);
  const [ownerId, setOwnerId] = useState('');
  const [pipelineIdFilter, setPipelineIdFilter] = useState('');
  const [stageIdFilter, setStageIdFilter] = useState('');
  const [countryIdFilter, setCountryIdFilter] = useState('');
  const [marketIdFilter, setMarketIdFilter] = useState('');
  const [productIdFilter, setProductIdFilter] = useState('');
  const [tradeEventFilter, setTradeEventFilter] = useState(initialEventId ?? '');
  const [sortMode, setSortMode] = useState<SortMode>('follow-up');
  // SF-18-099: Multi-sort rules
  type SortField = 'follow_up' | 'deal_value' | 'company_name' | 'priority_score' | 'created_at';
  type SortDirection = 'asc' | 'desc';
  type SortRule = { field: SortField; dir: SortDirection };
  const [sortRules, setSortRules] = useState<SortRule[]>([{ field: 'follow_up', dir: 'asc' }]);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  // SF-18-094: Group banner collapse states
  const [criticalCollapsed, setCriticalCollapsed] = useState(false);
  const [todayCollapsed, setTodayCollapsed] = useState(false);
  const [activeCollapsed, setActiveCollapsed] = useState(false);

  const SORT_FIELDS: Array<{ value: SortField; label: string }> = [
    { value: 'follow_up', label: 'Follow-up date' },
    { value: 'deal_value', label: 'Deal value' },
    { value: 'company_name', label: 'Company name' },
    { value: 'priority_score', label: 'Priority score' },
    { value: 'created_at', label: 'Created date' },
  ];
  const [showFilters, setShowFilters] = useState(false);
  // SF-18-100: Advanced filter state
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [advDealMin, setAdvDealMin] = useState('');
  const [advDealMax, setAdvDealMax] = useState('');
  const [advFollowUpTiming, setAdvFollowUpTiming] = useState('');
  const [advHasQuote, setAdvHasQuote] = useState('');
  const [advSourceType, setAdvSourceType] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [batchFollowUpAt, setBatchFollowUpAt] = useState('');
  const [batchNextStepId, setBatchNextStepId] = useState('');
  const [batchState, setBatchState] = useState<FormState>({});
  const [batchStageId, setBatchStageId] = useState('');
  const [batchStageState, setBatchStageState] = useState<FormState>({});
  const [isBatchStagePending, startBatchStageTransition] = useTransition();
  const [deleteState, setDeleteState] = useState<FormState>({});
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: Boolean(initialFastField && initialEventId), mode: 'quick', leadId: null, initialStepId: 'basics' });
  const [spotlightLeadId, setSpotlightLeadId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [isBatchPending, startBatchTransition] = useTransition();
  const [inlineActionState, setInlineActionState] = useState<FormState>({});
  const [inlineFollowUpAt, setInlineFollowUpAt] = useState(getDefaultFollowUpLocalValue());
  const [isInlineActionPending, startInlineActionTransition] = useTransition();

  useEffect(() => {
    const explicitMode = searchParams.get('mode');
    if (!explicitMode && !initialLeadType) {
      setWorkspaceMode('all');
      setLeadTypeFilter('');
      setSavedView('all');
      return;
    }
    setWorkspaceMode(initialMode);
    setLeadTypeFilter(initialLeadType);
    setSavedView(initialLeadType === 'buyer' ? 'buyers' : initialLeadType === 'supplier' ? 'suppliers' : 'all');
  }, [initialLeadType, initialMode, searchParams]);

  useEffect(() => {
    setTodayFilter(initialTodayState?.activeFilter ?? getPreferredTodayFilter(initialTodayState));
  }, [initialTodayState]);

  useEffect(() => {
    if (activeLeadId && workspaceLeads.some((lead) => lead.id === activeLeadId)) return;
    const fallbackLead = workspaceLeads[0] ?? null;
    setActiveLeadId(fallbackLead?.id ?? null);
    setSpotlightLeadId(fallbackLead?.id ?? null);
  }, [activeLeadId, workspaceLeads]);

  useEffect(() => {
    setTradeEventFilter(initialEventId ?? '');
  }, [initialEventId]);

  useEffect(() => {
    setWorkspaceLeads(leads);
  }, [leads]);

  useEffect(() => {
    setWorkspaceLeadMarkets(leadMarkets);
  }, [leadMarkets]);

  useEffect(() => {
    setWorkspaceLeadProductInterests(leadProductInterests);
  }, [leadProductInterests]);

  useEffect(() => {
    setWorkspaceFollowUps(followUps);
  }, [followUps]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const explicitMode = searchParams.get('mode');
      const routeLockedView = initialLeadType === 'buyer' ? 'buyers' : initialLeadType === 'supplier' ? 'suppliers' : null;
      if (parsed.search) { setSearch(parsed.search); setLocalSearch(parsed.search); }
      if (routeLockedView) {
        setSavedView(routeLockedView);
        setLeadTypeFilter(initialLeadType);
      } else if (!explicitMode && !initialLeadType) {
        // Plain /leads must always reopen as All. Do not restore stale buyer/supplier filters.
        setWorkspaceMode('all');
        setSavedView('all');
        setLeadTypeFilter('');
      } else {
        if (parsed.savedView) setSavedView(parsed.savedView as SavedView);
        if (parsed.leadTypeFilter) setLeadTypeFilter(parsed.leadTypeFilter);
      }
      if (parsed.ownerId) setOwnerId(parsed.ownerId);
      if (parsed.pipelineIdFilter) setPipelineIdFilter(parsed.pipelineIdFilter);
      if (parsed.stageIdFilter) setStageIdFilter(parsed.stageIdFilter);
      if (parsed.countryIdFilter) setCountryIdFilter(parsed.countryIdFilter);
      if (parsed.marketIdFilter) setMarketIdFilter(parsed.marketIdFilter);
      if (parsed.productIdFilter) setProductIdFilter(parsed.productIdFilter);
      if (parsed.sortMode) setSortMode(parsed.sortMode as SortMode);
    } catch {}
  }, [initialLeadType, searchParams, storageKey]);

  // URL restore — runs once on mount only, then hands off to localSearch debounce
  const didRestoreFromUrl = useRef(false);
  useEffect(() => {
    if (didRestoreFromUrl.current) return;
    const q = searchParams.get('q') ?? '';
    if (q) { setLocalSearch(q); setSearch(q); }
    didRestoreFromUrl.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce: only apply the search filter 350ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setSearch(localSearch.trim()), 350);
    return () => clearTimeout(timer);
  }, [localSearch]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) params.set('q', search.trim());
    else params.delete('q');
    if (workspaceMode === 'all') params.delete('mode');
    else params.set('mode', workspaceMode);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  // search (debounced) drives URL — not localSearch — preventing per-keystroke re-routes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router, search, workspaceMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      search,
      savedView,
      leadTypeFilter,
      ownerId,
      pipelineIdFilter,
      stageIdFilter,
      countryIdFilter,
      marketIdFilter,
      productIdFilter,
      sortMode,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }, [search, savedView, leadTypeFilter, ownerId, pipelineIdFilter, stageIdFilter, countryIdFilter, marketIdFilter, productIdFilter, sortMode, storageKey]);

  const activityMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of activities) {
      if (!item.lead_id) continue;
      const current = map.get(item.lead_id);
      if (!current || item.occurred_at > current) map.set(item.lead_id, item.occurred_at);
    }
    return map;
  }, [activities]);

  const stageHistoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of stageHistory) {
      if (!item.lead_id) continue;
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
    return new Map(
      stages.map((stage) => [
        stage.id,
        {
          sortOrder: stage.sort_order,
          stageCount: stageCounts.get(stage.pipeline_id) ?? 0,
          isClosed: stage.is_closed,
        },
      ]),
    );
  }, [stages]);

  const readinessByLeadId = useMemo(() => {
    return new Map(
      workspaceLeads.map((lead) => {
        const linkedProductIds = new Set(workspaceLeadProductInterests.filter((item) => item.lead_id === lead.id).map((item) => item.product_id));
        const linkedMarketIds = workspaceLeadMarkets.filter((item) => item.lead_id === lead.id).map((item) => item.market_id);
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
          rules: documentRequirementRules as DocumentRequirementRule[],
          leadType: lead.lead_type,
          marketIds: linkedMarketIds,
          productIds: Array.from(linkedProductIds),
          documents: linkedLeadDocuments,
          scope: 'quote_send',
        });
        const combinedReadiness: LeadCommercialReadiness = {
          ...readiness,
          blockerCount: readiness.blockerCount + documentState.blockerCount,
          blockerReasons: [...documentState.blockerReasons, ...readiness.blockerReasons],
        };
        return [lead.id, combinedReadiness] as [string, LeadCommercialReadiness];
      }),
    );
  }, [workspaceLeads, workspaceLeadMarkets, workspaceLeadProductInterests, products, documents, documentRequirementRules, variants, prices, pricingRules, rfqs, quotes, complianceItems]);


  const activeJourney = initialLeadType ? JOURNEY_COPY[initialLeadType] : null;
  const availablePipelines = useMemo(
    () =>
      !leadTypeFilter
        ? pipelines
        : pipelines.filter((pipeline) => isPipelineInJourney(pipeline.lead_type, leadTypeFilter)),
    [pipelines, leadTypeFilter],
  );

  const availableStages = useMemo(() => {
    if (!leadTypeFilter) return stages;
    const allowedPipelineIds = new Set(availablePipelines.map((pipeline) => pipeline.id));
    return stages.filter((stage) => allowedPipelineIds.has(stage.pipeline_id));
  }, [availablePipelines, leadTypeFilter, stages]);

  const selectedPipelines = useMemo(() => {
    const pipelineSet = new Set<string>();
    for (const leadId of selectedLeadIds) {
      const lead = leads.find((l) => l.id === leadId);
      if (lead?.pipeline_id) pipelineSet.add(lead.pipeline_id);
    }
    return Array.from(pipelineSet);
  }, [selectedLeadIds, leads]);

  const availableBatchStages = useMemo(() => {
    if (selectedPipelines.length === 1) {
      return availableStages.filter((stage) => stage.pipeline_id === selectedPipelines[0]);
    }
    return availableStages;
  }, [availableStages, selectedPipelines]);

  useEffect(() => {
    if (batchStageId && !availableBatchStages.some((stage) => stage.id === batchStageId)) {
      setBatchStageId('');
    }
  }, [availableBatchStages, batchStageId]);

  useEffect(() => {
    setBatchFollowUpAt(getDefaultFollowUpLocalValue());
    setBatchNextStepId(
      nextSteps.find((step) => step.name.toLowerCase() === 'send introduction')?.id ??
        nextSteps[0]?.id ??
        '',
    );
  }, [nextSteps]);

  useEffect(() => {
    setHydratedNowIso(new Date().toISOString());
  }, []);

  const stableNowIso = hydratedNowIso ?? initialTodayState?.updatedAtIso ?? '2026-04-24T00:00:00.000Z';

  useEffect(() => {
    setVisibleCount(50);
    setSelectedLeadIds((current) =>
      current.filter((leadId) => workspaceLeads.some((lead) => lead.id === leadId)),
    );
  }, [workspaceLeads]);

  useEffect(() => {
    setSpotlightLeadId((current) => current ?? workspaceLeads[0]?.id ?? null);
  }, [workspaceLeads]);

  const stageMap = useMemo(() => new Map(availableStages.map((stage) => [stage.id, stage.name])), [availableStages]);
  const nextStepMap = useMemo(() => new Map(nextSteps.map((step) => [step.id, step.name])), [nextSteps]);
  const ownerMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, labelForProfile(profile)])), [profiles]);
  const tradeEventMap = useMemo(() => new Map(tradeEvents.map((event) => [event.id, event.name])), [tradeEvents]);

  const leadMarketsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of workspaceLeadMarkets) {
      map.set(item.lead_id, [...(map.get(item.lead_id) ?? []), item.market_id]);
    }
    return map;
  }, [workspaceLeadMarkets]);

  const leadProductsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of workspaceLeadProductInterests) {
      map.set(item.lead_id, [...(map.get(item.lead_id) ?? []), item.product_id]);
    }
    return map;
  }, [workspaceLeadProductInterests]);

  const savedViewsBase: Array<{ id: SavedView; label: string; description: string }> = activeJourney
    ? [
        { id: activeJourney.key === 'buyer' ? 'buyers' : 'suppliers', label: activeJourney.queueLabel, description: `${activeJourney.pluralLabel} only, with dedicated journey copy and defaults.` },
        { id: 'mine', label: `My ${activeJourney.pluralLabel}`, description: `Records assigned to the current operator inside the ${activeJourney.label.toLowerCase()} journey.` },
        { id: 'overdue', label: 'Overdue', description: `Urgent ${activeJourney.label.toLowerCase()} follow-ups that need immediate recovery.` },
        { id: 'today', label: 'Due Today', description: `${activeJourney.label} commitments due in the current working window.` },
        { id: 'trade-event', label: 'Trade Event', description: `${activeJourney.label} records tied to exhibitions, fairs, or field capture.` },
      ]
    : [
        { id: 'all', label: 'All Leads', description: 'Full commercial queue across buyer and supplier journeys.' },
        { id: 'mine', label: 'My Leads', description: 'Records assigned to the current operator.' },
        { id: 'overdue', label: 'Overdue', description: 'Follow-ups that need immediate recovery.' },
        { id: 'today', label: 'Due Today', description: 'Commitments due in the current working window.' },
        { id: 'trade-event', label: 'Trade Event', description: 'Leads tied to exhibitions, fairs, or field capture.' },
        { id: 'buyers', label: 'Buyers', description: 'Demand-side journey with buyer-specific context.' },
        { id: 'suppliers', label: 'Suppliers', description: 'Supply-side journey with supplier-specific context.' },
      ];

  const todayState = useMemo(() => buildTodayLayerState({
    mode: workspaceMode,
    activeFilter: todayFilter,
    nowIso: stableNowIso,
    leads: workspaceLeads,
    activities,
    complianceItems,
  }), [activities, complianceItems, stableNowIso, todayFilter, workspaceLeads, workspaceMode]);
  const todayLeadIdSet = useMemo(() => new Set(todayState.filteredLeadIds), [todayState.filteredLeadIds]);

  const preparedLeads = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return workspaceLeads.filter((lead) => {
      const followUpState = getStableFollowUpVisualState(lead.next_follow_up_at, stableNowIso);
      const savedViewMatches = () => {
        if (savedView === 'all') return true;
        if (savedView === 'mine') return lead.owner_user_id === currentUserId;
        if (savedView === 'overdue') return followUpState === 'overdue';
        if (savedView === 'today') return followUpState === 'today';
        if (savedView === 'trade-event') return Boolean(lead.trade_event_id);
        if (savedView === 'buyers') return lead.lead_type === 'buyer';
        if (savedView === 'suppliers') return lead.lead_type === 'supplier';
        return true;
      };
      const matchesSavedView = savedViewMatches();

      const matchesSearch =
        !needle ||
        [lead.company_name, lead.contact_name ?? '', lead.email ?? '', lead.country ?? '']
          .some((value) => value.toLowerCase().includes(needle));

      const matchesPipeline = !pipelineIdFilter || lead.pipeline_id === pipelineIdFilter;
      const matchesStage = !stageIdFilter || lead.stage_id === stageIdFilter;
      const matchesCountry = !countryIdFilter || lead.country_id === countryIdFilter;
      const matchesMarket = !marketIdFilter || (leadMarketsMap.get(lead.id)?.includes(marketIdFilter) ?? false);
      const matchesProduct = !productIdFilter || (leadProductsMap.get(lead.id)?.includes(productIdFilter) ?? false);
      const matchesTradeEvent = !tradeEventFilter || lead.trade_event_id === tradeEventFilter;

      const matchesFilters =
        (!leadTypeFilter || lead.lead_type === leadTypeFilter) &&
        (!ownerId || lead.owner_user_id === ownerId) &&
        matchesPipeline &&
        matchesStage &&
        matchesCountry &&
        matchesMarket &&
        matchesProduct &&
        matchesTradeEvent;

      const matchesToday = todayFilter === 'all-open' ? true : todayLeadIdSet.has(lead.id);
      // SF-18-100: Advanced filters
      const matchesAdvanced = (
        (!advDealMin || (lead.deal_value ?? 0) >= Number(advDealMin)) &&
        (!advDealMax || (lead.deal_value ?? 0) <= Number(advDealMax)) &&
        (!advFollowUpTiming || (() => {
          const fs = getStableFollowUpVisualState(lead.next_follow_up_at, stableNowIso);
          if (advFollowUpTiming === 'overdue') return fs === 'overdue';
          if (advFollowUpTiming === 'today') return fs === 'today';
          if (advFollowUpTiming === 'unscheduled') return !lead.next_follow_up_at;
          return true;
        })()) &&
        (!advSourceType || lead.source_type === advSourceType)
      );
      return matchesSavedView && matchesSearch && matchesFilters && matchesToday && matchesAdvanced;
    });
  }, [currentUserId, leadTypeFilter, ownerId, savedView, search, pipelineIdFilter, stageIdFilter, countryIdFilter, marketIdFilter, productIdFilter, tradeEventFilter, todayFilter, todayLeadIdSet, workspaceLeads, leadMarketsMap, leadProductsMap, stableNowIso, advDealMin, advDealMax, advFollowUpTiming, advSourceType]);

  // SF-18-101: Feed live context to Guru widget
  const overdueCountForGuru = preparedLeads.filter(l => getStableFollowUpVisualState(l.next_follow_up_at, stableNowIso) === 'overdue').length;
  const dueTodayCountForGuru = preparedLeads.filter(l => getStableFollowUpVisualState(l.next_follow_up_at, stableNowIso) === 'today').length;
  const revenueAtRiskForGuru = preparedLeads.filter(l => getStableFollowUpVisualState(l.next_follow_up_at, stableNowIso) === 'overdue').reduce((s, l) => s + (l.deal_value ?? 0), 0);
  useEffect(() => {
    setSetuGuruWorkspaceContext({
      totalLeads: workspaceLeads.length,
      overdueLeads: overdueCountForGuru,
      dueTodayLeads: dueTodayCountForGuru,
      revenueAtRisk: revenueAtRiskForGuru,
      visibleLeadCount: preparedLeads.length,
      activeFilterCount: activeFilterChips.length,
      activeFilters: activeFilterChips.map(f => f.label),
      activeSorts: sortRules.map((r, i) => `${i + 1}: ${r.field.replace('_', ' ')} ${r.dir === 'asc' ? '↑' : '↓'}`),
    });
  }, [workspaceLeads.length, overdueCountForGuru, dueTodayCountForGuru, revenueAtRiskForGuru, preparedLeads.length]);

  const sortedLeads = useMemo(() => {
    const items = [...preparedLeads];
    // SF-18-099: Apply multi-sort rules first if more than default
    if (sortRules.length > 1 || (sortRules[0] && sortRules[0].field !== 'follow_up')) {
      items.sort((a, b) => {
        for (const rule of sortRules) {
          let cmp = 0;
          if (rule.field === 'follow_up') {
            const av = a.next_follow_up_at ?? '9999'; const bv = b.next_follow_up_at ?? '9999';
            cmp = av < bv ? -1 : av > bv ? 1 : 0;
          } else if (rule.field === 'deal_value') {
            cmp = (a.deal_value ?? 0) - (b.deal_value ?? 0);
          } else if (rule.field === 'company_name') {
            cmp = a.company_name.localeCompare(b.company_name);
          } else if (rule.field === 'created_at') {
            cmp = (a.created_at ?? '').localeCompare(b.created_at ?? '');
          }
          if (rule.dir === 'desc') cmp = -cmp;
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
      return items;
    }
    items.sort((left, right) => {
      if (sortMode === 'created') {
        return (right.created_at ?? '').localeCompare(left.created_at ?? '');
      }
      if (sortMode === 'company') {
        return left.company_name.localeCompare(right.company_name);
      }
      if (sortMode === 'health') {
        const leftStageMeta = left.stage_id ? stageMetaMap.get(left.stage_id) : null;
        const rightStageMeta = right.stage_id ? stageMetaMap.get(right.stage_id) : null;
        const leftHealth = computeLeadHealth({
          created_at: left.created_at,
          updated_at: left.updated_at,
          last_contacted_at: left.last_contacted_at,
          next_follow_up_at: left.next_follow_up_at,
          lastActivityAt: activityMap.get(left.id),
          lastStageChangeAt: stageHistoryMap.get(left.id),
          stageSortOrder: leftStageMeta?.sortOrder ?? null,
          stageCount: leftStageMeta?.stageCount ?? null,
          isClosedStage: leftStageMeta?.isClosed ?? null,
        });
        const rightHealth = computeLeadHealth({
          created_at: right.created_at,
          updated_at: right.updated_at,
          last_contacted_at: right.last_contacted_at,
          next_follow_up_at: right.next_follow_up_at,
          lastActivityAt: activityMap.get(right.id),
          lastStageChangeAt: stageHistoryMap.get(right.id),
          stageSortOrder: rightStageMeta?.sortOrder ?? null,
          stageCount: rightStageMeta?.stageCount ?? null,
          isClosedStage: rightStageMeta?.isClosed ?? null,
        });
        const healthComparison = compareLeadHealthPriority(leftHealth, rightHealth);
        if (healthComparison !== 0) return healthComparison;
      }
      const leftValue = left.next_follow_up_at ?? '9999-12-31T23:59:59.999Z';
      const rightValue = right.next_follow_up_at ?? '9999-12-31T23:59:59.999Z';
      const followUpComparison = leftValue.localeCompare(rightValue);
      if (followUpComparison !== 0) return followUpComparison;
      return (right.created_at ?? '').localeCompare(left.created_at ?? '');
    });
    return items;
  }, [activityMap, preparedLeads, sortMode, sortRules, stageHistoryMap, stageMetaMap]);

  const visibleLeads = useMemo(() => sortedLeads.slice(0, visibleCount), [sortedLeads, visibleCount]);

  useEffect(() => {
    setSelectedLeadIds((current) =>
      current.filter((leadId) => visibleLeads.some((lead) => lead.id === leadId)),
    );
  }, [visibleLeads]);

  useEffect(() => {
    if (!visibleLeads.length) {
      setSpotlightLeadId(null);
      return;
    }
    setSpotlightLeadId((current) =>
      current && visibleLeads.some((lead) => lead.id === current) ? current : visibleLeads[0]?.id ?? null,
    );
  }, [visibleLeads]);

  const summary = useMemo(
    () => ({
      overdue: sortedLeads.filter((lead) => getStableFollowUpVisualState(lead.next_follow_up_at, stableNowIso) === 'overdue').length,
      dueToday: sortedLeads.filter((lead) => getStableFollowUpVisualState(lead.next_follow_up_at, stableNowIso) === 'today').length,
      unassigned: sortedLeads.filter((lead) => !lead.owner_user_id).length,
      hot: sortedLeads.filter((lead) => {
        const health = computeLeadHealth({
          created_at: lead.created_at,
          updated_at: lead.updated_at,
          last_contacted_at: lead.last_contacted_at,
          next_follow_up_at: lead.next_follow_up_at,
          lastActivityAt: activityMap.get(lead.id),
          lastStageChangeAt: stageHistoryMap.get(lead.id),
          stageSortOrder: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.sortOrder ?? null : null,
          stageCount: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.stageCount ?? null : null,
          isClosedStage: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.isClosed ?? null : null,
        });
        const readiness = readinessByLeadId.get(lead.id);
        return (health === 'fresh' || health === 'overdue') && (readiness?.pricingReadiness === 'ready' || (readiness?.blockerCount ?? 0) === 0);
      }).length,
      atRisk: sortedLeads.filter((lead) =>
        computeLeadHealth({
          created_at: lead.created_at,
          updated_at: lead.updated_at,
          last_contacted_at: lead.last_contacted_at,
          next_follow_up_at: lead.next_follow_up_at,
          lastActivityAt: activityMap.get(lead.id),
          lastStageChangeAt: stageHistoryMap.get(lead.id),
          stageSortOrder: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.sortOrder ?? null : null,
          stageCount: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.stageCount ?? null : null,
          isClosedStage: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.isClosed ?? null : null,
        }).includes('at_risk'),
      ).length,
      pricingBlocked: sortedLeads.filter((lead) => {
        const readiness = readinessByLeadId.get(lead.id);
        return Boolean((readiness?.missingLinkedProductCount ?? 0) || (readiness?.missingRfqLineCount ?? 0) || (readiness?.missingQuoteLineCount ?? 0));
      }).length,
      blocked: sortedLeads.filter((lead) => (readinessByLeadId.get(lead.id)?.blockerCount ?? 0) > 0).length,
    }),
    [sortedLeads, activityMap, stageHistoryMap, stageMetaMap, readinessByLeadId, stableNowIso],
  );

  const todaysActions = useMemo(() => {
    return sortedLeads.filter((lead) => {
      const followUpState = getStableFollowUpVisualState(lead.next_follow_up_at, stableNowIso);
      return followUpState === 'overdue' || followUpState === 'today';
    });
  }, [sortedLeads, stableNowIso]);

  const actionPreview = useMemo(() => todaysActions.slice(0, actionsExpanded ? 10 : 3), [actionsExpanded, todaysActions]);

  const savedViews = useMemo(
    () =>
      savedViewsBase.map((view) => ({
        ...view,
        count: workspaceLeads.filter((lead) => {
          const followUpState = getStableFollowUpVisualState(lead.next_follow_up_at, stableNowIso);
          return (
            view.id === 'all' ||
            (view.id === 'mine' && lead.owner_user_id === currentUserId) ||
            (view.id === 'overdue' && followUpState === 'overdue') ||
            (view.id === 'today' && followUpState === 'today') ||
            (view.id === 'trade-event' && Boolean(lead.trade_event_id)) ||
            (view.id === 'buyers' && lead.lead_type === 'buyer') ||
            (view.id === 'suppliers' && lead.lead_type === 'supplier')
          );
        }).length,
      })),
    [currentUserId, workspaceLeads, stableNowIso],
  );

  const selectedLead = useMemo(() => {
    if (!drawerState.leadId) return undefined;
    return workspaceLeads.find((lead) => lead.id === drawerState.leadId);
  }, [drawerState.leadId, workspaceLeads]);


  const initialEventLead = useMemo<LeadDrawerLead | undefined>(() => {
    if (!initialFastField || !initialEventId || drawerState.leadId) return undefined;
    return {
      id: '',
      company_name: '',
      contact_name: null,
      job_title: null,
      email: null,
      phone: null,
      whatsapp_number: null,
      phone_secondary: null,
      lead_type: 'buyer',
      country: null,
      country_id: null,
      source_type: initialQuickCapture?.sourceType ?? null,
      source_label: initialQuickCapture?.sourceLabel ?? null,
      next_follow_up_at: null,
      created_at: null,
      updated_at: null,
      last_contacted_at: null,
      stage_id: null,
      next_step_id: null,
      owner_user_id: null,
      trade_event_id: initialEventId,
      notes: null,
      website: null,
      social_handle: null,
      deal_value: null,
      deal_currency: null,
      pipeline_id: null,
      intro_sent: false,
      phone_country_code: null,
      phone_secondary_country_code: null,
    };
  }, [drawerState.leadId, initialEventId, initialFastField, initialQuickCapture?.sourceLabel, initialQuickCapture?.sourceType]);

  const spotlightLead = useMemo(() => {
    const preferredId = spotlightLeadId ?? selectedLeadIds[0] ?? sortedLeads[0]?.id ?? null;
    return sortedLeads.find((lead) => lead.id === preferredId) ?? sortedLeads[0];
  }, [selectedLeadIds, sortedLeads, spotlightLeadId]);

  const handleLeadSaved = ({ resetForNextLead, lead, selectedMarketIds, selectedProductIds }: LeadDrawerSavePayload) => {
    if (lead) {
      setWorkspaceLeads((current) => {
        const existingIndex = current.findIndex((item) => item.id === lead.id);
        if (existingIndex === -1) return [lead, ...current];
        const next = [...current];
        next[existingIndex] = lead;
        return next;
      });
      if (selectedMarketIds) {
        setWorkspaceLeadMarkets((current) => [
          ...current.filter((item) => item.lead_id !== lead.id),
          ...selectedMarketIds.map((marketId) => ({ lead_id: lead.id, market_id: marketId })),
        ]);
      }
      if (selectedProductIds) {
        setWorkspaceLeadProductInterests((current) => [
          ...current.filter((item) => item.lead_id !== lead.id),
          ...selectedProductIds.map((productId) => ({ lead_id: lead.id, product_id: productId })),
        ]);
      }
      setWorkspaceFollowUps((current) => {
        const completed = current.filter((item) => item.lead_id === lead.id && item.status === 'completed');
        const others = current.filter((item) => item.lead_id !== lead.id);
        const scheduled = lead.next_follow_up_at ? [{ id: `local-follow-up-${lead.id}`, lead_id: lead.id, scheduled_at: lead.next_follow_up_at, status: 'scheduled' } as FollowUp] : [];
        return [...others, ...completed, ...scheduled];
      });
      setSpotlightLeadId(lead.id);
    }

    const needsCoverageAfterQuickLead = drawerState.mode === 'quick' && lead && (!selectedProductIds || selectedProductIds.length === 0);
    if (needsCoverageAfterQuickLead) {
      setActiveLeadId(lead.id);
      setActiveView('cc');
      setDrawerState({ open: true, mode: 'full', leadId: lead.id, initialStepId: 'coverage' });
      return;
    }

    if (drawerState.mode === 'quick' && resetForNextLead) {
      setDrawerState({ open: true, mode: 'quick', leadId: null, initialStepId: 'basics' });
      return;
    }

    setDrawerState((current) => ({ ...current, open: false, leadId: lead?.id ?? current.leadId }));
  };


  // SF-18-093: max deal value for priority score normalisation
  const maxDealValue = useMemo(() =>
    Math.max(0, ...visibleLeads.map(l => l.deal_value ?? 0)),
    [visibleLeads]
  );

  const groupedLeadSections = useMemo(() => {
    const groups: Array<{ id: 'critical' | 'due-today' | 'active'; label: string; leads: LeadRow[] }> = [
      { id: 'critical', label: 'Critical — needs action now', leads: [] },
      { id: 'due-today', label: 'Due today — keep momentum', leads: [] },
      { id: 'active', label: 'Active — next best queue', leads: [] },
    ];

    for (const lead of visibleLeads) {
      const readiness = readinessByLeadId.get(lead.id);
      const followUpState = getStableFollowUpVisualState(lead.next_follow_up_at, stableNowIso);
      if ((readiness?.blockerCount ?? 0) > 0 || followUpState === 'overdue') groups[0].leads.push(lead);
      else if (followUpState === 'today') groups[1].leads.push(lead);
      else groups[2].leads.push(lead);
    }

    return groups.filter((group) => group.leads.length > 0);
  }, [readinessByLeadId, visibleLeads]);

  const handleBatchFollowUpSubmit = () => {
    const formData = new FormData();
    selectedLeadIds.forEach((leadId) => formData.append('lead_ids', leadId));
    formData.set('scheduled_at', batchFollowUpAt);
    formData.set('next_step_id', batchNextStepId);
    setBatchState({});
    startBatchTransition(() => {
      void batchScheduleLeadFollowUps(undefined, formData).then((result) => {
        setBatchState(result ?? {});
        if (result?.success) {
          setSelectedLeadIds([]);
          setBatchFollowUpAt('');
          setBatchNextStepId('');
          router.refresh();
        }
      });
    });
  };

  const handleBatchStageSubmit = () => {
    const formData = new FormData();
    selectedLeadIds.forEach((leadId) => formData.append('lead_ids', leadId));
    formData.set('stage_id', batchStageId);
    setBatchStageState({});
    startBatchStageTransition(() => {
      void batchMoveLeadsToStage(undefined, formData).then((result) => {
        setBatchStageState(result ?? {});
        if (result?.success) {
          setSelectedLeadIds([]);
          setBatchStageId('');
          router.refresh();
        }
      });
    });
  };


  const handleDeleteLead = (leadId: string, companyName: string) => {
    if (!canManageLeads) return;
    const confirmed = window.confirm(`Delete lead "${companyName}"? This removes the lead and related CRM history from the workspace.`);
    if (!confirmed) return;
    const formData = new FormData();
    formData.set('lead_id', leadId);
    setDeleteState({});
    startDeleteTransition(() => {
      void deleteLead(undefined, formData).then((result) => {
        setDeleteState(result ?? {});
        if (result?.success) {
          setWorkspaceLeads((current) => current.filter((lead) => lead.id !== leadId));
          setWorkspaceLeadMarkets((current) => current.filter((item) => item.lead_id !== leadId));
          setWorkspaceLeadProductInterests((current) => current.filter((item) => item.lead_id !== leadId));
          setWorkspaceFollowUps((current) => current.filter((item) => item.lead_id !== leadId));
          setSelectedLeadIds((current) => current.filter((id) => id !== leadId));
          if (activeLeadId === leadId) {
            setActiveView('list');
            setActiveLeadId(null);
          }
          setSpotlightLeadId((current) => current === leadId ? null : current);
          router.refresh();
        }
      });
    });
  };

  const handleBatchDeleteLeads = () => {
    if (!canManageLeads || selectedLeadIds.length === 0) return;
    const confirmed = window.confirm(`Delete ${selectedLeadIds.length} selected lead${selectedLeadIds.length === 1 ? '' : 's'}? This removes their related CRM history from the workspace.`);
    if (!confirmed) return;
    const formData = new FormData();
    selectedLeadIds.forEach((leadId) => formData.append('lead_ids', leadId));
    const idsToDelete = new Set(selectedLeadIds);
    setDeleteState({});
    startDeleteTransition(() => {
      void batchDeleteLeads(undefined, formData).then((result) => {
        setDeleteState(result ?? {});
        if (result?.success) {
          setWorkspaceLeads((current) => current.filter((lead) => !idsToDelete.has(lead.id)));
          setWorkspaceLeadMarkets((current) => current.filter((item) => !idsToDelete.has(item.lead_id)));
          setWorkspaceLeadProductInterests((current) => current.filter((item) => !idsToDelete.has(item.lead_id)));
          setWorkspaceFollowUps((current) => current.filter((item) => !idsToDelete.has(item.lead_id ?? '')));
          setSelectedLeadIds([]);
          if (activeLeadId && idsToDelete.has(activeLeadId)) {
            setActiveView('list');
            setActiveLeadId(null);
          }
          setSpotlightLeadId((current) => current && idsToDelete.has(current) ? null : current);
          router.refresh();
        }
      });
    });
  };
 
  const openLeadInlineCommandCenter = (leadId: string) => {
    setActiveLeadId(leadId);
    setSpotlightLeadId(leadId);
    setActiveView('cc');
  };

  const openLeadInlineQuoteBuilder = (leadId: string) => {
    setActiveLeadId(leadId);
    setSpotlightLeadId(leadId);
    setActiveView('quote');
  };

  const openLeadEditDrawer = (leadId: string, stepId: LeadOpenStep = 'basics') => {
    if (!canManageLeads) return;
    setActiveLeadId(leadId);
    setSpotlightLeadId(leadId);
    setDrawerState({ open: true, mode: 'full', leadId, initialStepId: stepId });
  };

  const handleInlineScheduleFollowUp = (leadId: string, scheduledAt: string) => {
    if (!scheduledAt) {
      setInlineActionState({ error: 'Choose a follow-up date and time.' });
      return;
    }
    const formData = new FormData();
    formData.set('lead_id', leadId);
    formData.set('scheduled_at', scheduledAt);
    setInlineActionState({});
    startInlineActionTransition(() => {
      void scheduleLeadFollowUp(undefined, formData).then((result) => {
        setInlineActionState(result ?? {});
        if (result?.success) router.refresh();
      });
    });
  };

  const handleInlineCompleteFollowUp = (leadId: string, followUpId?: string | null) => {
    if (!followUpId) {
      setInlineActionState({ error: 'No active follow-up is available to complete.' });
      return;
    }
    const formData = new FormData();
    formData.set('lead_id', leadId);
    formData.set('follow_up_id', followUpId);
    setInlineActionState({});
    startInlineActionTransition(() => {
      void completeLeadFollowUp(undefined, formData).then((result) => {
        setInlineActionState(result ?? {});
        if (result?.success) router.refresh();
      });
    });
  };

  const handleInlineMoveLeadToStage = (leadId: string, stageId: string) => {
    const formData = new FormData();
    formData.append('lead_ids', leadId);
    formData.set('stage_id', stageId);
    setInlineActionState({});
    startInlineActionTransition(() => {
      void batchMoveLeadsToStage(undefined, formData).then((result) => {
        setInlineActionState(result ?? {});
        if (result?.success) router.refresh();
      });
    });
  };

  const handleInlineOpenOrCreateQuote = (leadId: string, preview?: QuotePreviewSavePayload) => {
    openLeadInlineQuoteBuilder(leadId);
    setInlineActionState({});
    startInlineActionTransition(() => {
      const action = preview ? saveLeadQuoteDraftPreview({ leadId, ...preview }) : openOrCreateLeadQuoteDraft(leadId);
      void action.then((result) => {
        setInlineActionState(result ?? {});
        if (result?.success) router.refresh();
      });
    });
  };

  const handleInlineRequestQuoteApproval = (leadId: string, quoteId?: string | null) => {
    setInlineActionState({});
    startInlineActionTransition(() => {
      void recordLeadQuoteApprovalRequest({
        leadId,
        quoteId: quoteId ?? null,
        note: 'Owner approval requested from the inline Leads Quote Preview.',
      }).then((result) => {
        setInlineActionState(result ?? {});
        if (result?.success) router.refresh();
      });
    });
  };

  const handleInlineApproveQuoteAdjustment = (leadId: string, quoteId?: string | null) => {
    if (!quoteId) {
      setInlineActionState({ error: 'Create or open a quote draft before approving.' });
      return;
    }
    setInlineActionState({});
    startInlineActionTransition(() => {
      void approveLeadQuoteAdjustment({
        leadId,
        quoteId,
        note: 'Owner/admin approved quote-only adjustment from Follow-up approval queue.',
      }).then((result) => {
        setInlineActionState(result ?? {});
        if (result?.success) router.refresh();
      });
    });
  };

  const handleInlineRejectQuoteAdjustment = (leadId: string, quoteId?: string | null) => {
    if (!quoteId) {
      setInlineActionState({ error: 'Create or open a quote draft before rejecting.' });
      return;
    }
    const note = window.prompt('Reason for rejecting this quote adjustment?') ?? '';
    if (!note.trim()) {
      setInlineActionState({ error: 'Add a rejection reason before sending it back for revision.' });
      return;
    }
    setInlineActionState({});
    startInlineActionTransition(() => {
      void rejectLeadQuoteAdjustment({ leadId, quoteId, note }).then((result) => {
        setInlineActionState(result ?? {});
        if (result?.success) router.refresh();
      });
    });
  };

  const handleInlineMarkDirectOrder = (leadId: string, quoteId?: string | null, notes?: string | null) => {
    if (!quoteId) {
      setInlineActionState({ error: 'Create or open a quote draft before marking a direct order.' });
      return;
    }
    const formData = new FormData();
    formData.set('quote_id', quoteId);
    formData.set('notes', notes?.trim() || 'Marked as direct order from inline quote send gate.');
    setInlineActionState({});
    startInlineActionTransition(() => {
      void markQuoteAsDirectOrder(undefined, formData).then((result) => {
        setInlineActionState(result ?? {});
        if (result?.success) router.refresh();
      });
    });
  };

  const selectedAllVisible =
    visibleLeads.length > 0 && visibleLeads.every((lead) => selectedLeadIds.includes(lead.id));

  const safeFormatDateTime = (value?: string | null) => {
    if (!value) return '—';
    return formatDateTime(value);
  };

  const openQuickAdd = () => {
    if (!canManageLeads) return;
    setDrawerState({ open: true, mode: 'quick', leadId: null, initialStepId: 'basics' });
  };
  const openFullAdd = () => {
    if (!canManageLeads) return;
    setDrawerState({ open: true, mode: 'full', leadId: null, initialStepId: 'basics' });
  };
  const closeDrawer = () => {
    setDrawerState((current) => ({ ...current, open: false }));
    setInlineActionState({});
  };

  // ---------------------------------------------------------------------------
  // PR03 realignment: leads topbar mode switch and vCard button helpers
  // Determine the current mode from the leadTypeFilter. `all` corresponds to no
  // specific filter, `buyers` for buyer-only, and `suppliers` for supplier-only.
  const currentMode: 'all' | 'buyers' | 'suppliers' =
    leadTypeFilter === 'buyer' ? 'buyers' : leadTypeFilter === 'supplier' ? 'suppliers' : 'all';

  /**
   * Handle mode switch toggles. Updates the lead type filter and saved view
   * simultaneously so the rest of the workspace reflects the new mode.
   */
  const handleModeSwitch = (mode: 'all' | 'buyers' | 'suppliers') => {
    switch (mode) {
      case 'buyers':
        setLeadTypeFilter('buyer');
        setSavedView('buyers');
        break;
      case 'suppliers':
        setLeadTypeFilter('supplier');
        setSavedView('suppliers');
        break;
      default:
        setWorkspaceMode('all');
        setLeadTypeFilter('');
        setSavedView('all');
        setTodayFilter('all-open');
        break;
    }
  };


  useEffect(() => {
    const requestedLeadId = searchParams.get('leadId');
    const requestedView = searchParams.get('view');
    if (!requestedLeadId || (requestedView !== 'cc' && requestedView !== 'quote')) return;
    setActiveLeadId(requestedLeadId);
    setSpotlightLeadId(requestedLeadId);
    setActiveView(requestedView);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('leadId');
    params.delete('view');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if ((!initialQuickCapture && !initialFastField) || !canManageLeads) return;
    setDrawerState((current) => (current.open ? current : { open: true, mode: 'quick', leadId: null, initialStepId: 'basics' }));
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    for (const key of ['quickLead', 'autoQuote', 'productId', 'sourceType', 'sourceLabel', 'eventId']) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [canManageLeads, initialFastField, initialQuickCapture, pathname, router, searchParams]);

  const handleTradeEventFilterChange = (eventId: string) => {
    setTradeEventFilter(eventId);
    const params = new URLSearchParams(searchParams.toString());
    if (eventId) {
      params.set('eventId', eventId);
    } else {
      params.delete('eventId');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearFilters = () => {
    setWorkspaceMode('all');
    setLeadTypeFilter('');
    setSavedView('all');
    setTodayFilter('all-open');
    setOwnerId('');
    setPipelineIdFilter('');
    setStageIdFilter('');
    setCountryIdFilter('');
    setMarketIdFilter('');
    setProductIdFilter('');
    handleTradeEventFilterChange('');
    // SF-18-091 fix: also clear search so the chip is removed by Clear All
    setSearch('');
    setLocalSearch('');
    setAdvDealMin(''); setAdvDealMax(''); setAdvFollowUpTiming(''); setAdvHasQuote(''); setAdvSourceType('');
  };

  const resetWorkspaceChrome = () => {
    setLocalSearch('');
    clearFilters(); // clearFilters now calls setSearch('') + setLocalSearch('')
    setShowFilters(false);
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId],
    );
  };

  const toggleVisibleSelection = () => {
    if (selectedAllVisible) {
      setSelectedLeadIds((current) =>
        current.filter((leadId) => !visibleLeads.some((lead) => lead.id === leadId)),
      );
      return;
    }

    setSelectedLeadIds((current) => [...new Set([...current, ...visibleLeads.map((lead) => lead.id)])]);
  };

  useEffect(() => {
    if (activeView !== 'quote') return;
    window.requestAnimationFrame(() => {
      document.getElementById('inline-lead-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeView, activeLeadId]);

  const activeFilterCount = [
    leadTypeFilter,
    ownerId,
    pipelineIdFilter,
    stageIdFilter,
    countryIdFilter,
    marketIdFilter,
    productIdFilter,
    tradeEventFilter,
  ].filter(Boolean).length;


  const activeFilterChips = [
    search ? { key: 'search', label: `Search: ${search}`, clear: () => setSearch('') } : null,
    leadTypeFilter ? { key: 'type', label: `Mode: ${leadTypeFilter === 'buyer' ? 'Buyers' : 'Suppliers'}`, clear: () => { setLeadTypeFilter(''); setSavedView('all'); } } : null,
    ownerId ? { key: 'owner', label: `Owner: ${ownerMap.get(ownerId) ?? 'Selected owner'}`, clear: () => setOwnerId('') } : null,
    stageIdFilter ? { key: 'stage', label: `Stage: ${stageMap.get(stageIdFilter) ?? 'Selected stage'}`, clear: () => setStageIdFilter('') } : null,
    countryIdFilter ? { key: 'country', label: `Country: ${countries.find((country) => country.id === countryIdFilter)?.name ?? 'Selected country'}`, clear: () => setCountryIdFilter('') } : null,
    marketIdFilter ? { key: 'market', label: `Market: ${markets.find((market) => market.id === marketIdFilter)?.name ?? 'Selected market'}`, clear: () => setMarketIdFilter('') } : null,
    productIdFilter ? { key: 'product', label: `Product: ${products.find((product) => product.id === productIdFilter)?.name ?? 'Selected product'}`, clear: () => setProductIdFilter('') } : null,
    tradeEventFilter ? { key: 'event', label: `Source event: ${tradeEventMap.get(tradeEventFilter) ?? 'Selected event'}`, clear: () => handleTradeEventFilterChange('') } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  const inlineNoticeTitle = inlineActionState.error ? 'Action failed' : inlineActionState.success ? 'Action saved' : '';
  const inlineNoticeDescription = inlineActionState.error ?? inlineActionState.success ?? '';

  return (
    <div className="mobile-premium-leads flex flex-col">
      <InlineCoverageResolverRuntime />
      {inlineNoticeDescription ? (
        <NoticeToast title={inlineNoticeTitle} description={inlineNoticeDescription} tone={inlineActionState.error ? 'danger' : 'success'} />
      ) : null}

      {/* ═══ PAGE NAV TABS — inline view switcher ═══ */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: activeView === 'list' ? 'flex' : 'none', alignItems: 'center' }}>
        <button type="button" onClick={() => setActiveView('list')} style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: activeView === 'list' ? '#0b2e4a' : '#94a3b8', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: activeView === 'list' ? '2px solid #0c7fff' : '2px solid transparent', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', cursor: 'pointer' }}>
          📋 Lead Queue
          <span style={{ background: summary.overdue > 0 ? '#f43f5e' : '#64748b', color: 'white', borderRadius: '999px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>{sortedLeads.length}</span>
        </button>
        <button type="button" disabled={!spotlightLead} onClick={() => { if (!spotlightLead) return; setActiveLeadId(spotlightLead.id); setActiveView('cc'); }} style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: activeView === 'cc' ? '#0b2e4a' : spotlightLead ? '#94a3b8' : '#cbd5e1', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: activeView === 'cc' ? '2px solid #0c7fff' : '2px solid transparent', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', cursor: spotlightLead ? 'pointer' : 'not-allowed', opacity: spotlightLead ? 1 : .65 }}>
          🎯 Command Center
          <span style={{ background: spotlightLead ? '#0c7fff' : '#e2e8f0', color: spotlightLead ? 'white' : '#94a3b8', borderRadius: '999px', padding: '1px 6px', fontSize: '9px', fontWeight: 800, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spotlightLead?.company_name ?? 'Select a lead →'}</span>
        </button>
        <button type="button" disabled={!spotlightLead} onClick={() => { if (!spotlightLead) return; setActiveLeadId(spotlightLead.id); setActiveView('quote'); }} style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: activeView === 'quote' ? '#0b2e4a' : spotlightLead ? '#94a3b8' : '#cbd5e1', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: activeView === 'quote' ? '2px solid #0c7fff' : '2px solid transparent', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', cursor: spotlightLead ? 'pointer' : 'not-allowed', opacity: spotlightLead ? 1 : .65 }}>
          ◇ Quote Preview
          <span style={{ background: spotlightLead ? '#0c7fff' : '#e2e8f0', color: spotlightLead ? 'white' : '#94a3b8', borderRadius: '999px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>5 steps</span>
        </button>
        <button type="button" onClick={() => setActiveView('quote')} style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: quotes.some((quote) => quote.approval_required && !quote.approved_at) ? '#92400e' : '#94a3b8', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '2px solid transparent', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', cursor: 'pointer' }}>
          ✅ Approval Queue
          <span style={{ background: quotes.some((quote) => quote.approval_required && !quote.approved_at) ? '#f59e0b' : '#e2e8f0', color: quotes.some((quote) => quote.approval_required && !quote.approved_at) ? 'white' : '#94a3b8', borderRadius: '999px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>{quotes.filter((quote) => quote.approval_required && !quote.approved_at).length}</span>
        </button>
        <a href="/pipeline" style={{ marginLeft: 'auto', padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', borderBottom: '2px solid transparent', marginBottom: '-1px', textDecoration: 'none' }}>
          ⊕ View in Pipeline →
        </a>
      </div>

      {/* ═══ FILTER BAR — SF-18-092: redesigned with Tailwind, no inline styles ═══ */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-5 py-2" style={{ display: activeView === 'list' ? 'flex' : 'none' }}>

        {/* Search box */}
        <div className="flex items-center gap-2 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 min-w-[200px] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition">
          <span className="text-sm text-slate-400 flex-shrink-0">🔍</span>
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search company, contact…"
            className="border-none bg-transparent outline-none text-xs font-semibold text-slate-900 placeholder:text-slate-400 w-full"
          />
        </div>

        {/* Market filter */}
        <label className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 min-w-[110px] cursor-pointer transition hover:bg-white hover:border-slate-300 hover:shadow-sm">
          <span className="text-sm flex-shrink-0">🌍</span>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400 leading-none">Market</span>
            <select value={marketIdFilter} onChange={(e) => setMarketIdFilter(e.target.value)}
              className="border-none bg-transparent outline-none text-xs font-bold text-slate-800 appearance-none cursor-pointer leading-snug">
              <option value="">All markets ▾</option>
              {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </label>

        {/* Product filter */}
        <label className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 min-w-[110px] cursor-pointer transition hover:bg-white hover:border-slate-300 hover:shadow-sm">
          <span className="text-sm flex-shrink-0">📦</span>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400 leading-none">Product</span>
            <select value={productIdFilter} onChange={(e) => setProductIdFilter(e.target.value)}
              className="border-none bg-transparent outline-none text-xs font-bold text-slate-800 appearance-none cursor-pointer leading-snug">
              <option value="">All products ▾</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </label>

        {/* Stage filter */}
        <label className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 min-w-[110px] cursor-pointer transition hover:bg-white hover:border-slate-300 hover:shadow-sm">
          <span className="text-sm flex-shrink-0">◎</span>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400 leading-none">Stage</span>
            <select value={stageIdFilter} onChange={(e) => setStageIdFilter(e.target.value)}
              className="border-none bg-transparent outline-none text-xs font-bold text-slate-800 appearance-none cursor-pointer leading-snug">
              <option value="">All stages ▾</option>
              {availableStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </label>

        {/* Owner filter */}
        <label className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 min-w-[110px] cursor-pointer transition hover:bg-white hover:border-slate-300 hover:shadow-sm">
          <span className="text-sm flex-shrink-0">👤</span>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400 leading-none">Owner</span>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
              className="border-none bg-transparent outline-none text-xs font-bold text-slate-800 appearance-none cursor-pointer leading-snug">
              <option value="">All owners ▾</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.username ?? p.id}</option>)}
            </select>
          </div>
        </label>

        {/* Country filter */}
        <label className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 min-w-[110px] cursor-pointer transition hover:bg-white hover:border-slate-300 hover:shadow-sm">
          <span className="text-sm flex-shrink-0">🌐</span>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400 leading-none">Country</span>
            <select value={countryIdFilter} onChange={(e) => setCountryIdFilter(e.target.value)}
              className="border-none bg-transparent outline-none text-xs font-bold text-slate-800 appearance-none cursor-pointer leading-snug">
              <option value="">All countries ▾</option>
              {countries.map((ctry) => <option key={ctry.id} value={ctry.id}>{ctry.name}</option>)}
            </select>
          </div>
        </label>

        {/* Source event filter */}
        <label className={`inline-flex items-center gap-1.5 h-9 rounded-xl border px-3 min-w-[130px] cursor-pointer transition hover:shadow-sm ${tradeEventFilter ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}>
          <span className="text-sm flex-shrink-0">🎪</span>
          <div className="flex flex-col leading-none gap-0.5">
            <span className={`text-[9px] font-extrabold uppercase tracking-[0.12em] leading-none ${tradeEventFilter ? 'text-emerald-600' : 'text-slate-400'}`}>Source event</span>
            <select value={tradeEventFilter} onChange={(e) => handleTradeEventFilterChange(e.target.value)}
              className="border-none bg-transparent outline-none text-xs font-bold text-slate-800 appearance-none cursor-pointer leading-snug">
              <option value="">All events ▾</option>
              {tradeEvents.map((te) => <option key={te.id} value={te.id}>{te.name}</option>)}
            </select>
          </div>
        </label>

        {/* Active filter chips */}
        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilterChips.map((chip) => (
              <button key={chip.key} type="button" onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition">
                {chip.label} <span className="opacity-60 text-[9px]">✕</span>
              </button>
            ))}
            <button type="button" onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition">
              Clear all
            </button>
          </div>
        )}

        {/* SF-18-099: Multi-sort button — opens inline sort panel below filter bar */}
        <button type="button" onClick={() => setSortPopoverOpen(o => !o)}
          className={`inline-flex items-center gap-1.5 h-9 rounded-xl border px-3 text-[11.5px] font-bold transition ${sortPopoverOpen || sortRules.length > 1 || (sortRules[0]?.field !== 'follow_up') ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300'}`}>
          ⇅ Sort
          {(sortRules.length > 1 || sortRules[0]?.field !== 'follow_up') && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">{sortRules.length}</span>
          )}
          {sortRules[0] && (
            <span className="text-[10px] font-semibold opacity-70">
              {SORT_FIELDS.find(f => f.value === sortRules[0].field)?.label?.split(' ')[0]}
              {sortRules[0].dir === 'asc' ? ' ↑' : ' ↓'}
            </span>
          )}
        </button>

        {/* SF-18-100: More filters button */}
        <button type="button" onClick={() => setShowAdvFilters(v => !v)}
          className={`inline-flex items-center gap-1.5 h-9 rounded-xl border px-3 text-[11.5px] font-bold transition ${showAdvFilters || [advDealMin,advDealMax,advFollowUpTiming,advHasQuote,advSourceType].some(Boolean) ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300'}`}>
          🔬 More filters {[advDealMin,advDealMax,advFollowUpTiming,advHasQuote,advSourceType].filter(Boolean).length > 0 && <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">{[advDealMin,advDealMax,advFollowUpTiming,advHasQuote,advSourceType].filter(Boolean).length}</span>}
        </button>

        {/* Summary count */}
        <span className="ml-auto text-[10px] font-semibold text-slate-400 tracking-wide whitespace-nowrap">
          {summary.overdue > 0 ? `${summary.overdue} overdue · ` : ''}{sortedLeads.length} total leads
        </span>
      </div>

            {/* SORT PANEL — SF-18-099: inline below filter bar, never overflows */}
      {sortPopoverOpen && (
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">Sort rules — applied in order ① → ②</p>
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => { setSortRules([{ field: 'follow_up', dir: 'asc' }]); setSortPopoverOpen(false); }}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10.5px] font-bold text-slate-500 hover:bg-slate-50">Reset</button>
              <button type="button" onClick={() => setSortPopoverOpen(false)}
                className="h-7 rounded-lg border border-slate-200 bg-white px-3 text-[10.5px] font-bold text-slate-600 hover:bg-slate-50">Close ✕</button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {sortRules.map((rule, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-3 py-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] font-extrabold uppercase tracking-[.1em] text-slate-400 mb-1">Sort field</div>
                  <select
                    value={rule.field}
                    onChange={e => { const next = [...sortRules]; next[i] = { ...next[i], field: e.target.value as SortField }; setSortRules(next); }}
                    className="w-full border-none bg-transparent outline-none text-[12px] font-bold text-slate-800 appearance-none cursor-pointer">
                    {SORT_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-[8px] font-extrabold uppercase tracking-[.1em] text-slate-400 mb-1">Direction</div>
                  <select
                    value={rule.dir}
                    onChange={e => { const next = [...sortRules]; next[i] = { ...next[i], dir: e.target.value as SortDirection }; setSortRules(next); }}
                    className="border-none bg-transparent outline-none text-[12px] font-bold text-slate-700 appearance-none cursor-pointer">
                    <option value="asc">↑ Earliest / Lowest first</option>
                    <option value="desc">↓ Latest / Highest first</option>
                  </select>
                </div>
                {sortRules.length > 1 && (
                  <button type="button" onClick={() => setSortRules(sortRules.filter((_, j) => j !== i))}
                    className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 text-xs flex items-center justify-center flex-shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>
          {sortRules.length < 3 && (
            <button type="button" onClick={() => setSortRules([...sortRules, { field: 'deal_value', dir: 'desc' }])}
              className="mt-2 flex items-center gap-1.5 text-blue-600 text-[11px] font-bold hover:text-blue-700 transition">
              + Add sort rule <span className="text-slate-400 text-[10px] font-normal">(max 3)</span>
            </button>
          )}
        </div>
      )}

      {/* ADVANCED FILTERS PANEL — SF-18-100 */}
      {showAdvFilters && (
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
          <div className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-400 mb-3">Advanced filters — 5 additional criteria</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-400 mb-1">Deal value min ($)</label>
              <input type="number" placeholder="e.g. 5000" value={advDealMin} onChange={e => setAdvDealMin(e.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-400 mb-1">Deal value max ($)</label>
              <input type="number" placeholder="e.g. 50000" value={advDealMax} onChange={e => setAdvDealMax(e.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-400 mb-1">Follow-up timing</label>
              <select value={advFollowUpTiming} onChange={e => setAdvFollowUpTiming(e.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none appearance-none">
                <option value="">Any</option>
                <option value="overdue">Overdue only</option>
                <option value="today">Due today</option>
                <option value="unscheduled">Unscheduled</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-400 mb-1">Has active quote</label>
              <select value={advHasQuote} onChange={e => setAdvHasQuote(e.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none appearance-none">
                <option value="">Any</option>
                <option value="yes">Has quote</option>
                <option value="no">No quote yet</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-400 mb-1">Source type</label>
              <select value={advSourceType} onChange={e => setAdvSourceType(e.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold outline-none appearance-none">
                <option value="">All sources</option>
                <option value="direct">Direct inquiry</option>
                <option value="trade_event">Trade event</option>
                <option value="referral">Referral</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3 items-center">
            <button type="button" onClick={() => setShowAdvFilters(false)} className="h-8 rounded-xl bg-slate-900 text-white px-4 text-xs font-bold">Apply</button>
            <button type="button" onClick={() => { setAdvDealMin(''); setAdvDealMax(''); setAdvFollowUpTiming(''); setAdvHasQuote(''); setAdvSourceType(''); }} className="h-8 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600">Clear</button>
            <span className="text-xs text-slate-400 font-semibold">Combines with AND logic · active: {[advDealMin,advDealMax,advFollowUpTiming,advHasQuote,advSourceType].filter(Boolean).length} filters</span>
          </div>
        </div>
      )}

      {/* ═══ SAVED VIEWS BAR — matches spec .saved-views ═══ */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: activeView === 'list' ? 'flex' : 'none', alignItems: 'center', overflowX: 'auto' }}>
        {savedViews.map((view) => {
          const active = savedView === view.id;
          const isOverdue = view.id === 'overdue';
          const isToday = view.id === 'today';
          return (
            <button key={view.id} type="button" onClick={() => setSavedView(view.id as SavedView)}
              style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: active ? '#0b2e4a' : '#64748b', cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: active ? '2px solid #0c7fff' : '2px solid transparent', background: 'none', whiteSpace: 'nowrap', marginBottom: '-1px', transition: 'color .1s', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {view.label}
              <span style={{ background: isOverdue ? '#fee2e2' : isToday ? '#fef3c7' : '#f1f5f9', borderRadius: '999px', padding: '1px 6px', fontSize: '9px', fontWeight: 700, color: isOverdue ? '#dc2626' : isToday ? '#d97706' : '#475569' }}>
                {view.count}
              </span>
            </button>
          );
        })}
        {!canManageLeads && readOnlyMessage ? (
          <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: '#d97706', padding: '6px 12px' }}>⚠ Read-only</span>
        ) : null}
      </div>

      {activeView !== 'list' && activeLeadId ? (
        <InlineLeadWorkspace
          activeView={activeView === 'quote' ? 'quote' : 'cc'}
          lead={workspaceLeads.find((lead) => lead.id === activeLeadId) ?? spotlightLead}
          stageName={stageMap.get((workspaceLeads.find((lead) => lead.id === activeLeadId) ?? spotlightLead)?.stage_id ?? '') ?? 'New Lead'}
          ownerLabel={ownerMap.get((workspaceLeads.find((lead) => lead.id === activeLeadId) ?? spotlightLead)?.owner_user_id ?? '') ?? 'Unassigned'}
          nextStepLabel={nextStepMap.get((workspaceLeads.find((lead) => lead.id === activeLeadId) ?? spotlightLead)?.next_step_id ?? '') ?? 'Next commercial move'}
          selectedProductIds={leadProductsMap.get(activeLeadId ?? '') ?? []}
          selectedMarketIds={leadMarketsMap.get(activeLeadId ?? '') ?? []}
          selectedProductNames={(leadProductsMap.get(activeLeadId ?? '') ?? []).map((productId) => products.find((product) => product.id === productId)?.name).filter((name): name is string => Boolean(name))}
          selectedMarketNames={(leadMarketsMap.get(activeLeadId ?? '') ?? []).map((marketId) => markets.find((market) => market.id === marketId)?.name).filter((name): name is string => Boolean(name))}
          products={products}
          markets={markets}
          variants={variants}
          prices={prices}
          pricingRules={pricingRules}
          readiness={readinessByLeadId.get(activeLeadId ?? '')}
          rfqs={rfqs.filter((rfq) => rfq.lead_id === activeLeadId)}
          quotes={quotes.filter((quote) => quote.lead_id === activeLeadId)}
          quoteVersions={quoteVersions}
          activities={activities.filter((activity) => activity.lead_id === activeLeadId)}
          followUps={workspaceFollowUps.filter((followUp) => followUp.lead_id === activeLeadId)}
          complianceItems={complianceItems.filter((item) => item.lead_id === activeLeadId)}
          complianceDefinitions={complianceDefinitions}
          documents={documents.filter((document) => document.related_id === activeLeadId || (document.linked_quote_id ? quotes.some((quote) => quote.lead_id === activeLeadId && quote.id === document.linked_quote_id) : false))}
          safeFormatDateTime={safeFormatDateTime}
          stableNowIso={stableNowIso}
          stages={stages}
          inlineActionState={inlineActionState}
          inlineFollowUpAt={inlineFollowUpAt}
          setInlineFollowUpAt={setInlineFollowUpAt}
          isInlineActionPending={isInlineActionPending}
          onOpenEditDrawer={openLeadEditDrawer}
          onScheduleFollowUp={handleInlineScheduleFollowUp}
          onCompleteFollowUp={handleInlineCompleteFollowUp}
          onMoveToStage={handleInlineMoveLeadToStage}
          onOpenOrCreateQuote={handleInlineOpenOrCreateQuote}
          onRequestQuoteApproval={handleInlineRequestQuoteApproval}
          onApproveQuoteAdjustment={handleInlineApproveQuoteAdjustment}
          onRejectQuoteAdjustment={handleInlineRejectQuoteAdjustment}
          onMarkDirectOrder={handleInlineMarkDirectOrder}
          onBackToList={() => setActiveView('list')}
          onOpenCommandCenter={() => setActiveView('cc')}
          onOpenQuoteBuilder={() => setActiveView('quote')}
        />
      ) : (
        <>
      {/* ═══ MAIN TABLE SECTION ═══ */}
      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {!canManageLeads && readOnlyMessage ? (
          <StateMessage title="Read-only lead queue" tone="warning" description={`${readOnlyMessage} Open leads and review status. Ask an admin to enable edits.`} />
        ) : null}

        {/* Batch bar — shows when rows are selected */}
        {selectedLeadIds.length ? (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 1px 3px rgba(15,23,42,.06)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>{selectedLeadIds.length} selected —</span>
            <input type="datetime-local" value={batchFollowUpAt} onChange={(e) => setBatchFollowUpAt(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#334155' }}
            />
            <select value={batchNextStepId} onChange={(e) => setBatchNextStepId(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#334155' }}
            >
              <option value="">Schedule follow-up…</option>
              {nextSteps.map((step) => <option key={step.id} value={step.id}>{step.name}</option>)}
            </select>
            <button type="button" onClick={handleBatchFollowUpSubmit} disabled={isBatchPending || !batchFollowUpAt}
              style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600, background: 'white', color: '#334155', cursor: 'pointer' }}
            >Set follow-up</button>
            <select value={batchStageId} onChange={(e) => setBatchStageId(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#334155' }}
            >
              <option value="">Move to stage…</option>
              {availableBatchStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
            </select>
            <button type="button" onClick={handleBatchStageSubmit} disabled={isBatchStagePending || !batchStageId}
              style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600, background: 'white', color: '#334155', cursor: 'pointer' }}
            >Apply</button>
            <div style={{ flex: 1 }}></div>
            <button type="button" onClick={handleBatchDeleteLeads} disabled={isDeletePending || !canManageLeads}
              style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 700, background: '#fff1f2', color: '#be123c', cursor: isDeletePending ? 'wait' : 'pointer' }}
            >Delete selected</button>
            <button type="button" onClick={() => setSelectedLeadIds([])}
              style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 600, background: 'white', color: '#334155', cursor: 'pointer' }}
            >Clear selection</button>
          </div>
        ) : null}

        {/* Batch state messages */}
        {batchState.error ? <StateMessage title="Bulk follow-up update failed" tone="danger" description={batchState.error} /> : null}
        {batchState.success ? <StateMessage title="Bulk follow-up update applied" tone="success" description={batchState.success} /> : null}
        {batchStageState.error ? <StateMessage title="Batch stage move failed" tone="danger" description={batchStageState.error} /> : null}
        {batchStageState.success ? <StateMessage title="Batch stage move applied" tone="success" description={batchStageState.success} /> : null}
        {deleteState.error ? <StateMessage title="Lead deletion failed" tone="danger" description={deleteState.error} /> : null}
        {deleteState.success ? <StateMessage title="Lead deleted" tone="success" description={deleteState.success} /> : null}

        {/* Lead Table */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>

          {/* Table header */}
          <LeadTableHeader
            allSelected={selectedAllVisible}
            onSelectAll={(checked) => {
              if (checked) {
                setSelectedLeadIds((cur) => [...new Set([...cur, ...visibleLeads.map((l) => l.id)])]);
              } else {
                setSelectedLeadIds((cur) => cur.filter((id) => !visibleLeads.some((l) => l.id === id)));
              }
            }}
            currentSortField={sortRules[0]?.field}
            currentSortDir={sortRules[0]?.dir}
            onColumnSort={(field) => {
              const current = sortRules[0];
              if (current?.field === field) {
                // Toggle direction
                setSortRules([{ field: field as typeof current.field, dir: current.dir === 'asc' ? 'desc' : 'asc' }]);
              } else {
                setSortRules([{ field: field as typeof current.field, dir: 'asc' }]);
              }
            }}
          />

          {visibleLeads.length ? (
            <>
              {groupedLeadSections.map((section) => (
                <section key={section.id}>
                  {/* SF-18-094: Group Intelligence Banner */}
                  {(() => {
                    const isCollapsed = section.id === 'critical' ? criticalCollapsed : section.id === 'due-today' ? todayCollapsed : activeCollapsed;
                    const setCollapsed = section.id === 'critical' ? setCriticalCollapsed : section.id === 'due-today' ? setTodayCollapsed : setActiveCollapsed;
                    const tone = section.id === 'critical' ? 'critical' : section.id === 'due-today' ? 'warning' : 'success';
                    const sectionRevenue = section.leads.reduce((sum, l) => sum + (l.deal_value ?? 0), 0);
                    const sectionAvgDays = section.id === 'critical' && section.leads.length > 0
                      ? Math.round(section.leads.filter(l => l.next_follow_up_at).reduce((sum, l) => {
                          const diff = Math.floor((Date.now() - new Date(l.next_follow_up_at!).getTime()) / 86400000);
                          return sum + Math.max(0, diff);
                        }, 0) / Math.max(1, section.leads.filter(l => l.next_follow_up_at).length))
                      : undefined;
                    const aiTip = section.id === 'critical'
                      ? `${sectionRevenue > 0 ? `$${Math.round(sectionRevenue/1000)}K at risk · ` : ''}schedule follow-up calls today`
                      : section.id === 'due-today' ? 'Complete today to maintain momentum'
                      : 'On track — no immediate action needed';
                    const toneStyles = {
                      critical: 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-200',
                      warning:  'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200',
                      success:  'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100',
                    } as const;
                    const dotStyles = {
                      critical: 'bg-rose-500 animate-pulse', warning: 'bg-amber-500 animate-pulse', success: 'bg-emerald-500',
                    } as const;
                    const textStyles = { critical: 'text-rose-800', warning: 'text-amber-800', success: 'text-emerald-800' } as const;
                    const fmt = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(0)}K` : n > 0 ? `$${n}` : '';
                    return (
                      <button type="button" onClick={() => setCollapsed(v => !v)}
                        className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-2.5 mb-2 mt-2 transition hover:shadow-md text-left ${toneStyles[tone]}`}
                        style={{ margin: '8px 8px 4px' }}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotStyles[tone]}`} />
                        <span className={`text-[10.5px] font-extrabold uppercase tracking-[.1em] ${textStyles[tone]}`}>
                          {section.id === 'critical' ? '⚠ Critical — Needs Action Now'
                            : section.id === 'due-today' ? '⏰ Due Today'
                            : '✓ Active / Upcoming'}
                        </span>
                        <span className="text-[9.5px] font-semibold text-slate-500 bg-white/70 rounded-md px-2 py-0.5 border border-white/80 flex items-center gap-1 whitespace-nowrap">
                          <GuruAvatar size="xs" />{aiTip}
                        </span>
                        <div className="ml-auto flex gap-3 items-center flex-shrink-0">
                          <span className={`text-[10.5px] font-bold ${textStyles[tone]}`}><strong>{section.leads.length}</strong> leads</span>
                          {sectionRevenue > 0 && <span className={`text-[10.5px] font-bold ${textStyles[tone]}`}><strong>{fmt(sectionRevenue)}</strong> pipeline</span>}
                          {sectionAvgDays != null && sectionAvgDays > 0 && <span className={`text-[10.5px] font-bold ${textStyles[tone]}`}>avg <strong>{sectionAvgDays}d</strong> overdue</span>}
                          <span className="text-[9px] text-slate-400">{isCollapsed ? '▶' : '▼'}</span>
                        </div>
                      </button>
                    );
                  })()}
                  {/* SF-18-094: Collapse group body */}
                  {(section.id === 'critical' ? !criticalCollapsed : section.id === 'due-today' ? !todayCollapsed : !activeCollapsed) && (
                  <div style={{ padding: '0 8px 4px' }}>
                    {section.leads.map((lead) => (
                      <LeadTableRow
                        key={lead.id}
                        lead={lead}
                        maxDealValue={maxDealValue}
                        selected={selectedLeadIds.includes(lead.id)}
                        isSpotlight={spotlightLead?.id === lead.id}
                        toggleSelect={toggleLeadSelection}
                        setSpotlightLead={setSpotlightLeadId}
                        stageMap={stageMap}
                        nextStepMap={nextStepMap}
                        ownerMap={ownerMap}
                        safeFormatDateTime={safeFormatDateTime}
                        activityMap={activityMap}
                        stageHistoryMap={stageHistoryMap}
                        stageMetaMap={stageMetaMap}
                        readinessMap={readinessByLeadId}
                        getLeadCommandCenterHref={getLeadCommandCenterHref}
                        openLeadCommandCenter={(_router, href) => {
                          const match = /\/leads\/([^/?#]+)/.exec(href);
                          if (match?.[1]) {
                            setActiveLeadId(match[1]);
                            setSpotlightLeadId(match[1]);
                            setActiveView('cc');
                          } else {
                            openLeadCommandCenter(_router, href);
                          }
                        }}
                        openQuoteBuilder={openLeadInlineQuoteBuilder}
                        openQuickEdit={(leadId) => openLeadEditDrawer(leadId, 'basics')}
                        onDeleteLead={canManageLeads ? handleDeleteLead : undefined}
                        shouldIgnoreLeadNavigationTarget={shouldIgnoreLeadNavigationTarget}
                        handleLeadCommandCenterKeyDown={(_event, _router, href) => {
                          const match = /\/leads\/([^/?#]+)/.exec(href);
                          if (match?.[1]) {
                            setActiveLeadId(match[1]);
                            setSpotlightLeadId(match[1]);
                            setActiveView('cc');
                          }
                        }}
                      />
                    ))}
                  </div>
                  )}
                </section>
              ))}
            </>
          ) : (
            <div className="p-8">
              <WorkspaceState
                eyebrow="Lead queue"
                title={isWorkspaceEmpty && !search && activeFilterCount === 0 ? 'No leads in this workspace yet' : 'No leads match the current view'}
                description={
                  isWorkspaceEmpty && !search && activeFilterCount === 0
                    ? canManageLeads
                      ? 'Create a lead now: Quick Lead for speed, New Lead for full capture.'
                      : 'No leads yet. Ask an admin to add the first lead or grant edit access.'
                    : activeFilterChips.length ? `No leads match: ${activeFilterChips.map((chip) => chip.label).join(', ')}. Clear one chip or reset all filters.` : 'Reset filters or search, then open a lead.'
                }
                primaryActionHref={isWorkspaceEmpty && !search && activeFilterCount === 0 && canManageLeads ? PRODUCT_ROUTES.app.leads : undefined}
                primaryActionLabel={isWorkspaceEmpty && !search && activeFilterCount === 0 && canManageLeads ? 'Stay on leads' : undefined}
              />
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', padding: '12px 16px' }}>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Showing {visibleLeads.length} of {sortedLeads.length} leads</p>
            {visibleCount < sortedLeads.length ? (
              <button type="button" onClick={() => setVisibleCount((c) => c + 50)}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
              >
                Load more
              </button>
            ) : null}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Lead drawer for new lead creation */}
      <LeadDrawer
        key={`${drawerState.mode}-${drawerState.leadId ?? 'new'}`}
        open={drawerState.open}
        onClose={closeDrawer}
        onSaved={handleLeadSaved}
        onOpenInlineQuote={(leadId) => {
          setDrawerState((current) => ({ ...current, open: false }));
          setActiveLeadId(leadId);
          setSpotlightLeadId(leadId);
          setActiveView('quote');
        }}
        mode={drawerState.mode}
        lead={drawerState.leadId ? selectedLead : initialEventLead}
        title={drawerState.leadId ? 'Edit Lead' : drawerState.mode === 'quick' ? 'Quick Add Lead' : 'Full Add Lead'}
        currentUserId={currentUserId}
        stages={stages}
        pipelines={pipelines}
        nextSteps={nextSteps}
        tradeEvents={tradeEvents}
        productCategories={productCategories}
        products={products}
        markets={markets}
        variants={variants}
        prices={prices}
        pricingRules={pricingRules}
        profiles={profiles}
        countries={countries}
        followUps={followUps}
        activities={activities}
        stageHistory={stageHistory.filter((item) => item.lead_id === (drawerState.leadId ? selectedLead?.id : undefined))}
        rfqs={rfqs.filter((item) => item.lead_id === (drawerState.leadId ? selectedLead?.id : undefined))}
        quotes={quotes.filter((item) => item.lead_id === (drawerState.leadId ? selectedLead?.id : undefined))}
        quoteVersions={quoteVersions.filter((item) => quotes.some((quote) => quote.lead_id === (drawerState.leadId ? selectedLead?.id : undefined) && quote.id === item.quote_id))}
        documents={documents.filter((document) => document.related_id === (drawerState.leadId ? selectedLead?.id : undefined) || (document.linked_quote_id ? quotes.some((quote) => quote.lead_id === (drawerState.leadId ? selectedLead?.id : undefined) && quote.id === document.linked_quote_id) : false) || (document.related_entity === 'quote' && document.related_id ? quotes.some((quote) => quote.lead_id === (drawerState.leadId ? selectedLead?.id : undefined) && quote.id === document.related_id) : false))}
        complianceItems={complianceItems.filter((item) => item.lead_id === (drawerState.leadId ? selectedLead?.id : undefined))}
        complianceDefinitions={complianceDefinitions}
        selectedMarketIds={drawerState.leadId && selectedLead ? leadMarketsMap.get(selectedLead.id) ?? [] : []}
        selectedProductIds={drawerState.leadId && selectedLead ? leadProductsMap.get(selectedLead.id) ?? [] : []}
        canNavigatePrev={false}
        canNavigateNext={false}
        navigationMeta={drawerState.leadId ? 'Editing selected lead in the inline Leads workspace.' : 'Create a new lead from the inline Leads workspace.'}
        prefill={drawerState.open && !drawerState.leadId ? initialQuickCapture : null}
        fastFieldMode={Boolean(initialFastField && initialEventId && !drawerState.leadId)}
      />
    </div>
  );
}

type InlineLeadWorkspaceProps = {
  activeView: 'cc' | 'quote';
  lead?: LeadRow;
  stageName: string;
  ownerLabel: string;
  nextStepLabel: string;
  selectedProductIds: string[];
  selectedMarketIds: string[];
  selectedProductNames: string[];
  selectedMarketNames: string[];
  products: Product[];
  markets: Option[];
  variants: Variant[];
  prices: Price[];
  pricingRules: PricingRule[];
  readiness?: LeadCommercialReadiness;
  rfqs: Rfq[];
  quotes: Quote[];
  quoteVersions: QuoteVersion[];
  activities: Activity[];
  followUps: FollowUp[];
  complianceItems: ComplianceItem[];
  complianceDefinitions: ComplianceDefinition[];
  documents: LeadDocument[];
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
  onOpenOrCreateQuote: (leadId: string, preview?: QuotePreviewSavePayload) => void;
  onRequestQuoteApproval: (leadId: string, quoteId?: string | null) => void;
  onApproveQuoteAdjustment: (leadId: string, quoteId?: string | null) => void;
  onRejectQuoteAdjustment: (leadId: string, quoteId?: string | null) => void;
  onMarkDirectOrder: (leadId: string, quoteId?: string | null, notes?: string | null) => void;
  onBackToList: () => void;
  onOpenCommandCenter: () => void;
  onOpenQuoteBuilder: () => void;
};

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

function InlineQuoteBuilder({
  lead,
  stageName,
  ownerLabel,
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
  documents,
  complianceItems,
  complianceDefinitions,
  safeFormatDateTime,
  stableNowIso,
  inlineActionState,
  isInlineActionPending,
  onOpenOrCreateQuote,
  onRequestQuoteApproval,
  onApproveQuoteAdjustment,
  onRejectQuoteAdjustment,
  onMarkDirectOrder,
  onOpenCommandCenter,
  onOpenCoverageManager,
}: {
  lead: LeadRow;
  stageName: string;
  ownerLabel: string;
  selectedProductIds: string[];
  selectedMarketIds: string[];
  selectedProductNames: string[];
  selectedMarketNames: string[];
  products: Product[];
  markets: Option[];
  variants: Variant[];
  prices: Price[];
  pricingRules: PricingRule[];
  readiness?: LeadCommercialReadiness;
  rfqs: Rfq[];
  quotes: Quote[];
  quoteVersions: QuoteVersion[];
  documents: LeadDocument[];
  complianceItems: ComplianceItem[];
  complianceDefinitions: ComplianceDefinition[];
  safeFormatDateTime: (value?: string | null) => string;
  stableNowIso: string;
  inlineActionState: FormState;
  isInlineActionPending: boolean;
  onOpenOrCreateQuote: (leadId: string, preview?: QuotePreviewSavePayload) => void;
  onRequestQuoteApproval: (leadId: string, quoteId?: string | null) => void;
  onApproveQuoteAdjustment: (leadId: string, quoteId?: string | null) => void;
  onRejectQuoteAdjustment: (leadId: string, quoteId?: string | null) => void;
  onMarkDirectOrder: (leadId: string, quoteId?: string | null, notes?: string | null) => void;
  onOpenCommandCenter: () => void;
  onOpenCoverageManager: () => void;
}) {
  const [builderStep, setBuilderStep] = React.useState(() => selectedProductIds.length ? 1 : 0);
  const [directOrderNote, setDirectOrderNote] = React.useState('');
  const steps = ['Product', 'Terms', 'Pricing', 'Review', 'Send gate'];
  const latestQuote = [...quotes].sort((a, b) => String(b.updated_at ?? b.created_at ?? '').localeCompare(String(a.updated_at ?? a.created_at ?? '')))[0] ?? null;
  const latestVersion = latestQuote ? quoteVersions.filter((v) => v.quote_id === latestQuote.id).sort((a, b) => Number(b.version_no ?? 0) - Number(a.version_no ?? 0))[0] : null;
  type DisplayLine = {
    id: string;
    productId: string | null;
    productLabel: string;
    productVariantId?: string | null;
    variantLabel?: string | null;
    catalogPriceAmount?: number | null;
    catalogPriceCurrency?: string | null;
    quantity: number;
    unitPrice: number | null;
    currency: string;
    total: number;
    source: 'quote' | 'rfq' | 'coverage';
    priceStatus: 'priced' | 'missing';
    note?: string | null;
    pricingBasis?: string | null;
    uomLabel?: string | null;
    moqLabel?: string | null;
    packSummary?: string | null;
    quoteAdjustmentType?: 'none' | 'discount_percent' | 'discount_amount' | 'markup_percent' | 'markup_amount';
    quoteAdjustmentValue?: number | null;
    quoteAdjustmentReason?: string | null;
    approvalRequired?: boolean | null;
    adjustmentDeltaPercent?: number | null;
  };

  const productNameMap = React.useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);
  const variantNameMap = React.useMemo(() => new Map(variants.map((variant) => [variant.id, variant.name])), [variants]);
  const variantDetailMap = React.useMemo(() => new Map(variants.map((variant) => [variant.id, variant])), [variants]);
  const marketNameMap = React.useMemo(() => new Map(markets.map((market) => [market.id, market.name])), [markets]);

  const quoteItems = React.useMemo(() => latestQuote?.lineItems ?? [], [latestQuote?.lineItems]);
  const rfqItems = React.useMemo(() => rfqs.flatMap((rfq) => rfq.lineItems ?? []), [rfqs]);
  const sourceItems = React.useMemo(() => quoteItems.length ? quoteItems : rfqItems, [quoteItems, rfqItems]);

  const baseDisplayLines = React.useMemo<DisplayLine[]>(() => {
    if (sourceItems.length) {
      return sourceItems.map((item) => {
        const variantIds = new Set(variants.filter((variant) => variant.product_id === item.product_id).map((variant) => variant.id));
        const lineVariant = (item.product_variant_id ? variantDetailMap.get(item.product_variant_id) : null) ?? variants.find((variant) => variant.product_id === item.product_id) ?? null;
        const qty = Number(item.quantity ?? defaultQuoteQuantity(lineVariant)) || 1;
        const fallbackPrice = prices.find((price) => variantIds.has(price.product_variant_id));
        const fallbackRule = pricingRules.find((rule) => rule.product_id === item.product_id || (rule.product_variant_id && variantIds.has(rule.product_variant_id)));
        const rulePrice = fallbackRule ? fallbackRule.fob_usd_per_case ?? fallbackRule.fob_usd_per_unit ?? fallbackRule.ex_factory_usd_per_case ?? fallbackRule.ex_factory_usd_per_unit ?? fallbackRule.bulk_usd_per_kg ?? fallbackRule.fob_usd ?? fallbackRule.ex_factory_usd ?? fallbackRule.fob_inr ?? fallbackRule.ex_factory_inr ?? null : null;
        const rawPrice = (Number(item.unit_price ?? 0) > 0 ? item.unit_price : null) ?? (Number(item.catalog_price_amount ?? 0) > 0 ? item.catalog_price_amount : null) ?? fallbackPrice?.price ?? rulePrice ?? null;
        const unitPrice = rawPrice == null ? null : Number(rawPrice);
        const lineCurrency = String(item.currency ?? item.catalog_price_currency ?? fallbackPrice?.currency ?? (fallbackRule?.fob_inr || fallbackRule?.ex_factory_inr ? 'INR' : latestQuote?.currency ?? lead.deal_currency ?? 'USD'));
        return {
          id: item.id,
          productId: item.product_id ?? null,
          productLabel: (item.product_id ? productNameMap.get(item.product_id) : null) ?? item.product_id ?? 'Catalog line',
          productVariantId: item.product_variant_id ?? null,
          variantLabel: item.product_variant_id ? variantNameMap.get(item.product_variant_id) ?? item.product_variant_id : null,
          catalogPriceAmount: item.catalog_price_amount ?? fallbackPrice?.price ?? rulePrice ?? null,
          catalogPriceCurrency: item.catalog_price_currency ?? fallbackPrice?.currency ?? lineCurrency,
          quantity: qty,
          unitPrice,
          currency: lineCurrency,
          total: unitPrice == null ? 0 : qty * unitPrice,
          source: quoteItems.length ? 'quote' : 'rfq',
          priceStatus: unitPrice != null && unitPrice > 0 ? 'priced' : 'missing',
          note: item.notes ?? null,
          quoteAdjustmentType: item.is_price_overridden ? 'discount_amount' : 'none',
          quoteAdjustmentValue: item.is_price_overridden && item.catalog_price_amount != null && item.unit_price != null ? Math.abs(Number(item.catalog_price_amount) - Number(item.unit_price)) : null,
          quoteAdjustmentReason: item.override_reason ?? null,
          approvalRequired: item.is_price_overridden && !latestQuote?.approved_at ? Math.abs(quoteAdjustmentDeltaPercent(item.catalog_price_amount, item.unit_price)) > 15 : false,
          adjustmentDeltaPercent: quoteAdjustmentDeltaPercent(item.catalog_price_amount, item.unit_price),
          pricingBasis: variantPricingUnit(lineVariant),
          uomLabel: variantPricingUnit(lineVariant),
          moqLabel: variantPricingUnit(lineVariant) === 'kg' ? `${lineVariant?.moq_kg ?? 1} kg MOQ` : variantPricingUnit(lineVariant) === 'case' ? `${lineVariant?.moq_cases ?? 1} cases MOQ` : '1 unit MOQ',
          packSummary: variantPackSummary(lineVariant),
        };
      });
    }

    return selectedProductIds.map((productId) => {
      const productVariants = variants.filter((variant) => variant.product_id === productId);
      const variantIds = new Set(productVariants.map((variant) => variant.id));
      const selectedPrice = prices
        .filter((price) => variantIds.has(price.product_variant_id))
        .sort((a, b) => {
          const aMarketMatch = a.market_id && selectedMarketIds.includes(a.market_id) ? 0 : a.market_id ? 2 : 1;
          const bMarketMatch = b.market_id && selectedMarketIds.includes(b.market_id) ? 0 : b.market_id ? 2 : 1;
          if (aMarketMatch !== bMarketMatch) return aMarketMatch - bMarketMatch;
          return String(b.effective_from ?? '').localeCompare(String(a.effective_from ?? ''));
        })[0] ?? null;
      const productLabel = productNameMap.get(productId) ?? selectedProductNames[selectedProductIds.indexOf(productId)] ?? '';
      const normalizedProductLabel = productLabel.trim().toLowerCase();
      const selectedRule = pricingRules.find((rule) => {
        if (rule.product_id === productId) return true;
        if (rule.product_variant_id && variantIds.has(rule.product_variant_id)) return true;
        const ruleName = String(rule.product_name ?? '').trim().toLowerCase();
        const ruleSku = String(rule.sku_code ?? '').trim().toLowerCase();
        const productSku = String(products.find((product) => product.id === productId)?.sku ?? '').trim().toLowerCase();
        return Boolean(normalizedProductLabel && ruleName && (ruleName === normalizedProductLabel || ruleName.includes(normalizedProductLabel) || normalizedProductLabel.includes(ruleName)))
          || Boolean(productSku && ruleSku && productSku === ruleSku);
      }) ?? null;
      const rulePrice = selectedRule
        ? selectedRule.fob_usd_per_case ?? selectedRule.fob_usd_per_unit ?? selectedRule.ex_factory_usd_per_case ?? selectedRule.ex_factory_usd_per_unit ?? selectedRule.bulk_usd_per_kg ?? selectedRule.fob_usd ?? selectedRule.ex_factory_usd ?? selectedRule.fob_inr ?? selectedRule.ex_factory_inr ?? null
        : null;
      const unitPrice = selectedPrice ? Number(selectedPrice.price) : rulePrice == null ? null : Number(rulePrice);
      const lineCurrency = selectedPrice?.currency ?? (selectedRule?.fob_inr || selectedRule?.ex_factory_inr ? 'INR' : latestQuote?.currency ?? lead.deal_currency ?? 'USD');
      const selectedVariant = (selectedPrice ? variantDetailMap.get(selectedPrice.product_variant_id) : null) ?? productVariants[0] ?? null;
      const variantLabel = selectedVariant ? variantNameMap.get(selectedVariant.id) ?? selectedVariant.name ?? null : null;
      const marketLabel = selectedPrice?.market_id ? marketNameMap.get(selectedPrice.market_id) : selectedMarketNames[0];
      const quantity = defaultQuoteQuantity(selectedVariant);
      return {
        id: `coverage-${productId}`,
        productId,
        productLabel: productLabel || 'Mapped product',
        productVariantId: selectedVariant?.id ?? null,
        variantLabel,
        catalogPriceAmount: unitPrice,
        catalogPriceCurrency: String(lineCurrency ?? 'USD'),
        quantity,
        unitPrice,
        currency: String(lineCurrency ?? 'USD'),
        total: unitPrice == null ? 0 : quantity * unitPrice,
        source: 'coverage',
        priceStatus: unitPrice != null && unitPrice > 0 ? 'priced' : 'missing',
        note: unitPrice == null ? `No catalog price found${marketLabel ? ` for ${marketLabel}` : ''}. Create/open draft preview creates the quote shell; fill price in saved quote workflow.` : `Catalog/reference price${marketLabel ? ` for ${marketLabel}` : ''}.`,
        quoteAdjustmentType: 'none',
        quoteAdjustmentValue: null,
        quoteAdjustmentReason: null,
        approvalRequired: false,
        adjustmentDeltaPercent: 0,
        pricingBasis: variantPricingUnit(selectedVariant),
        uomLabel: variantPricingUnit(selectedVariant),
        moqLabel: variantPricingUnit(selectedVariant) === 'kg' ? `${selectedVariant?.moq_kg ?? 1} kg MOQ` : variantPricingUnit(selectedVariant) === 'case' ? `${selectedVariant?.moq_cases ?? 1} cases MOQ` : '1 unit MOQ',
        packSummary: variantPackSummary(selectedVariant),
      };
    });
  }, [lead.deal_currency, latestQuote?.currency, marketNameMap, prices, pricingRules, productNameMap, quoteItems.length, selectedMarketIds, selectedMarketNames, selectedProductIds, selectedProductNames, sourceItems, variantDetailMap, variantNameMap, variants]);

  const [editableLines, setEditableLines] = React.useState<DisplayLine[]>(baseDisplayLines);
  const [termsCurrency, setTermsCurrency] = React.useState(latestQuote?.currency ?? baseDisplayLines.find((item) => item.currency)?.currency ?? lead.deal_currency ?? 'USD');
  const [stepValidationMessage, setStepValidationMessage] = React.useState<string | null>(null);
  const [termsIncoterm, setTermsIncoterm] = React.useState('FOB');
  const [paymentTerms, setPaymentTerms] = React.useState('30% advance, 70% on BL');
  const [quoteValidityDays, setQuoteValidityDays] = React.useState('30');
  const [portOfLoading, setPortOfLoading] = React.useState('');
  const [deliveryNotes, setDeliveryNotes] = React.useState('');
  const localCurrency = countryCurrency(lead.country);
  const currencyOptions = React.useMemo(() => uniqueCurrencyOptions(termsCurrency, localCurrency, lead.deal_currency, baseDisplayLines.find((item) => item.currency)?.currency), [baseDisplayLines, lead.deal_currency, localCurrency, termsCurrency]);

  React.useEffect(() => {
    setEditableLines(baseDisplayLines);
    setTermsCurrency(latestQuote?.currency ?? baseDisplayLines.find((item) => item.currency)?.currency ?? lead.deal_currency ?? 'USD');
  }, [baseDisplayLines, latestQuote?.currency, lead.deal_currency]);

  const updateEditableLine = (lineId: string, field: 'quantity' | 'unitPrice' | 'quoteAdjustmentType' | 'quoteAdjustmentValue' | 'quoteAdjustmentReason', value: string) => {
    const normalized = field === 'quoteAdjustmentType' || field === 'quoteAdjustmentReason' ? NaN : Number(value.replace(/,/g, ''));
    setEditableLines((current) => current.map((line) => {
      if (line.id !== lineId) return line;
      const nextQuantity = field === 'quantity' ? (Number.isFinite(normalized) && normalized > 0 ? normalized : 0) : line.quantity;
      const manualPrice = field === 'unitPrice' ? (Number.isFinite(normalized) ? normalized : 0) : line.unitPrice;
      const nextAdjustmentType = field === 'quoteAdjustmentType' ? value as DisplayLine['quoteAdjustmentType'] : (line.quoteAdjustmentType ?? 'none');
      const nextAdjustmentValue = field === 'quoteAdjustmentValue' ? (Number.isFinite(normalized) ? normalized : 0) : (line.quoteAdjustmentValue ?? null);
      const nextAdjustmentReason = field === 'quoteAdjustmentReason' ? value : (line.quoteAdjustmentReason ?? null);
      const baseline = line.catalogPriceAmount ?? manualPrice ?? 0;
      const nextUnitPrice = field === 'unitPrice' ? manualPrice : applyQuoteAdjustment(baseline, nextAdjustmentType, nextAdjustmentValue);
      const deltaPercent = quoteAdjustmentDeltaPercent(baseline, nextUnitPrice);
      const approvalRequired = Math.abs(deltaPercent) > 15;
      return {
        ...line,
        quantity: nextQuantity,
        unitPrice: nextUnitPrice,
        quoteAdjustmentType: nextAdjustmentType,
        quoteAdjustmentValue: nextAdjustmentValue,
        quoteAdjustmentReason: nextAdjustmentReason,
        adjustmentDeltaPercent: deltaPercent,
        approvalRequired,
        total: nextQuantity * (nextUnitPrice ?? 0),
        priceStatus: nextUnitPrice && nextUnitPrice > 0 ? 'priced' : 'missing'
      };
    }));
  };

  const displayLines = editableLines;

  React.useEffect(() => {
    if (!selectedProductIds.length && !displayLines.length) setBuilderStep(0);
  }, [displayLines.length, selectedProductIds.length]);

  const subtotal = displayLines.reduce((sum, item) => sum + item.total, 0);
  const currency = termsCurrency || displayLines.find((item) => item.currency)?.currency || lead.deal_currency || 'USD';
  const blockerCount = readiness?.blockerCount ?? complianceItems.length;
  const pricingReady = displayLines.length > 0 && displayLines.every((item) => item.priceStatus === 'priced');
  const hasQuoteDraft = Boolean(latestQuote);
  const quoteAdjustmentApprovalRequired = displayLines.some((line) => Boolean(line.approvalRequired));
  const latestQuoteApprovalRequired = Boolean(latestQuote?.approval_required) && !latestQuote?.approved_at;
  const approvalPending = quoteAdjustmentApprovalRequired || latestQuoteApprovalRequired;
  const sendReady = blockerCount === 0 && pricingReady && hasQuoteDraft && !approvalPending;
  const approvalReady = hasQuoteDraft && displayLines.length > 0;
  const canSendQuote = sendReady;

  const buildQuotePreviewSavePayload = React.useCallback((): QuotePreviewSavePayload => ({
    currency,
    lines: displayLines.map((line) => ({
      id: line.source === 'quote' ? line.id : undefined,
      productId: line.productId,
      productVariantId: line.productVariantId ?? null,
      quantity: Number(line.quantity) || 0,
      unitPrice: line.unitPrice == null ? null : Number(line.unitPrice),
      currency: currency || line.currency || 'USD',
      catalogPriceAmount: line.catalogPriceAmount ?? line.unitPrice ?? null,
      catalogPriceCurrency: line.catalogPriceCurrency ?? line.currency ?? currency ?? 'USD',
      notes: line.note ?? null,
      source: line.source,
      quoteAdjustmentType: line.quoteAdjustmentType ?? 'none',
      quoteAdjustmentValue: line.quoteAdjustmentValue ?? null,
      quoteAdjustmentReason: line.quoteAdjustmentReason ?? null,
      approvalRequired: Boolean(line.approvalRequired),
    })),
  }), [currency, displayLines]);

  const saveQuotePreview = React.useCallback(() => {
    onOpenOrCreateQuote(lead.id, buildQuotePreviewSavePayload());
  }, [buildQuotePreviewSavePayload, lead.id, onOpenOrCreateQuote]);

  const validateStepAdvance = React.useCallback(() => {
    if (builderStep === 0 && !selectedProductIds.length && !displayLines.length) return 'Select at least one product before pricing.';
    if (builderStep === 1) {
      if (!termsCurrency.trim()) return 'Select a quote currency before pricing.';
      if (!termsIncoterm.trim()) return 'Select an incoterm before pricing.';
      if (!paymentTerms.trim()) return 'Add payment terms before pricing.';
      if (!quoteValidityDays.trim()) return 'Add quote validity before pricing.';
    }
    if (builderStep === 2) {
      if (!displayLines.length) return 'Add at least one priced line before continuing to review.';
      if (displayLines.some((line) => !line.productId)) return 'Every quote line needs a mapped product before continuing.';
      if (displayLines.some((line) => !line.quantity || line.quantity <= 0)) return 'Every quote line needs a quantity above zero.';
      if (displayLines.some((line) => line.unitPrice == null || line.unitPrice <= 0)) return 'Every quote line needs a unit price above zero.';
      if (displayLines.some((line) => line.approvalRequired && !String(line.quoteAdjustmentReason ?? '').trim())) return 'Add a quote-only adjustment reason when the change requires approval.';
    }
    return null;
  }, [builderStep, displayLines, paymentTerms, quoteValidityDays, selectedProductIds.length, termsCurrency, termsIncoterm]);

  const continueQuotePreviewStep = React.useCallback(() => {
    const validationIssue = validateStepAdvance();
    if (validationIssue) {
      setStepValidationMessage(validationIssue);
      return;
    }
    setStepValidationMessage(null);
    saveQuotePreview();
    setBuilderStep((current) => Math.min(current + 1, steps.length - 1));
  }, [saveQuotePreview, steps.length, validateStepAdvance]);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 pb-20" style={{ background: '#f0f4f8' }}>

      {/* Hero — spec .qb-hero */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[22px] p-[18px_22px] text-white" style={{ background: 'linear-gradient(135deg,#061c2e 0%,#0b2e4a 55%,#1a5fa0 100%)' }}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] text-[14px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#1a5fa0,#0c7fff)' }}>
            {getLeadInitials(lead.company_name) || 'SF'}
          </div>
          <div>
            <div className="text-[19px] font-extrabold leading-tight tracking-[-0.4px]">{lead.company_name}</div>
            <div className="mt-[3px] text-[11px] text-white/60">{lead.lead_type} · {ownerLabel} · {selectedMarketNames[0] ?? lead.country ?? 'No market'} · {stageName}</div>
            <div className="mt-[7px] flex flex-wrap gap-[6px]">
              {selectedProductNames.slice(0, 3).map((p) => (
                <span key={p} className="rounded-full border border-white/18 bg-white/12 px-[9px] py-[2px] text-[9px] font-bold uppercase tracking-[.04em] text-white/85">{p}</span>
              ))}
              {blockerCount > 0 ? <span className="rounded-full px-[9px] py-[2px] text-[9px] font-bold text-[#fde68a]" style={{ background: 'rgba(217,119,6,.25)', border: '1px solid rgba(217,119,6,.5)' }}>{blockerCount} send blocker{blockerCount === 1 ? '' : 's'}</span> : null}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[24px] font-extrabold tracking-[-0.5px]">{subtotal > 0 ? `${currency} ${formatPreviewAmount(subtotal)}` : (quotes.length > 0 ? `${quotes.length} quote${quotes.length === 1 ? '' : 's'}` : '—')}</div>
          <div className="mt-[2px] text-[9px] uppercase tracking-[.12em] text-white/50">Draft quote total</div>
          <div className="mt-[10px] flex justify-end gap-[6px]">
            <button type="button" onClick={onOpenCommandCenter} className="rounded-[6px] border border-white/20 px-[12px] py-[5px] text-[10px] font-bold text-white" style={{ background: 'rgba(255,255,255,.12)' }}>← Back to CC</button>
            <button type="button" onClick={saveQuotePreview} disabled={isInlineActionPending} className="rounded-[6px] border border-white/20 px-[12px] py-[5px] text-[10px] font-bold text-white disabled:opacity-60" style={{ background: 'rgba(255,255,255,.12)' }}>Create/open draft preview</button>
          </div>
        </div>
      </div>


      {/* Stepper — spec .qb-stepper */}
      <div className="rounded-[22px] border border-[#e2e8f0] bg-white p-[16px_20px] shadow-sm">
        <div className="mb-[14px] flex items-center gap-[10px]">
          <div className="text-[13px] font-bold text-[#0f172a]">Quote Preview</div>
          <div className="rounded-full border border-[rgba(12,127,255,.2)] px-[9px] py-[2px] text-[9px] font-bold uppercase tracking-[.08em] text-[#0c7fff]" style={{ background: 'rgba(12,127,255,.08)' }}>
            Step {builderStep + 1} of 5 · {steps[builderStep]}
          </div>
          <div className="ml-auto text-[10px] text-[#94a3b8]">Capture → Lead → <strong className="text-[#0b2e4a]">Quote</strong> → Order</div>
        </div>
        {/* Step track — spec .qb-track */}
        <div className="relative mb-[12px] flex items-center">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <button type="button" onClick={() => setBuilderStep(index)} className="relative z-[1] flex flex-1 flex-col items-center gap-[4px]">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold transition-all ${index < builderStep ? 'bg-[#059669] text-white shadow-[0_0_0_3px_#d1fae5]' : index === builderStep ? 'bg-[#0b2e4a] text-white shadow-[0_0_0_3px_rgba(11,46,74,.1)]' : 'border-2 border-[#e2e8f0] bg-white text-[#94a3b8]'}`}>
                  {index < builderStep ? '✓' : index + 1}
                </div>
                <div className={`text-center text-[9px] font-bold ${index < builderStep ? 'text-[#059669]' : index === builderStep ? 'text-[#0b2e4a]' : 'text-[#94a3b8]'}`}>{step}</div>
              </button>
              {index < steps.length - 1 ? (
                <div className={`h-[2px] flex-1 ${index < builderStep ? 'bg-[#059669]' : 'bg-[#e2e8f0]'}`} style={{ marginTop: '14px', alignSelf: 'flex-start', position: 'relative', zIndex: 1 }} />
              ) : null}
            </React.Fragment>
          ))}
        </div>
        <div className="rounded-[6px] border-l-[3px] border-[#0c7fff] bg-[#f8fafc] px-[12px] py-[8px] text-[11px] leading-[1.6] text-[#64748b]">
          <strong className="text-[#1e293b]">Step {builderStep + 1} — {steps[builderStep]}:</strong>{' '}
          {builderStep === 0 ? 'Confirm the product or category promise before pricing starts.' :
           builderStep === 1 ? 'Lock the quote basis first: currency, incoterm, payment terms, port context, validity, and FX reference.' :
           builderStep === 2 ? 'Build pricing lines after the commercial basis is known. Quantities follow the product UOM, pack size, and MOQ.' :
           builderStep === 3 ? 'Review pricing, compliance, and document posture before release.' :
           'Send only after blockers, approval posture, and audit records are clear.'}
        </div>
      </div>

      {/* QB grid — spec .qb-grid (1fr 228px) */}
      <div className="grid gap-[14px] xl:grid-cols-[1fr_228px]">

        {/* Main step panel — spec .qb-main > .qb-panel */}
        <div className="overflow-hidden rounded-[22px] border border-[#e2e8f0] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e2e8f0] px-[18px] py-[13px]">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[.18em] text-[#0c7fff]">Step {builderStep + 1} — {steps[builderStep]}</div>
              <div className="text-[14px] font-bold text-[#0f172a]">
                {builderStep === 0 ? 'Product & buyer lock' : builderStep === 1 ? 'Set commercial terms' : builderStep === 2 ? 'Build pricing lines' : builderStep === 3 ? 'Review quote package' : 'Approve and send safely'}
              </div>
            </div>
            <button type="button" onClick={saveQuotePreview} disabled={isInlineActionPending} className="rounded-[6px] border border-[#e2e8f0] bg-white px-[12px] py-[7px] text-[11px] font-semibold text-[#334155] disabled:opacity-60">Create/open draft preview</button>
          </div>
          <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-[18px] py-[10px] text-[11px] leading-[1.6] text-[#475569]">
            This inline view is a quote preview and readiness handoff. Use <strong>Create/open draft preview</strong> to create or refresh the governed draft. Detailed quantity, pricing, terms, PDF, approval, and send actions remain in the saved quote workflow.
          </div>
          <div className="p-[16px_18px]">
            {builderStep === 0 ? (
              <div className="grid grid-cols-2 gap-[10px]">
                <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-[12px]">
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Buyer context</div>
                  {[['Company', lead.company_name], ['Lead type', lead.lead_type], ['Market', selectedMarketNames[0] ?? lead.country ?? '—'], ['Currency', currency]].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-[#f8fafc] py-[3px] text-[11px]">
                      <span className="text-[#64748b]">{k}</span><span className="font-bold text-[#1e293b]">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-[12px]">
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Product scope</div>
                  {selectedProductNames.length ? selectedProductNames.map((p) => (
                    <div key={p} className="mb-[4px] text-[11px] font-semibold text-[#334155]">· {p}</div>
                  )) : (
                    <div className="space-y-2">
                      <div className="text-[11px] text-[#94a3b8]">No products mapped yet</div>
                      <button type="button" onClick={onOpenCoverageManager} className="rounded-[6px] bg-[#0b2e4a] px-[10px] py-[6px] text-[10px] font-bold text-white">
                        Open coverage manager
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : builderStep === 2 ? (
              <div className="space-y-3">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[#f8fafc] text-left text-[9px] font-extrabold uppercase tracking-[.12em] text-[#94a3b8]">
                      <th className="border-b border-[#e2e8f0] px-[10px] py-[6px]">Product</th>
                      <th className="border-b border-[#e2e8f0] px-[10px] py-[6px]">Price basis</th>
                      <th className="border-b border-[#e2e8f0] px-[10px] py-[6px]">Qty</th>
                      <th className="border-b border-[#e2e8f0] px-[10px] py-[6px]">Baseline / adjustment</th>
                      <th className="border-b border-[#e2e8f0] px-[10px] py-[6px]">Quote price / total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLines.length ? displayLines.map((item) => {
                      const qty = item.quantity;
                      const price = item.unitPrice;
                      return (
                        <tr key={item.id} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]">
                          <td className="px-[10px] py-[10px]"><div className="font-bold text-[#0f172a]">{item.productLabel}</div><div className="mt-1 text-[10px] text-[#64748b]">{item.variantLabel ? `${item.variantLabel} · ` : ''}{item.source === 'coverage' ? 'coverage/catalog fallback' : item.source === 'rfq' ? 'RFQ line' : 'quote draft line'}</div>{item.note ? <div className="mt-1 text-[10px] text-[#94a3b8]">{item.note}</div> : null}</td>
                          <td className="px-[10px] py-[10px] text-[10px] text-[#475569]"><div className="font-extrabold uppercase tracking-[.08em] text-[#0f172a]">{item.pricingBasis ?? 'case'}</div><div>{item.packSummary ?? 'Pack not set'}</div><div>{item.moqLabel ?? 'MOQ not set'}</div></td>
                          <td className="px-[10px] py-[10px]"><input title="Quantity updates this quote preview total immediately. Save via the governed quote workflow when ready." className="w-[68px] rounded-[6px] border border-[#cbd5e1] bg-white p-[5px] text-center text-[12px] font-semibold text-[#0f172a] outline-none" value={qty} onChange={(event) => updateEditableLine(item.id, 'quantity', event.target.value)} /></td>
                          <td className="px-[10px] py-[10px]">
                            <div className="text-[10px] font-semibold text-[#475569]">Default: {item.currency} {formatPreviewAmount(item.catalogPriceAmount ?? price ?? 0)}</div>
                            <div className="mt-1 grid grid-cols-[1fr_72px] gap-1">
                              <select title="Quote-only adjustment type. This does not change product/category/default pricing." className="rounded-[6px] border border-[#cbd5e1] bg-white p-[5px] text-[10px] font-semibold text-[#0f172a] outline-none" value={item.quoteAdjustmentType ?? 'none'} onChange={(event) => updateEditableLine(item.id, 'quoteAdjustmentType', event.target.value)}>
                                {QUOTE_ADJUSTMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                              <input title="Adjustment value in percent or quote currency based on selected adjustment type." className="rounded-[6px] border border-[#cbd5e1] bg-white p-[5px] text-right text-[10px] font-bold text-[#0f172a] outline-none" value={item.quoteAdjustmentValue ?? ''} onChange={(event) => updateEditableLine(item.id, 'quoteAdjustmentValue', event.target.value)} placeholder="0" />
                            </div>
                            <input title="Reason is required if the quote-only change exceeds the approval threshold." className="mt-1 w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[5px] text-[10px] text-[#334155] outline-none" value={item.quoteAdjustmentReason ?? ''} onChange={(event) => updateEditableLine(item.id, 'quoteAdjustmentReason', event.target.value)} placeholder="Adjustment reason for this quote only" />
                            {item.approvalRequired ? <div className="mt-1 rounded-[6px] border border-[#fde68a] bg-[#fffbeb] px-2 py-1 text-[10px] font-bold text-[#92400e]">Approval needed: {formatPreviewAmount(Math.abs(item.adjustmentDeltaPercent ?? 0))}% change exceeds 15% threshold.</div> : null}
                          </td>
                          <td className="px-[10px] py-[10px]"><input title="Final quote unit price for this quote only. Save via the governed quote workflow when ready." className="w-[90px] rounded-[6px] border border-[#cbd5e1] bg-white p-[5px_7px] text-right text-[12px] font-bold text-[#0f172a] outline-none" value={price ?? ''} onChange={(event) => updateEditableLine(item.id, 'unitPrice', event.target.value)} placeholder="Price" />
                          <div className="mt-1 font-bold text-[#0f172a]">{item.currency} {formatPreviewAmount(item.total)}</div></td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={5} className="px-[10px] py-[24px] text-center text-[12px] text-[#94a3b8]">No quote lines yet. Map products in Coverage or create/open a quote draft.</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-[12px_14px]">
                  {[['Subtotal', `${currency} ${formatPreviewAmount(subtotal)}`], ['Freight (est.)', '—'], ['Taxes', '—']].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-[3px] text-[12px]"><span className="text-[#64748b]">{k}</span><span className="font-bold text-[#1e293b]">{v}</span>
                    </div>
                  ))}
                  <div className="mt-[5px] h-px bg-[#e2e8f0]" />
                  <div className="flex justify-between py-[6px] text-[13px]"><span className="font-bold text-[#0f172a]">Grand total</span><span className="text-[16px] font-extrabold text-[#0b2e4a]">{currency} {formatPreviewAmount(subtotal)}</span></div>
                </div>
                {quoteAdjustmentApprovalRequired ? (
                  <div className="rounded-[6px] border border-[#fde68a] bg-[#fffbeb] p-[9px_13px] text-[11px] leading-[1.55] text-[#92400e]">⚠ Quote-only adjustment exceeds the 15% approval threshold. Save the draft, then request approval before sending.</div>
                ) : null}
              </div>
            ) : builderStep === 1 ? (
              <div className="grid grid-cols-2 gap-[10px]">
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Currency</label>
                  <select className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={termsCurrency} onChange={(event) => setTermsCurrency(event.target.value)}>
                    {currencyOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <p className="text-[10px] leading-[1.45] text-[#64748b]">Lead country currency {localCurrency ?? 'not mapped'} is included when available. Use quote validity days to lock the weekly average FX reference for this quote.</p>
                </div>
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Incoterm</label>
                  <select className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={termsIncoterm} onChange={(event) => setTermsIncoterm(event.target.value)}>
                    {['FOB', 'CIF', 'EXW', 'DDP', 'CFR'].map((option) => <option key={option} value={option}>{option} — {getIncotermHelp(option)}</option>)}
                  </select>
                  <p className="text-[10px] leading-[1.45] text-[#64748b]">{getIncotermHelp(termsIncoterm)}</p>
                </div>
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Payment terms</label>
                  <input className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} />
                </div>
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Quote validity (days)</label>
                  <input className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={quoteValidityDays} onChange={(event) => setQuoteValidityDays(event.target.value)} />
                </div>
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Port of loading</label>
                  <input className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={portOfLoading} onChange={(event) => setPortOfLoading(event.target.value)} placeholder="e.g. JNPT Mumbai" />
                </div>
                <div className="col-span-2 flex flex-col gap-[4px]">
                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Delivery notes</label>
                  <textarea className="w-full resize-y rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] text-[#0f172a] outline-none" value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} placeholder="Packaging, labelling, or shipping notes..." style={{ minHeight: '68px' }} />
                </div>
              </div>
            ) : builderStep === 3 ? (
              <div className="space-y-[10px]">
                {blockerCount > 0 ? (
                  <details className="rounded-[16px] border border-[#fecaca] bg-[linear-gradient(135deg,#fff7f7,#fff)] p-[13px_15px] shadow-[0_18px_45px_rgba(225,29,72,.08)]">
                    <summary className="cursor-pointer list-none text-[12px] font-extrabold text-[#9f1239] [&::-webkit-details-marker]:hidden">
                      Resolve compliance/document blocker · open guided fix panel
                    </summary>
                    <div className="mt-[10px] grid gap-[8px] text-[11px] leading-[1.55] text-[#7f1d1d]">
                      <p>This quote is blocked because compliance or required evidence is still open. Upload the matching document in the Lead or Order document area, then return here and create/open the draft preview again.</p>
                      <div className="rounded-[12px] border border-[#fecaca] bg-white p-[10px]">Active blockers: {blockerCount}. Latest document: {documents[0]?.file_name ?? 'none linked'}.</div>
                      <div className="flex flex-wrap gap-[8px]">
                        <button type="button" onClick={onOpenCommandCenter} className="rounded-[8px] bg-[#0b2e4a] px-[12px] py-[7px] text-[11px] font-bold text-white">Back to Command Center</button>
                        <button type="button" onClick={saveQuotePreview} disabled={isInlineActionPending} className="rounded-[8px] border border-[#e2e8f0] bg-white px-[12px] py-[7px] text-[11px] font-bold text-[#334155] disabled:opacity-60">Refresh draft after fix</button>
                      </div>
                    </div>
                  </details>
                ) : null}
                <div className="grid grid-cols-2 gap-[8px]">
                {[
                  { label: 'Pricing check', items: [['Subtotal', `${currency} ${formatPreviewAmount(subtotal)}`], ['Line items', String(displayLines.length)], ['Status', pricingReady ? 'Ready ✓' : 'Incomplete']] },
                  { label: 'Documents check', items: [['Linked files', String(documents.length)], ['Latest', documents[0]?.file_name ?? 'None linked'], ['Status', documents.length > 0 ? 'Ready ✓' : 'Missing']] },
                  { label: 'Compliance check', items: [['Active items', String(complianceItems.length)], ['Blockers', String(blockerCount)], ['Gate', blockerCount === 0 ? 'Clear ✓' : 'Blocked']] },
                  { label: 'Quote version', items: [['Version', latestVersion?.version_no ? `v${latestVersion.version_no}` : 'v1 draft'], ['Status', latestQuote?.status?.replace(/_/g, ' ') ?? 'draft'], ['Updated', latestQuote ? safeFormatDateTime(latestQuote.updated_at) : 'Not saved']] },
                ].map((card) => (
                  <div key={card.label} className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-[11px_13px]">
                    <div className="mb-[7px] text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">{card.label}</div>
                    {card.items.map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-[rgba(0,0,0,.03)] py-[3px] text-[11px]">
                        <span className="text-[#64748b]">{k}</span>
                        <span className={`font-bold ${String(v).includes('✓') ? 'text-[#059669]' : String(v).includes('Blocked') ? 'text-[#e11d48]' : 'text-[#1e293b]'}`}>{v}</span>
                      </div>
                    ))}
                    <div className="mt-[4px] h-[6px] rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div className={`h-full rounded-full ${pricingReady && blockerCount === 0 ? 'bg-[#059669]' : 'bg-[#f59e0b]'}`} style={{ width: pricingReady && blockerCount === 0 ? '100%' : '50%' }} />
                    </div>
                  </div>
                ))}
                </div>
              </div>
            ) : (
              // Step 4: Send gate — spec .sg
              <div className={`overflow-hidden rounded-[22px] border-2 ${sendReady ? 'border-[#a7f3d0] bg-[#ecfdf5]' : 'border-[#fecaca] bg-[#fff1f2]'} mb-[10px]`}>
                <div className="flex items-center gap-3 p-[14px_18px]">
                  <span className="text-[22px]">{sendReady ? '✓' : '⚠'}</span>
                  <div>
                    <div className={`text-[14px] font-extrabold ${sendReady ? 'text-[#047857]' : 'text-[#9f1239]'}`}>
                      {sendReady ? 'This quote version is safe to send.' : 'Send blocked — resolve before sending.'}
                    </div>
                    <div className={`mt-[2px] text-[11px] ${sendReady ? 'text-[#059669]' : 'text-[#e11d48]'}`}>
                      {sendReady ? 'Version binding, approval posture, and explicit blockers all point to send-safe.' : `${blockerCount} blocker${blockerCount === 1 ? '' : 's'} or pricing gap${blockerCount === 1 ? '' : 's'} remain.`}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-[4px] px-[18px] pb-[12px]">
                  {[
                    { label: blockerCount === 0 ? 'No active blockers' : 'Resolve active blockers', ok: blockerCount === 0 },
                    { label: 'Pricing complete', ok: pricingReady },
                    { label: 'Approval cleared', ok: !approvalPending },
                    { label: 'Compliance clear', ok: complianceItems.length === 0 },
                    { label: 'Quote draft exists', ok: hasQuoteDraft },
                  ].map((ck) => (
                    <div key={ck.label} className={`flex items-center gap-[8px] rounded-[6px] border p-[6px_10px] text-[12px] ${ck.ok ? 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]' : 'border-[#fecaca] bg-[#fff1f2] text-[#9f1239]'}`}>
                      <span className="font-bold">{ck.ok ? '✓' : '✕'}</span> {ck.label}
                    </div>
                  ))}
                </div>
                <div className="flex gap-[8px] border-t p-[12px_18px]" style={{ borderColor: sendReady ? '#a7f3d0' : '#fecaca' }}>
                  {sendReady && latestQuote?.id ? (
                    <Link href={`/quotes?quoteId=${latestQuote.id}&send=1`} className="flex-1 rounded-[6px] bg-[#0b2e4a] p-[10px] text-center text-[13px] font-extrabold text-white no-underline">
                      Open send workflow
                    </Link>
                  ) : (
                    <button type="button" disabled title="Resolve blockers or approval before sending." className="flex-1 rounded-[6px] bg-[#e2e8f0] p-[10px] text-[13px] font-extrabold text-[#94a3b8] border-none cursor-not-allowed">
                      Send quote
                    </button>
                  )}
                  <button type="button" onClick={() => onRequestQuoteApproval(lead.id, latestQuote?.id ?? null)} disabled={!approvalReady || isInlineActionPending} title={approvalReady ? 'Record owner approval request for this quote.' : 'Create or open a quote draft before requesting approval.'} className="flex-1 rounded-[6px] bg-[#f59e0b] p-[10px] text-[13px] font-extrabold text-white border-none disabled:cursor-not-allowed disabled:opacity-60">
                    {approvalPending ? 'Request approval / view queue' : 'Request approval'}
                  </button>
                  <button type="button" onClick={saveQuotePreview} disabled={isInlineActionPending} className="rounded-[6px] border border-[#e2e8f0] bg-white p-[10px_14px] text-[12px] font-bold text-[#475569] disabled:opacity-60">
                    Create/open draft preview
                  </button>
                </div>
                <div className="border-t border-[#fecaca] bg-white/70 p-[14px_18px]">
                  <div className="mb-[8px] text-[13px] font-extrabold text-[#0f172a]">Deal closed directly?</div>
                  <div className="mb-[10px] text-[11px] leading-[1.6] text-[#64748b]">Use this when the buyer agreed by trade show, phone, or WhatsApp and you need an order record without sending the external quote email.</div>
                  <div className="flex flex-col gap-[8px] sm:flex-row">
                    <input
                      value={directOrderNote}
                      onChange={(event) => setDirectOrderNote(event.target.value)}
                      placeholder="Optional note, e.g. agreed at trade show"
                      className="min-w-0 flex-1 rounded-[8px] border border-[#e2e8f0] bg-white px-[12px] py-[9px] text-[12px] font-semibold text-[#334155] outline-none focus:border-[#0c7fff]"
                    />
                    <button
                      type="button"
                      onClick={() => onMarkDirectOrder(lead.id, latestQuote?.id ?? null, directOrderNote)}
                      disabled={!latestQuote?.id || !pricingReady || isInlineActionPending}
                      title={!latestQuote?.id ? 'Create or open a quote draft first.' : !pricingReady ? 'Fix missing prices before creating an order.' : 'Create the order directly from this quote.'}
                      className="rounded-[8px] bg-[#0b2e4a] px-[14px] py-[9px] text-[12px] font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
                    >
                      ✓ Mark as direct order
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — spec .qb-sidebar */}
        <aside className="flex flex-col gap-[10px]">
          {/* Quote summary card — spec .qb-rc */}
          <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-[14px] shadow-sm">
            <div className="mb-[6px] text-[9px] font-bold uppercase tracking-[.16em] text-[#94a3b8]">Quote v1</div>
            <div className="mb-[6px] text-[14px] font-extrabold text-[#0f172a]">{currency} {formatPreviewAmount(subtotal)}</div>
            {[['Lines', String(displayLines.length)], ['Status', latestQuote?.status?.replace(/_/g, ' ') ?? 'draft'], ['Version', latestVersion ? `v${latestVersion.version_no}` : 'v1'], ['Updated', latestQuote ? safeFormatDateTime(latestQuote.updated_at) : 'Not saved']].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-[#f8fafc] py-[3px] text-[11px]">
                <span className="text-[#64748b]">{k}</span><span className="font-bold text-[#1e293b]">{v}</span>
              </div>
            ))}
          </div>

          {/* Step nav buttons — spec .sn-btn */}
          <div className="flex flex-col gap-[4px]">
            {steps.map((step, index) => (
              <button key={step} type="button" onClick={() => setBuilderStep(index)}
                className={`flex w-full items-center gap-[8px] rounded-[6px] border p-[7px_10px] text-left text-[11px] font-bold transition-colors ${index < builderStep ? 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]' : index === builderStep ? 'border-[#0c7fff] bg-[rgba(12,127,255,.06)] text-[#0b2e4a]' : 'border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]'}`}>
                <span className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold ${index < builderStep ? 'bg-[#059669] text-white' : index === builderStep ? 'bg-[#0b2e4a] text-white' : 'border-[1.5px] border-[#e2e8f0] bg-[#f1f5f9] text-[#94a3b8]'}`}>
                  {index < builderStep ? '✓' : index + 1}
                </span>
                {step}
              </button>
            ))}
          </div>

          {/* Context card */}
          <div className="rounded-[16px] border border-[#e2e8f0] bg-white p-[14px] shadow-sm">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[.16em] text-[#94a3b8]">Approval queue</div>
            <div className="mb-[6px] text-[13px] font-bold text-[#0f172a]">{approvalPending ? 'Approval pending' : blockerCount > 0 ? `${blockerCount} blocker${blockerCount === 1 ? '' : 's'}` : 'No blockers'}</div>
            <div className="text-[11px] leading-[1.6] text-[#64748b]">{approvalPending ? 'A quote-only adjustment needs owner approval. The requester sees pending until approved.' : sendReady ? 'Send gate clear — quote is safe to send.' : 'Resolve blockers before the send gate opens.'}</div>
            {approvalPending ? (
              <div className="mt-3 grid gap-2">
                {quoteAdjustmentApprovalRequired && !latestQuoteApprovalRequired ? (
                  <button type="button" onClick={saveQuotePreview} disabled={isInlineActionPending} className="w-full rounded-[8px] bg-[#0b2e4a] px-3 py-2 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60">
                    Save adjustment for approval
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => onApproveQuoteAdjustment(lead.id, latestQuote?.id ?? null)} disabled={!latestQuote?.id || isInlineActionPending} className="w-full rounded-[8px] bg-[#059669] px-3 py-2 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60">
                      Approve quote adjustment
                    </button>
                    <button type="button" onClick={() => onRejectQuoteAdjustment(lead.id, latestQuote?.id ?? null)} disabled={!latestQuote?.id || isInlineActionPending} className="w-full rounded-[8px] border border-[#fecaca] bg-white px-3 py-2 text-[12px] font-extrabold text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60">
                      Reject / request revision
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {stepValidationMessage ? (
        <div role="alert" className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
          {stepValidationMessage}
        </div>
      ) : null}

      {/* Sticky bottom bar */}
      <div className="sticky bottom-3 z-10 rounded-[24px] border border-[#e2e8f0] bg-white/95 p-3 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={continueQuotePreviewStep} disabled={builderStep >= steps.length - 1}
            className="rounded-[22px] bg-[#0b2e4a] px-5 py-3 text-[13px] font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60" title={builderStep >= steps.length - 1 ? 'Send is disabled in the inline builder until the governed quote send workflow is connected.' : undefined}>
            {builderStep < steps.length - 1 ? `Continue ${steps[builderStep + 1]} step` : canSendQuote ? 'Send ready in quote workflow' : 'Review blockers'}
          </button>
          <button type="button" onClick={saveQuotePreview} disabled={isInlineActionPending} className="rounded-[22px] border border-[#e2e8f0] px-5 py-3 text-[13px] font-bold text-[#334155] disabled:opacity-60">Create/open draft preview</button>
          {latestQuote?.id ? <Link href={`/quotes?quoteId=${latestQuote.id}`} className="rounded-[22px] border border-[#e2e8f0] px-5 py-3 text-[13px] font-bold text-[#334155] no-underline">Open in Quotes</Link> : null}
          {latestQuote?.id ? <Link href={`/api/quotes/${latestQuote.id}/pdf`} target="_blank" className="rounded-[22px] border border-[#e2e8f0] px-5 py-3 text-[13px] font-bold text-[#334155] no-underline">PDF preview</Link> : null}
          <button type="button" onClick={() => onRequestQuoteApproval(lead.id, latestQuote?.id ?? null)} disabled={!approvalReady || isInlineActionPending} title={approvalReady ? 'Record owner approval request for this quote.' : 'Create or open a quote draft before requesting approval.'} className="rounded-[22px] border border-[#e2e8f0] px-5 py-3 text-[13px] font-bold text-[#334155] disabled:cursor-not-allowed disabled:opacity-60">{approvalPending ? 'Request approval / view queue' : 'Request approval'}</button>
          <span className="ml-auto rounded-full bg-[#f1f5f9] px-4 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#64748b]">
            Command Center · Quote Preview · {steps[builderStep]}
          </span>
        </div>
      </div>
    </div>
  );
}


function LeadQueueStat({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'blue' | 'amber' }) {
  const toneClass =
    tone === 'blue'
      ? 'border-blue-100 bg-blue-50 text-blue-700'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function LeadMobileCard(props: LeadTableRowProps) {
  const {
    lead,
    selected,
    isSpotlight,
    toggleSelect,
    setSpotlightLead,
    stageMap,
    nextStepMap,
    ownerMap,
    safeFormatDateTime,
    activityMap,
    stageHistoryMap,
    stageMetaMap,
    readinessMap,
  } = props;

  const stageMeta = lead.stage_id ? stageMetaMap.get(lead.stage_id) : null;
  const health = computeLeadHealth({
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    last_contacted_at: lead.last_contacted_at,
    next_follow_up_at: lead.next_follow_up_at,
    lastActivityAt: activityMap.get(lead.id),
    lastStageChangeAt: stageHistoryMap.get(lead.id),
    stageSortOrder: stageMeta?.sortOrder ?? null,
    stageCount: stageMeta?.stageCount ?? null,
    isClosedStage: stageMeta?.isClosed ?? null,
  });
  const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
  const readiness = readinessMap.get(lead.id);
  const commandCenterHref = getLeadCommandCenterHref(lead.id);
  const emailHref = getLeadEmailHref(lead);
  const whatsappHref = getLeadWhatsAppHref(lead);
  const router = useRouter();

  return (
    <article
      role="link"
      tabIndex={0}
      className={[
        'cursor-pointer rounded-[1.45rem] border border-slate-200 bg-white p-3.5 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
        selected || isSpotlight ? 'ring-2 ring-brand-200' : '',
      ].join(' ')}
      onMouseEnter={() => setSpotlightLead(lead.id)}
      onClick={(event) => {
        if (shouldIgnoreLeadNavigationTarget(event.target)) return;
        openLeadCommandCenter(router, commandCenterHref);
      }}
      onKeyDown={(event) => {
        if (shouldIgnoreLeadNavigationTarget(event.target)) return;
        handleLeadCommandCenterKeyDown(event, router, commandCenterHref);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openLeadCommandCenter(router, commandCenterHref);
              }}
              className="text-left text-base font-semibold text-slate-900 underline-offset-4 hover:text-brand-700 hover:underline"
            >
              {lead.company_name}
            </button>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${lead.lead_type === 'buyer' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {lead.lead_type}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{lead.contact_name ?? 'No primary contact'} · {lead.country ?? 'No country'}</p>
        </div>
        <input
          type="checkbox"
          checked={selected}
          aria-label={`Select ${lead.company_name}`}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleSelect(lead.id)}
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openLeadCommandCenter(router, commandCenterHref);
        }}
        className="mt-3 block w-full rounded-2xl text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Stage</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{stageMap.get(lead.stage_id ?? '') ?? '—'}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{nextStepMap.get(lead.next_step_id ?? '') ?? 'No next step set'}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Follow-up</p>
            <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getFollowUpBadgeClasses(followUpState)}`}>
              {lead.next_follow_up_at ? safeFormatDateTime(lead.next_follow_up_at) : getFollowUpLabel(followUpState)}
            </span>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ownerMap.get(lead.owner_user_id ?? '') ?? 'Unassigned'}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{health.replace('_', ' ')}</span>
          <SignalPill label={getPricingReadinessLabel(readiness?.pricingReadiness ?? 'missing')} tone={getReadinessTone(readiness?.pricingReadiness ?? 'missing')} icon={readiness?.pricingReadiness === 'ready' ? CheckCircle : readiness?.pricingReadiness === 'partial' ? Clock : AlertTriangle} />
          <SignalPill label={`${readiness?.blockerCount ?? 0} blocker${(readiness?.blockerCount ?? 0) === 1 ? '' : 's'}`} tone={(readiness?.blockerCount ?? 0) > 0 ? 'rose' : 'slate'} icon={(readiness?.blockerCount ?? 0) > 0 ? AlertTriangle : CheckCircle} />
        </div>
      </button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="text-xs font-medium text-slate-500">Continue, quote, or contact this lead.</div>
        <div className="flex flex-wrap gap-2">
          {emailHref ? (
            <a
              href={emailHref}
              onClick={(event) => event.stopPropagation()}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
            >
              Email
            </a>
          ) : null}
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
            >
              WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSpotlightLead(lead.id);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openLeadCommandCenter(router, commandCenterHref);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
          >
            Open
          </button>
        </div>
      </div>
    </article>
  );
}

function LeadSpotlightCard({
  lead,
  stageMap,
  nextStepMap,
  ownerMap,
  safeFormatDateTime,
  onQuickAdd,
  activityMap,
  stageHistoryMap,
  stageMetaMap,
  readinessMap,
  quotes,
  quoteVersions,
  documents,
}: {
  lead: LeadRow | undefined;
  stageMap: Map<string, string>;
  nextStepMap: Map<string, string>;
  ownerMap: Map<string, string>;
  safeFormatDateTime: (value?: string | null) => string;
  onQuickAdd: () => void;
  activityMap: Map<string, string>;
  stageHistoryMap: Map<string, string>;
  stageMetaMap: Map<string, { sortOrder: number; stageCount: number; isClosed: boolean }>;
  readinessMap: Map<string, LeadCommercialReadiness>;
  quotes: Quote[];
  quoteVersions: QuoteVersion[];
  documents: LeadDocument[];
}) {
  if (!lead) {
    return (
      <div className="sticky top-[144px] rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lead spotlight</p>
        <h3 className="mt-3 text-xl font-semibold text-slate-900">No lead selected yet</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Hover a row on desktop or choose a card on mobile to keep a detail preview visible inside the workspace.</p>
        <button type="button" onClick={onQuickAdd} className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Quick add lead</button>
      </div>
    );
  }

  const stageMeta = lead.stage_id ? stageMetaMap.get(lead.stage_id) : null;
  const health = computeLeadHealth({
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    last_contacted_at: lead.last_contacted_at,
    next_follow_up_at: lead.next_follow_up_at,
    lastActivityAt: activityMap.get(lead.id),
    lastStageChangeAt: stageHistoryMap.get(lead.id),
    stageSortOrder: stageMeta?.sortOrder ?? null,
    stageCount: stageMeta?.stageCount ?? null,
    isClosedStage: stageMeta?.isClosed ?? null,
  });
  const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
  const readiness = readinessMap.get(lead.id);
  const latestQuote = quotes
    .filter((quote) => quote.lead_id === lead.id)
    .sort((left, right) => String(right.updated_at ?? right.created_at ?? '').localeCompare(String(left.updated_at ?? left.created_at ?? '')))[0] ?? null;
  const leadDocuments = documents.filter((document) => document.related_id === lead.id);
  const router = useRouter();

  return (
    <div className="sticky top-[144px] space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lead spotlight</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-semibold text-slate-900">{lead.company_name}</h3>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${lead.lead_type === 'buyer' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {lead.lead_type}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{lead.contact_name ?? 'No primary contact'} · {lead.country ?? 'No country'} · {ownerMap.get(lead.owner_user_id ?? '') ?? 'Unassigned'}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <SpotlightItem label="Stage" value={stageMap.get(lead.stage_id ?? '') ?? '—'} />
        <SpotlightItem label="Next step" value={nextStepMap.get(lead.next_step_id ?? '') ?? 'No next step set'} />
        <SpotlightItem label="Follow-up" value={lead.next_follow_up_at ? safeFormatDateTime(lead.next_follow_up_at) : getFollowUpLabel(followUpState)} />
        <SpotlightItem label="Health" value={health.replace('_', ' ')} />
        <SpotlightItem label="Pricing readiness" value={getPricingReadinessLabel(readiness?.pricingReadiness ?? 'missing')} />
        <SpotlightItem label="Blockers" value={readiness?.blockerReasons[0] ?? 'No active blockers'} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recent context</p>
        <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>Last contacted: <span className="font-medium text-slate-800">{lead.last_contacted_at ? safeFormatDateTime(lead.last_contacted_at) : 'Not logged'}</span></p>
          <p>Last activity: <span className="font-medium text-slate-800">{activityMap.get(lead.id) ? safeFormatDateTime(activityMap.get(lead.id)) : 'Not logged'}</span></p>
          <p>Last stage change: <span className="font-medium text-slate-800">{stageHistoryMap.get(lead.id) ? safeFormatDateTime(stageHistoryMap.get(lead.id)) : 'Not logged'}</span></p>
        </div>
      </div>

      <QuoteReviewCard quote={latestQuote} quoteVersions={quoteVersions.filter((version) => quotes.some((candidate) => candidate.id === version.quote_id && candidate.lead_id === lead.id))} documents={leadDocuments} leadId={lead.id} safeFormatDateTime={safeFormatDateTime} />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => openLeadCommandCenter(router, getLeadCommandCenterHref(lead.id))}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
        >
          Open
        </button>
        <button type="button" onClick={onQuickAdd} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Add another lead
        </button>
      </div>
    </div>
  );
}

function SpotlightItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}


function getQuoteStatusTone(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();
  if (['approved', 'accepted', 'sent'].includes(normalized)) return 'emerald';
  if (['pending_approval', 'pending', 'draft'].includes(normalized)) return 'amber';
  return 'slate';
}

function QuoteReviewCard({
  quote,
  quoteVersions,
  documents,
  leadId,
  safeFormatDateTime,
}: {
  quote: Quote | null;
  quoteVersions: QuoteVersion[];
  documents: LeadDocument[];
  leadId: string;
  safeFormatDateTime: (value?: string | null) => string;
}) {
  if (!quote) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
        No quote created yet. Quotes will surface here once the lead enters the commercial workflow.
      </div>
    );
  }

  const versions = quoteVersions
    .filter((version) => version.quote_id === quote.id)
    .sort((left, right) => Number(right.version_no ?? 0) - Number(left.version_no ?? 0) || String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')));
  const quoteDocuments = documents
    .filter((document) => document.linked_quote_id === quote.id || (document.source_related_entity?.startsWith('quote') && document.related_id === leadId))
    .sort((left, right) => String(right.uploaded_at ?? '').localeCompare(String(left.uploaded_at ?? '')));
  const documentById = new Map(quoteDocuments.map((document) => [document.id, document] as const));
  const versionRows = versions.map((version) => ({
    version,
    document: version.pdf_document_id ? documentById.get(version.pdf_document_id) ?? quoteDocuments.find((document) => document.id === version.pdf_document_id) ?? null : null,
  }));
  const latestDocument = versionRows.find((row) => row.document)?.document ?? quoteDocuments[0] ?? null;
  const approvedDocument = versionRows.find((row) => row.version.approved_at || String(row.version.status ?? '').toLowerCase() === 'approved')?.document ?? quoteDocuments.find((document) => String(document.status ?? '').toLowerCase() === 'approved') ?? null;
  const sentDocument = versionRows.find((row) => row.version.sent_at || String(row.version.status ?? '').toLowerCase() === 'sent')?.document ?? quoteDocuments.find((document) => String(document.status ?? '').toLowerCase() === 'sent') ?? null;
  const approvedVersion = versions.find((version) => version.approved_at);
  const sentVersion = versions.find((version) => version.sent_at);
  const router = useRouter();
  const statusTimeline = [
    quote.created_at ? { label: 'Quote created', at: quote.created_at } : null,
    approvedVersion?.approved_at ? { label: 'Version approved', at: approvedVersion.approved_at } : null,
    sentVersion?.sent_at ? { label: 'Version sent', at: sentVersion.sent_at } : null,
    quote.updated_at && quote.updated_at !== quote.created_at ? { label: 'Quote updated', at: quote.updated_at } : null,
  ].filter((item): item is { label: string; at: string } => Boolean(item?.at));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quote review</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{quote.quote_number ?? 'Latest quote'} · {quote.status.replace(/_/g, ' ')}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Updated {safeFormatDateTime(quote.updated_at)} · Version {quote.current_version_id ?? 'Current pending sync'}</p>
        </div>
        <StatusChip label={quote.status.replace(/_/g, ' ')} tone={getQuoteStatusTone(quote.status)} />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">Latest document: <span className="font-medium text-slate-800">{latestDocument?.file_name ?? 'No quote PDF linked yet'}</span></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">Approved document: <span className="font-medium text-slate-800">{approvedDocument?.file_name ?? 'Not approved yet'}</span></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">Sent document: <span className="font-medium text-slate-800">{sentDocument?.file_name ?? 'Not sent yet'}</span></div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Version history</p>
          <div className="mt-2 space-y-2 text-xs text-slate-600">
            {versionRows.length ? versionRows.map(({ version, document }) => (
              <div key={version.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">v{version.version_no ?? '—'} · {String(version.status ?? 'draft').replace(/_/g, ' ')}</span>
                  <span>{safeFormatDateTime(version.sent_at ?? version.approved_at ?? version.created_at)}</span>
                </div>
                <p className="mt-1 text-slate-500">{document?.file_name ?? 'No linked PDF yet'}</p>
              </div>
            )) : <p>No quote versions synced yet.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Approval and send timeline</p>
          <div className="mt-2 space-y-2 text-xs text-slate-600">
            {statusTimeline.length ? statusTimeline.map((item) => (
              <div key={`${item.label}-${item.at}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{item.label}</span>
                  <span>{safeFormatDateTime(item.at)}</span>
                </div>
              </div>
            )) : <p>No approval or send timeline available yet.</p>}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openLeadCommandCenter(router, getLeadCommandCenterHref(leadId, 'quotes'))}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => openLeadCommandCenter(router, getLeadCommandCenterHref(leadId, 'quotes'))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
        >
          Open commercial view
        </button>
      </div>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: 'rose' | 'amber' | 'slate' | 'emerald' }) {
  const classes =
    tone === 'rose'
      ? 'bg-rose-50 text-rose-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'emerald'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-700';
  return <span className={`rounded-full px-3 py-1 text-sm font-medium ${classes}`}>{label}</span>;
}
