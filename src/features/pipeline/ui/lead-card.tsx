"use client";

import { GuruAvatar } from '@/components/ui/guru-avatar';

import { useRouter } from 'next/navigation';
import { useState, type KeyboardEvent } from 'react';
import { StateMessage } from '@/components/ui/state-message';
import { getFollowUpBadgeClasses, getFollowUpLabel, getFollowUpVisualState } from '@/lib/lead-status';
import { navigateToLeadCommandCenter } from '@/lib/lead-command-center-navigation';
import { formatDateTime, cn } from '@/lib/utils';
import { ICON_CONTAINER_CLASS, getActionIcon, getStageAccent, getStatusIcon } from '@/features/leads/ui/lead-workspace-icons';
import { getPipelineStageActionLabel } from '@/features/pipeline/logic/board';
import type { LeadCardProps, FollowUpVisualState } from '@/features/pipeline/types/board';

function openLeadCommandCenter(router: ReturnType<typeof useRouter>, href: string) {
  navigateToLeadCommandCenter(router, href);
}
function shouldIgnoreLeadNavigationTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, select, textarea, label'));
}
function handleLeadCommandCenterKeyDown(event: KeyboardEvent<HTMLElement>, router: ReturnType<typeof useRouter>, href: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openLeadCommandCenter(router, href);
}
function getHealthTone(health: string) {
  if (health.includes('at_risk')) return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200';
  if (health.includes('stalled') || health.includes('cold')) return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/45 dark:text-emerald-200';
}
function getMoveStatusLabel(status: string) {
  if (status === 'blocked') return 'Move blocked';
  if (status === 'at_risk') return 'Move guarded';
  return 'Move ready';
}
function getMoveTone(status: string) {
  if (status === 'blocked') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/45 dark:text-rose-200';
  if (status === 'at_risk') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/45 dark:text-amber-200';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/45 dark:text-emerald-200';
}
function getFollowUpStatus(state: FollowUpVisualState): 'ready' | 'progress' | 'blocked' | 'cold' | 'ontrack' {
  if (state === 'overdue') return 'blocked';
  if (state === 'today') return 'progress';
  if (state === 'unscheduled') return 'cold';
  if (state === 'upcoming') return 'ontrack';
  return 'ready';
}
function countryCodeToFlagEmoji(countryCode?: string | null) {
  if (!countryCode) return '◎';
  const normalized = countryCode.trim().slice(0, 2).toUpperCase();
  if (normalized.length !== 2) return '◎';
  return String.fromCodePoint(...normalized.split('').map((char) => 127397 + char.charCodeAt(0)));
}
function shortenCardCopy(value: string, maxLength = 88) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
function getQuickMoveLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes('qualified')) return 'Qualify';
  if (normalized.includes('document')) return 'Request docs';
  if (normalized.includes('sample')) return 'Send sample';
  if (normalized.includes('contract')) return 'Contract';
  if (normalized.includes('negoti')) return 'Negotiate';
  if (normalized.includes('approv')) return 'Approve';
  if (normalized.includes('won') || normalized.includes('complete')) return 'Complete';
  return 'Advance';
}

// SF-18-097: Stage Readiness Ring
function ReadinessRing({ pct, blockers }: { pct: number; blockers: string[] }) {
  const circumference = 2 * Math.PI * 10;
  const dash = (pct / 100) * circumference;
  const stroke = pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const labelCls = pct >= 75 ? 'text-emerald-700' : pct >= 40 ? 'text-amber-700' : 'text-rose-700';
  const label = blockers.length > 0 ? 'Blocked' : pct >= 75 ? 'Move ready' : 'Partial';
  return (
    <div className="flex items-center gap-2" title={`${pct}% criteria met${blockers[0] ? ' · ' + blockers[0] : ''}`}>
      <div className="relative w-7 h-7 flex-shrink-0">
        <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="14" cy="14" r="10" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
          <circle cx="14" cy="14" r="10" fill="none" stroke={stroke} strokeWidth="2.5"
            strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
        </svg>
      </div>
      <span className={`text-[10.5px] font-bold ${labelCls}`}>{label}</span>
    </div>
  );
}

// SF-18-097: Momentum Sparkline — 7-day activity bars
function MomentumSparkline({ activityDates }: { activityDates: string[] }) {
  const today = new Date();
  const bars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return activityDates.filter(a => a.startsWith(dateStr)).length;
  });
  const maxBar = Math.max(...bars, 1);
  return (
    <div className="flex items-end gap-[2px] h-4" title="Activity last 7 days">
      {bars.map((count, i) => (
        <div key={i}
          className={`w-[4px] rounded-[2px_2px_0_0] transition-all ${count > 0 ? 'bg-blue-400' : 'bg-slate-100'}`}
          style={{ height: `${Math.max((count / maxBar) * 100, count > 0 ? 20 : 10)}%` }}
        />
      ))}
    </div>
  );
}


export function LeadCard({ canManageLeads, readOnlyMessage, lead, stageLabel, state, history, nextStepMap, handleMove, handleAddNote, handleScheduleFollowUp, isPending, commandCenterHref, setDraggedLeadId, setDragOverStageId, safeFormatDateTime, health, ownerLabel, blockerCount, pricingLabel, pricingClassName, blockerSummary, openRfqCount, activeQuoteCount, agingLabel, moveReadiness, moveOptions, countryCode, coverageSummary, isSelected = false, onSelectedChange, onOpenDetail, activityDates = [], density = 'compact' }: LeadCardProps) {
  const router = useRouter();
  const stageAccent = getStageAccent(stageLabel);
  // SF-18-098: density-driven visibility
  const showFull = density === 'full';
  const showCompact = density !== 'micro';
  const FollowUpIcon = getStatusIcon(getFollowUpStatus(state));
  const OpenIcon = getActionIcon('open');
  const followUpLabel = getFollowUpLabel(state);
  const nextActionSummary = shortenCardCopy(moveReadiness.blockers[0] ?? moveReadiness.warnings[0] ?? moveReadiness.summary, 96);
  const suggestedAction = moveReadiness.status === 'blocked' ? 'Setu Guru: Clear blockers before moving' : state === 'overdue' ? 'Setu Guru: Follow up today' : `Setu Guru: ${nextActionSummary}`;
  const currentSortOrder = moveOptions.find((option) => option.stageId === lead.stage_id)?.sortOrder ?? 0;
  const quickMoveOption = moveOptions.filter((option) => option.stageId !== lead.stage_id && !option.disabled).sort((left, right) => {
    const leftDirectionPenalty = left.sortOrder > currentSortOrder ? 0 : 1000;
    const rightDirectionPenalty = right.sortOrder > currentSortOrder ? 0 : 1000;
    const leftDistance = Math.abs(left.sortOrder - currentSortOrder);
    const rightDistance = Math.abs(right.sortOrder - currentSortOrder);
    return (leftDirectionPenalty + leftDistance) - (rightDirectionPenalty + rightDistance);
  })[0];
  const quickMoveLabel = quickMoveOption ? getQuickMoveLabel(quickMoveOption.label) : 'Open lead';
  const visibleReadinessReasons = (moveReadiness.blockers.length ? moveReadiness.blockers : moveReadiness.warnings).slice(0, 2);
  const visibleActionItems = moveReadiness.actionItems.slice(0, 2);
  const metaSignals = [blockerCount ? `${blockerCount} blocked` : '', activeQuoteCount ? `${activeQuoteCount} quote${activeQuoteCount === 1 ? '' : 's'}` : '', openRfqCount ? `${openRfqCount} RFQ` : '', agingLabel !== '—' ? `Aging ${agingLabel}` : ''].filter(Boolean);
  const secondaryMeta = [metaSignals[1], metaSignals[2]].filter(Boolean);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [nextActionOpen, setNextActionOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [cardMessage, setCardMessage] = useState('');

  const submitNote = () => {
    if (!noteText.trim()) return;
    void handleAddNote(lead.id, noteText.trim()).then((result) => {
      if (result?.error) setCardMessage(result.error);
      if (result?.success) {
        setCardMessage(result.success);
        setNoteText('');
        setNoteOpen(false);
      }
    });
  };
  const submitFollowUp = () => {
    if (!scheduledAt.trim()) return;
    void handleScheduleFollowUp(lead.id, scheduledAt.trim()).then((result) => {
      if (result?.error) setCardMessage(result.error);
      if (result?.success) {
        setCardMessage(result.success);
        setScheduledAt('');
        setNextActionOpen(false);
      }
    });
  };

  return (
    <article
      draggable={canManageLeads}
      onDragStart={() => { if (canManageLeads) setDraggedLeadId(lead.id); }}
      onDragEnd={() => { setDraggedLeadId(null); setDragOverStageId(null); }}
      onClick={(event) => { if (!shouldIgnoreLeadNavigationTarget(event.target)) openLeadCommandCenter(router, commandCenterHref); }}
      onKeyDown={(event) => handleLeadCommandCenterKeyDown(event, router, commandCenterHref)}
      role="button"
      tabIndex={0}
      className={cn(
        'group border bg-white/96 transition hover:-translate-y-0.5 dark:bg-slate-900/88',
        density === 'full' ? 'rounded-panel p-3.5 shadow-[0_16px_34px_rgba(15,23,42,0.08)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]' :
        density === 'compact' ? 'rounded-2xl p-2.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.10)]' :
        /* micro */ 'rounded-xl px-2.5 py-2 shadow-none hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)]',
        isSelected ? 'border-slate-900 ring-2 ring-slate-900/10 dark:border-white dark:ring-white/10' : 'border-slate-200/80 dark:border-slate-700/70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={cn(ICON_CONTAINER_CLASS, 'h-8 w-8 rounded-2xl text-sm')} style={{ backgroundColor: `${stageAccent}18`, color: stageAccent }}>
              {countryCodeToFlagEmoji(countryCode)}
            </span>
            <div className="min-w-0">
              <p className={cn("truncate font-semibold text-slate-950 dark:text-white", density === "micro" ? "text-xs" : "text-sm")}>{lead.company_name}</p>
{density !== "micro" && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{lead.contact_name ?? ownerLabel}</p>}
            </div>
          </div>
          {density !== 'micro' ? (
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className={cn('rounded-full border px-2 py-1 font-semibold', getHealthTone(health))}>{health.replace(/_/g, ' ')}</span>
              <span className={cn('rounded-full border px-2 py-1 font-semibold', getFollowUpBadgeClasses(state))}><FollowUpIcon className="mr-1 inline h-3.5 w-3.5" />{followUpLabel}</span>
              {density === 'full' && <span className={cn('rounded-full border px-2 py-1 font-semibold', pricingClassName)}>{pricingLabel}</span>}
            </div>
          ) : (
            <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', getFollowUpBadgeClasses(state))}>
              <FollowUpIcon className="mr-0.5 inline h-3 w-3" />{followUpLabel}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onSelectedChange ? (
            <label className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300" title={isSelected ? 'Remove from bulk selection' : 'Add to bulk selection'}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(event) => onSelectedChange(lead.id, event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
                aria-label={isSelected ? `Deselect ${lead.company_name}` : `Select ${lead.company_name}`}
              />
            </label>
          ) : null}
          <button type="button" onClick={(event) => { event.stopPropagation(); (onOpenDetail ?? (() => openLeadCommandCenter(router, commandCenterHref)))(lead.id); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300">
            <OpenIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {density !== 'micro' && <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>{ownerLabel}</span>
          <span>{safeFormatDateTime(lead.next_follow_up_at)}</span>
        </div>
        {/* SF-18-097: Stage Readiness Ring replaces text chip */}
        {(() => {
          const totalChecks = moveReadiness.blockers.length + moveReadiness.warnings.length + 3;
          const passed = totalChecks - moveReadiness.blockers.length;
          const pct = Math.round((passed / totalChecks) * 100);
          return (
            <div className="flex items-center justify-between gap-2">
              <ReadinessRing pct={pct} blockers={moveReadiness.blockers} />
              <span className="text-[10px] font-semibold text-slate-500">{getPipelineStageActionLabel(stageLabel, moveReadiness.status === 'blocked')}</span>
            </div>
          );
        })()}
        {/* SF-18-097: Momentum Sparkline */}
        {activityDates && activityDates.length > 0 && (
          <div className="flex items-center gap-3">
            <MomentumSparkline activityDates={activityDates} />
            <span className="text-[9px] text-slate-400 font-semibold">7d activity</span>
          </div>
        )}
        <div className="flex items-start gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/85 px-3 py-2 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
          <GuruAvatar size="xs" className="mt-0.5 flex-shrink-0" />
          <span>{suggestedAction}</span>
        </div>{showCompact && visibleReadinessReasons.length ? <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-200"><p className="font-semibold">Stage blockers</p><ul className="mt-1 list-disc pl-4">{visibleReadinessReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}{showFull && visibleActionItems.length ? <div className="flex flex-wrap gap-1.5">{visibleActionItems.map((item) => <span key={item} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{item}</span>)}</div> : null}{showFull && coverageSummary ? <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 px-3 py-2 text-[11px] text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-200">{coverageSummary}</div> : null}
        {cardMessage ? <StateMessage title={cardMessage} tone="neutral" description="The lead card reflects the latest action result." /> : null}
      </div>}

      {/* Compact: just show quick action buttons, micro: show only Advance */}
      <div className={density === 'micro' ? 'mt-1.5 flex gap-1.5' : 'mt-3 flex flex-wrap gap-2'} onClick={(event) => event.stopPropagation()}>
        {quickMoveOption && canManageLeads ? <button type="button" disabled={isPending || moveReadiness.status === 'blocked'} onClick={() => handleMove(lead.id, quickMoveOption.stageId)} className={density === 'micro' ? 'inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50' : 'inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'}>{quickMoveLabel}</button> : null}
        {density !== 'micro' && <button type="button" onClick={() => setNoteOpen((value) => !value)} className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Add note</button>}
        {density !== 'micro' && <button type="button" onClick={() => setNextActionOpen((value) => !value)} className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Next action</button>}
        {density !== 'micro' && <button type="button" onClick={() => setMoveMenuOpen((value) => !value)} className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Move</button>}
      </div>

      {noteOpen && density !== 'micro' ? <div className="mt-3 space-y-2" onClick={(event) => event.stopPropagation()}><textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} className="min-h-[90px] w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none" placeholder="Add a pipeline note" /><button type="button" onClick={submitNote} disabled={isPending || !canManageLeads || !noteText.trim()} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-60">Save note</button></div> : null}
      {nextActionOpen && density !== 'micro' ? <div className="mt-3 space-y-2" onClick={(event) => event.stopPropagation()}><input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm text-slate-900 outline-none" /><button type="button" onClick={submitFollowUp} disabled={isPending || !canManageLeads || !scheduledAt.trim()} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-60">Schedule follow-up</button></div> : null}
      {moveMenuOpen && density !== 'micro' ? <div className="mt-3 grid gap-2" onClick={(event) => event.stopPropagation()}>{moveOptions.map((option) => <button key={option.stageId} type="button" disabled={isPending || option.disabled || option.stageId === lead.stage_id || !canManageLeads} onClick={() => handleMove(lead.id, option.stageId)} className="inline-flex min-h-10 items-center justify-between rounded-2xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"><span>{option.label}</span><span>{option.sortOrder}</span></button>)}</div> : null}
{showFull && <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400" onClick={(event) => event.stopPropagation()}>
        <span>{secondaryMeta[0] ?? (blockerCount ? blockerSummary : `${history.length} follow-up${history.length === 1 ? '' : 's'}`)}</span>
        <span>{secondaryMeta[1] ?? 'Next step visible'}</span>
      </div>}
      {!canManageLeads && readOnlyMessage ? <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{readOnlyMessage}</p> : null}
    </article>
  );
}
