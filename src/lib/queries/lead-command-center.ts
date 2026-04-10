import type { LeadProfileData } from '@/lib/queries/data'

export type GateStatus = 'CLEAR' | 'WARNING' | 'BLOCKED'
export type PricingReadiness = 'missing' | 'partial' | 'ready'
export type TaskUrgency = 'ON_TRACK' | 'DUE' | 'OVERDUE'
export type ReadinessStatus = 'not_ready' | 'at_risk' | 'ready'

export type ExplainableReadiness = {
  status: ReadinessStatus
  summary: string
  blockers: string[]
}

function byNewest<T>(items: T[], getDate: (item: T) => string | null | undefined) {
  return [...items].sort((a, b) => {
    const aTime = new Date(getDate(a) ?? 0).getTime()
    const bTime = new Date(getDate(b) ?? 0).getTime()
    return bTime - aTime
  })
}

export function getOwnerName(data: LeadProfileData) {
  const owner = data.profiles.find((profile) => profile.id === data.lead?.owner_user_id)
  return owner?.full_name?.trim() || owner?.username?.trim() || null
}

export function getCurrentStageName(data: LeadProfileData) {
  return data.stages.find((stage) => stage.id === data.lead?.stage_id)?.name ?? null
}

export function getPricingReadiness(data: LeadProfileData): PricingReadiness {
  const hasRules = data.pricingRules.length > 0
  const hasPrices = data.prices.length > 0
  const hasQuotedCommercials = data.rfqs.length > 0 || data.quotes.length > 0
  if ((hasRules || hasPrices) && hasQuotedCommercials) return 'ready'
  if (hasRules || hasPrices || hasQuotedCommercials) return 'partial'
  return 'missing'
}

export function getActivePricingBasis(data: LeadProfileData): 'EX_FACTORY' | 'FOB' | 'CIF' | null {
  const latestQuoteBasis = [...data.quotes]
    .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime())[0]
  const normalizedQuoteBasis = String((latestQuoteBasis as any)?.pricing_basis ?? '').trim().toUpperCase()
  if (normalizedQuoteBasis === 'CIF') return 'CIF'
  if (normalizedQuoteBasis === 'FOB') return 'FOB'
  if (normalizedQuoteBasis === 'EX_FACTORY') return 'EX_FACTORY'

  const normalized = data.pricingRules
    .map((rule) => String(rule.pricing_type ?? '').trim().toUpperCase())
    .filter(Boolean)
  if (normalized.includes('CIF')) return 'CIF'
  if (normalized.includes('FOB')) return 'FOB'
  if (normalized.includes('EX_FACTORY')) return 'EX_FACTORY'
  return null
}

export function getComplianceStatus(data: LeadProfileData) {
  const blockers: string[] = []
  const blockingItems = data.complianceItems.filter((item) => {
    const status = String(item.status ?? '').toLowerCase()
    const severity = String(item.severity ?? '').toLowerCase()
    return ['blocked', 'missing', 'rejected', 'overdue'].includes(status) || severity === 'high'
  })

  for (const item of blockingItems) {
    const definition = data.complianceDefinitions.find((definition) => definition.id === item.compliance_item_id)
    blockers.push(definition?.description ?? definition?.code ?? 'Compliance review required')
  }

  const missingRequiredDocs = data.documentRequirementRules.filter((rule) => {
    if (!rule.is_mandatory) return false
    const hasDoc = data.documents.some((document) => document.requirement_code && document.requirement_code === rule.requirement_code)
    return !hasDoc
  })

  for (const rule of missingRequiredDocs) blockers.push(`${rule.title} is missing`)

  const expiringDocs = data.documents.filter((document) => {
    if (!document.expires_at) return false
    const expiresAt = new Date(document.expires_at).getTime()
    const inThirtyDays = Date.now() + 1000 * 60 * 60 * 24 * 30
    return expiresAt <= inThirtyDays
  })

  const blockerCount = blockers.length
  const gate: GateStatus = blockerCount > 0 ? 'BLOCKED' : expiringDocs.length > 0 ? 'WARNING' : 'CLEAR'

  return {
    gate,
    blockerCount,
    blockers,
    missingRequiredDocumentCount: missingRequiredDocs.length,
    expiringDocumentCount: expiringDocs.length,
    approvedDocumentCount: data.documents.filter((item) => String(item.status ?? '').toLowerCase() === 'approved').length,
    totalDocumentCount: data.documents.length,
  }
}

export function getTaskStatus(data: LeadProfileData) {
  const now = Date.now()
  const openFollowUps = data.followUps.filter((item) => String(item.status ?? '').toLowerCase() !== 'completed')
  const overdueCount = openFollowUps.filter((item) => item.scheduled_at && new Date(item.scheduled_at).getTime() < now).length
  const dueSoonCount = openFollowUps.filter((item) => {
    if (!item.scheduled_at) return false
    const scheduled = new Date(item.scheduled_at).getTime()
    const soon = now + 1000 * 60 * 60 * 24 * 2
    return scheduled >= now && scheduled <= soon
  }).length
  const nextFollowUpAt = [...openFollowUps]
    .filter((item) => item.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime())[0]?.scheduled_at ?? data.lead?.next_follow_up_at ?? null

  const urgency: TaskUrgency = overdueCount > 0 ? 'OVERDUE' : dueSoonCount > 0 ? 'DUE' : 'ON_TRACK'

  return {
    urgency,
    openFollowUpCount: openFollowUps.length,
    overdueCount,
    dueSoonCount,
    nextFollowUpAt,
  }
}

export function getAiQueueStatus(data: LeadProfileData) {
  const aiDrafts = data.communications.filter((item) => item.draft_source)
  const pendingReviewCount = aiDrafts.filter((item) => !item.approved_at && !item.sent_at).length
  const readyDraftCount = aiDrafts.filter((item) => item.approved_at && !item.sent_at).length
  return {
    pendingReviewCount,
    readyDraftCount,
    totalDraftCount: aiDrafts.length,
  }
}

export function getQualificationState(data: LeadProfileData) {
  const workflow = data.workflow
  const missingFields: string[] = []
  if (!data.lead?.contact_name) missingFields.push('Primary contact')
  if (!data.lead?.email) missingFields.push('Email')
  if (!data.lead?.country && !data.lead?.country_id) missingFields.push('Country')
  if (!workflow.mappedProductIds.length) missingFields.push('Product mapping')

  return {
    status: workflow.qualificationStatus,
    notes: workflow.qualificationNotes,
    updatedAt: workflow.qualificationUpdatedAt,
    missingFields,
  }
}

export function getMappingState(data: LeadProfileData) {
  const workflow = data.workflow
  const mappedProductNames = workflow.mappedProductIds
    .map((productId) => data.products.find((product) => product.id === productId)?.name)
    .filter((value): value is string => Boolean(value))
  const mappedMarketNames = workflow.mappedMarketIds
    .map((marketId) => data.markets.find((market) => market.id === marketId)?.name)
    .filter((value): value is string => Boolean(value))

  return {
    productCount: workflow.mappedProductIds.length,
    marketCount: workflow.mappedMarketIds.length,
    isComplete: workflow.mappedProductIds.length > 0,
    productNames: mappedProductNames,
    marketNames: mappedMarketNames,
    status: workflow.productMappingStatus,
    notes: workflow.productMappingNotes,
  }
}

export function getStageProgressionReadiness(data: LeadProfileData): ExplainableReadiness {
  const blockers: string[] = []
  const qualification = getQualificationState(data)
  const mapping = getMappingState(data)
  const compliance = getComplianceStatus(data)
  const tasks = getTaskStatus(data)

  if (qualification.status !== 'qualified') blockers.push('Qualification is not approved')
  if (!mapping.isComplete) blockers.push('At least one product must be linked')
  if (compliance.gate === 'BLOCKED') blockers.push('Compliance blockers must be cleared')
  if (tasks.overdueCount > 0) blockers.push('There are overdue follow-ups')

  if (!blockers.length) return { status: 'ready', summary: 'Lead is ready for controlled stage progression.', blockers }
  if (blockers.length <= 2) return { status: 'at_risk', summary: 'Lead can progress soon, but a few conditions still need attention.', blockers }
  return { status: 'not_ready', summary: 'Lead is not ready to progress because the governed workflow is incomplete.', blockers }
}

export function getQuoteSendReadiness(data: LeadProfileData): ExplainableReadiness {
  const blockers: string[] = []
  const warnings: string[] = []
  const compliance = getComplianceStatus(data)
  const pricing = getPricingReadiness(data)
  const qualification = getQualificationState(data)
  const mapping = getMappingState(data)

  if (qualification.status !== 'qualified') blockers.push('Qualification must be approved before quote send')
  if (!mapping.isComplete) blockers.push('At least one product must be linked')
  if (!data.quotes.length) blockers.push('Quote draft does not exist')
  if (pricing === 'missing') blockers.push('Pricing is not commercially ready')
  if (compliance.gate === 'BLOCKED') blockers.push('Compliance is blocking quote send')
  if (!data.rfqs.length) warnings.push('No RFQ is linked yet; confirm quote context before send')

  if (!blockers.length && !warnings.length) return { status: 'ready', summary: 'Quote can move to review and send.', blockers }
  if (!blockers.length) return { status: 'at_risk', summary: 'Quote can move forward, but the commercial record still needs operator review.', blockers: warnings }
  if (blockers.length <= 2) return { status: 'at_risk', summary: 'Quote is close, but needs a small number of checks.', blockers }
  return { status: 'not_ready', summary: 'Quote send is blocked until the upstream conditions are complete.', blockers }
}

export function getContractHandoffReadiness(data: LeadProfileData): ExplainableReadiness {
  const blockers: string[] = []
  const compliance = getComplianceStatus(data)
  const latestQuote = byNewest(data.quotes, (item) => item.updated_at ?? item.created_at)[0]
  const hasAcceptedQuote = Boolean(latestQuote && ['accepted', 'approved'].includes(String(latestQuote.status ?? '').toLowerCase()))
  const hasContract = data.contracts.length > 0

  if (!hasAcceptedQuote) blockers.push('No accepted or approved quote is available for handoff')
  if (compliance.gate === 'BLOCKED') blockers.push('Compliance must be clear before contract handoff')
  if (hasContract) blockers.push('Contract handoff already started')

  if (!blockers.length) return { status: 'ready', summary: 'Lead is ready for contract handoff.', blockers }
  if (blockers.length === 1) return { status: 'at_risk', summary: 'Contract handoff is close but not yet fully clear.', blockers }
  return { status: 'not_ready', summary: 'Contract handoff is not yet ready.', blockers }
}

export function getActivityFeed(data: LeadProfileData) {
  const activity = data.activities.map((item) => ({
    id: `activity-${item.id}`,
    kind: 'activity',
    title: item.kind.replace(/_/g, ' '),
    detail: item.message,
    happenedAt: item.occurred_at,
  }))
  const stages = data.stageHistory.map((item) => ({
    id: `stage-${item.id}`,
    kind: 'stage',
    title: 'Stage changed',
    detail: item.note ?? 'Pipeline stage updated',
    happenedAt: item.changed_at,
  }))
  const communications = data.communications.map((item) => ({
    id: `comm-${item.id}`,
    kind: 'communication',
    title: item.subject?.trim() || item.communication_type?.replace(/_/g, ' ') || 'Communication',
    detail: item.summary?.trim() || item.body?.trim() || 'Communication recorded',
    happenedAt: item.sent_at ?? item.approved_at ?? item.created_at,
  }))

  return byNewest([...activity, ...stages, ...communications], (item) => item.happenedAt)
}
