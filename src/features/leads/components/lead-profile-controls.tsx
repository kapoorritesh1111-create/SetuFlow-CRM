'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addLeadNote, completeLeadFollowUp, scheduleLeadFollowUp, updateLeadQualification } from '@/features/leads/server/actions'
import type { LeadQualificationStatus } from '@/lib/lead-workflow'

type ActionState = { error?: string; success?: string }

const QUALIFICATION_OPTIONS: Array<{ value: LeadQualificationStatus; label: string }> = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_review', label: 'In review' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'disqualified', label: 'Disqualified' },
]

function toLabel(value: string | null | undefined) {
  const text = String(value ?? '').trim()
  if (!text) return 'Not started'
  return text.replace(/_/g, ' ')
}

export function LeadProfileControls({
  leadId,
  pendingFollowUpId,
  qualificationStatus,
  qualificationNotes,
  linkedProductCount,
  linkedMarketCount,
}: {
  leadId: string
  pendingFollowUpId?: string | null
  qualificationStatus?: LeadQualificationStatus
  qualificationNotes?: string | null
  linkedProductCount?: number
  linkedMarketCount?: number
}) {
  const router = useRouter()
  const [followUpAt, setFollowUpAt] = useState('')
  const [followUpState, setFollowUpState] = useState<ActionState>({})
  const [followUpSaving, setFollowUpSaving] = useState(false)
  const [qualificationValue, setQualificationValue] = useState<LeadQualificationStatus>(qualificationStatus ?? 'not_started')
  const [qualificationText, setQualificationText] = useState(qualificationNotes ?? '')
  const [qualificationState, setQualificationState] = useState<ActionState>({})
  const [qualificationSaving, setQualificationSaving] = useState(false)
  const [noteState, setNoteState] = useState<ActionState>({})
  const [noteSaving, setNoteSaving] = useState(false)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canStartRfq = useMemo(() => qualificationValue === 'qualified' && Number(linkedProductCount ?? 0) > 0, [qualificationValue, linkedProductCount])

  useEffect(() => {
    setQualificationValue(qualificationStatus ?? 'not_started')
  }, [qualificationStatus])

  useEffect(() => {
    setQualificationText(qualificationNotes ?? '')
  }, [qualificationNotes])

  useEffect(() => () => {
    if (noteTimer.current) clearTimeout(noteTimer.current)
  }, [])

  const saveQualification = async (nextStatus: LeadQualificationStatus, nextNotes: string) => {
    setQualificationSaving(true)
    const formData = new FormData()
    formData.set('lead_id', leadId)
    formData.set('qualification_status', nextStatus)
    formData.set('qualification_notes', nextNotes)
    const result = await updateLeadQualification(undefined, formData)
    setQualificationState(result ?? {})
    setQualificationSaving(false)
    if (!result?.error) router.refresh()
  }

  const saveFollowUp = async (value: string) => {
    setFollowUpSaving(true)
    const formData = new FormData()
    formData.set('lead_id', leadId)
    formData.set('scheduled_at', value)
    const result = await scheduleLeadFollowUp(undefined, formData)
    setFollowUpState(result ?? {})
    setFollowUpSaving(false)
    if (!result?.error) router.refresh()
  }

  const completeLatest = async () => {
    if (!pendingFollowUpId) return
    setFollowUpSaving(true)
    const formData = new FormData()
    formData.set('lead_id', leadId)
    formData.set('follow_up_id', pendingFollowUpId)
    const result = await completeLeadFollowUp(undefined, formData)
    setFollowUpState(result ?? {})
    setFollowUpSaving(false)
    if (!result?.error) router.refresh()
  }

  const scheduleQualificationNotesSave = (nextStatus: LeadQualificationStatus, nextNotes: string) => {
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => {
      void saveQualification(nextStatus, nextNotes)
    }, 700)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="rounded-hero border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Schedule follow-up</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Changes save automatically. Pick the next action date and move on.</p>
          </div>
          {pendingFollowUpId ? (
            <button type="button" disabled={followUpSaving} onClick={() => void completeLatest()} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">Complete latest</button>
          ) : null}
        </div>
        <input
          value={followUpAt}
          onChange={(event) => {
            const value = event.target.value
            setFollowUpAt(value)
            if (value) void saveFollowUp(value)
          }}
          type="datetime-local"
          className="mt-4 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-3 text-sm text-slate-500">{followUpSaving ? 'Saving follow-up…' : followUpState.error ? followUpState.error : followUpState.success || 'Pick a date to auto-save the next step.'}</p>
      </section>

      <section className="rounded-hero border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Lead qualification</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Qualification updates are instant. Markets are optional context, not a blocker.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{toLabel(qualificationValue)}</span>
        </div>
        <div className="mt-4 space-y-3">
          <select
            name="qualification_status"
            value={qualificationValue}
            onChange={(event) => {
              const nextValue = event.target.value as LeadQualificationStatus
              setQualificationValue(nextValue)
              void saveQualification(nextValue, qualificationText)
            }}
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
          >
            {QUALIFICATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <textarea
            name="qualification_notes"
            rows={4}
            value={qualificationText}
            onChange={(event) => {
              const nextNotes = event.target.value
              setQualificationText(nextNotes)
              scheduleQualificationNotesSave(qualificationValue, nextNotes)
            }}
            onBlur={() => void saveQualification(qualificationValue, qualificationText)}
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Capture why this lead is qualified, in review, or disqualified."
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p><span className="font-medium text-slate-900">Commercial coverage:</span> {linkedProductCount ?? 0} linked products · {linkedMarketCount ?? 0} markets</p>
            <p className="mt-2">RFQ creation unlocks once the lead is qualified and at least one product is linked.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-500">{qualificationSaving ? 'Saving qualification…' : qualificationState.error ? qualificationState.error : qualificationState.success || 'Select a value to auto-save.'}</span>
          <Link href={canStartRfq ? `/leads/${leadId}/rfq/new` : '#'} aria-disabled={!canStartRfq} className={`rounded-full border px-4 py-2 text-sm font-medium ${canStartRfq ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : 'pointer-events-none border-slate-200 text-slate-400'}`}>Start RFQ</Link>
        </div>
      </section>

      <form
        className="rounded-hero border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault()
          setNoteSaving(true)
          const formData = new FormData(event.currentTarget)
          const result = await addLeadNote(undefined, formData)
          setNoteState(result ?? {})
          setNoteSaving(false)
          if (!result?.error) {
            event.currentTarget.reset()
            router.refresh()
          }
        }}
      >
        <input type="hidden" name="lead_id" value={leadId} />
        <h3 className="text-lg font-semibold text-slate-900">Add note</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">Keep richer call summaries and relationship context in the activity timeline.</p>
        <textarea name="note" rows={5} className="mt-4 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Write a note for the activity timeline and notes panel." />
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{noteState.error ? noteState.error : noteState.success || 'Notes still use a manual save so longer text is not saved accidentally.'}</p>
          <button type="submit" disabled={noteSaving} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{noteSaving ? 'Saving…' : 'Add note'}</button>
        </div>
      </form>
    </div>
  )
}
