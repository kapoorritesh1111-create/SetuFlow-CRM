export type StageMoveReadinessStatus = 'ready' | 'at_risk' | 'blocked'

export type StageMoveReadiness = {
  status: StageMoveReadinessStatus
  summary: string
  blockers: string[]
  warnings: string[]
  canMove: boolean
}

export type StageMoveReadinessInput = {
  currentStageName?: string | null
  currentStageOrder?: number | null
  targetStageName: string
  targetStageOrder?: number | null
  targetStageIsClosed?: boolean | null
  targetStageIsWon?: boolean | null
  targetStageIsLost?: boolean | null
  qualificationStatus: string | null | undefined
  mappingComplete: boolean
  complianceGate: 'CLEAR' | 'WARNING' | 'BLOCKED'
  overdueFollowUpCount: number
  pricingReadiness: 'ready' | 'partial' | 'missing'
  rfqCount: number
  quoteCount: number
  acceptedQuoteCount: number
  contractCount: number
}

function normalizeStageLabel(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function isSameOrBackwardMove(input: StageMoveReadinessInput) {
  if (!input.currentStageOrder || !input.targetStageOrder) return false
  return input.targetStageOrder <= input.currentStageOrder
}

function targetsCommercialCommitment(label: string, input: StageMoveReadinessInput) {
  return Boolean(
    input.targetStageIsClosed ||
      input.targetStageIsWon ||
      input.targetStageIsLost ||
      label.includes('contract') ||
      label.includes('close') ||
      label.includes('won') ||
      label.includes('complete')
  )
}

function targetsQuoteExecution(label: string) {
  return Boolean(
    label.includes('rfq') ||
      label.includes('quote') ||
      label.includes('proposal') ||
      label.includes('negoti') ||
      label.includes('review') ||
      label.includes('approve') ||
      label.includes('compliance') ||
      label.includes('document') ||
      label.includes('contract') ||
      label.includes('close') ||
      label.includes('won')
  )
}

export function buildStageMoveReadiness(input: StageMoveReadinessInput): StageMoveReadiness {
  const label = normalizeStageLabel(input.targetStageName)
  const blockers: string[] = []
  const warnings: string[] = []

  if (isSameOrBackwardMove(input)) {
    return { status: 'ready', summary: 'Backward or same-stage moves remain available for operator correction.', blockers, warnings, canMove: true }
  }

  if (String(input.qualificationStatus ?? '').toLowerCase() !== 'qualified') blockers.push('Qualification is not approved')
  if (!input.mappingComplete) blockers.push('At least one product must be linked')
  if (input.complianceGate === 'BLOCKED') blockers.push('Compliance blockers must be cleared')

  if (targetsQuoteExecution(label)) {
    if (input.quoteCount <= 0 && !label.includes('rfq')) blockers.push('Quote draft does not exist')
    if (input.pricingReadiness === 'missing' && !label.includes('rfq')) blockers.push('Pricing is not commercially ready')
    if (input.rfqCount <= 0 && label.includes('quote')) warnings.push('No RFQ is linked yet; confirm quote context before moving forward')
  }

  if (targetsCommercialCommitment(label, input)) {
    if (input.acceptedQuoteCount <= 0) blockers.push('No approved or accepted quote is available for contract handoff')
    if (input.contractCount > 0) warnings.push('Contract handoff already started for this lead')
  }

  if (input.overdueFollowUpCount > 0) warnings.push('There are overdue follow-ups')

  if (blockers.length) {
    return { status: 'blocked', summary: 'Stage movement is blocked until governed workflow requirements are cleared.', blockers, warnings, canMove: false }
  }
  if (warnings.length) {
    return { status: 'at_risk', summary: 'Stage movement is allowed, but operator attention is still required.', blockers, warnings, canMove: true }
  }
  return { status: 'ready', summary: 'Stage movement is ready under the current governed workflow.', blockers, warnings, canMove: true }
}
