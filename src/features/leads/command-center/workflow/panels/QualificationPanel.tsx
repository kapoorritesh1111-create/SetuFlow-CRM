'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateLeadQualification } from '@/features/leads/server/actions'
import type { LeadProfileSnapshot } from '../../types'
import type { LeadQualificationStatus } from '@/lib/lead-workflow'

const OPTIONS: Array<{ value: LeadQualificationStatus; label: string }> = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_review', label: 'In review' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'disqualified', label: 'Disqualified' },
]

export function QualificationPanel({
  leadId,
  qualification,
  onSaved,
}: {
  leadId: string
  qualification: LeadProfileSnapshot['qualification']
  onSaved?: () => void
}) {
  const router = useRouter()
  const [status, setStatus] = useState<LeadQualificationStatus>(qualification.status)
  const [notes, setNotes] = useState(qualification.notes ?? '')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setStatus(qualification.status)
    setNotes(qualification.notes ?? '')
  }, [qualification.notes, qualification.status])

  return (
    <section className="premium-surface rounded-[12px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Lead qualification</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Keep buyer fit and operator context current before pushing downstream commercial work.</p>
        </div>
        <span className="rounded-full bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-700">{qualification.missingFields.length} missing</span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-3">
          <select value={status} onChange={(event) => setStatus(event.target.value as LeadQualificationStatus)} className="w-full rounded-[10px] border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-primary/30 focus:ring-2 focus:ring-brand-primary/10">
            {OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="rounded-[10px] bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-600">
            {qualification.missingFields.length ? qualification.missingFields.join(' · ') : 'No missing qualification inputs are currently surfaced.'}
          </div>
        </div>
        <div>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="w-full rounded-[10px] border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm outline-none focus:border-brand-primary/30 focus:bg-white focus:ring-2 focus:ring-brand-primary/10" placeholder="Capture why this lead is qualified, in review, or disqualified." />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                setPending(true)
                setMessage(null)
                const formData = new FormData()
                formData.set('lead_id', leadId)
                formData.set('qualification_status', status)
                formData.set('qualification_notes', notes)
                const result = await updateLeadQualification(undefined, formData)
                setPending(false)
                setMessage(result?.error || result?.success || null)
                if (!result?.error) {
                  onSaved?.()
                  router.refresh()
                }
              }}
              className="rounded-[8px] bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save qualification'}
            </button>
          </div>
          {message ? <p className="mt-3 text-sm text-neutral-600">{message}</p> : null}
        </div>
      </div>
    </section>
  )
}
