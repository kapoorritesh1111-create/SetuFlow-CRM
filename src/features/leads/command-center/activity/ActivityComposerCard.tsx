'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addLeadNote } from '@/features/leads/server/actions'
import { Edit3, ICON_CONTAINER_CLASS } from '../ui-system'

export function ActivityComposerCard({
  leadId,
  onAskAiSummary,
}: {
  leadId: string
  onAskAiSummary?: () => void
}) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <section className="premium-surface rounded-[12px] p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className={ICON_CONTAINER_CLASS}><Edit3 className="h-4 w-4 text-neutral-600" /></span>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Quick internal note</h3>
              <p className="text-sm text-neutral-600">Capture only the context that helps the next quote or follow-up decision.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !note.trim()}
            onClick={async () => {
              setPending(true)
              setMessage(null)
              const formData = new FormData()
              formData.set('lead_id', leadId)
              formData.set('note', note)
              const result = await addLeadNote(undefined, formData)
              setPending(false)
              setMessage(result?.error || result?.success || null)
              if (!result?.error) {
                setNote('')
                router.refresh()
              }
            }}
            className="rounded-[8px] bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save note'}
          </button>
          {onAskAiSummary ? <button type="button" onClick={onAskAiSummary} className="rounded-[8px] border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50">Use AI summary</button> : null}
        </div>
      </div>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className="mt-4 w-full rounded-[10px] border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm outline-none transition focus:border-brand-primary/30 focus:bg-white focus:ring-2 focus:ring-brand-primary/10" placeholder="Capture the note that should appear in the lead log." />
      {message ? <p className="mt-3 text-sm text-neutral-600">{message}</p> : null}
    </section>
  )
}
