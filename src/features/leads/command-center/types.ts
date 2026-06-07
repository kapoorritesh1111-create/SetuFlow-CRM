import type { QuotePricingBasis } from '@/lib/pricing-basis-contract'

export type GateStatus = 'CLEAR' | 'WARNING' | 'BLOCKED'
export type PricingReadiness = 'missing' | 'partial' | 'ready'
export type TaskUrgency = 'ON_TRACK' | 'DUE' | 'OVERDUE'
export type ReadinessStatus = 'not_ready' | 'at_risk' | 'ready'

export type LeadCommandCenterTabKey =
  | 'workflow'
  | 'quotes'
  | 'activity'

export type WorkflowActionKey =
  | 'qualification'
  | 'coverage'
  | 'commercial'
  | 'follow_up'

export type NextActionKind =
  | 'send_introduction'
  | 'prepare_follow_up'
  | 'review_quote'
  | 'fix_compliance'
  | 'reengage_lead'
  | 'schedule_follow_up'

export type PipelineStageItem = {
  id: string
  label: string
  position: number
  state: 'completed' | 'current' | 'upcoming' | 'won' | 'lost'
  canMoveTo: boolean
  blockedReason?: string | null
  entryHint?: string | null
  exitHint?: string | null
}

export type WorkflowActionCardState = {
  key: WorkflowActionKey
  label: string
  stateLabel: string
  helperText: string
  badge?: string | null
  blocked?: boolean
  blockedReason?: string | null
}

export type QuoteFocusSummary = {
  hasActiveQuote: boolean
  quoteId?: string | null
  quoteNumber?: string | null
  status?: string | null
  pricingBasis?: QuotePricingBasis | null
  updatedAt?: string | null
}

export type AiAssistSummary = {
  pendingReviewCount: number
  readyDraftCount: number
  enabled: boolean
  allowedActions: Array<'draft_next_message' | 'summarize_activity' | 'suggest_next_action'>
}

export type NextActionSummary = {
  id: string
  kind: NextActionKind
  title: string
  summary: string
  dueAt?: string | null
  urgency: TaskUrgency
  primaryLabel: string
  secondaryLabels: string[]
  quoteId?: string | null
  followUpId?: string | null
  aiDraftAvailable: boolean
  workflowPanel: WorkflowActionKey
}

export type LeadIdentity = {
  id: string
  companyName: string
  leadType: 'buyer' | 'supplier'
  ownerName?: string
  currentStageId?: string | null
  currentStage?: string
  sourceLabel?: string
  contactName?: string | null
  jobTitle?: string | null
  email?: string | null
  phone?: string | null
  phoneSecondary?: string | null
  phoneCountryCode?: string | null
  phoneSecondaryCountryCode?: string | null
  whatsappNumber?: string | null
  country?: string | null
}

export type ExplainableReadiness = {
  status: ReadinessStatus
  summary: string
  blockers: string[]
}

export type LeadProfileSnapshot = {
  lead: LeadIdentity
  pricingReadiness: PricingReadiness
  complianceGate: GateStatus
  blockerCount: number
  nextFollowUpAt?: string
  taskUrgency: TaskUrgency
  tabs: Array<{ key: LeadCommandCenterTabKey; label: string }>
  pipeline: {
    name: string
    currentStageId?: string | null
    stages: PipelineStageItem[]
  }
  nextAction: NextActionSummary
  workflowCards: WorkflowActionCardState[]
  quoteFocus: QuoteFocusSummary
  aiAssist: AiAssistSummary
  qualification: {
    status: 'not_started' | 'in_review' | 'qualified' | 'disqualified'
    missingFields: string[]
    notes?: string | null
    updatedAt?: string | null
  }
  mapping: {
    status: 'pending' | 'in_progress' | 'ready'
    productCount: number
    marketCount: number
    isComplete: boolean
    productNames: string[]
    marketNames: string[]
    notes?: string | null
  }
  commercial: {
    activePricingBasis?: QuotePricingBasis | null
    rfqCount: number
    quoteCount: number
    contractCount: number
    latestQuoteStatus?: string | null
    latestQuoteNumber?: string | null
    stageProgression: ExplainableReadiness
    quoteSend: ExplainableReadiness
    contractHandoff: ExplainableReadiness
  }
  compliance: {
    gate: GateStatus
    blockerCount: number
    blockers: string[]
    missingRequiredDocumentCount: number
    expiringDocumentCount: number
    approvedDocumentCount: number
    totalDocumentCount: number
  }
  tasks: {
    urgency: TaskUrgency
    openFollowUpCount: number
    overdueCount: number
    dueSoonCount: number
    nextFollowUpAt?: string | null
  }
  ai: {
    pendingReviewCount: number
    readyDraftCount: number
    totalDraftCount: number
  }
  activity: Array<{
    id: string
    kind: string
    title: string
    detail: string
    happenedAt?: string | null
  }>
  links: {
    quoteWorkspace: string
    complianceWorkspace: string
    documentsWorkspace: string
    tasksWorkspace: string
    contractsWorkspace: string
    aiWorkspace: string
    backToLeads: string
  }
}
