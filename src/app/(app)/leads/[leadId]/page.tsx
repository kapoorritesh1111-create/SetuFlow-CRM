import { EmptyState } from '@/components/ui/empty-state'
import { StateMessage } from '@/components/ui/state-message'
import { notFound, redirect } from 'next/navigation'
import { hasSupabaseEnv } from '@/lib/env'
import { getLeadProfileData } from '@/lib/queries/leads'
import { requireWorkspace } from '@/lib/workspace/auth'
import LeadDetailPremium from '@/features/leads/lead-detail/LeadDetailPremium'
import { toLeadProfileSnapshot } from '@/features/leads/command-center/adapters'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { parseWorkspaceMode } from '@/features/workspace/mode'
import { buildTodayLayerState } from '@/features/workspace/today'
import { getSetuNotificationFromAddress, sendTransactionalEmail } from '@/features/client-onboarding/server/notifications'

const BUYER_STAGE_FALLBACK = ['New Lead', 'Qualified', 'Contacted', 'Samples Sent', 'Negotiation', 'Won', 'Lost']
type LeadQueueRow = Pick<Database['public']['Tables']['leads']['Row'], 'id' | 'company_name' | 'next_follow_up_at' | 'updated_at' | 'stage_id' | 'lead_type'>
const SUPPLIER_STAGE_FALLBACK = ['New Supplier', 'Qualified', 'Sample Review', 'Compliance Review', 'Negotiation', 'Approved Supplier', 'Lost']

type LeadCommandRouteTab = 'workflow' | 'quotes' | 'activity'

function parseWorkspaceReturnTo(value: string | string[] | undefined, fallbackHref: string) {
  const requested = Array.isArray(value) ? value[0] : value
  const normalized = String(requested ?? '').trim()
  if (normalized.startsWith('/pipeline') || normalized === '/compliance' || normalized === '/documents' || normalized === '/contracts') return normalized
  return fallbackHref
}

function capturedRequestFromNotes(notes?: string | null) {
  const line = String(notes ?? '').split(/\n+/).map((item) => item.trim()).filter(Boolean).reverse().find((item) => /^(new buyer request|new supplier category|interested in products|interested in category|can supply products|can supply category):/i.test(item))
  return line?.replace(/^(new buyer request|new supplier category|interested in products|interested in category|can supply products|can supply category):\s*/i, '').trim() || ''
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

export async function sendLeadIntroEmailTest(formData: FormData) {
  'use server'
  const leadId = String(formData.get('lead_id') ?? '').trim()
  const workspace = await requireWorkspace()
  if (!workspace?.organization || !workspace?.user || !leadId) redirect('/leads?introEmail=missing-context')
  const supabase = (await createClient()) as any
  const { data: rawLead } = await supabase.from('leads').select('*').eq('organization_id', workspace.organization.id).eq('id', leadId).maybeSingle()
  const lead = rawLead as any
  if (!lead?.id || !lead?.email) redirect(`/leads/${leadId}?introEmail=missing-email`)
  const request = capturedRequestFromNotes(lead.notes)
  const eventName = lead.source_label || lead.source_type || 'the trade show'
  const subject = `Great meeting you at ${eventName}`
  const body = [`Hi ${lead.contact_name || lead.company_name || 'there'},`, '', `It was great meeting you at ${eventName}.`, request ? `I noted your interest in ${request}.` : 'I wanted to reconnect while the conversation is fresh.', '', 'Best regards'].join('\n')
  const from = getSetuNotificationFromAddress()
  if (!from) redirect(`/leads/${leadId}?introEmail=mailtrap-missing`)
  const delivery = await sendTransactionalEmail({ from, to: lead.email, subject, text: body, html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;white-space:pre-line">${escapeHtml(body)}</div>` })
  if (delivery.status !== 'email_sent') redirect(`/leads/${leadId}?introEmail=failed`)
  const nowIso = new Date().toISOString()
  await supabase.from('communications').insert({
    organization_id: workspace.organization.id,
    lead_id: lead.id,
    related_entity: 'lead',
    related_id: lead.id,
    direction: 'outbound',
    channel: 'email',
    communication_type: 'lead_capture_intro',
    subject,
    body,
    summary: 'Manual intro email test sent from lead detail.',
    status: 'sent',
    sent_at: nowIso,
    created_by: workspace.user.id,
    email_provider: 'mailtrap',
    email_delivery_status: 'sent',
    email_delivered_at: nowIso,
    draft_source: 'manual',
    metadata: { source: 'manual_intro_email_test', captured_request: request || null },
  })
  await supabase.from('leads').update({ intro_sent: true, last_contacted_at: nowIso }).eq('organization_id', workspace.organization.id).eq('id', lead.id)
  redirect(`/leads/${leadId}?introEmail=sent`)
}

export default async function Page({ params, searchParams }: { params: { leadId: string }, searchParams?: { mode?: string | string[]; tab?: string | string[]; returnTo?: string | string[]; handoff?: string | string[]; quoteId?: string | string[]; introEmail?: string | string[] } }) {
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
  const capturedRequest = capturedRequestFromNotes(data.lead.notes)
  const introEmailStatus = Array.isArray(searchParams?.introEmail) ? searchParams?.introEmail[0] : searchParams?.introEmail

  const requestedTab = parseLeadCommandTab(searchParams?.tab)
  const handoff = Array.isArray(searchParams?.handoff) ? searchParams?.handoff[0] ?? '' : searchParams?.handoff ?? ''
  const effectiveMode = requestedMode === 'all' ? (leadType === 'supplier' ? 'suppliers' : 'buyers') : requestedMode
  const returnToHref = parseWorkspaceReturnTo(searchParams?.returnTo, `/pipeline?mode=${effectiveMode}`)
  if (returnToHref === '/compliance') snapshot.links.complianceWorkspace = returnToHref
  if (returnToHref === '/documents') snapshot.links.documentsWorkspace = returnToHref
  if (returnToHref === '/contracts') snapshot.links.contractsWorkspace = returnToHref
  const pipelineHref = returnToHref.startsWith('/pipeline') ? returnToHref : `/pipeline?mode=${effectiveMode}`

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
    activities: data.activities.map((item) => ({ lead_id: item.lead_id ?? '', kind: item.kind ?? null, occurred_at: item.occurred_at ?? item.created_at ?? null })),
    complianceItems: data.complianceItems.map((item) => ({ lead_id: item.lead_id ?? '', status: item.status ?? null })),
  })

  const initialOpsHistory = data.communications
    .filter((item) => {
      const subject = String(item.subject ?? '').toLowerCase()
      return subject.includes('quote') || subject.includes('follow-up') || subject.includes('introduction') || subject.includes('approval')
    })
    .map((item) => {
      const statusTone: 'blue' | 'emerald' | 'amber' = item.subject?.toLowerCase().includes('approval') ? 'amber' : item.sent_at ? 'emerald' : 'blue'
      return { id: item.id, kind: subjectToKind(String(item.subject ?? '')), label: item.subject ?? 'Lead update', detail: item.summary ?? item.body ?? null, happenedAt: item.sent_at ?? item.approved_at ?? item.created_at ?? new Date().toISOString(), statusTone, quoteId: item.quote_id ?? null, quoteNumber: item.quote_id ? quoteNumbersById.get(item.quote_id) ?? null : null }
    })
    .sort((a, b) => String(b.happenedAt).localeCompare(String(a.happenedAt)))
    .slice(0, 8)

  return (
    <div className="space-y-4">
      {introEmailStatus ? <StateMessage title={introEmailStatus === 'sent' ? 'Intro email sent' : 'Intro email test needs attention'} description={introEmailStatus === 'sent' ? 'Mailtrap accepted the intro email and the communication row was saved as sent.' : introEmailStatus === 'missing-email' ? 'Add an email address to this lead before sending a test intro.' : introEmailStatus === 'mailtrap-missing' ? 'Mailtrap sender settings are missing in this environment.' : 'The intro email was not sent. Check Mailtrap configuration and try again.'} tone={introEmailStatus === 'sent' ? 'success' : 'warning'} /> : null}
      {capturedRequest ? <div className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-slate-700"><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Captured request</p><p className="mt-2 text-base font-semibold text-slate-950">New buyer request: {capturedRequest}</p><p className="mt-1 text-slate-600">Catalog mapping available after upgrade. The request remains visible on this lead until it is mapped.</p></div> : null}
      {handoff ? <StateMessage title={handoff === 'capture-converted' ? 'Capture handoff is complete' : handoff === 'quote-live-follow-up' ? 'Quote response work continues here' : handoff === 'quote-requalify' ? 'Quote decision now needs follow-up' : handoff === 'approval-send-fix-blocker' ? 'Sending blocker needs follow-up' : 'Workflow handoff is active'} description={handoff === 'capture-converted' ? 'This record was just created from Capture. Qualify it here first, then open Quote only when the commercial path is explicit.' : handoff === 'quote-live-follow-up' ? 'The quote is already live. Stay in this lead workflow to manage the buyer response and next commercial move.' : handoff === 'quote-requalify' ? 'This quote is no longer active. Make the next qualification or close decision here instead of lingering in Quote.' : handoff === 'approval-send-fix-blocker' ? 'Approvals & Sending found a blocker. Use this lead view to fix the missing context before another send attempt.' : 'The route transition preserved context so the next working step stays obvious.'} tone="success" /> : null}
      <LeadDetailPremium data={data} snapshot={snapshot} currentUserId={workspace.user?.id} />
    </div>
  )
}

async function getLeadQueueContext({ organizationId, currentLeadId, leadType, stageNameById }: { organizationId: string; currentLeadId: string; leadType: 'buyer' | 'supplier'; stageNameById: Map<string, string | null> }) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('leads').select('id, company_name, next_follow_up_at, updated_at, stage_id, lead_type').eq('organization_id', organizationId).eq('lead_type', leadType).order('updated_at', { ascending: false }).limit(80)
  const queueData: LeadQueueRow[] = (data ?? []) as LeadQueueRow[]
  if (error || !queueData.length) return { previous: null, next: null, hotList: [] }
  const sorted = [...queueData].sort((a, b) => { const aTime = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : Number.POSITIVE_INFINITY; const bTime = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : Number.POSITIVE_INFINITY; if (aTime !== bTime) return aTime - bTime; return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime() }).map((item) => ({ id: item.id, companyName: item.company_name ?? 'Untitled lead', stageName: item.stage_id ? stageNameById.get(item.stage_id) ?? null : null, nextFollowUpAt: item.next_follow_up_at ?? null }))
  const currentIndex = sorted.findIndex((item) => item.id === currentLeadId)
  const previous = currentIndex > 0 ? sorted[currentIndex - 1] : null
  const next = currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null
  const hotList = sorted.filter((item) => item.id !== currentLeadId).slice(0, 5)
  return { previous, next, hotList }
}

function subjectToKind(subject: string) { const normalized = subject.toLowerCase(); if (normalized.includes('approval')) return 'approval_request' as const; if (normalized.includes('quote')) return 'quote_ready' as const; return 'sent' as const }
function parseLeadCommandTab(value?: string | string[]): LeadCommandRouteTab { const candidate = Array.isArray(value) ? value[0] : value; if (candidate === 'quotes' || candidate === 'activity') return candidate; return 'workflow' }
