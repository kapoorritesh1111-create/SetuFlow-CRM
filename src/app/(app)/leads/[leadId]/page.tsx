import { EmptyState } from '@/components/ui/empty-state'
import { notFound } from 'next/navigation'
import { hasSupabaseEnv } from '@/lib/env'
import { getLeadProfileData } from '@/lib/queries/leads'
import { requireWorkspace } from '@/lib/workspace/auth'
import LeadCommandCenterPage from '@/features/leads/command-center/LeadCommandCenterPage'
import { toLeadProfileSnapshot } from '@/features/leads/command-center/adapters'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { parseWorkspaceMode } from '@/features/workspace/mode'
import { buildTodayLayerState } from '@/features/workspace/today'

const BUYER_STAGE_FALLBACK = ['New Lead', 'Qualified', 'Contacted', 'Samples Sent', 'Negotiation', 'Won', 'Lost']
type LeadQueueRow = Pick<Database['public']['Tables']['leads']['Row'], 'id' | 'company_name' | 'next_follow_up_at' | 'updated_at' | 'stage_id' | 'lead_type'>
const SUPPLIER_STAGE_FALLBACK = ['New Supplier', 'Qualified', 'Sample Review', 'Compliance Review', 'Negotiation', 'Approved Supplier', 'Lost']

type LeadCommandRouteTab = 'workflow' | 'quotes' | 'activity'

function parseWorkspaceReturnTo(value: string | string[] | undefined, fallbackHref: string) {
  const requested = Array.isArray(value) ? value[0] : value;
  const normalized = String(requested ?? '').trim();
  if (normalized.startsWith('/pipeline') || normalized === '/compliance' || normalized === '/documents' || normalized === '/contracts') return normalized;
  return fallbackHref;
}

export default async function Page({ params, searchParams }: { params: { leadId: string }, searchParams?: { mode?: string | string[]; tab?: string | string[]; returnTo?: string | string[] } }) {
  let workspace: Awaited<ReturnType<typeof requireWorkspace>> | null = null

  try {
    workspace = await requireWorkspace()
  } catch {
    return (
      <EmptyState
        title="Workspace unavailable"
        description="We were unable to load your workspace. Please refresh or try again later."
      />
    )
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) {
    return (
      <EmptyState
        title="Configuration required"
        description="SETU Flow needs Supabase environment values. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your local or Vercel environment settings."
      />
    )
  }

  if (!workspace?.membership || !workspace?.organization) {
    return (
      <EmptyState
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded."
      />
    )
  }

  const data = await getLeadProfileData(workspace.organization.id, params.leadId)

  if (!data?.lead) {
    notFound()
  }

  const snapshot = toLeadProfileSnapshot(data)
  const leadType = data.lead.lead_type === 'supplier' ? 'supplier' : 'buyer'
  const requestedMode = parseWorkspaceMode(searchParams?.mode)

  const requestedTab = parseLeadCommandTab(searchParams?.tab)
  const effectiveMode = requestedMode === 'all' ? (leadType === 'supplier' ? 'suppliers' : 'buyers') : requestedMode
  const returnToHref = parseWorkspaceReturnTo(searchParams?.returnTo, `/pipeline?mode=${effectiveMode}`)
  if (returnToHref === '/compliance') snapshot.links.complianceWorkspace = returnToHref
  if (returnToHref === '/documents') snapshot.links.documentsWorkspace = returnToHref
  if (returnToHref === '/contracts') snapshot.links.contractsWorkspace = returnToHref
  const pipelineHref = returnToHref.startsWith('/pipeline') ? returnToHref : `/pipeline?mode=${effectiveMode}`
  const currentPipeline = data.pipelines.find((pipeline) => pipeline.id === data.lead?.pipeline_id)
    ?? data.pipelines.find((pipeline) => pipeline.lead_type === leadType || pipeline.lead_type === 'both')
    ?? null

  const pipelineStages = data.stages
    .filter((stage) => !currentPipeline || stage.pipeline_id === currentPipeline.id)
    .map((stage) => stage.name)
    .filter(Boolean)

  const fallbackStages = leadType === 'supplier' ? SUPPLIER_STAGE_FALLBACK : BUYER_STAGE_FALLBACK
  const selectedProductIds = data.linkedProducts.map((item) => item.id).filter(Boolean)
  const selectedMarketIds = data.linkedMarkets.map((item) => item.id).filter(Boolean)
  const latestQuote = [...data.quotes].sort((a, b) => String(b.updated_at ?? b.created_at ?? '').localeCompare(String(a.updated_at ?? a.created_at ?? '')))[0] ?? null
  const pendingFollowUp = [...data.followUps]
    .filter((item) => String(item.status ?? '').toLowerCase() !== 'completed')
    .sort((a, b) => new Date(a.scheduled_at ?? a.created_at ?? 0).getTime() - new Date(b.scheduled_at ?? b.created_at ?? 0).getTime())[0] ?? null
  const quoteNumbersById = new Map(data.quotes.map((quote) => [quote.id, quote.quote_number ?? null]))
  const aiReviewHref = `/ai-suggestions?leadId=${params.leadId}&status=generated`

  const leadQueue = await getLeadQueueContext({
    organizationId: workspace.organization.id,
    currentLeadId: params.leadId,
    leadType,
    stageNameById: new Map(data.stages.map((stage) => [stage.id, stage.name ?? null])),
  })

  const todayState = buildTodayLayerState({
    mode: effectiveMode,
    nowIso: new Date().toISOString(),
    leads: [{
      id: data.lead.id,
      company_name: data.lead.company_name ?? 'Untitled lead',
      lead_type: leadType,
      stage_id: data.lead.stage_id ?? null,
      next_follow_up_at: data.lead.next_follow_up_at ?? null,
      owner_user_id: data.lead.owner_user_id ?? null,
      deal_value: data.lead.deal_value ?? null,
      deal_currency: data.lead.deal_currency ?? null,
      updated_at: data.lead.updated_at ?? null,
      last_contacted_at: data.lead.last_contacted_at ?? null,
    }],
    activities: data.activities.map((item) => ({
      lead_id: item.lead_id ?? '',
      kind: item.kind ?? null,
      occurred_at: item.occurred_at ?? item.created_at ?? null,
    })),
    complianceItems: data.complianceItems.map((item) => ({
      lead_id: item.lead_id ?? '',
      status: item.status ?? null,
    })),
  })

  const initialOpsHistory = data.communications
    .filter((item) => {
      const subject = String(item.subject ?? '').toLowerCase()
      return subject.includes('quote') || subject.includes('follow-up') || subject.includes('introduction') || subject.includes('approval')
    })
    .map((item) => {
      const statusTone: 'blue' | 'emerald' | 'amber' = item.subject?.toLowerCase().includes('approval') ? 'amber' : item.sent_at ? 'emerald' : 'blue'

      return {
        id: item.id,
        kind: subjectToKind(String(item.subject ?? '')),
        label: item.subject ?? 'Lead update',
        detail: item.summary ?? item.body ?? null,
        happenedAt: item.sent_at ?? item.approved_at ?? item.created_at ?? new Date().toISOString(),
        statusTone,
        quoteId: item.quote_id ?? null,
        quoteNumber: item.quote_id ? quoteNumbersById.get(item.quote_id) ?? null : null,
      }
    })
    .sort((a, b) => String(b.happenedAt).localeCompare(String(a.happenedAt)))
    .slice(0, 8)

  return (
    <LeadCommandCenterPage
      snapshot={snapshot}
      availableProducts={data.products.map((product) => ({ id: product.id, name: product.name }))}
      availableMarkets={data.markets.map((market) => ({ id: market.id, name: market.name }))}
      selectedProductIds={selectedProductIds}
      selectedMarketIds={selectedMarketIds}
      initialOpsHistory={initialOpsHistory}
      latestQuoteId={latestQuote?.id ?? null}
      pendingFollowUpId={pendingFollowUp?.id ?? null}
      aiReviewHref={aiReviewHref}
      leadQueue={leadQueue}
      initialTab={requestedTab}
      todayContext={{
        mode: effectiveMode,
        activeFilter: todayState.activeFilter,
        urgency: todayState.items[0]?.urgency ?? 'normal',
        nextActionAt: snapshot.nextAction.dueAt ?? data.lead.next_follow_up_at ?? null,
        nextActionLabel: snapshot.nextAction.title,
        blockedReason: todayState.items[0]?.blockedReason ?? null,
        backHref: `/leads?mode=${effectiveMode}`,
        pipelineHref,
        queueHref: `/tasks?mode=${effectiveMode}`,
      }}
    />
  )
}

async function getLeadQueueContext({
  organizationId,
  currentLeadId,
  leadType,
  stageNameById,
}: {
  organizationId: string
  currentLeadId: string
  leadType: 'buyer' | 'supplier'
  stageNameById: Map<string, string | null>
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('id, company_name, next_follow_up_at, updated_at, stage_id, lead_type')
    .eq('organization_id', organizationId)
    .eq('lead_type', leadType)
    .order('updated_at', { ascending: false })
    .limit(80)

  const queueData: LeadQueueRow[] = (data ?? []) as LeadQueueRow[]

  if (error || !queueData.length) return { previous: null, next: null, hotList: [] }

  const sorted = [...queueData]
    .sort((a, b) => {
      const aTime = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : Number.POSITIVE_INFINITY
      const bTime = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : Number.POSITIVE_INFINITY
      if (aTime !== bTime) return aTime - bTime
      return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
    })
    .map((item) => ({
      id: item.id,
      companyName: item.company_name ?? 'Untitled lead',
      stageName: item.stage_id ? stageNameById.get(item.stage_id) ?? null : null,
      nextFollowUpAt: item.next_follow_up_at ?? null,
    }))

  const currentIndex = sorted.findIndex((item) => item.id === currentLeadId)
  const previous = currentIndex > 0 ? sorted[currentIndex - 1] : null
  const next = currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null
  const hotList = sorted.filter((item) => item.id !== currentLeadId).slice(0, 5)

  return { previous, next, hotList }
}

function subjectToKind(subject: string) {
  const normalized = subject.toLowerCase()
  if (normalized.includes('approval')) return 'approval_request' as const
  if (normalized.includes('quote')) return 'quote_ready' as const
  return 'sent' as const
}


function parseLeadCommandTab(value?: string | string[]): LeadCommandRouteTab {
  const candidate = Array.isArray(value) ? value[0] : value
  if (candidate === 'quotes' || candidate === 'activity') return candidate
  return 'workflow'
}
