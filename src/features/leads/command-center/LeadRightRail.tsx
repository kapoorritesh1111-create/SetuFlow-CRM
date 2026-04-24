import type { ReactNode } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot, NextActionSummary, QuoteFocusSummary } from './types'
import { getStatusIcon, getUrgencyStatus, ICON_CONTAINER_CLASS } from './ui-system'

type RailTone = 'neutral' | 'ready' | 'attention' | 'blocked'

type QueueLead = {
  id: string
  companyName: string
  stageName?: string | null
  nextFollowUpAt?: string | null
}

function Card({ title, children, accent }: { title: string; children: ReactNode; accent?: RailTone }) {
  const accentClass = accent === 'blocked'
    ? 'border-l-4 border-l-status-blocked'
    : accent === 'attention'
      ? 'border-l-4 border-l-status-progress'
      : accent === 'ready'
        ? 'border-l-4 border-l-status-ready'
        : ''

  return (
    <section className={`rounded-[12px] border border-neutral-200/70 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)] ${accentClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{title}</p>
      {children}
    </section>
  )
}

function toneClasses(tone: RailTone) {
  if (tone === 'ready') return 'border-status-ready/15 bg-status-ready/8 text-status-ready'
  if (tone === 'blocked') return 'border-status-blocked/20 bg-status-blocked/8 text-status-blocked'
  if (tone === 'attention') return 'border-status-progress/25 bg-status-progress/10 text-amber-900'
  return 'border-neutral-200 bg-neutral-50 text-neutral-700'
}

function QueueDot({ tone }: { tone: RailTone }) {
  const dotClass = tone === 'blocked' ? 'bg-status-blocked' : tone === 'attention' ? 'bg-status-progress' : tone === 'ready' ? 'bg-status-ready' : 'bg-brand-primary'
  return <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`} />
}

function getQueueTone(item: QueueLead): RailTone {
  if (!item.nextFollowUpAt) return 'neutral'
  const due = new Date(item.nextFollowUpAt).getTime()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(startOfToday)
  endOfToday.setDate(endOfToday.getDate() + 1)
  if (due < startOfToday.getTime()) return 'blocked'
  if (due < endOfToday.getTime()) return 'attention'
  return 'ready'
}

function WatchSummaryRow({
  label,
  summary,
  tone,
}: {
  label: string
  summary: string
  tone: RailTone
}) {
  return (
    <div className={`rounded-[12px] border px-3.5 py-3 ${toneClasses(tone)}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{summary}</p>
    </div>
  )
}

function getComplianceTone(compliance: LeadProfileSnapshot['compliance']): RailTone {
  if (compliance.blockerCount > 0) return 'blocked'
  if (compliance.missingRequiredDocumentCount > 0 || compliance.expiringDocumentCount > 0) return 'attention'
  return 'ready'
}

export function LeadRightRail({
  nextAction,
  quoteFocus,
  compliance,
  workspaceLinks,
  leadQueue,
  backToQueueHref,
  pipelineHref,
  onOpenNextAction,
  onOpenLeadLog,
}: {
  nextAction: NextActionSummary
  quoteFocus: QuoteFocusSummary
  compliance: LeadProfileSnapshot['compliance']
  workspaceLinks: LeadProfileSnapshot['links']
  leadQueue?: {
    previous?: QueueLead | null
    next?: QueueLead | null
    hotList: QueueLead[]
  }
  backToQueueHref: string
  pipelineHref: string
  onOpenNextAction: () => void
  onOpenLeadLog: () => void
}) {
  const NextIcon = getStatusIcon(getUrgencyStatus(nextAction.urgency))
  const complianceTone = getComplianceTone(compliance)
  const priorityTone: RailTone = nextAction.urgency === 'OVERDUE' ? 'blocked' : nextAction.urgency === 'DUE' ? 'attention' : quoteFocus.hasActiveQuote ? 'ready' : 'attention'
  const priorityTitle = nextAction.urgency === 'OVERDUE' ? 'Follow-up overdue' : nextAction.title
  const complianceSummary = compliance.blockerCount > 0
    ? `${compliance.blockerCount} blocker${compliance.blockerCount === 1 ? '' : 's'} still affect quote motion.`
    : compliance.missingRequiredDocumentCount > 0 || compliance.expiringDocumentCount > 0
      ? `${compliance.missingRequiredDocumentCount} missing required · ${compliance.expiringDocumentCount} expiring soon.`
      : 'Compliance is currently clear.'

  return (
    <aside className="sticky top-[98px] space-y-4 self-start md:top-[108px]">
      <Card title="Priority action" accent={priorityTone}>
        <div className="mt-3 flex items-start gap-3">
          <span className={ICON_CONTAINER_CLASS}><NextIcon className="h-4 w-4 text-neutral-600" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-tight text-neutral-900">{priorityTitle}</h3>
            <p className="mt-2 text-sm leading-7 text-neutral-600">{nextAction.summary}</p>
          </div>
        </div>
        <button type="button" onClick={onOpenNextAction} className="mt-4 w-full rounded-full bg-brand-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          {nextAction.primaryLabel || 'Open action'}
        </button>
      </Card>

      <Card title="Lead queue">
        <h3 className="mt-2 text-lg font-semibold text-neutral-900">Hot list</h3>
        <div className="mt-3 space-y-2">
          {(leadQueue?.hotList ?? []).slice(0, 4).map((item) => (
            <Link key={item.id} href={`/leads/${item.id}`} className="flex items-start gap-2 rounded-[10px] border border-neutral-200/70 bg-neutral-50/80 px-3 py-2.5 text-sm transition hover:border-neutral-300 hover:bg-white">
              <QueueDot tone={getQueueTone(item)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-neutral-900">{item.companyName}</span>
                <span className="block text-xs text-neutral-500">{item.stageName ?? 'Stage not set'} · {formatDate(item.nextFollowUpAt) === '—' ? 'No follow-up' : formatDate(item.nextFollowUpAt)}</span>
              </span>
            </Link>
          ))}
          {!(leadQueue?.hotList ?? []).length ? <p className="rounded-[10px] bg-neutral-50 px-3 py-3 text-sm text-neutral-600">No nearby queue items found.</p> : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
          {leadQueue?.previous ? <Link href={`/leads/${leadQueue.previous.id}`} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-center text-neutral-700 hover:bg-neutral-50">Previous</Link> : null}
          {leadQueue?.next ? <Link href={`/leads/${leadQueue.next.id}`} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-center text-neutral-700 hover:bg-neutral-50">Next</Link> : null}
        </div>
        <Link href={backToQueueHref} className="mt-3 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
          Back to queue
        </Link>
      </Card>

      <Card title="Compliance">
        <h3 className="mt-2 text-lg font-semibold text-neutral-900">Gate status</h3>
        <div className="mt-3 space-y-2">
          <WatchSummaryRow label="Current gate" summary={complianceSummary} tone={complianceTone} />
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-neutral-600">
            <span className="rounded-[10px] bg-neutral-50 px-3 py-2">Approved {compliance.approvedDocumentCount}</span>
            <span className="rounded-[10px] bg-neutral-50 px-3 py-2">Total {compliance.totalDocumentCount}</span>
          </div>
        </div>
        <Link href={workspaceLinks.complianceWorkspace} className="mt-3 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
          View compliance
        </Link>
      </Card>

      <Card title="Quick links">
        <div className="mt-3 flex flex-col gap-2 text-sm font-semibold">
          <Link href={pipelineHref} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-700 transition hover:bg-neutral-50">View in pipeline</Link>
          <button type="button" onClick={onOpenLeadLog} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-left text-neutral-700 transition hover:bg-neutral-50">Lead log / activity</button>
          <Link href={workspaceLinks.documentsWorkspace} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-700 transition hover:bg-neutral-50">Share lead brief</Link>
        </div>
      </Card>
    </aside>
  )
}
