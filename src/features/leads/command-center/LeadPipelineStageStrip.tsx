'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PipelineStageItem } from './types'
import { getStageAccent, getStageIcon, ICON_CONTAINER_CLASS } from './ui-system'

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function stageStatusLabel(stage: PipelineStageItem) {
  if (stage.state === 'current') return 'Current'
  if (stage.state === 'completed' || stage.state === 'won') return 'Done'
  if (!stage.canMoveTo) return 'Blocked'
  if (stage.state === 'lost') return 'Lost'
  return 'Available'
}

function stageStatusTone(stage: PipelineStageItem) {
  if (stage.state === 'current') return 'bg-brand-primary/10 text-brand-dark'
  if (stage.state === 'completed' || stage.state === 'won') return 'bg-status-ready/10 text-status-ready'
  if (stage.state === 'lost') return 'bg-stage-lost/10 text-stage-lost'
  if (!stage.canMoveTo) return 'bg-status-progress/15 text-amber-900'
  return 'bg-neutral-100 text-neutral-600'
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-neutral-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">{label}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-700">{value}</p>
    </div>
  )
}

export function LeadPipelineStageStrip({
  leadName,
  pipelineName,
  stages,
  currentStageLabel,
  pendingStageId,
  compact = false,
  onStageSelect,
  onConfirmStageChange,
  onCancelStageChange,
}: {
  leadName: string
  pipelineName: string
  stages: PipelineStageItem[]
  currentStageLabel?: string
  pendingStageId?: string | null
  compact?: boolean
  onStageSelect: (stageId: string) => void
  onConfirmStageChange: (stageId: string) => Promise<void> | void
  onCancelStageChange: () => void
}) {
  const [inspectedStageId, setInspectedStageId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (pendingStageId) {
      setInspectedStageId(pendingStageId)
      return
    }
    setInspectedStageId(null)
    setBusy(false)
  }, [pendingStageId])

  const orderedStages = useMemo(() => stages.slice().sort((a, b) => a.position - b.position), [stages])
  const currentStage = useMemo(() => orderedStages.find((stage) => stage.state === 'current') ?? orderedStages[0] ?? null, [orderedStages])
  const activeStage = useMemo(() => {
    if (!inspectedStageId) return null
    return orderedStages.find((stage) => stage.id === inspectedStageId) ?? null
  }, [inspectedStageId, orderedStages])
  const stickyStage = currentStage ?? activeStage
  const StickyStageIcon = getStageIcon(stickyStage?.label)

  async function confirmStageChange(stageId: string) {
    try {
      setBusy(true)
      await onConfirmStageChange(stageId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={compact ? 'space-y-2.5' : 'rounded-[12px] bg-white px-5 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)]'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {compact ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
              <span className="font-semibold text-neutral-900">{leadName}</span>
              <span className="text-neutral-300">/</span>
              <span className="truncate text-neutral-600">{pipelineName}</span>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">Pipeline</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
                <span className="font-semibold text-neutral-900">{pipelineName}</span>
                <span className="text-neutral-400">•</span>
                <span className="truncate text-neutral-600">{leadName}</span>
              </div>
            </>
          )}
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700">
          <span className={ICON_CONTAINER_CLASS}><StickyStageIcon className="h-3.5 w-3.5 text-neutral-600" /></span>
          {currentStageLabel ?? stickyStage?.label ?? 'Unknown'}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {orderedStages.map((stage, index) => {
          const StageIcon = getStageIcon(stage.label)
          const accent = getStageAccent(stage.label)
          const isCurrent = stage.state === 'current'
          const isPending = stage.id === pendingStageId
          const clickable = stage.canMoveTo && !isCurrent

          return (
            <div key={stage.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!clickable) return
                  setInspectedStageId(stage.id)
                  onStageSelect(stage.id)
                }}
                className={cn(
                  'group inline-flex items-center gap-2 rounded-full px-3 py-2 transition focus:outline-none focus:ring-2 focus:ring-brand-primary/25',
                  isCurrent && 'bg-white shadow-[0_4px_14px_rgba(15,23,42,0.10)]',
                  !isCurrent && 'bg-white/80',
                  clickable && 'hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]',
                  !clickable && 'cursor-default',
                  isPending && 'ring-2 ring-brand-primary/20'
                )}
                style={{ borderBottom: `2px solid ${accent}` }}
              >
                <span className={ICON_CONTAINER_CLASS}><StageIcon className="h-4 w-4 text-neutral-600" /></span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-neutral-900">{stage.label}</div>
                  <div className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${stageStatusTone(stage)}`}>
                    {stageStatusLabel(stage)}
                  </div>
                </div>
              </button>
              {index < orderedStages.length - 1 ? <div className="hidden h-px w-4 bg-neutral-200 lg:block" /> : null}
            </div>
          )
        })}
      </div>

      {pendingStageId && activeStage ? (
        <div className="rounded-[10px] bg-neutral-50 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={ICON_CONTAINER_CLASS}><StickyStageIcon className="h-4 w-4 text-neutral-600" /></span>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Move to {activeStage.label}</p>
                  <p className="text-xs text-neutral-600">Review the stage meaning before confirming the change.</p>
                </div>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${stageStatusTone(activeStage)}`}>{stageStatusLabel(activeStage)}</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <DetailBlock label="Before moving here" value={activeStage.entryHint?.trim() || 'Review the requirements and confirm the lead is ready before progressing.'} />
            <DetailBlock label="What this stage means" value={activeStage.exitHint?.trim() || 'This stage should map to a clear operator-visible commercial moment.'} />
          </div>

          {!activeStage.canMoveTo ? (
            <div className="mt-4 rounded-[8px] bg-status-progress/10 px-3 py-3 text-sm text-amber-900">
              {activeStage.blockedReason?.trim() || `This lead cannot move to ${activeStage.label} yet.`}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void confirmStageChange(activeStage.id)} className="rounded-[8px] bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? 'Updating stage…' : 'Confirm stage change'}
              </button>
              <button type="button" disabled={busy} onClick={() => { setInspectedStageId(null); onCancelStageChange() }} className="rounded-[8px] bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-soft disabled:opacity-60">
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
