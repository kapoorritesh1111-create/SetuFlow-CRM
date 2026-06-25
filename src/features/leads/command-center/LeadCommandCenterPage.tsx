'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { normalizePricingBasis, type QuotePricingBasis } from '@/lib/pricing-basis-contract'
import { cloneQuoteForRepeatBusiness, createNewLeadQuoteDraft, createQuoteRevisionFromQuote, openOrCreateLeadQuoteDraft } from '@/features/leads/server/actions'
import { moveLeadToStage } from '@/features/pipeline/server/actions'
import type { LeadQualificationStatus } from '@/lib/lead-workflow'
import type { LeadCommandCenterTabKey, LeadProfileSnapshot, PipelineStageItem, QuoteVersionTimelineItem, WorkflowActionKey } from './types'
import { LeadCommandHeader } from './LeadCommandHeader'
import { LeadPipelineStageStrip } from './LeadPipelineStageStrip'
import LeadQuickEditDrawer, { type LeadQuickEditDrawerSection } from './LeadQuickEditDrawer'
import { LeadRightRail } from './LeadRightRail'
import { LeadTodayContextBar, type LeadTodayContext } from './LeadTodayContextBar'
import { LeadStickyActionBar } from './LeadStickyActionBar'
import { WorkflowTab } from './workflow/WorkflowTab'
import { LeadCommandTabs } from './LeadCommandTabs'
import { ActivityTab } from './activity/ActivityTab'
import { QuotesTab } from './quotes/QuotesTab'
import { StateMessage } from '@/components/ui/state-message'

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
  quoteVersions?: QuoteVersionTimelineItem[]
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
  return snapshot.tabs
    .filter((tab) => hasActiveQuote || tab.key !== 'quotes')
    .map((tab) => {
      if (tab.key === 'workflow') return { ...tab, label: 'Command center' }
      if (tab.key === 'quotes') return { ...tab, label: 'Quote record' }
      if (tab.key === 'activity') return { ...tab, label: 'Lead log' }
      return tab
    })
}

function buildLiveWorkflowCards(snapshot: LeadProfileSnapshot, input: {
  qualificationStatus: LeadQualificationStatus
  qualificationMissingCount: number
  productCount: number
  marketCount: number
  quoteCount: number
  quoteNumber?: string | null
  pricingBasis?: QuotePricingBasis | null
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
        helperText: input.pricingBasis ? `${input.pricingBasis.replace(/_/g, ' ')} basis is carrying the current sales process` : 'Create or review the current quote and pricing basis',
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
  quoteVersions = [],
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
  const [supportingRecordExpanded, setSupportingRecordExpanded] = useState(false)
  const [activeWorkflowPanel, setActiveWorkflowPanel] = useState<WorkflowActionKey | null>(null)
  const [stageChangeTarget, setStageChangeTarget] = useState<string | null>(null)
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
  const [quoteLauncherOpen, setQuoteLauncherOpen] = useState(false)

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
    setQuoteLauncherOpen(false)
    setStageChangeTarget(null)
    setActiveTab(initialTab)
    setActiveWorkflowPanel(null)
    setSupportingRecordExpanded(false)
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
      isComplete: mappingState.productCount > 0 && mappingState.marketCount > 0,
    },
    commercial: {
      ...snapshot.commercial,
      quoteCount: commercialState.quoteCount,
      latestQuoteNumber: commercialState.latestQuoteNumber,
      activePricingBasis: commercialState.activePricingBasis ?? snapshot.commercial.activePricingBasis ?? null,
    },
    quoteVersions: quoteVersions.length ? quoteVersions : snapshot.quoteVersions,
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
  }), [commercialState, leadState, mappingState, quoteVersions, snapshot, workflowState])

  const hasActiveQuoteRecord = liveSnapshot.quoteFocus.hasActiveQuote
  const wonStageId = liveSnapshot.pipeline.stages.find((stage) => stage.state === 'won' || stage.label.toLowerCase().includes('won'))?.id ?? null
  const lostStageId = liveSnapshot.pipeline.stages.find((stage) => stage.state === 'lost' || stage.label.toLowerCase().includes('lost'))?.id ?? null

  useEffect(() => {
    if (activeTab === 'quotes' && !hasActiveQuoteRecord) {
      setActiveTab('workflow')
    }
  }, [activeTab, hasActiveQuoteRecord])

  useEffect(() => {
    if (activeTab !== 'quotes' && activeTab !== 'activity') {
      setSupportingRecordExpanded(false)
    }
  }, [activeTab])

  const openDrawer = (section: LeadQuickEditDrawerSection) => {
    setDrawerSection(section)
    setEditOpen(true)
  }

  const logOperation = (item: Omit<OperationItem, 'id'>) => {
    setOpsHistory((current) => [{ id: `${item.kind}-${item.happenedAt}-${current.length}`, ...item }, ...current].slice(0, 10))
  }

  async function runQuoteLauncherAction(mode: 'continue' | 'new' | 'revision' | 'repeat' | 'history' | 'response') {
    setQuoteBusy(true)
    setQuoteMessage(null)

    try {
      if (mode === 'history') {
        setActiveTab('quotes')
        setQuoteLauncherOpen(false)
        return
      }

      if (mode === 'response') {
        setActiveTab('activity')
        setQuoteLauncherOpen(false)
        return
      }

      if (mode === 'continue') {
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
        if (nextQuoteId) {
          window.location.assign(`/leads/${leadState.id}/quote?quoteId=${nextQuoteId}`)
          return
        }
        setQuoteMessage(result.success ?? 'Quote workspace is ready.')
        return
      }

      const result: any = mode === 'new'
        ? await createNewLeadQuoteDraft(leadState.id)
        : mode === 'revision' && commercialState.latestQuoteId
          ? await createQuoteRevisionFromQuote(leadState.id, commercialState.latestQuoteId)
          : mode === 'repeat' && commercialState.latestQuoteId
            ? await cloneQuoteForRepeatBusiness(leadState.id, commercialState.latestQuoteId)
            : { error: 'Select a source quote before creating this draft.' }

      if (result.error) {
        setQuoteMessage(result.error)
        return
      }

      const nextQuoteId = result.quoteId ?? result.quote?.id ?? null
      const nextQuoteNumber = result.quote?.quote_number ?? commercialState.latestQuoteNumber
      const nextBasis = result.quote?.pricing_basis ? normalizePricingBasis(result.quote.pricing_basis) : null
      if (nextQuoteId) {
        setCommercialState((current) => ({
          quoteCount: current.quoteCount + 1,
          latestQuoteId: nextQuoteId,
          latestQuoteNumber: nextQuoteNumber,
          activePricingBasis: nextBasis ?? current.activePricingBasis,
        }))
        setQuoteLauncherOpen(false)
        window.location.assign(`/leads/${leadState.id}/quote?quoteId=${nextQuoteId}`)
        return
      }

      setQuoteMessage(result.success ?? 'Quote launcher action completed.')
    } catch {
      setQuoteMessage('We could not open the quote workspace. Please try again.')
    } finally {
      setQuoteBusy(false)
    }
  }

  function handleOpenQuoteWorkspace() {
    setQuoteMessage(null)
    setQuoteLauncherOpen(true)
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
          onOpenQuote={handleOpenQuoteWorkspace}
          onQuickEdit={() => openDrawer('details')}
          onEditCoverage={() => openDrawer('coverage')}
          onOpenActivity={openActivityTab}
          onScheduleFollowUp={() => {
            setActiveTab('workflow')
            setActiveWorkflowPanel('follow_up')
          }}
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

      {quoteMessage ? <StateMessage title="Lead workflow update" description={quoteMessage} tone={quoteMessage.toLowerCase().includes('could not') || quoteMessage.toLowerCase().includes('error') ? 'danger' : 'success'} /> : null}
      {todayContext ? <LeadTodayContextBar todayContext={todayContext} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px] xl:gap-6">
        <main className="space-y-6">
          <LeadCommandTabs
            tabs={getVisibleLeadTabs(liveSnapshot, hasActiveQuoteRecord)}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />

          <div className="space-y-5">
            {activeTab === 'workflow' ? (
              <WorkflowTab
                snapshot={liveSnapshot}
                leadId={leadState.id}
                pendingFollowUpId={workflowState.pendingFollowUpId}
                activePanel={activeWorkflowPanel}
                onPanelChange={setActiveWorkflowPanel}
                onEditCoverage={() => openDrawer('coverage')}
                onOpenQuote={handleOpenQuoteWorkspace}
                onFollowUpSaved={(payload) => {
                  setWorkflowState((current) => ({
                    ...current,
                    nextFollowUpAt: payload?.nextFollowUpAt !== undefined ? payload.nextFollowUpAt : current.nextFollowUpAt,
                    pendingFollowUpId: payload?.followUpId !== undefined ? payload.followUpId : current.pendingFollowUpId,
                    overdueCount: 0,
                    dueSoonCount: payload?.nextFollowUpAt ? 1 : current.dueSoonCount,
                    openFollowUpCount: Math.max(1, current.openFollowUpCount),
                  }))
                }}
              />
            ) : activeTab === 'quotes' ? (
              <QuotesTab
                quoteFocus={liveSnapshot.quoteFocus}
                commercial={liveSnapshot.commercial}
                activity={liveSnapshot.activity}
                quoteVersions={liveSnapshot.quoteVersions}
                onOpenQuote={handleOpenQuoteWorkspace}
              />
            ) : activeTab === 'activity' ? (
              <ActivityTab
                snapshot={liveSnapshot}
              />
            ) : null}
          </div>
        </main>

        <LeadRightRail
          leadId={leadState.id}
          nextAction={liveSnapshot.nextAction}
          quoteFocus={liveSnapshot.quoteFocus}
          compliance={liveSnapshot.compliance}
          workspaceLinks={liveSnapshot.links}
          leadQueue={leadQueue}
          backToQueueHref={'/leads' + navigationQueryString}
          pipelineHref={todayContext?.pipelineHref ?? '/pipeline'}
          onOpenNextAction={() => {
            setActiveTab('workflow')
            setActiveWorkflowPanel(liveSnapshot.nextAction.workflowPanel)
          }}
          onOpenLeadLog={openActivityTab}
        />
      </div>

      <LeadStickyActionBar
        activeTab={activeTab}
        currentStageLabel={liveSnapshot.lead.currentStage}
        hasActiveQuote={liveSnapshot.quoteFocus.hasActiveQuote}
        quoteBusy={quoteBusy}
        lead={liveSnapshot.lead}
        onOpenQuote={handleOpenQuoteWorkspace}
        onScheduleFollowUp={() => {
          setActiveTab('workflow')
          setActiveWorkflowPanel('follow_up')
        }}
        onQuickEdit={() => openDrawer('details')}
        wonStageId={wonStageId}
        lostStageId={lostStageId}
        onMarkTerminalStage={(stageId) => void handleConfirmStageChange(stageId)}
      />

      {quoteLauncherOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-6 sm:items-center">
          <div className="w-full max-w-2xl rounded-[22px] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-dark">Quote launcher</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Choose the right quote path</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Existing quote history remains locked. New revisions and repeat quotes are created as separate editable drafts.
                </p>
              </div>
              <button type="button" onClick={() => setQuoteLauncherOpen(false)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600">Close</button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {commercialState.quoteCount === 0 ? (
                <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('continue')} className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-left transition hover:border-brand-primary/40">
                  <span className="text-sm font-semibold text-slate-950">Create first quote</span>
                  <span className="mt-1 block text-sm text-slate-600">Start the first governed quote draft for this lead.</span>
                </button>
              ) : null}

              {commercialState.latestQuoteId && ['draft', 'in_review', 'review', 'pending_approval'].includes(String(liveSnapshot.quoteFocus.status ?? '').toLowerCase()) ? (
                <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('continue')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
                  <span className="text-sm font-semibold text-slate-950">Continue latest draft</span>
                  <span className="mt-1 block text-sm text-slate-600">Open the latest editable quote without creating a duplicate.</span>
                </button>
              ) : null}

              {commercialState.quoteCount > 0 ? (
                <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('new')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
                  <span className="text-sm font-semibold text-slate-950">Create separate new quote</span>
                  <span className="mt-1 block text-sm text-slate-600">Use for a second quote or separate commercial opportunity.</span>
                </button>
              ) : null}

              {commercialState.latestQuoteId && String(liveSnapshot.quoteFocus.status ?? '').toLowerCase() === 'sent' ? (
                <>
                  <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('continue')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
                    <span className="text-sm font-semibold text-slate-950">View sent quote</span>
                    <span className="mt-1 block text-sm text-slate-600">Review the locked customer-facing quote.</span>
                  </button>
                  <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('revision')} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300">
                    <span className="text-sm font-semibold text-amber-950">Create governed revision</span>
                    <span className="mt-1 block text-sm text-amber-800">Copy sent quote into a new editable draft.</span>
                  </button>
                  <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('response')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
                    <span className="text-sm font-semibold text-slate-950">Log customer response</span>
                    <span className="mt-1 block text-sm text-slate-600">Jump to the lead log for response notes.</span>
                  </button>
                </>
              ) : null}

              {commercialState.latestQuoteId && ['accepted', 'approved'].includes(String(liveSnapshot.quoteFocus.status ?? '').toLowerCase()) ? (
                <>
                  <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('continue')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
                    <span className="text-sm font-semibold text-slate-950">View accepted quote / order handoff</span>
                    <span className="mt-1 block text-sm text-slate-600">Open the locked accepted quote and handoff context.</span>
                  </button>
                  <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('repeat')} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-300">
                    <span className="text-sm font-semibold text-emerald-950">Clone accepted quote</span>
                    <span className="mt-1 block text-sm text-emerald-800">Create a new repeat-business draft without changing history.</span>
                  </button>
                </>
              ) : null}

              {commercialState.latestQuoteId && ['rejected', 'expired'].includes(String(liveSnapshot.quoteFocus.status ?? '').toLowerCase()) ? (
                <>
                  <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('continue')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50">
                    <span className="text-sm font-semibold text-slate-950">View locked quote</span>
                    <span className="mt-1 block text-sm text-slate-600">Review the closed commercial record.</span>
                  </button>
                  <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('revision')} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300">
                    <span className="text-sm font-semibold text-amber-950">Clone to new draft</span>
                    <span className="mt-1 block text-sm text-amber-800">Use when the customer reopens the discussion.</span>
                  </button>
                </>
              ) : null}

              {commercialState.quoteCount > 0 ? (
                <button type="button" disabled={quoteBusy} onClick={() => void runQuoteLauncherAction('history')} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300">
                  <span className="text-sm font-semibold text-slate-950">View quote history</span>
                  <span className="mt-1 block text-sm text-slate-600">Switch to the quote record and activity trail.</span>
                </button>
              ) : null}
            </div>
            {quoteBusy ? <p className="mt-4 text-sm font-semibold text-slate-600">Working on quote action…</p> : null}
          </div>
        </div>
      ) : null}

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
