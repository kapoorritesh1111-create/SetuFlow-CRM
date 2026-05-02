'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeLeadFollowUp, scheduleLeadFollowUp } from '@/features/leads/server/actions'
import { GenerateLeadDraftControls } from '@/features/ai/components/ai-draft-controls'
import type { NextActionSummary } from '../../types'

export function FollowUpPanel({
  leadId,
  nextAction,
  pendingFollowUpId,
  onSaved,
}: {
  leadId: string
  nextAction: NextActionSummary
  pendingFollowUpId?: string | null
  onSaved?: (payload?: { nextFollowUpAt?: string | null; followUpId?: string | null }) => void
}) {
  const router = useRouter()
  const [scheduledAt, setScheduledAt] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <section className="premium-surface rounded-[12px] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Follow-up execution</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Keep follow-up inside workflow so the next communication is visible, reviewable, and not duplicated elsewhere.</p>
        </div>
        <div className="rounded-full bg-neutral-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Draft assist stays embedded</div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[10px] bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-900">{nextAction.title}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{nextAction.summary}</p>
          <input value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} type="datetime-local" className="mt-4 w-full rounded-[10px] border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-primary/30 focus:ring-2 focus:ring-brand-primary/10" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !scheduledAt}
              onClick={async () => {
                setPending(true)
                setMessage(null)
                const formData = new FormData()
                formData.set('lead_id', leadId)
                formData.set('scheduled_at', scheduledAt)
                const result = await scheduleLeadFollowUp(undefined, formData)
                setPending(false)
                setMessage(result?.error || result?.success || null)
                if (!result?.error) {
                  setScheduledAt('')
                  onSaved?.({ nextFollowUpAt: result?.nextFollowUpAt ?? scheduledAt, followUpId: result?.followUpId ?? null })
                  router.refresh()
                }
              }}
              className="rounded-[8px] bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save follow-up'}
            </button>
            {pendingFollowUpId ? (
              <button
                type="button"
                disabled={pending}
                onClick={async () => {
                  setPending(true)
                  setMessage(null)
                  const formData = new FormData()
                  formData.set('lead_id', leadId)
                  formData.set('follow_up_id', pendingFollowUpId)
                  const result = await completeLeadFollowUp(undefined, formData)
                  setPending(false)
                  setMessage(result?.error || result?.success || null)
                  if (!result?.error) {
                    onSaved?.()
                    router.refresh()
                  }
                }}
                className="rounded-[8px] bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] disabled:opacity-60"
              >
                Mark latest complete
              </button>
            ) : null}
          </div>
          {message ? <p className="mt-3 text-sm text-neutral-600">{message}</p> : null}
        </div>
        <div className="rounded-[10px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm font-semibold text-neutral-900">Draft assist</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Generate a follow-up, intro, or internal summary draft without opening a detached AI tab.</p>
          <div className="mt-4">
            <GenerateLeadDraftControls leadId={leadId} />
          </div>
        </div>
      </div>
    </section>
  )
}
