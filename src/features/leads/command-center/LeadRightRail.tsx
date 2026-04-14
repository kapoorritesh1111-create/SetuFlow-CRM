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

function SignalRow({
  label,
  body,
  tone,
}: {
  label: string
  body: string
  tone: RailTone
}) {
  return (
    <div className={`rounded-[12px] border px-3.5 py-3 ${toneClasses(tone)}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{body}</p>
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

  return (
    <aside className="sticky top-[98px] space-y-4 self-start md:top-[108px]">
      <Card title="Passive support snapshot">
        <div className="mt-3 flex items-start gap-3">
          <span className={ICON_CONTAINER_CLASS}><NextIcon className="h-4 w-4 text-neutral-600" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-tight text-neutral-900">{nextAction.title}</h3>
            <p className="mt-2 text-sm leading-7 text-neutral-600">{nextAction.summary}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-neutral-600">
          {nextAction.dueAt ? <span className="rounded-full bg-neutral-50 px-3 py-2">Due {formatDate(nextAction.dueAt)}</span> : null}
          <button type="button" onClick={onOpenNextAction} className="rounded-full border border-neutral-200 bg-white px-3 py-2 transition hover:border-neutral-300 hover:bg-neutral-50">
            Inspect blocker
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <SignalRow
            label="Quote state"
            tone={quoteFocus.hasActiveQuote ? 'ready' : 'attention'}
            body={quoteFocus.hasActiveQuote
              ? `${quoteFocus.quoteNumber || 'Active quote'} is already in motion. Keep the main quote workspace in front and use this rail only as passive context.`
              : 'No quote exists yet. Create Quote remains the dominant move in the main workspace once the current blocker is clear.'}
          />
          <SignalRow
            label="Compliance guardrail"
            tone={complianceTone}
            body={compliance.blockerCount > 0
              ? `${compliance.blockerCount} blocker${compliance.blockerCount === 1 ? '' : 's'} still need clearance before the lead is fully safe for commercial motion.`
              : compliance.missingRequiredDocumentCount > 0 || compliance.expiringDocumentCount > 0
                ? `${compliance.missingRequiredDocumentCount} missing required and ${compliance.expiringDocumentCount} expiring soon stay visible as support context.`
                : 'Compliance is currently clear and no document issue is pulling attention away from the quote path.'}
          />
        </div>
      </Card>

      <Card title="Supporting workspaces">
        <p className="mt-3 text-sm leading-7 text-neutral-600">
          Open document or compliance detail only when a blocker actually needs inspection. The main Leads workspace remains the commercial control surface, and quote prep now owns the single blocker call.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <Link href={workspaceLinks.complianceWorkspace} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-700 transition hover:bg-neutral-50">
            Compliance
          </Link>
          <Link href={workspaceLinks.documentsWorkspace} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-700 transition hover:bg-neutral-50">
            Documents
          </Link>
        </div>
      </Card>
    </aside>
  )
}
