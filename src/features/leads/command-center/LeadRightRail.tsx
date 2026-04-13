import type { ReactNode } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { LeadProfileSnapshot, NextActionSummary, QuoteFocusSummary } from './types'
import { getActionIcon, getStatusIcon, getUrgencyStatus, ICON_CONTAINER_CLASS } from './ui-system'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[12px] bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">{title}</p>
      {children}
    </section>
  )
}

export function LeadRightRail({
  nextAction,
  quoteFocus,
  compliance,
  workspaceLinks,
  onOpenNextAction,
  onOpenQuote,
}: {
  nextAction: NextActionSummary
  quoteFocus: QuoteFocusSummary
  compliance: LeadProfileSnapshot['compliance']
  workspaceLinks: LeadProfileSnapshot['links']
  onOpenNextAction: () => void
  onOpenQuote: () => void
}) {
  const NextIcon = getStatusIcon(getUrgencyStatus(nextAction.urgency))
  const OpenIcon = getActionIcon('open')

  return (
    <aside className="sticky top-[98px] space-y-4 self-start md:top-[108px]">
      <Card title="Next step">
        <div className="mt-3 flex items-start gap-3">
          <span className={ICON_CONTAINER_CLASS}><NextIcon className="h-4 w-4 text-neutral-600" /></span>
          <div>
            <h3 className="text-xl font-semibold leading-tight text-neutral-900">{nextAction.title}</h3>
            <p className="mt-2 text-sm leading-7 text-neutral-600">{nextAction.summary}</p>
          </div>
        </div>
        <button type="button" onClick={onOpenNextAction} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark">
          <span className={ICON_CONTAINER_CLASS}><OpenIcon className="h-4 w-4 text-neutral-900" /></span>
          {nextAction.primaryLabel}
        </button>
        {nextAction.dueAt ? <span className="mt-3 inline-flex rounded-full bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-600">Due {formatDate(nextAction.dueAt)}</span> : null}
      </Card>

      <Card title="Quote focus">
        <p className="mt-3 text-xl font-semibold text-neutral-900">{quoteFocus.quoteNumber || 'No quote yet'}</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {quoteFocus.hasActiveQuote
            ? `${quoteFocus.status || 'Draft'} · ${quoteFocus.pricingBasis?.replace(/_/g, ' ') || 'Pricing basis pending'}`
            : 'Create the first quote from here when the lead is commercially ready.'}
        </p>
        <button type="button" onClick={onOpenQuote} className={quoteFocus.hasActiveQuote ? 'mt-4 rounded-[8px] bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100' : 'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark'}>
          {quoteFocus.hasActiveQuote ? 'Review active quote' : 'Create quote'}
        </button>
      </Card>

      <Card title="Compliance summary">
        <p className="mt-3 text-xl font-semibold text-neutral-900">{compliance.blockerCount} blocker{compliance.blockerCount === 1 ? '' : 's'}</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {compliance.approvedDocumentCount} approved · {compliance.missingRequiredDocumentCount} missing required · {compliance.expiringDocumentCount} expiring soon.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <Link href={workspaceLinks.complianceWorkspace} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-700 transition hover:bg-neutral-50">
            Open compliance
          </Link>
          <Link href={workspaceLinks.documentsWorkspace} className="rounded-full bg-neutral-900 px-3 py-2 text-white transition hover:bg-neutral-800">
            Open documents
          </Link>
        </div>
      </Card>
    </aside>
  )
}
