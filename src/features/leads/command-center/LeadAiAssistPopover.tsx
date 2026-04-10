import Link from 'next/link'
import { GenerateLeadDraftControls } from '@/features/ai/components/ai-draft-controls'
import type { AiAssistSummary, NextActionSummary } from './types'

export function LeadAiAssistPopover({
  open,
  leadId,
  aiAssist,
  nextAction,
  reviewHref,
  onClose,
}: {
  open: boolean
  leadId: string
  aiAssist: AiAssistSummary
  nextAction?: NextActionSummary
  reviewHref: string
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-slate-950/20 p-4">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">AI assist</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Draft, summarize, and suggest without leaving the lead.</h3>
            {nextAction ? <p className="mt-2 text-sm text-slate-600">Current next action: {nextAction.title}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600">Close</button>
        </div>
        <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
          {aiAssist.pendingReviewCount} pending review · {aiAssist.readyDraftCount} ready drafts. AI stays assistive only.
        </div>
        <div className="mt-4">
          <GenerateLeadDraftControls leadId={leadId} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={reviewHref} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Open AI review queue</Link>
        </div>
      </div>
    </div>
  )
}
