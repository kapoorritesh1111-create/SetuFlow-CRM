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
import type { PipelineBoardProps, Lead, Stage, FollowUp, Activity } from '@/features/pipeline/types/board';
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
        description="Use the explicit pipeline rescue board to see stalled work, blockers, and the next intervention without letting the pipeline collapse into passive analytics."
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
      <section className="sticky top-[73px] z-20 space-y-3">
        <div className={cn('grid gap-3 rounded-[1.4rem] border p-4 shadow-soft lg:grid-cols-[0.9fr_1.1fr_auto]', workspacePanelClass)}>
          <div className="rounded-[1rem] border border-slate-200 bg-white/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Where am I</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Pipeline rescue board</p>
            <p className="mt-1 text-sm text-slate-600">Work one stage move at a time with blockers visible before you drag anything.</p>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-white/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">What is blocking me</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{overdueCount || atRiskCount ? `${overdueCount} overdue, ${atRiskCount} at risk` : 'No rescue pressure right now'}</p>
            <p className="mt-1 text-sm text-slate-600">{filteredLeads.reduce((sum, lead) => sum + (getLeadBlockerCount(lead.id) ? 1 : 0), 0)} visible records still have commercial or workflow blockers.</p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:min-w-[220px]">
            <a href={PRODUCT_ROUTES.app.leads} className={workspacePrimaryButtonClass}>Open follow-up queue</a>
            <a href={PRODUCT_ROUTES.app.orders} className="text-sm font-semibold text-slate-700 hover:text-slate-900">Orders</a>
          </div>
        </div>
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

      <section className="grid gap-3 lg:grid-cols-3">
        <StateMessage
          title="What needs intervention now"
          tone={overdueCount || atRiskCount ? 'warning' : 'success'}
          description={`${overdueCount} overdue follow-ups, ${atRiskCount} at-risk leads, and ${filteredLeads.reduce((sum, lead) => sum + (getLeadBlockerCount(lead.id) ? 1 : 0), 0)} commercially blocked records need rescue attention before pipeline movement can be trusted.`}
        />
        <StateMessage
          title="Pipeline stays explicit"
          tone="neutral"
          description="This page stays a true pipeline board. Rescue posture is layered on top of the board, not used as an excuse to hide stage movement."
        />
        <div className={cn('flex flex-col gap-3 p-4', workspacePanelClass)}>
          <p className="text-sm font-semibold text-slate-950">Move fast without losing continuity</p>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <a href={PRODUCT_ROUTES.app.dashboard} className={workspaceSecondaryButtonClass}>Open dashboard</a>
            <a href={PRODUCT_ROUTES.app.leads} className={workspaceSecondaryButtonClass}>Open follow-up</a>
            <a href={PRODUCT_ROUTES.app.orders} className={workspacePrimaryButtonClass}>Open execution</a>
          </div>
        </div>
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
