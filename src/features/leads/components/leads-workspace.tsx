'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition, type KeyboardEvent, type SVGProps } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LeadDrawer } from '@/features/leads/components/lead-drawer';
import LeadsFiltersPanel from '@/features/leads/components/LeadsFiltersPanel';
import { SavedViewsBar, ToolbarActionButton, ToolbarSearchInput, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { batchScheduleLeadFollowUps, batchMoveLeadsToStage } from '@/features/leads/server/actions';
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
import type { LeadDrawerSavePayload, LeadsWorkspaceProps } from '@/features/leads/types/workspace';
import type {
  TodayFilterKey,
  TodayLayerState,
  WorkspaceMode
} from '@/features/workspace/types';

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

type SignalTone = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
type IconComponent = (props: SVGProps<SVGSVGElement>) => JSX.Element;

function getStageIcon(stageName?: string | null): IconComponent {
  const value = String(stageName ?? '').toLowerCase();
  if (value.includes('qual')) return BadgeCheck;
  if (value.includes('contact')) return Phone;
  if (value.includes('sample')) return Package;
  if (value.includes('negoti')) return Handshake;
  if (value.includes('won') || value.includes('close')) return Trophy;
  if (value.includes('lost')) return XCircle;
  return Sparkles;
}

function getStageTone(stageName?: string | null) {
  const value = String(stageName ?? '').toLowerCase();
  if (value.includes('qual')) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (value.includes('contact')) return 'border-indigo-100 bg-indigo-50 text-indigo-700';
  if (value.includes('sample')) return 'border-amber-100 bg-amber-50 text-amber-700';
  if (value.includes('negoti')) return 'border-violet-100 bg-violet-50 text-violet-700';
  if (value.includes('won') || value.includes('close')) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (value.includes('lost')) return 'border-rose-100 bg-rose-50 text-rose-700';
  return 'border-blue-100 bg-blue-50 text-blue-700';
}

function getHealthTone(health: string): SignalTone {
  if (health.includes('at_risk')) return 'rose';
  if (health.includes('cold')) return 'slate';
  if (health.includes('due')) return 'amber';
  return 'emerald';
}

function getHealthIcon(health: string): IconComponent {
  if (health.includes('at_risk')) return AlertTriangle;
  if (health.includes('cold')) return Snowflake;
  if (health.includes('due')) return Clock;
  return CalendarCheck;
}

function getReadinessTone(readiness: string): SignalTone {
  if (readiness === 'ready') return 'emerald';
  if (readiness === 'partial') return 'amber';
  return 'rose';
}

function buildAiLeadBrief(lead: LeadRow, readiness: LeadCommercialReadiness | undefined, ownerLabel: string, followUpLabel: string) {
  if ((readiness?.blockerCount ?? 0) > 0) return `${lead.company_name} needs blocker recovery before moving deeper into the sales process. ${ownerLabel} should review ${followUpLabel.toLowerCase()}.`;
  if (lead.next_follow_up_at) return `${lead.company_name} is live in the queue with ${followUpLabel.toLowerCase()}. Keep the operator handoff calm and move toward ${lead.contact_name ?? 'the main contact'}.`;
  return `${lead.company_name} has no scheduled next touch. Add a follow-up so AI, pricing, and workflow stay aligned.`;
}

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
}: LeadsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);
  const [todayFilter, setTodayFilter] = useState<TodayFilterKey>(initialTodayState?.activeFilter ?? getPreferredTodayFilter(initialTodayState));
  const [workspaceLeads, setWorkspaceLeads] = useState<LeadRow[]>(leads);
  const [workspaceLeadMarkets, setWorkspaceLeadMarkets] = useState<Array<{ lead_id: string; market_id: string }>>(leadMarkets);
  const [workspaceLeadProductInterests, setWorkspaceLeadProductInterests] = useState<Array<{ lead_id: string; product_id: string }>>(leadProductInterests);
  const [workspaceFollowUps, setWorkspaceFollowUps] = useState<FollowUp[]>(followUps);
  const [savedView, setSavedView] = useState<SavedView>(
    initialLeadType === 'buyer' ? 'buyers' : initialLeadType === 'supplier' ? 'suppliers' : 'all',
  );
  const [search, setSearch] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState<'' | LeadJourney>(initialLeadType);
  const [ownerId, setOwnerId] = useState('');
  const [pipelineIdFilter, setPipelineIdFilter] = useState('');
  const [stageIdFilter, setStageIdFilter] = useState('');
  const [countryIdFilter, setCountryIdFilter] = useState('');
  const [marketIdFilter, setMarketIdFilter] = useState('');
  const [productIdFilter, setProductIdFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('follow-up');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [batchFollowUpAt, setBatchFollowUpAt] = useState('');
  const [batchNextStepId, setBatchNextStepId] = useState('');
  const [batchState, setBatchState] = useState<FormState>({});
  const [batchStageId, setBatchStageId] = useState('');
  const [batchStageState, setBatchStageState] = useState<FormState>({});
  const [isBatchStagePending, startBatchStageTransition] = useTransition();
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, mode: 'quick', leadId: null, initialStepId: 'basics' });
  const [spotlightLeadId, setSpotlightLeadId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [isBatchPending, startBatchTransition] = useTransition();

  useEffect(() => {
    setWorkspaceMode(initialMode);
    setLeadTypeFilter(initialLeadType);
    setSavedView(initialLeadType === 'buyer' ? 'buyers' : initialLeadType === 'supplier' ? 'suppliers' : 'all');
  }, [initialLeadType, initialMode]);

  useEffect(() => {
    setTodayFilter(initialTodayState?.activeFilter ?? getPreferredTodayFilter(initialTodayState));
  }, [initialTodayState]);

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
      const routeLockedView = initialLeadType === 'buyer' ? 'buyers' : initialLeadType === 'supplier' ? 'suppliers' : null;
      if (parsed.search) setSearch(parsed.search);
      if (routeLockedView) {
        setSavedView(routeLockedView);
        setLeadTypeFilter(initialLeadType);
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
  }, [initialLeadType, storageKey]);

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

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
  }, [pathname, router, search, searchParams, workspaceMode]);

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
    nowIso: new Date().toISOString(),
    leads: workspaceLeads,
    activities,
    complianceItems,
  }), [activities, complianceItems, todayFilter, workspaceLeads, workspaceMode]);
  const todayLeadIdSet = useMemo(() => new Set(todayState.filteredLeadIds), [todayState.filteredLeadIds]);

  const preparedLeads = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return workspaceLeads.filter((lead) => {
      const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
      const matchesSavedView = true;

      const matchesSearch =
        !needle ||
        [lead.company_name, lead.contact_name ?? '', lead.email ?? '', lead.country ?? '']
          .some((value) => value.toLowerCase().includes(needle));

      const matchesPipeline = !pipelineIdFilter || lead.pipeline_id === pipelineIdFilter;
      const matchesStage = !stageIdFilter || lead.stage_id === stageIdFilter;
      const matchesCountry = !countryIdFilter || lead.country_id === countryIdFilter;
      const matchesMarket = !marketIdFilter || (leadMarketsMap.get(lead.id)?.includes(marketIdFilter) ?? false);
      const matchesProduct = !productIdFilter || (leadProductsMap.get(lead.id)?.includes(productIdFilter) ?? false);

      const matchesFilters =
        (!leadTypeFilter || lead.lead_type === leadTypeFilter) &&
        (!ownerId || lead.owner_user_id === ownerId) &&
        matchesPipeline &&
        matchesStage &&
        matchesCountry &&
        matchesMarket &&
        matchesProduct;

      const matchesToday = todayFilter === 'all-open' ? true : todayLeadIdSet.has(lead.id);
      return matchesSavedView && matchesSearch && matchesFilters && matchesToday;
    });
  }, [currentUserId, leadTypeFilter, ownerId, savedView, search, pipelineIdFilter, stageIdFilter, countryIdFilter, marketIdFilter, productIdFilter, todayFilter, todayLeadIdSet, workspaceLeads, leadMarketsMap, leadProductsMap]);

  const sortedLeads = useMemo(() => {
    const items = [...preparedLeads];
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
  }, [activityMap, preparedLeads, sortMode, stageHistoryMap, stageMetaMap]);

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
      overdue: sortedLeads.filter((lead) => getFollowUpVisualState(lead.next_follow_up_at) === 'overdue').length,
      dueToday: sortedLeads.filter((lead) => getFollowUpVisualState(lead.next_follow_up_at) === 'today').length,
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
    [sortedLeads, activityMap, stageHistoryMap, stageMetaMap, readinessByLeadId],
  );

  const todaysActions = useMemo(() => {
    return sortedLeads.filter((lead) => {
      const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
      return followUpState === 'overdue' || followUpState === 'today';
    });
  }, [sortedLeads]);

  const actionPreview = useMemo(() => todaysActions.slice(0, actionsExpanded ? 10 : 3), [actionsExpanded, todaysActions]);

  const savedViews = useMemo(
    () =>
      savedViewsBase.map((view) => ({
        ...view,
        count: workspaceLeads.filter((lead) => {
          const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
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
    [currentUserId, workspaceLeads],
  );

  const selectedLead = useMemo(() => {
    if (!drawerState.leadId) return undefined;
    return workspaceLeads.find((lead) => lead.id === drawerState.leadId);
  }, [drawerState.leadId, workspaceLeads]);

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

    if (drawerState.mode === 'quick' && resetForNextLead) {
      setDrawerState({ open: true, mode: 'quick', leadId: null, initialStepId: 'basics' });
      return;
    }

    setDrawerState((current) => ({ ...current, open: false, leadId: lead?.id ?? current.leadId }));
  };


  const groupedLeadSections = useMemo(() => {
    const groups: Array<{ id: 'critical' | 'due-today' | 'active'; label: string; leads: LeadRow[] }> = [
      { id: 'critical', label: 'Critical — needs action now', leads: [] },
      { id: 'due-today', label: 'Due today — keep momentum', leads: [] },
      { id: 'active', label: 'Active — next best queue', leads: [] },
    ];

    for (const lead of visibleLeads) {
      const readiness = readinessByLeadId.get(lead.id);
      const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
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
  const closeDrawer = () => setDrawerState((current) => ({ ...current, open: false }));

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
        // Reset to initial lead type filter (blank) and all view
        setLeadTypeFilter(initialLeadType);
        setSavedView('all');
        break;
    }
  };


  useEffect(() => {
    if (!initialQuickCapture || !canManageLeads) return;
    setDrawerState((current) => (current.open ? current : { open: true, mode: 'quick', leadId: null, initialStepId: 'basics' }));
  }, [canManageLeads, initialQuickCapture]);

  const clearFilters = () => {
    setLeadTypeFilter(initialLeadType);
    setOwnerId('');
    setPipelineIdFilter('');
    setStageIdFilter('');
    setCountryIdFilter('');
    setMarketIdFilter('');
    setProductIdFilter('');
  };

  const resetWorkspaceChrome = () => {
    setSearch('');
    clearFilters();
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

  const activeFilterCount = [
    leadTypeFilter,
    ownerId,
    pipelineIdFilter,
    stageIdFilter,
    countryIdFilter,
    marketIdFilter,
    productIdFilter,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col" style={{ background: '#f0f4f8', minHeight: '100vh' }}>

      {/* ═══ TOPBAR — matches spec .topbar ═══ */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', position: 'sticky', top: 0, zIndex: 50 }}>
        {/* Left: Company badge + divider + eyebrow/title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: '6px', background: 'rgba(11,46,74,.06)', border: '1px solid rgba(11,46,74,.12)' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'linear-gradient(135deg,#061c2e,#0c7fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: 'white', letterSpacing: '-.3px' }}>BO</div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#0b2e4a', letterSpacing: '.04em' }}>Blue Orbit Int&apos;l</div>
              <div style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '.06em', textTransform: 'uppercase' }}>SETU Flow CRM</div>
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#0c7fff' }}>Follow-up</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', letterSpacing: '-.3px' }}>Lead Workspace</div>
          </div>
        </div>
        {/* Right: vCard + divider + mode switch + Quick Lead + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href={PRODUCT_ROUTES.app.myCard}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '6px', background: 'linear-gradient(135deg,#0b2e4a 0%,#0c7fff 160%)', color: 'white', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '-.1px', boxShadow: '0 2px 8px rgba(12,127,255,.35)', textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="3" width="14" height="10" rx="1.5"/><line x1="1" y1="7" x2="15" y2="7"/><line x1="5" y1="10" x2="9" y2="10"/></svg>
            Share my vCard
          </a>
          <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '3px', border: '1px solid #e2e8f0', gap: '2px' }}>
            {(['all', 'buyers', 'suppliers'] as const).map((mode) => {
              const active = currentMode === mode;
              return (
                <button key={mode} type="button" onClick={() => handleModeSwitch(mode)}
                  style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', background: active ? '#0b2e4a' : 'transparent', color: active ? 'white' : '#64748b', transition: 'all .15s' }}
                >
                  {mode === 'all' ? 'All' : mode === 'buyers' ? 'Buyers' : 'Suppliers'}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={openQuickAdd} disabled={!canManageLeads}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '6px', background: '#0b2e4a', color: 'white', border: 'none', fontSize: '12px', fontWeight: 700, cursor: canManageLeads ? 'pointer' : 'not-allowed', opacity: canManageLeads ? 1 : 0.5 }}
          >
            <span style={{ fontSize: '15px', lineHeight: 1 }}>＋</span> Quick Lead
          </button>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#0b2e4a 0%,#0c7fff 140%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white' }}>RK</div>
        </div>
      </header>

      {/* ═══ PAGE NAV TABS — matches spec .page-nav ═══ */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#0b2e4a', cursor: 'pointer', borderBottom: '2px solid #0c7fff', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📋 Lead Queue
          <span style={{ background: summary.overdue > 0 ? '#f43f5e' : '#64748b', color: 'white', borderRadius: '999px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>{sortedLeads.length}</span>
        </div>
        <div style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🎯 Command Center
          <span style={{ background: '#0c7fff', color: 'white', borderRadius: '999px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>Select a lead →</span>
        </div>
        <div style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ◇ Quote Builder
          <span style={{ background: '#0c7fff', color: 'white', borderRadius: '999px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>5 steps</span>
        </div>
        <div style={{ marginLeft: 'auto', padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-1px' }}>
          ⊕ View in Pipeline →
        </div>
      </div>

      {/* ═══ FILTER BAR — matches spec .filter-bar ═══ */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94a3b8', marginRight: '4px' }}>Filter:</span>

        {/* Search box inline */}
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', padding: '0 10px', height: '32px', gap: '6px', minWidth: '200px' }}>
          <span style={{ fontSize: '13px' }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact…"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', fontWeight: 600, color: '#1e293b', width: '100%' }}
          />
        </div>

        {/* Stage filter */}
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', padding: '0 10px', height: '32px', gap: '6px', minWidth: '120px' }}>
          <span style={{ fontSize: '13px' }}>◎</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#94a3b8', lineHeight: 1 }}>Stage</span>
            <select value={stageIdFilter} onChange={(e) => setStageIdFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', fontWeight: 600, color: '#1e293b', appearance: 'none', cursor: 'pointer', lineHeight: 1.4 }}
            >
              <option value="">All stages ▾</option>
              {availableStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Owner filter */}
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', padding: '0 10px', height: '32px', gap: '6px', minWidth: '120px' }}>
          <span style={{ fontSize: '13px' }}>👤</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#94a3b8', lineHeight: 1 }}>Owner</span>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', fontWeight: 600, color: '#1e293b', appearance: 'none', cursor: 'pointer', lineHeight: 1.4 }}
            >
              <option value="">All owners ▾</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.username ?? p.id}</option>)}
            </select>
          </div>
        </div>

        {/* Market filter */}
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', padding: '0 10px', height: '32px', gap: '6px', minWidth: '120px' }}>
          <span style={{ fontSize: '13px' }}>🌍</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#94a3b8', lineHeight: 1 }}>Market</span>
            <select value={marketIdFilter} onChange={(e) => setMarketIdFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', fontWeight: 600, color: '#1e293b', appearance: 'none', cursor: 'pointer', lineHeight: 1.4 }}
            >
              <option value="">All markets ▾</option>
              {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {/* Product filter */}
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', padding: '0 10px', height: '32px', gap: '6px', minWidth: '120px' }}>
          <span style={{ fontSize: '13px' }}>📦</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#94a3b8', lineHeight: 1 }}>Product</span>
            <select value={productIdFilter} onChange={(e) => setProductIdFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', fontWeight: 600, color: '#1e293b', appearance: 'none', cursor: 'pointer', lineHeight: 1.4 }}
            >
              <option value="">All products ▾</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 ? (
          <button type="button" onClick={clearFilters}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, border: '1px solid #fecaca', background: '#fff1f2', color: '#991b1b', cursor: 'pointer' }}
          >
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active <span style={{ opacity: .6 }}>×</span>
          </button>
        ) : null}

        {/* Summary count */}
        <div style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: '#94a3b8', letterSpacing: '.04em' }}>
          {summary.overdue > 0 ? `${summary.overdue} overdue · ` : ''}{sortedLeads.length} total leads
        </div>
      </div>

      {/* ═══ SAVED VIEWS BAR — matches spec .saved-views ═══ */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
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
            <div style={{ flex: 1 }} />
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
          />

          {visibleLeads.length ? (
            <>
              {groupedLeadSections.map((section) => (
                <section key={section.id}>
                  {/* Section label */}
                  <div style={{ padding: '10px 16px 4px', marginTop: section.id === 'critical' ? 0 : 8 }}>
                    <p style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#94a3b8' }}>
                      {section.id === 'critical' ? '🔴' : section.id === 'due-today' ? '🟡' : '🟢'}{' '}
                      {section.id === 'critical' ? 'Critical — needs action now' : section.id === 'due-today' ? 'Due today — scheduled actions' : 'Active / upcoming'} ({section.leads.length})
                    </p>
                  </div>
                  {/* Lead rows */}
                  <div style={{ padding: '0 8px 4px' }}>
                    {section.leads.map((lead) => (
                      <LeadTableRow
                        key={lead.id}
                        lead={lead}
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
                        openLeadCommandCenter={openLeadCommandCenter}
                        shouldIgnoreLeadNavigationTarget={shouldIgnoreLeadNavigationTarget}
                        handleLeadCommandCenterKeyDown={handleLeadCommandCenterKeyDown}
                      />
                    ))}
                  </div>
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
                    : 'Reset filters or search, then open a lead.'
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

      {/* Lead drawer for new lead creation */}
      <LeadDrawer
        key={`${drawerState.mode}-${drawerState.leadId ?? 'new'}`}
        open={drawerState.open && (!drawerState.leadId || drawerState.mode === 'quick')}
        onClose={closeDrawer}
        onSaved={handleLeadSaved}
        mode={drawerState.mode}
        lead={drawerState.leadId ? selectedLead : undefined}
        title={drawerState.mode === 'quick' ? 'Quick Add Lead' : 'Full Add Lead'}
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
        navigationMeta="Existing leads now open through /leads/[leadId]. The drawer is reserved for new lead creation only."
        prefill={drawerState.open && !drawerState.leadId ? initialQuickCapture : null}
      />
    </div>
  );
}

function MetricMiniCard({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'blue' | 'amber' }) {
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
        <div className="text-xs font-medium text-slate-500">Open this lead to continue in the command center.</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSpotlightLead(lead.id);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Set preview
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
