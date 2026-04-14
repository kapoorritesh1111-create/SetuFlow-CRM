import type { ReactNode } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot, NextActionSummary, QuoteFocusSummary } from './types'
import { getStatusIcon, getUrgencyStatus, ICON_CONTAINER_CLASS } from './ui-system'

type RailTone = 'neutral' | 'ready' | 'attention' | 'blocked'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[12px] border border-neutral-200/70 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
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

function WatchlistDisclosure({
  label,
  tone,
  summary,
  children,
  buttonOpenLabel,
  buttonCloseLabel,
}: {
  label: string
  tone: RailTone
  summary: string
  children: ReactNode
  buttonOpenLabel: string
  buttonCloseLabel: string
}) {
  return (
    <details className="group rounded-[12px] border border-neutral-200/80 bg-white/90 p-3.5 shadow-soft">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <WatchSummaryRow label={label} summary={summary} tone={tone} />
        </div>
        <span className="mt-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600 transition group-open:bg-neutral-900 group-open:text-white">
          <span className="group-open:hidden">{buttonOpenLabel}</span>
          <span className="hidden group-open:inline">{buttonCloseLabel}</span>
        </span>
      </summary>
      <div className="mt-3 rounded-[12px] border border-neutral-200/80 bg-neutral-50/80 p-3.5 text-sm leading-7 text-neutral-600">
        {children}
      </div>
    </details>
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
  onOpenNextAction,
}: {
  nextAction: NextActionSummary
  quoteFocus: QuoteFocusSummary
  compliance: LeadProfileSnapshot['compliance']
  workspaceLinks: LeadProfileSnapshot['links']
  onOpenNextAction: () => void
}) {
  const NextIcon = getStatusIcon(getUrgencyStatus(nextAction.urgency))
  const complianceTone = getComplianceTone(compliance)
  const blockerSummary = nextAction.dueAt
    ? `${nextAction.title} · due ${formatDate(nextAction.dueAt)}`
    : nextAction.title
  const complianceSummary = compliance.blockerCount > 0
    ? `${compliance.blockerCount} blocker${compliance.blockerCount === 1 ? '' : 's'} still affect quote motion.`
    : compliance.missingRequiredDocumentCount > 0 || compliance.expiringDocumentCount > 0
      ? `${compliance.missingRequiredDocumentCount} missing required · ${compliance.expiringDocumentCount} expiring soon.`
      : 'Compliance is currently clear.'
  const workspaceSummary = quoteFocus.hasActiveQuote
    ? 'Open compliance or documents only when the current quote blocker needs inspection.'
    : 'Keep workspace links quiet until support work is actually needed for quote motion.'

  return (
    <aside className="sticky top-[98px] space-y-4 self-start md:top-[108px]">
      <Card title="Passive support watchlist">
        <div className="mt-3 flex items-start gap-3">
          <span className={ICON_CONTAINER_CLASS}><NextIcon className="h-4 w-4 text-neutral-600" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-tight text-neutral-900">Keep support visible without turning it into another work lane</h3>
            <p className="mt-2 text-sm leading-7 text-neutral-600">This rail now stays as a quiet watchlist. Quote prep and quote creation remain the commercial control surface, while blocker detail and support workspaces open only when deeper inspection is actually needed.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <WatchlistDisclosure
            label="Current blocker"
            tone={quoteFocus.hasActiveQuote ? 'ready' : 'attention'}
            summary={blockerSummary}
            buttonOpenLabel="Open"
            buttonCloseLabel="Hide"
          >
            <p>{nextAction.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-neutral-600">
              {nextAction.dueAt ? <span className="rounded-full bg-white px-3 py-2">Due {formatDate(nextAction.dueAt)}</span> : null}
              <button type="button" onClick={onOpenNextAction} className="rounded-full border border-neutral-200 bg-white px-3 py-2 transition hover:border-neutral-300 hover:bg-neutral-50">
                Inspect blocker
              </button>
            </div>
          </WatchlistDisclosure>

          <WatchSummaryRow label="Compliance watch" summary={complianceSummary} tone={complianceTone} />

          <WatchlistDisclosure
            label="Support workspaces"
            tone="neutral"
            summary={workspaceSummary}
            buttonOpenLabel="Open"
            buttonCloseLabel="Hide"
          >
            <p>Open document or compliance detail only when the current blocker needs deeper inspection. The main Leads workspace remains the commercial surface.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <Link href={workspaceLinks.complianceWorkspace} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-700 transition hover:bg-neutral-50">
                Compliance
              </Link>
              <Link href={workspaceLinks.documentsWorkspace} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-700 transition hover:bg-neutral-50">
                Documents
              </Link>
            </div>
          </WatchlistDisclosure>
        </div>
      </Card>
    </aside>
  )
}
