'use client'

import Link from 'next/link'
import { cn, formatDate } from '@/lib/utils'
import type { TodayFilterKey, WorkspaceMode } from '@/features/workspace/types'
import { AlertTriangle, CalendarCheck, CheckCircle, Clock, ICON_CONTAINER_CLASS, Sparkles } from './ui-system'

export type LeadTodayContext = {
  mode: WorkspaceMode
  activeFilter: TodayFilterKey
  urgency: 'normal' | 'today' | 'overdue' | 'blocked'
  nextActionAt?: string | null
  nextActionLabel?: string | null
  blockedReason?: string | null
  backHref: string
  pipelineHref: string
  queueHref: string
}

function modeLabel(mode: WorkspaceMode) {
  if (mode === 'buyers') return 'Buyer mode'
  if (mode === 'suppliers') return 'Supplier mode'
  return 'All modes'
}

function filterLabel(filter: TodayFilterKey) {
  switch (filter) {
    case 'overdue':
      return 'Overdue queue'
    case 'due-today':
      return 'Due today'
    case 'waiting':
      return 'Waiting review'
    case 'blocked':
      return 'Blocked lane'
    case 'high-value':
      return 'High-value focus'
    case 'needs-reply':
      return 'Needs reply'
    case 'all-open':
    default:
      return 'Today context'
  }
}

function urgencyConfig(urgency: LeadTodayContext['urgency']) {
  switch (urgency) {
    case 'blocked':
      return {
        label: 'Blocked today',
        description: 'Clear the blocker before moving the deal forward.',
        icon: AlertTriangle,
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
      }
    case 'overdue':
      return {
        label: 'Overdue today',
        description: 'This lead needs action before it slips further.',
        icon: Clock,
        tone: 'border-rose-200 bg-rose-50 text-rose-900',
      }
    case 'today':
      return {
        label: 'Due today',
        description: 'This lead is already in today\'s working lane.',
        icon: CalendarCheck,
        tone: 'border-sky-200 bg-sky-50 text-sky-900',
      }
    case 'normal':
    default:
      return {
        label: 'On track',
        description: 'No immediate risk, but keep the next action visible.',
        icon: CheckCircle,
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      }
  }
}

export function LeadTodayContextBar({ todayContext }: { todayContext: LeadTodayContext }) {
  const urgency = urgencyConfig(todayContext.urgency)
  const UrgencyIcon = urgency.icon

  return (
    <section className="rounded-[12px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.95))] px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.03] md:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {modeLabel(todayContext.mode)}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {filterLabel(todayContext.activeFilter)}
            </span>
          </div>

          <div className="flex flex-wrap items-start gap-2.5">
            <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold', urgency.tone)}>
              <span className={ICON_CONTAINER_CLASS}><UrgencyIcon className="h-4 w-4" /></span>
              {urgency.label}
            </span>
            {todayContext.nextActionLabel ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                <span className={ICON_CONTAINER_CLASS}><Sparkles className="h-4 w-4 text-brand-primary" /></span>
                {todayContext.nextActionLabel}
                {todayContext.nextActionAt ? <span className="font-semibold text-slate-900">· {formatDate(todayContext.nextActionAt)}</span> : null}
              </span>
            ) : null}
          </div>

          <p className="text-sm text-slate-600">
            {todayContext.blockedReason
              ? `Current blocker: ${todayContext.blockedReason}.`
              : urgency.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link href={todayContext.backHref} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            Back to leads
          </Link>
          <Link href={todayContext.pipelineHref} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            Open pipeline
          </Link>
          <Link href={todayContext.queueHref} className="rounded-full bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-800">
            Open task queue
          </Link>
        </div>
      </div>
    </section>
  )
}
