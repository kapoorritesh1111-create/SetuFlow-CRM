export type StageMoveReadinessStatus = 'ready' | 'at_risk' | 'blocked'

export type StageMoveReadiness = {
  status: StageMoveReadinessStatus
  summary: string
  blockers: string[]
  warnings: string[]
  actionItems: string[]
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
  hasConfirmedProductInterest: boolean
  hasMarketCoverage: boolean
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
  if (input.currentStageOrder == null || input.targetStageOrder == null) return false
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

function pushAction(actions: string[], label: string) {
  if (!actions.includes(label)) actions.push(label)
}

export function buildStageMoveReadiness(input: StageMoveReadinessInput): StageMoveReadiness {
  const label = normalizeStageLabel(input.targetStageName)
  const blockers: string[] = []
  const warnings: string[] = []
  const actionItems: string[] = []

  if (isSameOrBackwardMove(input)) {
    return {
      status: 'ready',
      summary: 'Backward or same-stage moves remain available for operator correction.',
      blockers,
      warnings,
      actionItems: ['Review lead command center'],
      canMove: true,
    }
  }

  const quoteExecutionTarget = targetsQuoteExecution(label)
  const commercialCommitmentTarget = targetsCommercialCommitment(label, input)
  const highControlTarget = quoteExecutionTarget || commercialCommitmentTarget

  if (String(input.qualificationStatus ?? '').toLowerCase() !== 'qualified') {
    blockers.push('Qualification is not approved for forward pipeline movement')
    pushAction(actionItems, 'Approve qualification')
  }

  if (!input.hasConfirmedProductInterest) {
    blockers.push('Confirmed product linkage is required before the lead can move forward')
    pushAction(actionItems, 'Confirm product interest')
  }

  if (!input.hasMarketCoverage) {
    blockers.push('Market coverage is not complete for governed stage progression')
    pushAction(actionItems, 'Map market coverage')
  }

  if (input.complianceGate === 'BLOCKED') {
    blockers.push('Compliance blockers must be cleared before the next stage')
    pushAction(actionItems, 'Resolve compliance blockers')
  } else if (input.complianceGate === 'WARNING' && highControlTarget) {
    warnings.push('Compliance still needs an operator review before later-stage movement')
    pushAction(actionItems, 'Review compliance status')
  }

  if (quoteExecutionTarget) {
    if (input.pricingReadiness !== 'ready') {
      blockers.push('Pricing readiness is insufficient for quote-stage progression')
      pushAction(actionItems, 'Complete catalog pricing readiness')
    }
    if (input.quoteCount <= 0 && !label.includes('rfq')) {
      blockers.push('Quote draft does not exist for the target stage')
      pushAction(actionItems, 'Create quote draft')
    }
    if (input.rfqCount <= 0 && label.includes('quote')) {
      warnings.push('No RFQ is linked yet; confirm quote context before moving forward')
      pushAction(actionItems, 'Confirm RFQ context')
    }
  }

  if (commercialCommitmentTarget) {
    if (input.acceptedQuoteCount <= 0) {
      blockers.push('No approved or accepted quote is available for contract handoff')
      pushAction(actionItems, 'Secure approved quote')
    }
    if (input.contractCount > 0) {
      warnings.push('Contract handoff already started for this lead')
      pushAction(actionItems, 'Review contract handoff')
    }
  }

  if (input.overdueFollowUpCount > 0) {
    blockers.push('Overdue follow-ups must be cleared before forward stage movement')
    pushAction(actionItems, 'Complete overdue follow-up')
  }

  if (blockers.length) {
    return {
      status: 'blocked',
      summary: 'Stage movement is blocked until qualification, coverage, pricing, compliance, and follow-up controls are cleared.',
      blockers,
      warnings,
      actionItems,
      canMove: false,
    }
  }
  if (warnings.length) {
    return {
      status: 'at_risk',
      summary: 'Stage movement is allowed, but operator review is still required before progressing confidently.',
      blockers,
      warnings,
      actionItems: actionItems.length ? actionItems : ['Review lead command center'],
      canMove: true,
    }
  }
  return {
    status: 'ready',
    summary: 'Stage movement is ready under the current governed workflow.',
    blockers,
    warnings,
    actionItems: ['Advance stage'],
    canMove: true,
  }
}
