'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { openOrCreateLeadQuoteDraft } from '@/features/leads/server/actions'
import { moveLeadToStage } from '@/features/pipeline/server/actions'
import type { LeadQualificationStatus } from '@/lib/lead-workflow'
import type { LeadCommandCenterTabKey, LeadProfileSnapshot, PipelineStageItem, WorkflowActionKey } from './types'
import { LeadCommandHeader } from './LeadCommandHeader'
import { LeadCommandTabs } from './LeadCommandTabs'
import { LeadPipelineStageStrip } from './LeadPipelineStageStrip'
import LeadQuickEditDrawer, { type LeadQuickEditDrawerSection } from './LeadQuickEditDrawer'
import { LeadContextRail } from './LeadContextRail'
import { LeadRightRail } from './LeadRightRail'
import { LeadAiAssistPopover } from './LeadAiAssistPopover'
import { LeadTodayContextBar, type LeadTodayContext } from './LeadTodayContextBar'
import { LeadStickyActionBar } from './LeadStickyActionBar'
import { WorkflowTab } from './workflow/WorkflowTab'
import { QuotesTab } from './quotes/QuotesTab'
import { ActivityTab } from './activity/ActivityTab'

type Option = { id: string; name: string; categoryName?: string | null }

type OperationItem = {
  id: string
  kind: 'sent' | 'approval_request' | 'quote_ready' | 'coverage_saved' | 'follow_up' | 'qualification'
  label: string
  detail?: string | null
  happenedAt: string
  statusTone?: 'blue' | 'emerald' | 'amber'
  quoteId?: string | null
  quoteNumber?: string | null
}

type QueueLead = {
  id: string
  companyName: string
  stageName?: string | null
  nextFollowUpAt?: string | null
}

type Props = {
  snapshot: LeadProfileSnapshot
  availableProducts: Option[]
  availableMarkets: Option[]
  selectedProductIds: string[]
  selectedMarketIds: string[]
  initialOpsHistory: OperationItem[]
  latestQuoteId?: string | null
  pendingFollowUpId?: string | null
  aiReviewHref?: string
  leadQueue?: {
    previous?: QueueLead | null
    next?: QueueLead | null
    hotList: QueueLead[]
  }
  todayContext?: LeadTodayContext
  initialTab?: LeadCommandCenterTabKey
}

type LeadState = LeadProfileSnapshot['lead']

function formatDateLabel(value?: string | null) {
  const formatted = formatDate(value)
  return formatted === '—' ? 'Not scheduled' : formatted
}

function updatePipelineStageState(stages: PipelineStageItem[], currentStageId?: string | null) {
  const currentIndex = stages.findIndex((stage) => stage.id === currentStageId)
  return stages.map((stage, index) => {
    if (stage.state === 'won' || stage.state === 'lost') {
      return { ...stage, state: stage.state }
    }
    if (stage.id === currentStageId) return { ...stage, state: 'current' as const }
    if (currentIndex >= 0 && index < currentIndex) return { ...stage, state: 'completed' as const }
    return { ...stage, state: 'upcoming' as const }
  })
}

function getVisibleLeadTabs(snapshot: LeadProfileSnapshot, hasActiveQuote: boolean) {
  return snapshot.tabs.filter((tab) => hasActiveQuote || tab.key !== 'quotes')
}

function buildLiveWorkflowCards(snapshot: LeadProfileSnapshot, input: {
  qualificationStatus: LeadQualificationStatus
  qualificationMissingCount: number
  productCount: number
  marketCount: number
  quoteCount: number
  quoteNumber?: string | null
  pricingBasis?: string | null
  nextFollowUpAt?: string | null
  overdueCount: number
  dueSoonCount: number
}) {
  return snapshot.workflowCards.map((card) => {
    if (card.key === 'qualification') {
      return {
        ...card,
        stateLabel: input.qualificationStatus.replace(/_/g, ' '),
        helperText: input.qualificationMissingCount ? `${input.qualificationMissingCount} inputs still need attention` : 'Buyer fit and operator readiness look current',
        badge: input.qualificationMissingCount ? `${input.qualificationMissingCount} missing` : 'Ready',
      }
    }
    if (card.key === 'coverage') {
      return {
        ...card,
        stateLabel: `${input.productCount} products · ${input.marketCount} markets`,
        helperText: input.productCount > 0 ? 'Mapped coverage is ready for commercial work' : 'Map at least one product and market',
        badge: input.productCount > 0 ? 'Mapped' : 'Needs mapping',
      }
    }
    if (card.key === 'commercial') {
      return {
        ...card,
        stateLabel: input.quoteNumber || (input.quoteCount > 0 ? 'Quote in progress' : 'No quote yet'),
        helperText: input.pricingBasis ? `${input.pricingBasis.replace(/_/g, ' ')} basis is carrying the current commercial lane` : 'Create or review the current quote and pricing basis',
      }
    }
    return {
      ...card,
      stateLabel: input.nextFollowUpAt ? 'Scheduled' : 'Not scheduled',
      helperText: input.nextFollowUpAt ? `Next follow-up is ${formatDateLabel(input.nextFollowUpAt)}` : 'Keep the next communication visible and reviewable',
      badge: input.overdueCount > 0 ? `${input.overdueCount} overdue` : input.dueSoonCount > 0 ? 'Due soon' : null,
    }
  })
}

export default function LeadCommandCenterPage({
  snapshot,
  availableProducts,
  availableMarkets,
  selectedProductIds,
  selectedMarketIds,
  initialOpsHistory,
  latestQuoteId,
  pendingFollowUpId,
  aiReviewHref,
  leadQueue,
  todayContext,
  initialTab = 'workflow',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<LeadCommandCenterTabKey>(initialTab)
  const [activeWorkflowPanel, setActiveWorkflowPanel] = useState<WorkflowActionKey | null>(snapshot.nextAction.workflowPanel)
  const [stageChangeTarget, setStageChangeTarget] = useState<string | null>(null)
  const [aiPopoverOpen, setAiPopoverOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [drawerSection, setDrawerSection] = useState<LeadQuickEditDrawerSection>('details')
  const [leadState, setLeadState] = useState<LeadState>(snapshot.lead)
  const [availableProductOptions, setAvailableProductOptions] = useState<Option[]>(availableProducts)
  const [selectedProductIdState, setSelectedProductIdState] = useState(selectedProductIds)
  const [selectedMarketIdState, setSelectedMarketIdState] = useState(selectedMarketIds)
  const [mappingState, setMappingState] = useState({
    productCount: snapshot.mapping.productCount,
    marketCount: snapshot.mapping.marketCount,
    productNames: snapshot.mapping.productNames,
    marketNames: snapshot.mapping.marketNames,
  })
  const [commercialState, setCommercialState] = useState({
    quoteCount: snapshot.commercial.quoteCount,
    latestQuoteNumber: snapshot.commercial.latestQuoteNumber,
    latestQuoteId: latestQuoteId ?? snapshot.quoteFocus.quoteId ?? null,
    activePricingBasis: snapshot.quoteFocus.pricingBasis ?? snapshot.commercial.activePricingBasis ?? null,
  })
  const [workflowState, setWorkflowState] = useState({
    qualificationStatus: snapshot.qualification.status,
    qualificationNotes: snapshot.qualification.notes ?? '',
    nextFollowUpAt: snapshot.tasks.nextFollowUpAt ?? snapshot.nextFollowUpAt ?? null,
    openFollowUpCount: snapshot.tasks.openFollowUpCount,
    overdueCount: snapshot.tasks.overdueCount,
    dueSoonCount: snapshot.tasks.dueSoonCount,
    pendingFollowUpId: pendingFollowUpId ?? snapshot.nextAction.followUpId ?? null,
  })
  const [opsHistory, setOpsHistory] = useState<OperationItem[]>(initialOpsHistory)
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null)

  useEffect(() => {
    setLeadState(snapshot.lead)
    setAvailableProductOptions(availableProducts)
    setSelectedProductIdState(selectedProductIds)
    setSelectedMarketIdState(selectedMarketIds)
    setMappingState({
      productCount: snapshot.mapping.productCount,
      marketCount: snapshot.mapping.marketCount,
      productNames: snapshot.mapping.productNames,
      marketNames: snapshot.mapping.marketNames,
    })
    setCommercialState({
      quoteCount: snapshot.commercial.quoteCount,
      latestQuoteNumber: snapshot.commercial.latestQuoteNumber,
      latestQuoteId: latestQuoteId ?? snapshot.quoteFocus.quoteId ?? null,
      activePricingBasis: snapshot.quoteFocus.pricingBasis ?? snapshot.commercial.activePricingBasis ?? null,
    })
    setWorkflowState({
      qualificationStatus: snapshot.qualification.status,
      qualificationNotes: snapshot.qualification.notes ?? '',
      nextFollowUpAt: snapshot.tasks.nextFollowUpAt ?? snapshot.nextFollowUpAt ?? null,
      openFollowUpCount: snapshot.tasks.openFollowUpCount,
      overdueCount: snapshot.tasks.overdueCount,
      dueSoonCount: snapshot.tasks.dueSoonCount,
      pendingFollowUpId: pendingFollowUpId ?? snapshot.nextAction.followUpId ?? null,
    })
    setOpsHistory(initialOpsHistory)
    setQuoteMessage(null)
    setStageChangeTarget(null)
    setActiveTab(initialTab)
    setActiveWorkflowPanel(snapshot.nextAction.workflowPanel)
  }, [availableProducts, initialOpsHistory, initialTab, latestQuoteId, pendingFollowUpId, selectedMarketIds, selectedProductIds, snapshot])



  useEffect(() => {
    const currentValue = searchParams?.get('tab') ?? null
    const nextValue = activeTab === 'workflow' ? null : activeTab
    if (currentValue === nextValue) return

    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (nextValue) {
      params.set('tab', nextValue)
    } else {
      params.delete('tab')
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [activeTab, pathname, router, searchParams])

  const liveSnapshot = useMemo<LeadProfileSnapshot>(() => ({
    ...snapshot,
    lead: {
      ...snapshot.lead,
      ...leadState,
    },
    nextFollowUpAt: workflowState.nextFollowUpAt ?? undefined,
    pipeline: {
      ...snapshot.pipeline,
      currentStageId: leadState.currentStageId,
      stages: updatePipelineStageState(snapshot.pipeline.stages, leadState.currentStageId),
    },
    qualification: {
      ...snapshot.qualification,
      status: workflowState.qualificationStatus,
      notes: workflowState.qualificationNotes,
    },
    mapping: {
      ...snapshot.mapping,
      productCount: mappingState.productCount,
      marketCount: mappingState.marketCount,
      productNames: mappingState.productNames,
      marketNames: mappingState.marketNames,
      isComplete: mappingState.productCount > 0,
    },
    commercial: {
      ...snapshot.commercial,
      quoteCount: commercialState.quoteCount,
      latestQuoteNumber: commercialState.latestQuoteNumber,
      activePricingBasis: commercialState.activePricingBasis ?? snapshot.commercial.activePricingBasis ?? null,
    },
    quoteFocus: {
      ...snapshot.quoteFocus,
      quoteId: commercialState.latestQuoteId,
      quoteNumber: commercialState.latestQuoteNumber,
      hasActiveQuote: Boolean(commercialState.latestQuoteId || commercialState.quoteCount > 0),
      pricingBasis: commercialState.activePricingBasis ?? snapshot.quoteFocus.pricingBasis ?? null,
    },
    tasks: {
      ...snapshot.tasks,
      nextFollowUpAt: workflowState.nextFollowUpAt,
      openFollowUpCount: workflowState.openFollowUpCount,
      overdueCount: workflowState.overdueCount,
      dueSoonCount: workflowState.dueSoonCount,
      urgency: workflowState.overdueCount > 0 ? 'OVERDUE' : workflowState.dueSoonCount > 0 ? 'DUE' : 'ON_TRACK',
    },
    workflowCards: buildLiveWorkflowCards(snapshot, {
      qualificationStatus: workflowState.qualificationStatus,
      qualificationMissingCount: snapshot.qualification.missingFields.length,
      productCount: mappingState.productCount,
      marketCount: mappingState.marketCount,
      quoteCount: commercialState.quoteCount,
      quoteNumber: commercialState.latestQuoteNumber,
      pricingBasis: commercialState.activePricingBasis,
      nextFollowUpAt: workflowState.nextFollowUpAt,
      overdueCount: workflowState.overdueCount,
      dueSoonCount: workflowState.dueSoonCount,
    }),
  }), [commercialState, leadState, mappingState, snapshot, workflowState])

  const visibleTabs = useMemo(() => getVisibleLeadTabs(liveSnapshot, liveSnapshot.quoteFocus.hasActiveQuote), [liveSnapshot])

  useEffect(() => {
    if (activeTab === 'quotes' && !visibleTabs.some((tab) => tab.key === 'quotes')) {
      setActiveTab('workflow')
    }
  }, [activeTab, visibleTabs])

  const openDrawer = (section: LeadQuickEditDrawerSection) => {
    setDrawerSection(section)
    setEditOpen(true)
  }

  const logOperation = (item: Omit<OperationItem, 'id'>) => {
    setOpsHistory((current) => [{ id: `${item.kind}-${item.happenedAt}-${current.length}`, ...item }, ...current].slice(0, 10))
  }

  async function handleOpenQuoteWorkspace() {
    setQuoteBusy(true)
    setQuoteMessage(null)

    try {
      if (commercialState.latestQuoteId) {
        window.location.assign(`/leads/${leadState.id}/quote?quoteId=${commercialState.latestQuoteId}`)
        return
      }

      const result = await openOrCreateLeadQuoteDraft(leadState.id)
      if (result.error) {
        setQuoteMessage(result.error)
        return
      }

      const nextQuoteId = result.quoteId ?? result.quote?.id ?? null
      const nextQuoteNumber = result.quote?.quote_number ?? commercialState.latestQuoteNumber
      const nextBasis = String(result.quote?.pricing_basis ?? '').trim().toUpperCase() || null
      if (nextQuoteId) {
        setCommercialState((current) => ({
          quoteCount: current.quoteCount > 0 ? current.quoteCount : 1,
          latestQuoteId: nextQuoteId,
          latestQuoteNumber: nextQuoteNumber,
          activePricingBasis: nextBasis === 'FOB' || nextBasis === 'CIF' || nextBasis === 'EX_FACTORY' ? nextBasis : current.activePricingBasis,
        }))
        window.location.assign(`/leads/${leadState.id}/quote?quoteId=${nextQuoteId}`)
        return
      }

      setQuoteMessage(result.success ?? 'Quote workspace is ready.')
    } catch {
      setQuoteMessage('We could not open the quote workspace. Please try again.')
    } finally {
      setQuoteBusy(false)
    }
  }

  async function handleConfirmStageChange(stageId: string) {
    const formData = new FormData()
    formData.set('lead_id', leadState.id)
    formData.set('stage_id', stageId)
    const result = await moveLeadToStage(undefined, formData)
    if (result?.error) {
      setQuoteMessage(result.error)
      return
    }
    const nextStage = liveSnapshot.pipeline.stages.find((stage) => stage.id === stageId)
    setLeadState((current) => ({
      ...current,
      currentStageId: stageId,
      currentStage: nextStage?.label ?? current.currentStage,
    }))
    setStageChangeTarget(null)
    router.refresh()
  }

  const aiReviewLink = aiReviewHref || `${liveSnapshot.links.aiWorkspace}?leadId=${leadState.id}`
  const openActivityTab = () => setActiveTab('activity')
  const navigationQueryString = todayContext?.mode && todayContext.mode !== 'all' ? `?mode=${todayContext.mode}` : ''

  return (
    <div className="space-y-5 md:space-y-6">
      <section className="premium-surface overflow-hidden rounded-[14px]">
        <LeadCommandHeader
          lead={liveSnapshot.lead}
          currentStageLabel={liveSnapshot.lead.currentStage}
          pricingReadiness={liveSnapshot.pricingReadiness}
          complianceGate={liveSnapshot.complianceGate}
          nextFollowUpAt={workflowState.nextFollowUpAt}
          quoteFocus={liveSnapshot.quoteFocus}
          nextActionSummary={liveSnapshot.nextAction.summary}
          onOpenQuote={() => void handleOpenQuoteWorkspace()}
          onQuickEdit={() => openDrawer('details')}
          onOpenAiAssist={() => setAiPopoverOpen(true)}
          onEditCoverage={() => openDrawer('coverage')}
          onOpenActivity={openActivityTab}
        />

        <div className="border-t border-neutral-200/70 px-5 py-3 md:px-6">
          <LeadPipelineStageStrip
            leadName={liveSnapshot.lead.companyName}
            pipelineName={liveSnapshot.pipeline.name}
            stages={liveSnapshot.pipeline.stages}
            currentStageLabel={liveSnapshot.lead.currentStage}
            pendingStageId={stageChangeTarget}
            compact
            onStageSelect={setStageChangeTarget}
            onConfirmStageChange={(stageId) => void handleConfirmStageChange(stageId)}
            onCancelStageChange={() => setStageChangeTarget(null)}
          />
        </div>
      </section>

      {quoteMessage ? <p className="text-sm text-slate-600">{quoteMessage}</p> : null}
      {todayContext ? <LeadTodayContextBar todayContext={todayContext} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_272px] xl:gap-6">
        <main className="space-y-6">
          <LeadContextRail snapshot={liveSnapshot} nextFollowUpAt={workflowState.nextFollowUpAt} leadQueue={leadQueue} navigationQueryString={navigationQueryString} />

          <div className="sticky top-[80px] z-20 rounded-[12px] border border-neutral-200/70 bg-white/92 px-4 py-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur md:top-[88px] md:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <LeadCommandTabs tabs={visibleTabs} activeTab={activeTab} onSelect={setActiveTab} />
              <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                <Link href={todayContext?.pipelineHref ?? '/pipeline'} className="rounded-full bg-neutral-50 px-3 py-1.5 font-semibold text-neutral-600 transition hover:bg-neutral-100">Pipeline</Link>
                <Link href={liveSnapshot.links.tasksWorkspace} className="rounded-full bg-neutral-50 px-3 py-1.5 font-semibold text-neutral-600 transition hover:bg-neutral-100">Task queue</Link>
              </div>
            </div>
          </div>

          <div>
            {activeTab === 'workflow' ? (
              <WorkflowTab
                snapshot={liveSnapshot}
                leadId={leadState.id}
                pendingFollowUpId={workflowState.pendingFollowUpId}
                activePanel={activeWorkflowPanel}
                onPanelChange={setActiveWorkflowPanel}
                onEditCoverage={() => openDrawer('coverage')}
                onOpenQuote={() => void handleOpenQuoteWorkspace()}
              />
            ) : null}
            {activeTab === 'quotes' ? (
              <QuotesTab
                quoteFocus={liveSnapshot.quoteFocus}
                commercial={liveSnapshot.commercial}
                activity={[...opsHistory.map((item) => ({ id: item.id, kind: item.kind, title: item.label, detail: item.detail ?? 'Lead operation recorded', happenedAt: item.happenedAt })), ...liveSnapshot.activity]}
                onOpenQuote={() => void handleOpenQuoteWorkspace()}
              />
            ) : null}
            {activeTab === 'activity' ? <ActivityTab snapshot={liveSnapshot} onAskAiSummary={() => setAiPopoverOpen(true)} onOpenFollowUp={() => { setActiveTab('workflow'); setActiveWorkflowPanel('follow_up') }} /> : null}
          </div>
        </main>

        <LeadRightRail
          nextAction={liveSnapshot.nextAction}
          quoteFocus={liveSnapshot.quoteFocus}
          compliance={liveSnapshot.compliance}
          workspaceLinks={liveSnapshot.links}
          onOpenNextAction={() => {
            setActiveTab('workflow')
            setActiveWorkflowPanel(liveSnapshot.nextAction.workflowPanel)
          }}
          onOpenQuote={() => void handleOpenQuoteWorkspace()}
        />
      </div>

      <LeadAiAssistPopover
        open={aiPopoverOpen}
        leadId={leadState.id}
        aiAssist={liveSnapshot.aiAssist}
        nextAction={liveSnapshot.nextAction}
        reviewHref={aiReviewLink}
        onClose={() => setAiPopoverOpen(false)}
      />

      <LeadStickyActionBar
        tabs={visibleTabs}
        activeTab={activeTab}
        hasActiveQuote={liveSnapshot.quoteFocus.hasActiveQuote}
        quoteBusy={quoteBusy}
        onSelectTab={setActiveTab}
        onOpenQuote={() => void handleOpenQuoteWorkspace()}
        onQuickEdit={() => openDrawer('details')}
        onOpenFollowUp={() => {
          setActiveTab('workflow')
          setActiveWorkflowPanel('follow_up')
        }}
      />

      <LeadQuickEditDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lead={{
          id: leadState.id,
          name: leadState.companyName,
          contactName: leadState.contactName,
          email: leadState.email,
          phone: leadState.phone,
          country: leadState.country,
          ownerName: leadState.ownerName,
          sourceLabel: leadState.sourceLabel,
          leadType: leadState.leadType,
        }}
        availableProducts={availableProductOptions}
        availableMarkets={availableMarkets}
        selectedProductIds={selectedProductIdState}
        selectedMarketIds={selectedMarketIdState}
        quoteWorkspaceHref={commercialState.latestQuoteId ? `/leads/${leadState.id}/quote?quoteId=${commercialState.latestQuoteId}` : liveSnapshot.links.quoteWorkspace}
        quoteCount={commercialState.quoteCount}
        latestQuoteNumber={commercialState.latestQuoteNumber}
        pendingFollowUpId={workflowState.pendingFollowUpId}
        nextFollowUpAt={workflowState.nextFollowUpAt}
        openFollowUpCount={workflowState.openFollowUpCount}
        overdueFollowUpCount={workflowState.overdueCount}
        dueSoonFollowUpCount={workflowState.dueSoonCount}
        qualificationStatus={workflowState.qualificationStatus}
        qualificationNotes={workflowState.qualificationNotes}
        initialSection={drawerSection}
        onLeadUpdated={(patch) => {
          setLeadState((current) => ({
            ...current,
            companyName: patch.name ?? current.companyName,
            contactName: patch.contactName ?? current.contactName,
            email: patch.email ?? current.email,
            phone: patch.phone ?? current.phone,
            country: patch.country ?? current.country,
          }))
        }}
        onCoverageSaved={({ productIds, marketIds }) => {
          setSelectedProductIdState(productIds)
          setSelectedMarketIdState(marketIds)
          setMappingState({
            productCount: productIds.length,
            marketCount: marketIds.length,
            productNames: availableProductOptions.filter((product) => productIds.includes(product.id)).map((product) => product.name),
            marketNames: availableMarkets.filter((market) => marketIds.includes(market.id)).map((market) => market.name),
          })
        }}
        onProductCreated={(product) => {
          setAvailableProductOptions((current) => current.some((item) => item.id === product.id) ? current : [product, ...current])
        }}
        onWorkflowUpdated={(payload) => {
          setWorkflowState((current) => ({
            ...current,
            qualificationStatus: payload.qualificationStatus ?? current.qualificationStatus,
            qualificationNotes: payload.qualificationNotes ?? current.qualificationNotes,
            nextFollowUpAt: payload.nextFollowUpAt !== undefined ? payload.nextFollowUpAt : current.nextFollowUpAt,
            pendingFollowUpId: payload.pendingFollowUpId !== undefined ? payload.pendingFollowUpId : current.pendingFollowUpId,
            openFollowUpCount: payload.openFollowUpCount ?? current.openFollowUpCount,
            overdueCount: payload.overdueFollowUpCount ?? current.overdueCount,
            dueSoonCount: payload.dueSoonFollowUpCount ?? current.dueSoonCount,
          }))
        }}
        onOperationLogged={logOperation}
        onQuoteReady={({ quoteId, quoteNumber, quoteCountDelta }) => {
          setCommercialState((current) => ({
            quoteCount: quoteCountDelta ? current.quoteCount + quoteCountDelta : current.quoteCount,
            latestQuoteId: quoteId ?? current.latestQuoteId,
            latestQuoteNumber: quoteNumber ?? current.latestQuoteNumber,
            activePricingBasis: current.activePricingBasis,
          }))
        }}
      />
    </div>
  )
}
