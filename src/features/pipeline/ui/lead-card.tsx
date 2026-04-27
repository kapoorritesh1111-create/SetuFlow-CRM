'use client';

import { type KeyboardEvent, type MouseEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFollowUpLabel } from '@/lib/lead-status';
import { navigateToLeadCommandCenter } from '@/lib/lead-command-center-navigation';
import { getPipelineStageActionLabel } from '@/features/pipeline/logic/board';
import type { LeadCardProps } from '@/features/pipeline/types/board';

function shouldIgnoreTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, select, textarea, label, a'));
}

function countryCodeToFlag(code?: string | null) {
  if (!code) return '◎';
  const c = code.trim().slice(0, 2).toUpperCase();
  if (c.length !== 2) return '◎';
  return String.fromCodePoint(...c.split('').map((ch) => 127397 + ch.charCodeAt(0)));
}

function getCardAccent(health: string, followUpState: string) {
  if (followUpState === 'overdue') return { border: '#e11d48', label: `⚠ Overdue`, badge: { bg: '#fef2f2', border: '#fecaca', color: '#9f1239' } };
  if (health.includes('at_risk')) return { border: '#d97706', label: '⚡ At risk', badge: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' } };
  if (health.includes('stalled') || health.includes('cold')) return { border: '#94a3b8', label: '❄ Stalled', badge: { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' } };
  return { border: '#059669', label: '✓ Healthy', badge: { bg: '#f0fdf4', border: '#a7f3d0', color: '#15803d' } };
}

function getMoveBadge(status: string) {
  if (status === 'blocked') return { label: 'Move blocked', bg: '#fff1f2', border: '#fecaca', color: '#9f1239' };
  if (status === 'at_risk') return { label: 'Move guarded', bg: '#fffbeb', border: '#fde68a', color: '#92400e' };
  return { label: 'Move ready', bg: '#f0fdf4', border: '#a7f3d0', color: '#15803d' };
}

export function LeadCard({
  canManageLeads,
  readOnlyMessage,
  lead,
  stageLabel,
  state,
  history,
  handleMove,
  handleAddNote,
  handleScheduleFollowUp,
  isPending,
  commandCenterHref,
  setDraggedLeadId,
  setDragOverStageId,
  health,
  ownerLabel,
  moveReadiness,
  moveOptions,
  countryCode,
  isSelected = false,
  onSelectedChange,
  onOpenDetail,
}: LeadCardProps & { onOpenDetail?: (leadId: string) => void }) {
  const router = useRouter();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const accent = getCardAccent(health, state);
  const moveBadge = getMoveBadge(moveReadiness.status);

  const currentSortOrder = moveOptions.find((o) => o.stageId === lead.stage_id)?.sortOrder ?? 0;
  const quickMove = moveOptions
    .filter((o) => o.stageId !== lead.stage_id && !o.disabled)
    .sort((a, b) => {
      const aFwd = a.sortOrder > currentSortOrder ? 0 : 1000;
      const bFwd = b.sortOrder > currentSortOrder ? 0 : 1000;
      return (aFwd + Math.abs(a.sortOrder - currentSortOrder)) - (bFwd + Math.abs(b.sortOrder - currentSortOrder));
    })[0];

  const submitNote = () => {
    if (!noteText.trim()) return;
    void handleAddNote(lead.id, noteText.trim()).then(() => { setNoteText(''); setNoteOpen(false); });
  };
  const submitSchedule = () => {
    if (!scheduledAt.trim()) return;
    void handleScheduleFollowUp(lead.id, scheduledAt.trim()).then(() => { setScheduledAt(''); setScheduleOpen(false); });
  };

  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    if (shouldIgnoreTarget(e.target)) return;
    if (onOpenDetail) onOpenDetail(lead.id);
    else navigateToLeadCommandCenter(router, commandCenterHref);
  };

  return (
    <div
      draggable={canManageLeads}
      onDragStart={() => { if (canManageLeads) setDraggedLeadId(lead.id); }}
      onDragEnd={() => { setDraggedLeadId(null); setDragOverStageId(null); }}
      onClick={handleCardClick}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (onOpenDetail) onOpenDetail(lead.id); else navigateToLeadCommandCenter(router, commandCenterHref); }
      }}
      role="button"
      tabIndex={0}
      style={{
        position: 'relative',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        borderLeft: `4px solid ${accent.border}`,
        padding: '11px 12px',
        cursor: 'pointer',
        marginBottom: '7px',
        outline: 'none',
        transition: 'box-shadow .12s',
      }}
    >
      {/* Checkbox */}
      {canManageLeads && onSelectedChange ? (
        <label
          style={{ position: 'absolute', top: '10px', left: '-12px', opacity: isSelected ? 1 : 0, transition: 'opacity .12s', zIndex: 10 }}
          onClick={e => e.stopPropagation()}
        >
          <input type="checkbox" checked={isSelected} onChange={e => onSelectedChange(lead.id, e.target.checked)} style={{ width: '13px', height: '13px' }} aria-label={`Select ${lead.company_name}`} />
        </label>
      ) : null}

      {/* TOP: flag + company + ↗ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '7px', marginBottom: '7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{countryCodeToFlag(countryCode)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{lead.company_name}</div>
            <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{lead.contact_name ?? ownerLabel}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); navigateToLeadCommandCenter(router, commandCenterHref); }}
          title="Open in Command Center"
          style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '7px', border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer', color: '#64748b' }}
        >↗</button>
      </div>

      {/* BADGES */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '7px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: lead.lead_type === 'buyer' ? '#dbeafe' : '#f0fdf4', border: `1px solid ${lead.lead_type === 'buyer' ? '#bfdbfe' : '#a7f3d0'}`, color: lead.lead_type === 'buyer' ? '#1d4ed8' : '#15803d' }}>
          {lead.lead_type === 'buyer' ? 'Buyer' : 'Supplier'}
        </span>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: accent.badge.bg, border: `1px solid ${accent.badge.border}`, color: accent.badge.color }}>
          {accent.label}
        </span>
      </div>

      {/* MOVE READINESS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: '7px', border: `1px solid ${moveBadge.border}`, background: moveBadge.bg, marginBottom: '7px', fontSize: '10px', fontWeight: 700 }}>
        <span style={{ color: moveBadge.color }}>{moveBadge.label}</span>
        {quickMove && <span style={{ color: moveBadge.color }}>→ {quickMove.label ?? stageLabel}</span>}
      </div>

      {/* ACTIONS — always visible */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
        <button type="button" onClick={() => setScheduleOpen(v => !v)}
          style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '11px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
          📅 Schedule
        </button>
        <button type="button" onClick={() => setNoteOpen(v => !v)}
          style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '11px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
          📝 Note
        </button>
        {quickMove && canManageLeads ? (
          <button type="button"
            disabled={isPending || moveReadiness.status === 'blocked'}
            onClick={() => handleMove(lead.id, quickMove.stageId)}
            style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #0b2e4a', background: '#0b2e4a', fontSize: '11px', fontWeight: 700, color: 'white', cursor: 'pointer', flex: 1, textAlign: 'center', opacity: moveReadiness.status === 'blocked' ? 0.5 : 1 }}>
            → {quickMove.label ?? 'Advance'}
          </button>
        ) : null}
      </div>

      {/* FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px', fontSize: '10px', color: '#94a3b8' }}>
        <span>{ownerLabel}</span>
        <span>{history.length > 0 ? `${history.length} follow-up${history.length === 1 ? '' : 's'}` : 'No activity'}</span>
      </div>

      {/* Note editor */}
      {noteOpen && (
        <div style={{ marginTop: '7px' }} onClick={e => e.stopPropagation()}>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a pipeline note…"
            style={{ width: '100%', minHeight: '66px', borderRadius: '7px', border: '1px solid #e2e8f0', padding: '6px 9px', fontSize: '12px', resize: 'vertical', outline: 'none', display: 'block' }} />
          <button type="button" onClick={submitNote} disabled={isPending || !noteText.trim()}
            style={{ marginTop: '4px', padding: '4px 12px', borderRadius: '6px', background: '#0b2e4a', color: 'white', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Save note</button>
        </div>
      )}

      {/* Schedule editor */}
      {scheduleOpen && (
        <div style={{ marginTop: '7px' }} onClick={e => e.stopPropagation()}>
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
            style={{ width: '100%', height: '34px', borderRadius: '7px', border: '1px solid #e2e8f0', padding: '0 9px', fontSize: '12px', outline: 'none' }} />
          <button type="button" onClick={submitSchedule} disabled={isPending || !scheduledAt.trim()}
            style={{ marginTop: '4px', padding: '4px 12px', borderRadius: '6px', background: '#0b2e4a', color: 'white', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Save</button>
        </div>
      )}

      {!canManageLeads && readOnlyMessage ? <p style={{ marginTop: '5px', fontSize: '10px', color: '#94a3b8' }}>{readOnlyMessage}</p> : null}
    </div>
  );
}
