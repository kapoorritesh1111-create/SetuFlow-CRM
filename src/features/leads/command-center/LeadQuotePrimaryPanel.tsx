import { formatDate } from '@/lib/utils'
import type { GateStatus, LeadProfileSnapshot, PricingReadiness, WorkflowActionKey } from './types'
import { AlertTriangle, CheckCircle, Clock, ICON_CONTAINER_CLASS, getActionIcon } from './ui-system'

type ReadinessTone = 'ready' | 'attention' | 'blocked'

type SupportException = {
  key: WorkflowActionKey
  title: string
  body: string
  tone: Exclude<ReadinessTone, 'ready'>
}

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

function decisionStyles(tone: ReadinessTone) {
  if (tone === 'ready') {
    return {
      wrapper: 'border-emerald-200/80 bg-white',
      accent: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'Quote direction clear',
      Icon: CheckCircle,
    }
  }
  if (tone === 'blocked') {
    return {
      wrapper: 'border-amber-200 bg-amber-50/70',
      accent: 'text-amber-900',
      badge: 'bg-amber-100 text-amber-800',
      label: 'Support blocker active',
      Icon: AlertTriangle,
    }
  }
  return {
    wrapper: 'border-slate-200 bg-white',
    accent: 'text-slate-900',
    badge: 'bg-slate-100 text-slate-700',
    label: 'Quote prep in progress',
    Icon: Clock,
  }
}

function SupportExceptionRow({
  title,
  body,
  tone,
  actionLabel,
  onClick,
}: {
  title: string
  body: string
  tone: Exclude<ReadinessTone, 'ready'>
  actionLabel?: string
  onClick?: () => void
}) {
  const styles = rowStyles(tone)
  return (
    <div className={`rounded-[14px] border p-4 ${styles.wrapper}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${styles.badge}`}>
              <span className={ICON_CONTAINER_CLASS}><styles.Icon className="h-3.5 w-3.5 text-current" /></span>
              {styles.label}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        </div>
        {actionLabel && onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="inline-flex h-10 shrink-0 items-center rounded-[12px] border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {actionLabel}
          </button>
        ) : null}
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

function buildSupportExceptions({
  snapshot,
  nextFollowUpAt,
}: {
  snapshot: LeadProfileSnapshot
  nextFollowUpAt?: string | null
}): SupportException[] {
  const exceptions: SupportException[] = []

  if (snapshot.complianceGate === 'BLOCKED') {
    exceptions.push({
      key: 'commercial',
      title: 'Compliance is actively blocking quote motion',
      body: `${snapshot.compliance.blockerCount} blocker${snapshot.compliance.blockerCount === 1 ? '' : 's'} need to clear before commercial movement feels safe.`,
      tone: 'blocked',
    })
  } else if (snapshot.complianceGate === 'WARNING') {
    exceptions.push({
      key: 'commercial',
      title: 'Compliance still needs a visible operator check',
      body: snapshot.compliance.blockers[0] ?? 'Compliance should stay visible while the lead moves toward quote.',
      tone: 'attention',
    })
  }

  if (snapshot.qualification.status !== 'qualified') {
    exceptions.push({
      key: 'qualification',
      title: 'Qualification still needs a clear decision',
      body: snapshot.qualification.missingFields.length > 0
        ? `${snapshot.qualification.missingFields.length} qualification inputs still need attention before the lead feels complete.`
        : 'Qualification still needs a clear operator decision before the quote path feels trusted.',
      tone: 'attention',
    })
  }

  if (!snapshot.mapping.isComplete) {
    exceptions.push({
      key: 'coverage',
      title: 'Coverage is still thin for the quote path',
      body: `Coverage is still light with ${snapshot.mapping.productCount} product${snapshot.mapping.productCount === 1 ? '' : 's'} and ${snapshot.mapping.marketCount} market${snapshot.mapping.marketCount === 1 ? '' : 's'} mapped.`,
      tone: 'attention',
    })
  }

  if (snapshot.tasks.overdueCount > 0) {
    exceptions.push({
      key: 'follow_up',
      title: 'Follow-up drift is pulling the lead off the quote path',
      body: `${snapshot.tasks.overdueCount} overdue follow-up${snapshot.tasks.overdueCount === 1 ? '' : 's'} still need attention so the commercial thread does not stall.`,
      tone: 'blocked',
    })
  } else if (!snapshot.quoteFocus.hasActiveQuote && !nextFollowUpAt && !snapshot.tasks.nextFollowUpAt) {
    exceptions.push({
      key: 'follow_up',
      title: 'No next follow-up is committed yet',
      body: 'Set the next communication step so quote preparation keeps visible momentum instead of going quiet.',
      tone: 'attention',
    })
  }

  return exceptions
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
  const supportExceptions = buildSupportExceptions({ snapshot, nextFollowUpAt })
  const primaryException = supportExceptions[0]
  const remainingExceptions = supportExceptions.slice(1)
  const commercialDecisionTone: ReadinessTone = snapshot.quoteFocus.hasActiveQuote
    ? 'ready'
    : primaryException?.tone === 'blocked'
      ? 'blocked'
      : snapshot.pricingReadiness === 'ready' && supportExceptions.length === 0
        ? 'ready'
        : 'attention'
  const commercialDecisionTitle = snapshot.quoteFocus.hasActiveQuote
    ? `Quote ${snapshot.quoteFocus.quoteNumber || snapshot.quoteFocus.status || 'in progress'} is the active commercial move`
    : commercialDecisionTone === 'ready'
      ? 'This lead is ready for the first quote'
      : commercialDecisionTone === 'blocked'
        ? 'Quote direction is still clear, but one support blocker is in the way'
        : 'Quote prep stays the next commercial move'
  const commercialDecisionBody = snapshot.quoteFocus.hasActiveQuote
    ? 'Keep the active quote moving and treat every other workflow action as support around that commercial thread.'
    : commercialDecisionTone === 'ready'
      ? 'Commercial direction is now decisive: create the first quote from here and use the support lane only if something newly blocks motion.'
      : commercialDecisionTone === 'blocked'
        ? 'Do not let the page split into competing workstreams. Clear the current blocker, then return directly to quote creation.'
        : 'This lead still needs a small amount of support work, but the page should keep pointing back to quote creation rather than equal-weight readiness tracking.'
  const decisionToneStyles = decisionStyles(commercialDecisionTone)
  const primaryExceptionAction = primaryException ? helperMap[primaryException.key] : null

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
            <button type="button" onClick={(primaryExceptionAction ?? helperAction).onClick} className="inline-flex h-12 items-center rounded-[12px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              {(primaryExceptionAction ?? helperAction).label}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
            <span className="rounded-full bg-white/90 px-3 py-1.5 shadow-soft">Flow: Capture → Lead → Quote → Order</span>
            <span className="rounded-full bg-white/90 px-3 py-1.5 shadow-soft">{snapshot.quoteFocus.hasActiveQuote ? `Active quote ${snapshot.quoteFocus.quoteNumber || snapshot.quoteFocus.status || 'in progress'}` : 'No quote exists yet'}</span>
            <span className="rounded-full bg-white/90 px-3 py-1.5 shadow-soft">{snapshot.quoteFocus.hasActiveQuote ? 'Commercial direction: continue quote' : commercialDecisionTone === 'ready' ? 'Commercial direction: create first quote' : 'Commercial direction: quote prep, then create quote'}</span>
            {snapshot.nextAction.dueAt ? <span className="rounded-full bg-white/90 px-3 py-1.5 shadow-soft">Next committed step due {formatDate(snapshot.nextAction.dueAt)}</span> : null}
          </div>
        </div>

        <div className="w-full max-w-xl space-y-3">
          <div className={`rounded-[18px] border p-5 shadow-soft ${decisionToneStyles.wrapper}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Commercial state</p>
                <h3 className={`mt-2 text-lg font-semibold ${decisionToneStyles.accent}`}>{commercialDecisionTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{commercialDecisionBody}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${decisionToneStyles.badge}`}>
                <span className={ICON_CONTAINER_CLASS}><decisionToneStyles.Icon className="h-3.5 w-3.5 text-current" /></span>
                {decisionToneStyles.label}
              </span>
            </div>
          </div>

          {primaryException ? (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-slate-200/80 bg-white/90 p-4 shadow-soft">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Current support exception</p>
                <p className="mt-2 text-sm text-slate-600">Only the support work still affecting quote motion stays visible here. Everything else remains secondary below the fold.</p>
              </div>
              <SupportExceptionRow
                title={primaryException.title}
                body={primaryException.body}
                tone={primaryException.tone}
                actionLabel={primaryExceptionAction?.label}
                onClick={primaryExceptionAction?.onClick}
              />
            </div>
          ) : (
            <div className="rounded-[18px] border border-emerald-200 bg-emerald-50/70 p-4 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Support lane</p>
              <p className="mt-2 text-sm font-semibold text-emerald-900">No active support exception is competing with quote motion right now.</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">Use the lower quote-prep lane only for optional verification or future blockers. The commercial move stays decisively pointed at the quote.</p>
            </div>
          )}

          {remainingExceptions.length ? (
            <div className="rounded-[18px] border border-slate-200/80 bg-white/90 p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Remaining support queue</p>
                  <p className="mt-2 text-sm text-slate-600">Supporting exceptions stay visible, but only after the primary blocker so they do not compete with the commercial move.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{remainingExceptions.length} waiting</span>
              </div>
              <div className="mt-3 space-y-3">
                {remainingExceptions.map((exception) => {
                  const action = helperMap[exception.key]
                  return (
                    <SupportExceptionRow
                      key={`${exception.key}-${exception.title}`}
                      title={exception.title}
                      body={exception.body}
                      tone={exception.tone}
                      actionLabel={action.label}
                      onClick={action.onClick}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
