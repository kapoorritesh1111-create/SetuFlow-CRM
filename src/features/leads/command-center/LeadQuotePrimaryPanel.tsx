import { formatDate } from '@/lib/utils'
import type { GateStatus, LeadProfileSnapshot, PricingReadiness, WorkflowActionKey } from './types'
import { AlertTriangle, CheckCircle, Clock, ICON_CONTAINER_CLASS, getActionIcon } from './ui-system'

type ReadinessTone = 'ready' | 'attention' | 'blocked'

function rowStyles(tone: ReadinessTone) {
  if (tone === 'ready') {
    return {
      wrapper: 'border-emerald-200 bg-emerald-50/70',
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'Ready',
      Icon: CheckCircle,
    }
  }
  if (tone === 'blocked') {
    return {
      wrapper: 'border-amber-200 bg-amber-50/80',
      badge: 'bg-amber-100 text-amber-800',
      label: 'Blocked',
      Icon: AlertTriangle,
    }
  }
  return {
    wrapper: 'border-slate-200 bg-white',
    badge: 'bg-slate-100 text-slate-700',
    label: 'Needs attention',
    Icon: Clock,
  }
}

function ReadinessRow({
  title,
  body,
  tone,
}: {
  title: string
  body: string
  tone: ReadinessTone
}) {
  const styles = rowStyles(tone)
  return (
    <div className={`rounded-[14px] border p-4 ${styles.wrapper}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${styles.badge}`}>
          <span className={ICON_CONTAINER_CLASS}><styles.Icon className="h-3.5 w-3.5 text-current" /></span>
          {styles.label}
        </span>
      </div>
    </div>
  )
}

function getPanelCopy({
  hasActiveQuote,
  pricingReadiness,
  complianceGate,
}: {
  hasActiveQuote: boolean
  pricingReadiness: PricingReadiness
  complianceGate: GateStatus
}) {
  if (hasActiveQuote) {
    return {
      eyebrow: 'Primary commercial workspace',
      title: 'Continue the active quote',
      body: 'This lead already has a live commercial thread. Keep the quote moving and use the workflow below only as support.',
      cta: 'Continue quote',
    }
  }

  if (complianceGate === 'BLOCKED') {
    return {
      eyebrow: 'Primary commercial workspace',
      title: 'Create quote after blockers clear',
      body: 'Keep the quote path dominant, but clear blocking compliance conditions first so the first quote starts from a governed lead state.',
      cta: 'Create quote',
    }
  }

  if (pricingReadiness === 'ready') {
    return {
      eyebrow: 'Primary commercial workspace',
      title: 'Create the first quote',
      body: 'This lead has enough commercial context to move forward. Quote creation should stay above every other action on the page.',
      cta: 'Create quote',
    }
  }

  return {
    eyebrow: 'Primary commercial workspace',
    title: 'Prepare this lead for quote creation',
    body: 'The lead page should still point toward quoting first. Tighten the support checks below, then launch the first quote from here.',
    cta: 'Create quote',
  }
}

export function LeadQuotePrimaryPanel({
  snapshot,
  nextFollowUpAt,
  onOpenQuote,
  onOpenQualification,
  onOpenCoverage,
  onOpenFollowUp,
}: {
  snapshot: LeadProfileSnapshot
  nextFollowUpAt?: string | null
  onOpenQuote: () => void
  onOpenQualification: () => void
  onOpenCoverage: () => void
  onOpenFollowUp: () => void
}) {
  const quoteCopy = getPanelCopy({
    hasActiveQuote: snapshot.quoteFocus.hasActiveQuote,
    pricingReadiness: snapshot.pricingReadiness,
    complianceGate: snapshot.complianceGate,
  })
  const OpenIcon = getActionIcon('open')
  const helperMap: Record<WorkflowActionKey, { label: string; onClick: () => void }> = {
    qualification: { label: 'Open qualification', onClick: onOpenQualification },
    coverage: { label: 'Check coverage', onClick: onOpenCoverage },
    commercial: { label: 'Open workflow guidance', onClick: onOpenFollowUp },
    follow_up: { label: 'Open follow-up lane', onClick: onOpenFollowUp },
  }
  const helperAction = helperMap[snapshot.nextAction.workflowPanel]
  const qualificationTone: ReadinessTone = snapshot.qualification.status === 'qualified'
    ? 'ready'
    : snapshot.qualification.missingFields.length > 0
      ? 'attention'
      : 'attention'
  const coverageTone: ReadinessTone = snapshot.mapping.isComplete ? 'ready' : 'attention'
  const complianceTone: ReadinessTone = snapshot.complianceGate === 'CLEAR' ? 'ready' : snapshot.complianceGate === 'BLOCKED' ? 'blocked' : 'attention'
  const followUpTone: ReadinessTone = snapshot.tasks.overdueCount > 0 ? 'blocked' : snapshot.tasks.nextFollowUpAt ? 'ready' : 'attention'

  return (
    <section className="overflow-hidden rounded-[20px] border border-brand-primary/15 bg-[linear-gradient(135deg,rgba(31,72,124,0.05),rgba(53,159,145,0.06))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] md:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-dark">{quoteCopy.eyebrow}</p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 md:text-[2.35rem]">{quoteCopy.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700 md:text-[15px]">{quoteCopy.body}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onOpenQuote} className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-brand-primary px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(31,72,124,0.22)] transition hover:bg-brand-dark">
              <span className={ICON_CONTAINER_CLASS}><OpenIcon className="h-4 w-4 text-neutral-900" /></span>
              {quoteCopy.cta}
            </button>
            <button type="button" onClick={helperAction.onClick} className="inline-flex h-12 items-center rounded-[12px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              {helperAction.label}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
            <span className="rounded-full bg-white/90 px-3 py-1.5 shadow-soft">Flow: Capture → Lead → Quote → Order</span>
            <span className="rounded-full bg-white/90 px-3 py-1.5 shadow-soft">{snapshot.quoteFocus.hasActiveQuote ? `Active quote ${snapshot.quoteFocus.quoteNumber || snapshot.quoteFocus.status || 'in progress'}` : 'No quote exists yet'}</span>
            {snapshot.nextAction.dueAt ? <span className="rounded-full bg-white/90 px-3 py-1.5 shadow-soft">Next committed step due {formatDate(snapshot.nextAction.dueAt)}</span> : null}
          </div>
        </div>

        <div className="w-full max-w-xl space-y-3">
          <ReadinessRow
            title="Qualification"
            tone={qualificationTone}
            body={snapshot.qualification.status === 'qualified'
              ? 'Buyer fit is qualified and ready to support commercial quoting.'
              : snapshot.qualification.missingFields.length > 0
                ? `${snapshot.qualification.missingFields.length} qualification inputs still need attention before the lead feels complete.`
                : 'Qualification still needs a clear operator decision.'}
          />
          <ReadinessRow
            title="Coverage"
            tone={coverageTone}
            body={snapshot.mapping.isComplete
              ? `${snapshot.mapping.productCount} product${snapshot.mapping.productCount === 1 ? '' : 's'} and ${snapshot.mapping.marketCount} market${snapshot.mapping.marketCount === 1 ? '' : 's'} are mapped for the quote path.`
              : `Coverage is still light with ${snapshot.mapping.productCount} products and ${snapshot.mapping.marketCount} markets mapped.`}
          />
          <ReadinessRow
            title="Compliance"
            tone={complianceTone}
            body={snapshot.complianceGate === 'CLEAR'
              ? 'No blocking compliance condition is stopping commercial movement.'
              : snapshot.complianceGate === 'BLOCKED'
                ? `${snapshot.compliance.blockerCount} blocker${snapshot.compliance.blockerCount === 1 ? '' : 's'} need to clear before commercial movement feels safe.`
                : 'Compliance is being watched and should stay visible while the lead moves toward quote.'}
          />
          <ReadinessRow
            title="Next follow-up"
            tone={followUpTone}
            body={snapshot.tasks.overdueCount > 0
              ? `${snapshot.tasks.overdueCount} overdue follow-up${snapshot.tasks.overdueCount === 1 ? '' : 's'} are pulling attention away from the quote path.`
              : nextFollowUpAt
                ? `Next follow-up is scheduled for ${formatDate(nextFollowUpAt)} so the rep can keep the thread moving.`
                : 'No follow-up is scheduled yet. Keep the next communication visible around the quote motion.'}
          />
        </div>
      </div>
    </section>
  )
}
