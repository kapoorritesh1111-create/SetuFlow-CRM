'use client'

import { useState } from 'react'
import type { PipelineStageItem } from './types'

/**
 * PR03 spec match: .pipeline-strip from SetuFlow-Leads-Redesign_Updated.html
 *
 * Spec structure:
 *   horizontal flex of .ps-stage + .ps-arrow between each
 *   Each .ps-node has:
 *     .ps-node-dot  (10px circle)
 *     .ps-node-label (10px text below dot)
 *   States: .done (emerald) | .current (brand, glowing dot) | .upcoming (slate, clickable)
 *
 * Clicking an upcoming stage shows a confirm dialog inline.
 */

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
  const [busy, setBusy] = useState(false)
  const orderedStages = [...stages].sort((a, b) => a.position - b.position)
  const pendingStage = pendingStageId ? orderedStages.find((s) => s.id === pendingStageId) ?? null : null

  async function handleConfirm(stageId: string) {
    try {
      setBusy(true)
      await onConfirmStageChange(stageId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid #e2e8f0' }}>
      {/* Horizontal stage strip — matches spec .pipeline-strip */}
      <div style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        {orderedStages.map((stage, index) => {
          const isCurrent = stage.state === 'current'
          const isDone = stage.state === 'completed' || stage.state === 'won'
          const isLost = stage.state === 'lost'
          const isUpcoming = !isCurrent && !isDone && !isLost
          const isPending = stage.id === pendingStageId
          const clickable = stage.canMoveTo && isUpcoming

          // Dot colour per state
          const dotStyle: React.CSSProperties = isCurrent
            ? { background: '#0c7fff', boxShadow: '0 0 0 3px rgba(12,127,255,.2)' }
            : isDone
              ? { background: '#10b981' }
              : isLost
                ? { background: '#f43f5e' }
                : { background: '#cbd5e1' }

          // Label colour per state
          const labelColor = isCurrent ? '#0b2e4a' : isDone ? '#059669' : '#94a3b8'

          // Node background on current
          const nodeBg = isCurrent ? 'rgba(12,127,255,.1)' : isDone ? 'rgba(16,185,129,.08)' : 'transparent'

          return (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
              {/* Stage node */}
              <button
                type="button"
                onClick={() => {
                  if (!clickable) return
                  onStageSelect(stage.id)
                }}
                title={clickable ? `Move to ${stage.label}` : stage.label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  padding: '4px 10px', borderRadius: '6px', cursor: clickable ? 'pointer' : 'default',
                  background: isPending ? 'rgba(12,127,255,.12)' : nodeBg,
                  border: isPending ? '1px solid rgba(12,127,255,.3)' : '1px solid transparent',
                  minWidth: '80px', transition: 'background .12s',
                }}
                onMouseOver={(e) => { if (clickable) (e.currentTarget as HTMLElement).style.background = 'rgba(12,127,255,.06)'; }}
                onMouseOut={(e) => { if (clickable && !isPending) (e.currentTarget as HTMLElement).style.background = nodeBg; }}
              >
                {/* Dot */}
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', ...dotStyle }} />
                {/* Label */}
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.04em', textAlign: 'center', color: labelColor, lineHeight: 1.2 }}>
                  {isDone ? '✓ ' : ''}{stage.label}
                </div>
              </button>

              {/* Arrow connector */}
              {index < orderedStages.length - 1 ? (
                <div style={{ color: '#cbd5e1', fontSize: '16px', flexShrink: 0, margin: '0 2px', paddingBottom: '8px' }}>›</div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Stage confirmation panel */}
      {pendingStageId && pendingStage ? (
        <div style={{ margin: '0 22px 14px', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Move to {pendingStage.label}</p>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {pendingStage.entryHint?.trim() || 'Review requirements before confirming.'}
              </p>
              {!pendingStage.canMoveTo && pendingStage.blockedReason ? (
                <p style={{ fontSize: '11px', color: '#d97706', marginTop: '4px', fontWeight: 600 }}>{pendingStage.blockedReason}</p>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {pendingStage.canMoveTo ? (
                <button type="button" disabled={busy} onClick={() => void handleConfirm(pendingStage.id)}
                  style={{ padding: '7px 16px', borderRadius: '6px', background: '#0b2e4a', color: 'white', border: 'none', fontSize: '12px', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? 'Updating…' : 'Confirm stage change'}
                </button>
              ) : null}
              <button type="button" disabled={busy} onClick={() => { onCancelStageChange(); }}
                style={{ padding: '7px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
