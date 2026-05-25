import type { LeadProfileData } from '@/lib/queries/leads'
import { buildStageMoveReadiness } from '@/lib/queries/pipeline-stage-gating'
import { PRODUCT_ROUTES } from '@/lib/product-contract'
import {
  getActivePricingBasis,
  getActivityFeed,
  getAiQueueStatus,
  getComplianceStatus,
  getContractHandoffReadiness,
  getCurrentStageName,
  getOwnerName,
  getPricingReadiness,
  getQualificationState,
  getMappingState,
  getQuoteSendReadiness,
  getStageProgressionReadiness,
  getTaskStatus,
} from '@/lib/queries/lead-command-center'
import type {
  AiAssistSummary,
  LeadProfileSnapshot,
  NextActionSummary,
  PipelineStageItem,
  QuoteFocusSummary,
  WorkflowActionCardState,
} from './types'

function latestQuote(data: LeadProfileData) {
  return [...data.quotes].sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime())[0] ?? null
}

function latestPendingFollowUp(data: LeadProfileData) {
  return [...data.followUps]
    .filter((item) => String(item.status ?? '').toLowerCase() !== 'completed')
    .sort((a, b) => new Date(a.scheduled_at ?? a.created_at ?? 0).getTime() - new Date(b.scheduled_at ?? b.created_at ?? 0).getTime())[0] ?? null
}

function getPipelineStageHints(label: string) {
  const normalized = label.trim().toLowerCase()
  if (normalized.includes('new')) {
    return {
      entryHint: 'A newly captured lead that still needs contact and fit validation.',
      exitHint: 'Confirm contact details and first-fit checks before moving onward.',
    }
  }
  if (normalized.includes('qualif')) {
    return {
      entryHint: 'Buyer fit, mapped coverage, and initial operator confidence are established here.',
      exitHint: 'A qualified lead should have clear coverage and a visible next commercial action.',
    }
  }
  if (normalized.includes('contact')) {
    return {
      entryHint: 'The lead has entered active commercial outreach.',
      exitHint: 'Keep the next communication and response tracking current before progressing.',
    }
  }
  if (normalized.includes('sample')) {
    return {
      entryHint: 'Samples or early validation are in motion.',
      exitHint: 'Confirm sample outcomes and objections before negotiation starts.',
    }
  }
  if (normalized.includes('negoti')) {
    return {
      entryHint: 'Commercial review is live and quote terms are now central.',
      exitHint: 'Approved pricing and a current quote should exist before close stages.',
    }
  }
  if (normalized.includes('won')) {
    return {
      entryHint: 'This lead is ready to be treated as a successful commercial outcome.',
      exitHint: 'Won stages should only happen once quote and commercial acceptance are trustworthy.',
    }
  }
  if (normalized.includes('lost')) {
    return {
      entryHint: 'The lead is being formally marked as lost.',
      exitHint: 'Use this only when the operator intends to stop active progression.',
    }
  }
  return {
    entryHint: 'This stage belongs to the active governed pipeline.',
    exitHint: 'Use stage movement only when the current workflow conditions make sense.',
  }
}

function buildPipelineStageItems(data: LeadProfileData, pricingReadiness: LeadProfileSnapshot['pricingReadiness']): { name: string; currentStageId?: string | null; stages: PipelineStageItem[] } {
  const leadType = data.lead?.lead_type === 'supplier' ? 'supplier' : 'buyer'
  const pipeline = data.pipelines.find((item) => item.id === data.lead?.pipeline_id)
    ?? data.pipelines.find((item) => item.lead_type === leadType || item.lead_type === 'both')
    ?? null
  const stages = [...data.stages]
    .filter((stage) => !pipeline || stage.pipeline_id === pipeline.id)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))

  const qualification = getQualificationState(data)
  const mapping = getMappingState(data)
  const compliance = getComplianceStatus(data)
  const tasks = getTaskStatus(data)
  const currentStage = stages.find((stage) => stage.id === data.lead?.stage_id) ?? null
  const acceptedQuoteCount = data.quotes.filter((item) => ['accepted', 'approved'].includes(String(item.status ?? '').toLowerCase())).length

  return {
    name: pipeline?.name ?? (leadType === 'supplier' ? 'Supplier Pipeline' : 'Buyer Pipeline'),
    currentStageId: data.lead?.stage_id ?? null,
    stages: stages.map((stage, index) => {
      const readiness = buildStageMoveReadiness({
        currentStageName: currentStage?.name ?? null,
        currentStageOrder: currentStage?.sort_order ?? null,
        targetStageName: stage.name ?? `Stage ${index + 1}`,
        targetStageOrder: stage.sort_order ?? null,
        targetStageIsClosed: (stage as any).is_closed,
        targetStageIsWon: (stage as any).is_won,
        targetStageIsLost: (stage as any).is_lost,
        qualificationStatus: qualification.status,
        hasConfirmedProductInterest: mapping.hasConfirmedProductInterest,
        hasMarketCoverage: mapping.hasMarketCoverage,
        complianceGate: compliance.gate,
        overdueFollowUpCount: tasks.overdueCount,
        pricingReadiness,
        rfqCount: data.rfqs.length,
        quoteCount: data.quotes.length,
        acceptedQuoteCount,
        contractCount: data.contracts.length,
      })
      const hints = getPipelineStageHints(stage.name ?? `Stage ${index + 1}`)
      const currentIndex = currentStage ? stages.findIndex((item) => item.id === currentStage.id) : -1
      const stageState: PipelineStageItem['state'] = (stage as any).is_won
        ? 'won'
        : (stage as any).is_lost
          ? 'lost'
          : stage.id === data.lead?.stage_id
            ? 'current'
            : currentIndex >= 0 && index < currentIndex
              ? 'completed'
              : 'upcoming'

      return {
        id: stage.id,
        label: stage.name ?? `Stage ${index + 1}`,
        position: index,
        state: stageState,
        canMoveTo: readiness.canMove,
        blockedReason: readiness.canMove ? readiness.warnings[0] ?? null : readiness.blockers[0] ?? readiness.summary,
        entryHint: hints.entryHint,
        exitHint: hints.exitHint,
      }
    }),
  }
}

function buildNextActionSummary(data: LeadProfileData): NextActionSummary {
  const tasks = getTaskStatus(data)
  const qualification = getQualificationState(data)
  const mapping = getMappingState(data)
  const quote = latestQuote(data)
  const followUp = latestPendingFollowUp(data)
  const ai = getAiQueueStatus(data)
  const compliance = getComplianceStatus(data)

  if (compliance.gate === 'BLOCKED') {
    return {
      id: 'next-action-compliance',
      kind: 'fix_compliance',
      title: 'Clear compliance blockers',
      summary: 'This lead still has blocking compliance conditions. Clear them before pushing the record into later commercial movement.',
      urgency: tasks.urgency,
      primaryLabel: 'Review compliance',
      secondaryLabels: ['Keep movement governed'],
      aiDraftAvailable: false,
      workflowPanel: 'commercial',
    }
  }

  if (!mapping.hasConfirmedProductInterest || !mapping.hasMarketCoverage) {
    return {
      id: 'next-action-coverage',
      kind: 'reengage_lead',
      title: 'Map coverage before quote',
      summary: !mapping.hasConfirmedProductInterest
        ? 'Map at least one confirmed product first. Once product coverage is saved, buyer qualification can be completed automatically for quote prep.'
        : 'Market coverage is still missing. The selected country should auto-populate the market; review coverage if it did not.',
      urgency: tasks.urgency,
      primaryLabel: 'Open coverage first',
      secondaryLabels: ['Map product', 'Auto-qualify buyer after mapping'],
      aiDraftAvailable: false,
      workflowPanel: 'coverage',
    }
  }

  if (qualification.status !== 'qualified') {
    return {
      id: 'next-action-qualification',
      kind: 'reengage_lead',
      title: 'Confirm buyer qualification',
      summary: 'Coverage is mapped. Confirm the buyer fit, or let the coverage save action auto-qualify buyers when products are mapped.',
      urgency: tasks.urgency,
      primaryLabel: 'Open qualification',
      secondaryLabels: ['Review buyer fit'],
      aiDraftAvailable: false,
      workflowPanel: 'qualification',
    }
  }

  if (tasks.overdueCount > 0 || followUp?.scheduled_at) {
    const dueAt = followUp?.scheduled_at ?? tasks.nextFollowUpAt ?? null
    return {
      id: followUp?.id ?? 'next-action-follow-up',
      kind: tasks.overdueCount > 0 ? 'prepare_follow_up' : 'schedule_follow_up',
      title: tasks.overdueCount > 0 ? 'Resolve overdue follow-up' : 'Prepare next follow-up',
      summary: dueAt
        ? `The lead has a scheduled follow-up for ${new Date(dueAt).toLocaleString()}. Keep the commercial thread moving from the workflow surface.`
        : 'Keep the next follow-up visible and operator-owned inside the workflow surface.',
      dueAt,
      urgency: tasks.urgency,
      primaryLabel: 'Open follow-up lane',
      secondaryLabels: ['Review draft', 'Reschedule if needed'],
      followUpId: followUp?.id ?? null,
      aiDraftAvailable: ai.readyDraftCount > 0 || ai.pendingReviewCount > 0,
      workflowPanel: 'follow_up',
    }
  }

  if (quote?.id) {
    return {
      id: quote.id,
      kind: 'review_quote',
      title: 'Review active quote',
      summary: 'The latest quote is the primary commercial artifact. Keep pricing basis, send readiness, and next communication aligned before moving forward.',
      urgency: tasks.urgency,
      primaryLabel: 'Open quote flow',
      secondaryLabels: ['Check pricing basis', 'Move into Quotes tab when ready'],
      quoteId: quote.id,
      aiDraftAvailable: ai.readyDraftCount > 0 || ai.pendingReviewCount > 0,
      workflowPanel: 'commercial',
    }
  }

  return {
    id: 'next-action-intro',
    kind: 'send_introduction',
    title: 'Prepare introduction',
    summary: 'No active quote or scheduled follow-up is carrying the thread yet. Use workflow to set the first structured commercial move.',
    urgency: tasks.urgency,
    primaryLabel: 'Open workflow',
    secondaryLabels: ['Draft intro'],
    aiDraftAvailable: ai.totalDraftCount > 0,
    workflowPanel: 'follow_up',
  }
}

function buildWorkflowActionCards(data: LeadProfileData): WorkflowActionCardState[] {
  const qualification = getQualificationState(data)
  const mapping = getMappingState(data)
  const compliance = getComplianceStatus(data)
  const tasks = getTaskStatus(data)
  const quote = latestQuote(data)
  const pricingBasis = getActivePricingBasis(data)

  return [
    {
      key: 'qualification',
      label: 'Qualification',
      stateLabel: qualification.status.replace(/_/g, ' '),
      helperText: qualification.missingFields.length
        ? `${qualification.missingFields.length} inputs still need attention. Product coverage should be mapped before qualification is finalized.`
        : 'Buyer fit and operator readiness look current',
      badge: qualification.status === 'qualified' ? 'Ready' : qualification.missingFields.length ? `${qualification.missingFields.length} missing` : 'Auto-ready after coverage',
      blocked: qualification.status !== 'qualified',
      blockedReason: qualification.status !== 'qualified' ? 'Map coverage first; buyer qualification can then be auto-completed when products are saved.' : null,
    },
    {
      key: 'coverage',
      label: 'Coverage',
      stateLabel: `${mapping.productCount} products · ${mapping.marketCount} markets`,
      helperText: mapping.isComplete
        ? 'Confirmed product linkage and market coverage are ready; buyer qualification can auto-complete from this coverage state'
        : !mapping.hasConfirmedProductInterest
          ? 'Map confirmed product coverage before qualifying the buyer or opening quote work'
          : 'Map at least one active market before pushing the lead forward',
      badge: mapping.isComplete ? 'Mapped' : !mapping.hasConfirmedProductInterest ? 'Confirm product' : 'Add market',
      blocked: !mapping.isComplete,
      blockedReason: !mapping.hasConfirmedProductInterest
        ? 'Confirmed product linkage is still missing for pipeline progression.'
        : !mapping.hasMarketCoverage
          ? 'Market coverage is still missing for pipeline progression.'
          : null,
    },
    {
      key: 'commercial',
      label: 'Commercial',
      stateLabel: quote?.quote_number ?? 'No quote yet',
      helperText: pricingBasis ? `${pricingBasis.replace(/_/g, ' ')} basis is carrying the current sales process` : 'Create or review the current quote and pricing basis',
      badge: quote?.status ?? null,
      blocked: compliance.gate === 'BLOCKED' || String(quote?.status ?? '').toLowerCase() === 'draft',
      blockedReason: compliance.gate === 'BLOCKED'
        ? 'Compliance blockers still affect commercial movement.'
        : String(quote?.status ?? '').toLowerCase() === 'draft'
          ? 'Quote readiness still needs operator completion before later-stage movement.'
          : null,
    },
    {
      key: 'follow_up',
      label: 'Follow-up',
      stateLabel: tasks.nextFollowUpAt ? 'Scheduled' : tasks.openFollowUpCount > 0 ? 'Open' : 'Not scheduled',
      helperText: tasks.overdueCount > 0
        ? 'Overdue follow-ups now block forward stage progression until the operator closes the drift.'
        : tasks.nextFollowUpAt
          ? `Next follow-up is ${new Date(tasks.nextFollowUpAt).toLocaleDateString()}`
          : 'Keep the next communication visible and reviewable',
      badge: tasks.overdueCount > 0 ? `${tasks.overdueCount} overdue` : tasks.dueSoonCount > 0 ? 'Due soon' : null,
      blocked: tasks.overdueCount > 0,
      blockedReason: tasks.overdueCount > 0 ? 'Overdue follow-ups are blocking forward stage movement.' : null,
    },
  ]
}

function buildQuoteFocusSummary(data: LeadProfileData): QuoteFocusSummary {
  const quote = latestQuote(data)
  const pricingBasis = getActivePricingBasis(data)
  return {
    hasActiveQuote: Boolean(quote?.id),
    quoteId: quote?.id ?? null,
    quoteNumber: quote?.quote_number ?? null,
    status: quote?.status ?? null,
    pricingBasis,
    updatedAt: quote?.updated_at ?? quote?.created_at ?? null,
  }
}

function buildAiAssistSummary(data: LeadProfileData): AiAssistSummary {
  const ai = getAiQueueStatus(data)
  return {
    pendingReviewCount: ai.pendingReviewCount,
    readyDraftCount: ai.readyDraftCount,
    enabled: true,
    allowedActions: ['draft_next_message', 'summarize_activity', 'suggest_next_action'],
  }
}

export function toLeadProfileSnapshot(data: LeadProfileData): LeadProfileSnapshot {
  const qualification = getQualificationState(data)
  const mapping = getMappingState(data)
  const pricingReadiness = getPricingReadiness(data)
  const compliance = getComplianceStatus(data)
  const tasks = getTaskStatus(data)
  const ai = getAiQueueStatus(data)
  const stageProgression = getStageProgressionReadiness(data)
  const quoteSend = getQuoteSendReadiness(data)
  const contractHandoff = getContractHandoffReadiness(data)
  const quote = latestQuote(data)
  const pipeline = buildPipelineStageItems(data, pricingReadiness)
  const quoteFocus = buildQuoteFocusSummary(data)
  const aiAssist = buildAiAssistSummary(data)

  return {
    lead: {
      id: data.lead?.id ?? '',
      companyName: data.lead?.company_name ?? 'Unknown lead',
      leadType: data.lead?.lead_type === 'supplier' ? 'supplier' : 'buyer',
      ownerName: getOwnerName(data) ?? undefined,
      currentStageId: data.lead?.stage_id ?? null,
      currentStage: getCurrentStageName(data) ?? undefined,
      sourceLabel: data.lead?.source_label ?? undefined,
      contactName: data.lead?.contact_name ?? null,
      jobTitle: (data.lead as any)?.job_title ?? null,
      email: data.lead?.email ?? null,
      phone: data.lead?.phone ?? null,
      whatsappNumber: (data.lead as any)?.whatsapp_number ?? null,
      country: data.lead?.country ?? null,
    },
    pricingReadiness,
    complianceGate: compliance.gate,
    blockerCount: compliance.blockerCount,
    nextFollowUpAt: tasks.nextFollowUpAt ?? undefined,
    taskUrgency: tasks.urgency,
    tabs: [
      { key: 'workflow', label: 'Workflow' },
      ...(quoteFocus.hasActiveQuote ? [{ key: 'quotes' as const, label: 'Quotes' }] : []),
      { key: 'activity', label: 'Activity' },
    ],
    pipeline,
    nextAction: buildNextActionSummary(data),
    workflowCards: buildWorkflowActionCards(data),
    quoteFocus,
    aiAssist,
    qualification,
    mapping,
    commercial: {
      activePricingBasis: quoteFocus.pricingBasis,
      rfqCount: data.rfqs.length,
      quoteCount: data.quotes.length,
      contractCount: data.contracts.length,
      latestQuoteStatus: quote?.status ?? null,
      latestQuoteNumber: quote?.quote_number ?? null,
      stageProgression,
      quoteSend,
      contractHandoff,
    },
    compliance,
    tasks,
    ai,
    activity: getActivityFeed(data).slice(0, 16),
    links: {
      quoteWorkspace: `/leads?leadId=${data.lead?.id}&view=quote`,
      complianceWorkspace: '/compliance',
      documentsWorkspace: '/documents',
      tasksWorkspace: '/tasks',
      contractsWorkspace: '/contracts',
      aiWorkspace: '/ai-suggestions',
      backToLeads: PRODUCT_ROUTES.app.leads,
    },
  }
}
