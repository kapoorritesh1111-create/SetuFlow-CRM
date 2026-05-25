'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { moveLeadToStage } from '@/features/pipeline/server';
import { addLeadNote, scheduleLeadFollowUp } from '@/features/leads/server/actions';
import { getFollowUpBadgeClasses, getFollowUpLabel, getFollowUpVisualState } from '@/lib/lead-status';
import { parseLeadWorkflow, summarizeLeadCoverageSelections } from '@/lib/lead-workflow';
import { computeLeadHealth, compareLeadHealthPriority } from '@/lib/lead-health';
import { isPipelineInJourney, type LeadJourney } from '@/lib/journey';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { buildPipelineAiMessage, buildPipelineLaneSummary, getBoardMessageTone, normalizeLeadTypeParam } from '@/features/pipeline/logic/board';
import { LeadCard } from '@/features/pipeline/ui/lead-card';
import { PipelineDetailPanel } from '@/features/pipeline/ui/pipeline-detail-panel';
import type { PipelineBoardProps, Lead, Stage, FollowUp, Activity } from '@/features/pipeline/types/board';
import { buildStageMoveReadiness, type StageMoveReadiness } from '@/lib/queries/pipeline-stage-gating';
import { cn, formatDateTime } from '@/lib/utils';
import { navigateToLeadCommandCenter } from '@/lib/lead-command-center-navigation';
import { buildLeadCommercialReadiness, getPricingReadinessClasses, getPricingReadinessLabel } from '@/lib/catalog-pricing-model';
import { buildLeadDocumentRequirementState, type DocumentRequirementRule } from '@/lib/document-requirements';
import PipelineLaneSection from './PipelineLaneSection';
import PipelineBoardFilters from './PipelineBoardFilters';
import { ToolbarActionButton, ToolbarField, ToolbarSearchInput, ToolbarSelect, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { ICON_CONTAINER_CLASS, getActionIcon, getStageAccent, getStageIcon, getStatusIcon } from '@/features/leads/command-center/ui-system';
import { PipelineAIStrip } from './PipelineAIStrip';
import { WorkspaceWorkflowShell } from '@/features/workspace/components/WorkspaceWorkflowShell';
import { buildTodayLayerState } from '@/features/workspace/today';
import { workspaceInsetClass, workspacePanelClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { CollapsiblePanel } from '@/components/ui/collapsible-panel';
import { workspaceModeToLeadJourney } from '@/features/workspace/mode';
import type { TodayFilterKey, TodayLayerState, WorkspaceMode } from '@/features/workspace/types';

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
}: PipelineBoardProps) {
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
  const [followUpTiming, setFollowUpTiming] = useState(() => searchParams.get('follow') ?? '');
  // ownerFilter controls whether we show only the current user's leads or all leads.  An empty
  // string means "all leads"; "mine" means only leads owned by the logged‑in user.  This
  // provides a quick way for users to focus on their own portfolio without scrolling through
  // everyone else's deals.
  // ownerFilter holds the user ID to filter leads by owner.  An empty string means
  // all owners.  This general form makes it easy to expand the dropdown in the
  // future, such as when co‑ownership or additional roles are introduced.
  const [ownerFilter, setOwnerFilter] = useState(() => searchParams.get('owner') ?? '');
  // productId and marketId allow users to narrow the board to leads interested in a
  // specific product category or market.  An empty string means "all".  We use the
  // leadProductsMap and leadMarketsMap computed below to determine membership.
  const [productId, setProductId] = useState(() => searchParams.get('product') ?? searchParams.get('category') ?? '');
  const [marketId, setMarketId] = useState(() => searchParams.get('market') ?? '');
  // SF-18-105: Pipeline filter parity
  const [countryFilter, setCountryFilter] = useState(() => searchParams.get('country') ?? '');
  const [tradeEventFilter, setTradeEventFilter] = useState(() => searchParams.get('event') ?? '');
  const [message, setMessage] = useState('');
  // SF-18-098: Card density toggle
  const [density, setDensity] = useState<'full' | 'compact' | 'micro'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pipeline-density') as 'full' | 'compact' | 'micro') ?? 'compact';
    }
    return 'compact';
  });
  const [filtersOpen, setFiltersOpen] = useState(() => ['follow','owner','product','category','market'].some((key) => Boolean(searchParams.get(key))));
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
  // Detail panel — slide-in from right on card click
  const [detailPanelLeadId, setDetailPanelLeadId] = useState<string | null>(null);
  // Bulk select state for multi-card stage move
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkStageId, setBulkStageId] = useState<string>('');


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
  const getLeadCoverageActionSummary = (lead: Lead) => {
    const workflow = parseLeadWorkflow(lead.notes).workflow;
    const hasConfirmedProduct = workflow.coverageSelections.some((item) => item.interestType === 'confirmed_product' && item.productIds.length > 0) || workflow.mappedProductIds.length > 0;
    const hasMarketCoverage = workflow.mappedMarketIds.length > 0;
    if (!hasConfirmedProduct) return 'Action: confirm product linkage before stage progression';
    if (!hasMarketCoverage) return 'Action: map market coverage before stage progression';
    return summarizeLeadCoverageSelections(workflow.coverageSelections)[0] ?? 'Structured product/category interest is present';
  };
  const getLeadPricingReadiness = (leadId: string) => readinessByLeadId.get(leadId)?.pricingReadiness ?? 'missing';
  const getLeadCoverageSummary = (lead: Lead) => summarizeLeadCoverageSelections(parseLeadWorkflow(lead.notes).workflow.coverageSelections)[0] ?? 'No structured product/category interest';

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
      hasConfirmedProductInterest: workflow.coverageSelections.some((item) => item.interestType === 'confirmed_product' && item.productIds.length > 0) || workflow.mappedProductIds.length > 0,
      hasMarketCoverage: workflow.mappedMarketIds.length > 0,
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
    setFollowUpTiming(searchParams.get('follow') ?? '');
    setOwnerFilter(searchParams.get('owner') ?? '');
    setProductId(searchParams.get('product') ?? searchParams.get('category') ?? '');
    setMarketId(searchParams.get('market') ?? '');
    setLeadTypeFilter(nextLeadType);
    setFiltersOpen(['follow', 'owner', 'product', 'category', 'market'].some((key) => Boolean(searchParams.get(key))));
    urlSyncReady.current = true;
  }, [searchParams, initialLeadType]);

  useEffect(() => {
    if (!urlSyncReady.current) return;
    const params = new URLSearchParams(searchParams.toString());
    const mappings: Array<[string, string]> = [
      ['q', search],
      ['follow', followUpTiming],
      ['owner', ownerFilter],
      ['product', productId],
      ['market', marketId],
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
  }, [pathname, router, search, followUpTiming, ownerFilter, productId, marketId, searchParams, workspaceMode]);

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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(todayStart.getDate() + 7);

    return localLeads.filter((lead) => {
      const followState = getFollowUpVisualState(lead.next_follow_up_at);
      const followUpAt = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) : null;
      const isThisWeek = Boolean(followUpAt && followUpAt >= todayStart && followUpAt <= weekEnd);
      const matchesSearch = !needle || [lead.company_name, lead.contact_name ?? '', lead.country ?? ''].some((item) => item.toLowerCase().includes(needle));
      const matchesFollowUp = !followUpTiming
        || followState === followUpTiming
        || (followUpTiming === 'week' && isThisWeek)
        || (followUpTiming === 'none' && followState === 'unscheduled');
      const matchesOwner = !ownerFilter || lead.owner_user_id === ownerFilter;
      const matchesProduct = !productId || (leadProductsMap.get(lead.id)?.includes(productId) ?? false);
      const matchesMarket = !marketId || (leadMarketsMap.get(lead.id)?.includes(marketId) ?? false);
      // SF-18-105: country + trade event predicates
      const matchesCountry = !countryFilter || lead.country_id === countryFilter;
      const matchesTradeEvent = !tradeEventFilter || lead.trade_event_id === tradeEventFilter;
      const matchesLeadType = !leadTypeFilter || lead.lead_type === leadTypeFilter;
      return matchesSearch && matchesFollowUp && matchesOwner && matchesProduct && matchesMarket && matchesCountry && matchesTradeEvent && matchesLeadType;
    });
  }, [localLeads, search, followUpTiming, ownerFilter, productId, marketId, leadTypeFilter, leadProductsMap, leadMarketsMap]);

  type VisualStageGroup = (typeof filteredStageGroups)[number] & {
    stage: Stage;
    leads: Lead[];
  };

  const visualStageGroups = useMemo<VisualStageGroup[]>(() => filteredStageGroups.map((group) => ({
    ...group,
    stage: group.ref,
    leads: filteredLeads.filter((lead) => group.stages.some((stage) => stage.id === lead.stage_id)),
  })), [filteredStageGroups, filteredLeads]);


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

    const previousStageId = lead.stage_id ?? null;
    const optimisticUpdatedAt = new Date().toISOString();
    setLocalLeads((current) => current.map((item) => (item.id === leadId ? { ...item, stage_id: stageId, updated_at: optimisticUpdatedAt } : item)));
    setMessage('Saving stage move...');

    const formData = new FormData();
    formData.append('lead_id', leadId);
    formData.append('stage_id', stageId);
    startTransition(() => {
      void moveLeadToStage(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? '');
        if (result?.error) {
          setLocalLeads((current) => current.map((item) => (item.id === leadId ? { ...item, stage_id: previousStageId, updated_at: lead.updated_at } : item)));
          router.refresh();
          return;
        }
        const nextLead = result?.lead;
        setLocalLeads((current) => current.map((item) => (item.id === leadId ? { ...item, stage_id: nextLead?.stage_id ?? stageId, updated_at: nextLead?.updated_at ?? optimisticUpdatedAt } : item)));
        router.refresh();
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


  const activeFilterCount = [followUpTiming, ownerFilter, productId, marketId].filter(Boolean).length;
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
              moveReadiness={((): StageMoveReadiness => {
                const currentStage = lead.stage_id ? stageById.get(lead.stage_id) : null;
                return currentStage
                  ? getStageMoveReadinessForLead(lead, currentStage)
                  : { status: 'ready', summary: 'Stage movement is ready under the current workflow.', blockers: [], warnings: [], actionItems: ['Advance stage'], canMove: true };
              })()}
              countryCode={lead.country_id ? (countryById.get(lead.country_id)?.iso2_code ?? null) : (lead.country ? (countryCodeByName.get(lead.country.trim().toLowerCase()) ?? null) : null)}
              coverageSummary={`${getLeadCoverageSummary(lead)} · ${getLeadCoverageActionSummary(lead)}`}
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
              isSelected={selectedLeadIds.has(lead.id)}
              onSelectedChange={(leadId, checked) => {
                setSelectedLeadIds(prev => {
                  const next = new Set(prev);
                  if (checked) next.add(leadId); else next.delete(leadId);
                  return next;
                });
              }}
              onOpenDetail={(leadId) => setDetailPanelLeadId(leadId)}
              activityDates={activities.filter(a => a.lead_id === lead.id).map(a => a.occurred_at)}
              density={density}
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

  const laneSummary = buildPipelineLaneSummary({
    filteredStageGroups,
    filteredLeads,
    getLeadBlockerCount,
    getFollowUpVisualState,
    getStageAccent,
    groupHasLead: (groupName, lead) => filteredStageGroups.some((group) => group.name === groupName && group.stages.some((stage) => stage.id === lead.stage_id)),
  });

  const aiMessage = buildPipelineAiMessage({
    message,
    overdueCount,
    todayCount,
    filteredLeadCount: filteredLeads.length,
  });

  const totalPipelineValue = filteredLeads.reduce((sum, lead) => sum + (Number(lead.deal_value ?? 0) || 0), 0);

  // SF-18-096: per-stage value map for Value Waterfall
  const stageValueMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const lead of filteredLeads) {
      if (!lead.stage_id) continue;
      map.set(lead.stage_id, (map.get(lead.stage_id) ?? 0) + (Number(lead.deal_value ?? 0) || 0));
    }
    return map;
  }, [filteredLeads]);
  const valueCurrency = filteredLeads.find((lead) => lead.deal_currency)?.deal_currency ?? 'USD';
  const blockedRecordCount = filteredLeads.reduce((sum, lead) => sum + (getLeadBlockerCount(lead.id) ? 1 : 0), 0);
  const selectedLead = filteredLeads[0] ?? null;
  const selectedStageName = selectedLead?.stage_id
    ? filteredStageGroups.find((group) => group.stages.some((stage) => stage.id === selectedLead.stage_id))?.name ?? 'Unassigned stage'
    : 'Unassigned stage';
  const selectedOwner = selectedLead?.owner_user_id ? ownerLabelMap.get(selectedLead.owner_user_id) ?? 'Unassigned' : 'Unassigned';
  const selectedCurrentStage = selectedLead?.stage_id ? stageById.get(selectedLead.stage_id) ?? null : null;
  const selectedReadiness = selectedLead && selectedCurrentStage ? getStageMoveReadinessForLead(selectedLead, selectedCurrentStage) : null;
  const selectedQuoteCount = selectedLead ? getLeadActiveQuoteCount(selectedLead.id) : 0;
  const selectedRfqCount = selectedLead ? getLeadOpenRfqCount(selectedLead.id) : 0;
  const pipelineModeLabel = workspaceMode === 'buyers' ? 'Buyer pipeline' : workspaceMode === 'suppliers' ? 'Supplier pipeline' : 'All pipelines';

  const resetFilters = () => {
    setFollowUpTiming('');
    setOwnerFilter('');
    setProductId('');
    setMarketId('');
    setLeadTypeFilter(initialLeadType);
    setMessage('');
  };

  const showStageConfigurationState = isStageConfigurationEmpty || filteredStageGroups.length === 0;
  const showWorkspaceEmptyState = !showStageConfigurationState && isWorkspaceEmpty && !search && activeFilterCount === 0;
  const showPipelineBoard = !showStageConfigurationState && !showWorkspaceEmptyState;


  // ── NORTHSTAR RENDER ─────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',fontSize:'13px',lineHeight:'1.5',color:'#1e293b',background:'#f0f4f8',minHeight:'100vh'}}>

      {/* PAGE NAV TABS */}
      <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',display:'flex',alignItems:'center',gap:0}}>
        <div style={{padding:'12px 16px',fontSize:'12px',fontWeight:700,color:'#0b2e4a',cursor:'pointer',borderBottom:'2px solid #0c7fff',marginBottom:'-1px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
          ⊕ Kanban Board <span style={{background:'#0c7fff',color:'white',borderRadius:'999px',padding:'1px 6px',fontSize:'9px',fontWeight:800}}>{filteredLeads.length}</span>
        </div>
        <a href={PRODUCT_ROUTES.app.leads} style={{padding:'12px 16px',fontSize:'12px',fontWeight:700,color:'#94a3b8',cursor:'pointer',borderBottom:'2px solid transparent',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap',marginBottom:'-1px'}}>
          📋 Follow-up Queue {overdueCount>0&&<span style={{background:'#f43f5e',color:'white',borderRadius:'999px',padding:'1px 6px',fontSize:'9px',fontWeight:800}}>{overdueCount}</span>}
        </a>
        <a href={PRODUCT_ROUTES.app.dashboard} style={{padding:'12px 16px',fontSize:'12px',fontWeight:700,color:'#94a3b8',cursor:'pointer',borderBottom:'2px solid transparent',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap',marginBottom:'-1px'}}>⊞ Dashboard →</a>
      </div>

      {/* DENSITY TOGGLE — SF-18-098 */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-2">
        <span className="text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-400">Density:</span>
        <div className="flex border border-slate-200 rounded-xl overflow-hidden">
          {(['full', 'compact', 'micro'] as const).map(d => (
            <button key={d} type="button"
              onClick={() => { setDensity(d); if (typeof window !== 'undefined') localStorage.setItem('pipeline-density', d); }}
              className={`h-8 px-3 text-[11px] font-bold capitalize transition ${density === d ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}>
              {d}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          {density === 'compact' ? '2× more cards visible' : density === 'micro' ? '4× scanning mode' : 'Full detail view'}
        </span>
      </div>

      {/* FILTER BAR — SF-18-103: premium shared pills */}
      <PipelineBoardFilters
        search={search}
        onSearchChange={setSearch}
        leadType={leadTypeFilter}
        onLeadTypeChange={(value) => setLeadTypeFilter(normalizeLeadTypeParam(value))}
        ownerId={ownerFilter}
        onOwnerIdChange={setOwnerFilter}
        owners={profiles.map((profile) => ({ id: profile.id, label: profile.full_name ?? profile.username ?? 'Unassigned' }))}
        followUpTiming={followUpTiming}
        onFollowUpTimingChange={setFollowUpTiming}
        productId={productId}
        onProductIdChange={setProductId}
        products={products.map((product) => ({ id: product.id, label: product.name }))}
        marketId={marketId}
        onMarketIdChange={setMarketId}
        markets={markets.map((market) => ({ id: market.id, label: market.name }))}
          countryId={countryFilter}
          onCountryIdChange={setCountryFilter}
          countries={countries.map((co) => ({ id: co.id, label: co.name }))}
          tradeEventId={tradeEventFilter}
          onTradeEventIdChange={setTradeEventFilter}
          tradeEvents={tradeEvents.map((te) => ({ id: te.id, label: te.name }))}
        summary={`${filteredLeads.length} leads · ${valueCurrency} ${Math.round(totalPipelineValue).toLocaleString()}`}
      />

      {/* VALUE WATERFALL — SF-18-096 */}
      {totalPipelineValue > 0 && (
        <div className="bg-white border-b border-slate-100 px-5 py-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-slate-400 mb-2">
            Pipeline by stage · {valueCurrency} {Math.round(totalPipelineValue).toLocaleString()} total
          </p>
          <div className="flex gap-[2px] h-2 rounded-full overflow-hidden mb-2">
            {[...filteredStageGroups].flatMap(g => g.stages).sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((stage, i) => {
              const val = stageValueMap.get(stage.id) ?? 0;
              const flex = totalPipelineValue > 0 ? val / totalPipelineValue : 0;
              if (flex < 0.005) return null;
              const COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#10b981','#6366f1','#f97316','#0ea5e9'];
              return (
                <div key={stage.id}
                  className="rounded-full cursor-pointer hover:brightness-110 transition"
                  style={{ flex, background: COLORS[i % COLORS.length] }}
                  title={`${stage.name}: ${valueCurrency} ${Math.round(val).toLocaleString()}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[...filteredStageGroups].flatMap(g => g.stages).sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((stage, i) => {
              const val = stageValueMap.get(stage.id) ?? 0;
              if (!val) return null;
              const COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#10b981','#6366f1','#f97316','#0ea5e9'];
              return (
                <span key={stage.id} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  {stage.name} <strong>{valueCurrency} {Math.round(val).toLocaleString()}</strong>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* STATS STRIP */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px',padding:'16px 24px 0'}}>
        {[
          {label:'Overdue follow-ups',value:overdueCount,meta:'Action required',accent:'#e11d48'},
          {label:'Due today',value:todayCount,meta:'Follow up today',accent:'#d97706'},
          {label:'Blocked records',value:blockedRecordCount,meta:'Stage move blocked',accent:'#7c3aed'},
          {label:'Healthy cards',value:Math.max(0,filteredLeads.length-overdueCount-blockedRecordCount),meta:'No active blockers',accent:'#059669'},
          {label:'Pipeline value',value:`${valueCurrency} ${Math.round(totalPipelineValue/1000)}K`,meta:'Across all stages',accent:'#0c7fff'},
          {label:'Active stages',value:filteredStageGroups.length,meta:'Kanban lanes',accent:'#cbd5e1'},
        ].map(sc=>(
          <div key={sc.label} style={{position:'relative',overflow:'hidden',borderRadius:'16px',border:'1px solid #e2e8f0',background:'white',padding:'14px 16px',boxShadow:'0 1px 3px rgba(15,23,42,.06)',cursor:'pointer',transition:'box-shadow .12s'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:sc.accent,borderRadius:'16px 16px 0 0'}}/>
            <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'8px'}}>{sc.label}</div>
            <div style={{fontSize:'26px',fontWeight:800,letterSpacing:'-.04em',color:'#0f172a',lineHeight:1}}>{sc.value}</div>
            <div style={{fontSize:'10px',fontWeight:600,color:'#94a3b8',marginTop:'5px'}}>{sc.meta}</div>
          </div>
        ))}
      </div>

      {/* STATE / EMPTY MESSAGES */}
      {message&&<div style={{margin:'14px 24px 0',padding:'12px 16px',borderRadius:'12px',border:'1px solid #a7f3d0',background:'#ecfdf5',fontSize:'13px',color:'#065f46'}}>{message}</div>}

      {showStageConfigurationState&&(
        <div style={{margin:'14px 24px',padding:'32px',textAlign:'center',background:'white',borderRadius:'22px',border:'1px solid #e2e8f0'}}>
          <p style={{fontSize:'16px',fontWeight:700,color:'#1e293b',marginBottom:'8px'}}>{isStageConfigurationEmpty?'No pipeline stages configured yet':'No stage lanes match this mode'}</p>
          <a href={canManageLeads?'/admin/organization#settings-lists':PRODUCT_ROUTES.app.leads} style={{display:'inline-block',padding:'9px 18px',background:'#0b2e4a',color:'white',borderRadius:'8px',fontSize:'13px',fontWeight:700,textDecoration:'none'}}>{canManageLeads?'Review pipeline settings':'Open leads'}</a>
        </div>
      )}

      {showWorkspaceEmptyState&&(
        <div style={{margin:'14px 24px',padding:'32px',textAlign:'center',background:'white',borderRadius:'22px',border:'1px solid #e2e8f0'}}>
          <p style={{fontSize:'16px',fontWeight:700,color:'#1e293b',marginBottom:'8px'}}>No leads in this pipeline yet</p>
          <a href={PRODUCT_ROUTES.app.leads} style={{display:'inline-block',padding:'9px 18px',background:'#0b2e4a',color:'white',borderRadius:'8px',fontSize:'13px',fontWeight:700,textDecoration:'none'}}>Open leads workspace</a>
        </div>
      )}

      {/* KANBAN BOARD */}
      {showPipelineBoard&&(
        <>
          <div style={{display:'none'}} className="md:hidden">
            {filteredStageGroups.map(group=>renderLane(group,true))}
          </div>
          <div style={{margin:'12px 24px 0',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',border:'1px solid #dbeafe',background:'linear-gradient(90deg,#eff6ff,#f8fafc)',borderRadius:'14px',padding:'10px 12px',fontSize:'11px',fontWeight:700,color:'#1e40af'}}>
            <span>Pipeline lanes scroll horizontally on desktop. Drag, shift-scroll, or swipe to review every stage.</span>
            <span aria-hidden="true" style={{letterSpacing:'.18em',whiteSpace:'nowrap'}}>SCROLL →</span>
          </div>
          <div style={{padding:'14px 24px 24px',overflowX:'auto',display:'flex',gap:'12px',minHeight:0,WebkitOverflowScrolling:'touch',scrollbarGutter:'stable'} as React.CSSProperties}>
            {visualStageGroups.map(group=>(
              <div
                key={group.stage.id}
                style={{flexShrink:0,width:'256px',display:'flex',flexDirection:'column',gap:'8px'}}
                onDragOver={(event) => { event.preventDefault(); if (draggedLeadId) setDragOverStageId(group.stage.id); }}
                onDragLeave={() => { if (dragOverStageId === group.stage.id) setDragOverStageId(null); }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!draggedLeadId) return;
                  const draggedLead = localLeads.find((lead) => lead.id === draggedLeadId);
                  if (!draggedLead || draggedLead.stage_id === group.stage.id) {
                    setDraggedLeadId(null);
                    setDragOverStageId(null);
                    return;
                  }
                  handleMove(draggedLeadId, group.stage.id);
                  setDraggedLeadId(null);
                  setDragOverStageId(null);
                }}
              >
                {/* Lane header */}
                <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'22px',padding:'12px 14px',boxShadow:'0 1px 3px rgba(15,23,42,.06)'}}>
                  <div style={{height:'3px',borderRadius:'99px',marginBottom:'10px',background:getStageAccent(group.stage.name)}}/>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px',marginBottom:'6px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div style={{width:'28px',height:'28px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0,background:'rgba(12,127,255,.08)'}}>{(() => { const StageIcon = getStageIcon(group.stage.name); return <StageIcon width={15} height={15} color="#475569" strokeWidth={2.4} />; })()}</div>
                      <span style={{fontSize:'13px',fontWeight:800,color:'#1e293b',letterSpacing:'-.2px'}}>{group.stage.name}</span>
                    </div>
                    <span style={{background:'#f1f5f9',borderRadius:'999px',padding:'2px 8px',fontSize:'11px',fontWeight:800,color:'#475569'}}>{group.leads.length}</span>
                  </div>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    {group.leads.filter(l=>getFollowUpVisualState(l.next_follow_up_at)==='overdue').length>0&&<span style={{fontSize:'10px',fontWeight:700,color:'#e11d48'}}>{group.leads.filter(l=>getFollowUpVisualState(l.next_follow_up_at)==='overdue').length} overdue</span>}
                    {group.leads.filter(l=>getStageMoveReadinessForLead(l, group.stage).blockers.length>0).length>0&&<span style={{fontSize:'10px',fontWeight:700,color:'#dc2626'}}>{group.leads.filter(l=>getStageMoveReadinessForLead(l, group.stage).blockers.length>0).length} blocked</span>}
                  </div>
                  <div style={{fontSize:'11px',fontWeight:700,color:'#475569',marginTop:'4px',paddingTop:'6px',borderTop:'1px solid #e2e8f0'}}>
                    {valueCurrency} {Math.round(group.leads.reduce((s,l)=>s+(l.deal_value??0),0)).toLocaleString()}
                  </div>
                </div>
                {/* Lane cards */}
                <div style={{display:'flex',flexDirection:'column',gap:'7px',minHeight:'60px'}}>
                  {group.leads.map(lead=>{
                    const readiness = getStageMoveReadinessForLead(lead, group.stage);
                    const followUpState = getFollowUpVisualState(lead.next_follow_up_at);
                    const isBlocked = readiness.blockers.length>0;
                    const cardBorderLeft = isBlocked?'3px solid #f43f5e':followUpState==='overdue'?'3px solid #f59e0b':'3px solid #10b981';
                    const commercialReadiness = getLeadPricingReadiness(lead.id);
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDraggedLeadId(lead.id); }}
                        onDragEnd={() => { setDraggedLeadId(null); setDragOverStageId(null); }}
                        style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'16px',padding:'12px',boxShadow:draggedLeadId===lead.id?'0 12px 24px rgba(15,23,42,.16)':'0 1px 3px rgba(15,23,42,.06)',cursor:'grab',transition:'box-shadow .15s,transform .15s',borderLeft:cardBorderLeft,opacity:draggedLeadId===lead.id ? .8 : 1}}
                        onClick={()=>navigateToLeadCommandCenter(router, buildLeadCommandCenterHref(lead.id))}
                      >
                        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'6px',marginBottom:'8px'}}>
                          <div style={{width:'28px',height:'28px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>
                            {lead.country?'🌍':'🏢'}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'12px',fontWeight:800,color:'#1e293b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{lead.company_name}</div>
                            <div style={{fontSize:'10px',color:'#64748b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{lead.contact_name??'—'}</div>
                          </div>
                          <button style={{width:'26px',height:'26px',borderRadius:'50%',border:'1px solid #e2e8f0',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',color:'#64748b',cursor:'pointer',flexShrink:0}} onClick={e=>{e.stopPropagation();navigateToLeadCommandCenter(router, buildLeadCommandCenterHref(lead.id));}}>→</button>
                        </div>
                        <div style={{display:'flex',gap:'4px',marginBottom:'8px',flexWrap:'wrap'}}>
                          {followUpState==='overdue'&&<span style={{display:'inline-flex',alignItems:'center',padding:'1px 7px',borderRadius:'999px',fontSize:'9px',fontWeight:700,letterSpacing:'.04em',border:'1px solid',background:'#fff1f2',borderColor:'#fecaca',color:'#e11d48'}}>Overdue</span>}
                          {(followUpState==='today'||followUpState==='upcoming')&&<span style={{display:'inline-flex',alignItems:'center',padding:'1px 7px',borderRadius:'999px',fontSize:'9px',fontWeight:700,border:'1px solid',background:'#fffbeb',borderColor:'#fde68a',color:'#d97706'}}>Today</span>}
                          {isBlocked&&<span style={{display:'inline-flex',alignItems:'center',padding:'1px 7px',borderRadius:'999px',fontSize:'9px',fontWeight:700,border:'1px solid',background:'#fff1f2',borderColor:'#fecaca',color:'#9f1239'}}>Blocked</span>}
                          {lead.lead_type==='buyer'&&<span style={{display:'inline-flex',alignItems:'center',padding:'1px 7px',borderRadius:'999px',fontSize:'9px',fontWeight:700,border:'1px solid',background:'#f0f9ff',borderColor:'#bae6fd',color:'#0369a1'}}>Buyer</span>}
                          {lead.lead_type==='supplier'&&<span style={{display:'inline-flex',alignItems:'center',padding:'1px 7px',borderRadius:'999px',fontSize:'9px',fontWeight:700,border:'1px solid',background:'#f5f3ff',borderColor:'#ede9fe',color:'#7c3aed'}}>Supplier</span>}
                        </div>
                        {/* Move readiness bar */}
                        <div style={{borderRadius:'6px',padding:'6px 8px',marginBottom:'8px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px',fontSize:'10px',fontWeight:700,background:isBlocked?'#fff1f2':readiness.canMove?'#ecfdf5':'#fffbeb',border:`1px solid ${isBlocked?'#fecaca':readiness.canMove?'#a7f3d0':'#fde68a'}`,color:isBlocked?'#dc2626':readiness.canMove?'#059669':'#d97706'}}>
                          <span>{isBlocked?'Move blocked':readiness.canMove?'Ready to advance':'Needs action'}</span>
                          {isBlocked&&<span style={{fontSize:'9px',fontWeight:500,opacity:.85}}>{readiness.blockers[0]?.slice(0,30)}</span>}
                        </div>
                        {/* Actions */}
                        <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                          <button style={{padding:'3px 8px',borderRadius:'6px',fontSize:'9px',fontWeight:700,border:'1px solid #e2e8f0',background:isBlocked?'#fff1f2':'#0b2e4a',color:isBlocked?'#dc2626':'white',cursor:isBlocked?'not-allowed':'pointer'}} onClick={e=>{e.stopPropagation();}} disabled={isBlocked}>Advance</button>
                          <button style={{padding:'3px 8px',borderRadius:'6px',fontSize:'9px',fontWeight:700,border:'1px solid #e2e8f0',background:'white',color:'#475569',cursor:'pointer'}} onClick={e=>{e.stopPropagation();navigateToLeadCommandCenter(router, buildLeadCommandCenterHref(lead.id));}}>Open</button>
                        </div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px',marginTop:'8px',paddingTop:'7px',borderTop:'1px solid #e2e8f0'}}>
                          <span style={{fontSize:'9px',fontWeight:600,color:'#94a3b8'}}>{lead.owner_user_id?ownerLabelMap.get(lead.owner_user_id)??'Unassigned':'Unassigned'}</span>
                          <span style={{fontSize:'9px',fontWeight:600,color:'#94a3b8'}}>{lead.deal_value?`${lead.deal_currency??'USD'} ${Number(lead.deal_value).toLocaleString()}`:'—'}</span>
                        </div>
                      </div>
                    );
                  })}
                  {group.leads.length===0&&<div style={{border:'2px dashed #e2e8f0',borderRadius:'16px',padding:'16px',textAlign:'center',fontSize:'11px',fontWeight:600,color:'#0c7fff',background:'rgba(12,127,255,.02)'}}>Drop cards here</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel / review */}
          {selectedLead&&(
            <div style={{margin:'0 24px 24px',background:'white',border:'1px solid #e2e8f0',borderRadius:'22px',overflow:'hidden',boxShadow:'0 1px 3px rgba(15,23,42,.06)'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px'}}>
                <div>
                  <div style={{fontSize:'18px',fontWeight:800,color:'#0f172a',marginBottom:'2px'}}>{selectedLead.company_name}</div>
                  <div style={{fontSize:'11px',color:'#64748b'}}>{selectedStageName} · {selectedOwner} · {selectedLead.lead_type}</div>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <a href={buildLeadCommandCenterHref(selectedLead.id)} style={{padding:'7px 14px',borderRadius:'6px',background:'#0b2e4a',color:'white',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>Open command center</a>
                  <a href={PRODUCT_ROUTES.app.quotes} style={{padding:'7px 14px',borderRadius:'6px',border:'1px solid #e2e8f0',background:'white',color:'#334155',fontSize:'12px',fontWeight:600,textDecoration:'none'}}>Open quotes</a>
                  <a href={PRODUCT_ROUTES.app.orders} style={{padding:'7px 14px',borderRadius:'6px',border:'1px solid #e2e8f0',background:'white',color:'#334155',fontSize:'12px',fontWeight:600,textDecoration:'none'}}>Open order</a>
                </div>
              </div>
              <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'12px 14px'}}>
                  <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'8px'}}>Move readiness</div>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#1e293b',marginBottom:'4px'}}>{selectedReadiness?.summary??'Select a card to review readiness.'}</div>
                  {selectedReadiness?.blockers?.length?<ul style={{marginTop:'8px',paddingLeft:'16px',display:'flex',flexDirection:'column',gap:'4px'}}>{selectedReadiness.blockers.slice(0,3).map(b=><li key={b} style={{fontSize:'11px',color:'#dc2626'}}>{b}</li>)}</ul>:<p style={{fontSize:'12px',color:'#059669',marginTop:'4px'}}>No visible blockers</p>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'12px 14px'}}><div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'4px'}}>Quotes</div><div style={{fontSize:'22px',fontWeight:800,color:'#0f172a'}}>{selectedQuoteCount}</div></div>
                  <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'12px 14px'}}><div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'4px'}}>RFQs</div><div style={{fontSize:'22px',fontWeight:800,color:'#0f172a'}}>{selectedRfqCount}</div></div>
                </div>
              </div>
            </div>
          )}

          {!filteredLeads.length&&<div style={{margin:'14px 24px',padding:'40px',textAlign:'center',background:'white',borderRadius:'22px',border:'2px dashed #e2e8f0',fontSize:'13px',color:'#64748b'}}>No pipeline cards match the current filters. Reset filters or switch journey modes.</div>}
        </>
      )}

      {/* Bulk action floating bar */}
      {selectedLeadIds.size >= 1 && (
        <div style={{position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',zIndex:60,display:'flex',alignItems:'center',gap:'10px',padding:'12px 18px',background:'white',borderRadius:'14px',border:'1px solid #e2e8f0',boxShadow:'0 8px 24px rgba(15,23,42,.14)',backdropFilter:'blur(8px)'}}>
          <span style={{fontSize:'12px',fontWeight:700,color:'#0f172a',whiteSpace:'nowrap'}}>{selectedLeadIds.size} lead{selectedLeadIds.size>1?'s':''} selected — Move to:</span>
          <select value={bulkStageId} onChange={e=>setBulkStageId(e.target.value)}
            style={{height:'32px',borderRadius:'7px',border:'1px solid #e2e8f0',padding:'0 10px',fontSize:'12px',background:'#f8fafc',minWidth:'140px'}}>
            <option value="">Choose stage…</option>
            {stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" disabled={!bulkStageId || isPending}
            onClick={() => {
              if (!bulkStageId) return;
              Array.from(selectedLeadIds).forEach(lid => {
                const formData = new FormData();
                formData.append('lead_id', lid);
                formData.append('stage_id', bulkStageId);
                void moveLeadToStage(undefined, formData);
              });
              setSelectedLeadIds(new Set());
              setBulkStageId('');
            }}
            style={{padding:'6px 14px',borderRadius:'7px',background:'#0b2e4a',color:'white',fontSize:'12px',fontWeight:700,border:'none',cursor:'pointer',opacity:!bulkStageId?0.5:1}}>
            Move
          </button>
          <button type="button" onClick={()=>setSelectedLeadIds(new Set())}
            style={{padding:'6px 12px',borderRadius:'7px',border:'1px solid #e2e8f0',background:'white',color:'#475569',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>
            Clear
          </button>
        </div>
      )}

      {/* Slide-in detail panel */}
      {detailPanelLeadId && (() => {
        const panelLead = localLeads.find(l => l.id === detailPanelLeadId);
        if (!panelLead) return null;
        const panelCurrentStage = panelLead.stage_id ? stageById.get(panelLead.stage_id) ?? null : null;
        const panelReadiness: StageMoveReadiness = panelCurrentStage
          ? getStageMoveReadinessForLead(panelLead, panelCurrentStage)
          : { status: 'ready', summary: 'Stage movement is ready under the current workflow.', blockers: [], warnings: [], actionItems: ['Advance stage'], canMove: true };
        const panelStageMeta = panelLead.stage_id ? stageMetaMap.get(panelLead.stage_id) : null;
        const panelHealth = computeLeadHealth({
          created_at: panelLead.created_at,
          updated_at: panelLead.updated_at,
          last_contacted_at: panelLead.last_contacted_at,
          next_follow_up_at: panelLead.next_follow_up_at,
          lastActivityAt: activityMap.get(panelLead.id),
          lastStageChangeAt: stageHistoryMap.get(panelLead.id),
          stageSortOrder: panelStageMeta?.sortOrder ?? null,
          stageCount: panelStageMeta?.stageCount ?? null,
          isClosedStage: panelStageMeta?.isClosed ?? null,
        });
        const panelOwner = profiles.find(p => p.id === panelLead.owner_user_id)?.full_name ?? 'Unassigned';
        const panelHref = buildLeadCommandCenterHref(panelLead.id);
        return (
          <PipelineDetailPanel
            lead={panelLead as any}
            stages={stages}
            ownerLabel={panelOwner}
            health={panelHealth}
            moveReadiness={panelReadiness}
            commandCenterHref={panelHref}
            onClose={() => setDetailPanelLeadId(null)}
            onMove={(leadId, stageId) => { handleMove(leadId, stageId); setDetailPanelLeadId(null); }}
            onSchedule={(leadId, at) => void handleScheduleFollowUp(leadId, at)}
            onAddNote={(leadId, note) => void handleAddNote(leadId, note)}
            isPending={isPending}
          />
        );
      })()}
    </div>
  );
}
