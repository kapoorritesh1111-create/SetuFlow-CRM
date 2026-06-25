import type { LeadProfileSnapshot, QuoteVersionTimelineItem } from '../types'
import { QuoteSummaryCard } from './QuoteSummaryCard'
import { QuoteMilestoneTimeline } from './QuoteMilestoneTimeline'
import { formatDate } from '@/lib/utils'

function statusLabel(value?: string | null) {
  return String(value || 'draft').replace(/_/g, ' ')
}

function approvalBadgeClasses(state: QuoteVersionTimelineItem['approvalState']) {
  if (state === 'approved') return 'border-teal-200 bg-teal-50 text-teal-800'
  if (state === 'pending') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (state === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-800'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function versionBadgeClasses(version: QuoteVersionTimelineItem) {
  const normalized = String(version.status ?? '').toLowerCase()
  if (version.isCurrent) return 'border-brand-primary/20 bg-brand-primary/5 text-brand-dark'
  if (version.isSent || normalized === 'sent' || normalized === 'viewed') return 'border-blue-200 bg-blue-50 text-blue-800'
  if (normalized === 'superseded') return 'border-slate-200 bg-slate-50 text-slate-500'
  if (normalized === 'accepted') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (normalized === 'rejected' || normalized === 'expired' || normalized === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-800'
  return 'border-slate-200 bg-white text-slate-700'
}

function QuoteVersionTimeline({ versions, onOpenQuote }: { versions: QuoteVersionTimelineItem[]; onOpenQuote: () => void }) {
  const sorted = [...versions].sort((left, right) => Number(right.versionNo ?? 0) - Number(left.versionNo ?? 0) || String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')))
  const currentVersion = sorted.find((item) => item.isCurrent) ?? sorted[0] ?? null
  const sentVersion = sorted.find((item) => item.isSent || item.sentAt) ?? null
  const approvalPendingCount = sorted.filter((item) => item.approvalState === 'pending').length

  return (
    <section className="premium-surface rounded-[12px] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Version timeline</p>
          <h3 className="mt-1 text-xl font-semibold text-neutral-900">Quote v1 / v2 history</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Parent quote status is derived by the database. Use this lane to see the current working version, the latest customer-facing version, and approval posture without rewriting history.
          </p>
        </div>
        <button type="button" onClick={onOpenQuote} className="rounded-[8px] bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
          {currentVersion ? 'Open current quote' : 'Create quote'}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[10px] bg-neutral-50 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Current working</p>
          <p className="mt-2 text-base font-semibold text-neutral-900">{currentVersion?.versionNo ? `v${currentVersion.versionNo}` : 'Not started'}</p>
          <p className="mt-1 text-xs text-neutral-500">{currentVersion ? statusLabel(currentVersion.status) : 'Create a governed draft first'}</p>
        </div>
        <div className="rounded-[10px] bg-neutral-50 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Customer-facing</p>
          <p className="mt-2 text-base font-semibold text-neutral-900">{sentVersion?.versionNo ? `v${sentVersion.versionNo}` : 'Not sent'}</p>
          <p className="mt-1 text-xs text-neutral-500">{sentVersion?.sentAt ? `Sent ${formatDate(sentVersion.sentAt)}` : 'No sent version yet'}</p>
        </div>
        <div className="rounded-[10px] bg-neutral-50 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Approvals</p>
          <p className="mt-2 text-base font-semibold text-neutral-900">{approvalPendingCount ? `${approvalPendingCount} pending` : 'No pending request'}</p>
          <p className="mt-1 text-xs text-neutral-500">Source of truth: approval_requests</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {sorted.length ? sorted.map((version) => (
          <article key={version.id} className={`rounded-[12px] border px-4 py-4 ${versionBadgeClasses(version)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold capitalize">v{version.versionNo ?? '—'} · {statusLabel(version.status)}</p>
                <p className="mt-1 text-xs opacity-75">Created {formatDate(version.createdAt)}{version.sentAt ? ` · Sent ${formatDate(version.sentAt)}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {version.isCurrent ? <span className="rounded-full border border-current/20 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">Current</span> : null}
                {version.isSent ? <span className="rounded-full border border-current/20 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">Latest sent</span> : null}
                {version.isAccepted ? <span className="rounded-full border border-current/20 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">Accepted</span> : null}
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${approvalBadgeClasses(version.approvalState)}`}>{version.approvalState === 'none' ? 'No approval request' : version.approvalState}</span>
              </div>
            </div>
            {version.approvalReason ? <p className="mt-3 text-sm opacity-80">Approval note: {version.approvalReason}</p> : null}
            {version.isCurrent && sentVersion && sentVersion.id !== version.id ? (
              <p className="mt-3 rounded-[10px] bg-white/65 px-3 py-2 text-xs font-medium opacity-80">
                This working version has not replaced customer-facing v{sentVersion.versionNo ?? '—'} yet. The older sent version is preserved until this version is sent.
              </p>
            ) : null}
          </article>
        )) : (
          <div className="rounded-[12px] border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
            No quote versions have been created yet.
          </div>
        )}
      </div>
    </section>
  )
}

export function QuotesTab({
  quoteFocus,
  commercial,
  activity,
  quoteVersions,
  onOpenQuote,
}: {
  quoteFocus: LeadProfileSnapshot['quoteFocus']
  commercial: LeadProfileSnapshot['commercial']
  activity: LeadProfileSnapshot['activity']
  quoteVersions: QuoteVersionTimelineItem[]
  onOpenQuote: () => void
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[12px] border border-neutral-200 bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Quote record</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Review the version timeline, approval posture, and current quote entry point from one premium lead detail surface.</p>
      </section>
      <QuoteSummaryCard quoteFocus={quoteFocus} commercial={commercial} onOpenQuote={onOpenQuote} />
      <QuoteVersionTimeline versions={quoteVersions} onOpenQuote={onOpenQuote} />
      <QuoteMilestoneTimeline activity={activity} />
    </div>
  )
}
