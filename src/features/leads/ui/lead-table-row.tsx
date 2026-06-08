'use client';

import { type KeyboardEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LeadCommercialReadiness } from '@/lib/catalog-pricing-model';
import { computeLeadHealth } from '@/lib/lead-health';
import { LeadHealthBadge } from '@/components/ui/lead-health-badge';
import type { LeadRow } from '@/features/leads/types/workspace';

export interface LeadTableRowProps {
  lead: LeadRow;
  selected: boolean;
  isSpotlight: boolean;
  toggleSelect: (leadId: string) => void;
  setSpotlightLead: (leadId: string | null) => void;
  stageMap: Map<string, string>;
  nextStepMap: Map<string, string>;
  ownerMap: Map<string, string>;
  safeFormatDateTime: (value?: string | null) => string;
  activityMap: Map<string, string>;
  stageHistoryMap: Map<string, string>;
  stageMetaMap: Map<string, { sortOrder: number | null; stageCount: number | null; isClosed: boolean | null | undefined }>;
  readinessMap: Map<string, LeadCommercialReadiness>;
  getLeadCommandCenterHref: (leadId: string) => string;
  openLeadCommandCenter: (router: ReturnType<typeof useRouter>, href: string) => void;
  shouldIgnoreLeadNavigationTarget: (target: EventTarget | null) => boolean;
  handleLeadCommandCenterKeyDown: (event: KeyboardEvent<HTMLElement>, router: ReturnType<typeof useRouter>, href: string) => void;
  openQuoteBuilder?: (leadId: string) => void;
  openQuickEdit?: (leadId: string) => void;
  onDeleteLead?: (leadId: string, companyName: string) => void;
  maxDealValue?: number;
}

function getLeadInitials(companyName: string) {
  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getAvatarGradient(companyName: string): string {
  const gradients = [
    'linear-gradient(135deg,#0b2e4a,#0c7fff)',
    'linear-gradient(135deg,#0f766e,#0d9488)',
    'linear-gradient(135deg,#5b21b6,#7c3aed)',
    'linear-gradient(135deg,#9f1239,#e11d48)',
    'linear-gradient(135deg,#92400e,#d97706)',
  ];
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) hash = (hash * 31 + companyName.charCodeAt(i)) & 0xffff;
  return gradients[hash % gradients.length];
}

function getStagePillClasses(stageName: string): string {
  const lower = stageName.toLowerCase();
  if (lower.includes('quote') || lower.includes('negoti')) return 'border-[#fde68a] bg-[#fef3c7] text-[#92400e]';
  if (lower.includes('sample') || lower.includes('qualif') || lower.includes('won') || lower.includes('close')) return 'border-[#6ee7b7] bg-[#d1fae5] text-[#047857]';
  return 'border-slate-300 bg-slate-100 text-slate-600';
}

function getStableFollowUpVisualState(scheduledAt?: string | null, nowIso?: string | null) {
  if (!scheduledAt || !nowIso) return scheduledAt ? 'upcoming' : 'unscheduled';
  const target = new Date(scheduledAt);
  const now = new Date(nowIso);
  if (Number.isNaN(target.getTime()) || Number.isNaN(now.getTime())) return 'unscheduled';
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const targetDay = start(target);
  const today = start(now);
  if (targetDay < today) return 'overdue';
  if (targetDay === today) return 'today';
  return 'upcoming';
}

function getStableDayDiff(scheduledAt?: string | null, nowIso?: string | null) {
  if (!scheduledAt || !nowIso) return null;
  const target = new Date(scheduledAt);
  const now = new Date(nowIso);
  if (Number.isNaN(target.getTime()) || Number.isNaN(now.getTime())) return null;
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.round((start(target) - start(now)) / dayMs);
}

function computePriorityScore(
  dealValue: number | null,
  overdueDays: number | null,
  maxDealValue: number,
  blockerCount: number,
  progress: number,
  followUpState: string,
): number {
  const urgency    = Math.min((overdueDays ?? 0) / 14, 1) * 45;
  const value      = maxDealValue > 0 ? Math.min((dealValue ?? 0) / maxDealValue, 1) * 25 : 0;
  const blocker    = blockerCount > 0 ? 15 : 0;
  const entry      = progress < 0.2 ? 10 : 0;
  const unscheduled = followUpState === 'unscheduled' ? 5 : 0;
  return Math.round(Math.min(Math.max(urgency + value + blocker + entry + unscheduled, 0), 99));
}

function PriorityRing({ score }: { score: number }) {
  const [stroke, textClass] =
    score >= 75 ? ['#e11d48', 'text-rose-600'] :
    score >= 50 ? ['#d97706', 'text-amber-600'] :
    score >= 25 ? ['#2563eb', 'text-blue-600'] :
                  ['#94a3b8', 'text-slate-400'];
  return (
    <div className="relative w-11 h-11 flex-shrink-0">
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="22" cy="22" r="18" fill="none" stroke="#f1f5f9" strokeWidth="3" />
        <circle cx="22" cy="22" r="18" fill="none" stroke={stroke} strokeWidth="3"
          strokeDasharray={`${(score / 100) * 113.1} 113.1`} strokeLinecap="round" />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-black font-mono ${textClass}`}>
        {score}
      </span>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.18 2 2 0 0 1 4.11 1h2a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.8a2 2 0 0 1-.45 2.11L7.1 8.85a16 16 0 0 0 6 6l1.22-1.22a2 2 0 0 1 2.11-.45c.9.31 1.84.53 2.8.66A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-[17px] w-[17px]" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="#25D366" />
      <path fill="#fff" d="M23.1 18.8c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.7-.2-1 .2-.3.4-1.1 1.3-1.4 1.6-.3.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-1-2.4-1.3-3.2-.3-.8-.7-.7-1-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.5 1.5-1.5 3.6s1.6 4.2 1.8 4.5c.2.3 3.1 4.8 7.6 6.7 1.1.5 1.9.7 2.5.9 1.1.3 2 .3 2.8.2.9-.1 2.4-1 2.8-2 .3-1 .3-1.8.2-2-.1-.2-.4-.3-.8-.5Z" />
      <path fill="#fff" d="M8.2 26.5 9.4 22A10.9 10.9 0 1 1 13.9 24l-5.7 2.5Zm5.9-4.5.3.1a8.9 8.9 0 1 0-3.1-2.3l.2.3-.7 2.7 3.3-.8Z" />
    </svg>
  );
}

function ContactIconButton({ href, label, tone, children }: { href: string; label: string; tone: 'mail' | 'whatsapp' | 'phone'; children: React.ReactNode }) {
  const toneClass = tone === 'whatsapp'
    ? 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50'
    : tone === 'phone'
      ? 'border-[#0b2e4a]/15 bg-white text-[#0b2e4a] hover:border-[#0b2e4a]/30 hover:bg-slate-50'
      : 'border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50';
  return (
    <a
      href={href}
      target={href.startsWith('https://wa.me/') ? '_blank' : undefined}
      rel={href.startsWith('https://wa.me/') ? 'noreferrer' : undefined}
      onClick={(event) => event.stopPropagation()}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-[0_8px_20px_rgba(15,23,42,.08)] transition ${toneClass}`}
    >
      {children}
    </a>
  );
}

export function LeadTableRow({
  lead,
  selected,
  isSpotlight,
  toggleSelect,
  stageMap,
  nextStepMap,
  ownerMap,
  safeFormatDateTime,
  activityMap,
  stageHistoryMap,
  stageMetaMap,
  readinessMap,
  getLeadCommandCenterHref,
  openLeadCommandCenter,
  shouldIgnoreLeadNavigationTarget,
  handleLeadCommandCenterKeyDown,
  openQuoteBuilder,
  openQuickEdit,
  onDeleteLead,
  maxDealValue = 0,
}: LeadTableRowProps) {
  const [hydratedNowIso, setHydratedNowIso] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => { setHydratedNowIso(new Date().toISOString()); }, []);

  const followUpState = getStableFollowUpVisualState(lead.next_follow_up_at, hydratedNowIso);
  const readiness = readinessMap.get(lead.id);
  const commandCenterHref = getLeadCommandCenterHref(lead.id);
  const router = useRouter();
  const stageName = stageMap.get(lead.stage_id ?? '') ?? 'Unstaged';
  const nextStepName = nextStepMap.get(lead.next_step_id ?? '') ?? 'Review next step';
  const ownerLabel = ownerMap.get(lead.owner_user_id ?? '') ?? 'Unassigned';
  const blockerCount = readiness?.blockerCount ?? 0;
  const leadHealth = computeLeadHealth({
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    last_contacted_at: lead.last_contacted_at,
    next_follow_up_at: lead.next_follow_up_at,
    lastActivityAt: activityMap.get(lead.id),
    lastStageChangeAt: stageHistoryMap.get(lead.id),
    stageSortOrder: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.sortOrder ?? null : null,
    stageCount: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.stageCount ?? null : null,
    isClosedStage: lead.stage_id ? stageMetaMap.get(lead.stage_id)?.isClosed ?? null : null,
  });

  const diffDays = getStableDayDiff(lead.next_follow_up_at, hydratedNowIso);
  const overdueDays = diffDays !== null && diffDays < 0 ? Math.abs(diffDays) : null;
  const severityBorderClass = blockerCount > 0 || followUpState === 'overdue'
    ? 'border-l-[3px] border-rose-500'
    : followUpState === 'today'
      ? 'border-l-[3px] border-amber-500'
      : 'border-l-[3px] border-emerald-500';

  const signalPills = useMemo(() => {
    const pills: Array<{ label: string; className: string }> = [];
    pills.push({
      label: lead.lead_type === 'supplier' ? 'Supplier' : 'Buyer',
      className: lead.lead_type === 'supplier' ? 'border-[#c4b5fd] bg-[#f5f3ff] text-[#6d28d9]' : 'border-[#7dd3fc] bg-[#f0f9ff] text-[#0369a1]',
    });
    if (stageName && stageName !== 'Unstaged') pills.push({ label: stageName, className: getStagePillClasses(stageName) });
    else if (blockerCount > 0) pills.push({ label: `${blockerCount} blocker${blockerCount === 1 ? '' : 's'}`, className: 'border-rose-200 bg-rose-50 text-rose-700' });
    return pills.slice(0, 2);
  }, [lead.lead_type, stageName, blockerCount]);

  const avatarLabel = getLeadInitials(lead.company_name) || 'L';
  const avatarGradient = getAvatarGradient(lead.company_name);
  const stageMeta = stageMetaMap.get(lead.stage_id ?? '') ?? { sortOrder: null, stageCount: null };
  const stageOrder = stageMeta.sortOrder ?? 0;
  const stageCount = stageMeta.stageCount ?? 1;
  const progress = stageCount > 0 ? Math.max(0.08, Math.min(1, stageOrder / stageCount)) : 0.08;
  const priorityScore = computePriorityScore(lead.deal_value, overdueDays, maxDealValue, blockerCount, progress, followUpState);
  const progressBarColour = blockerCount > 0 || followUpState === 'overdue' ? 'bg-rose-400' : followUpState === 'today' ? 'bg-amber-400' : 'bg-emerald-500';

  let progressSubLabel: string;
  if (overdueDays !== null) progressSubLabel = `${overdueDays} day${overdueDays === 1 ? '' : 's'} no contact`;
  else if (diffDays === 0) progressSubLabel = 'Follow-up today';
  else if (diffDays !== null && diffDays > 0) progressSubLabel = `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  else progressSubLabel = nextStepName;

  const progressSubColour = overdueDays !== null ? 'text-rose-600' : followUpState === 'today' ? 'text-amber-600' : 'text-slate-500';
  const dealValue = typeof lead.deal_value === 'number' && lead.deal_value > 0 ? lead.deal_value : null;
  const dealCurrency = lead.deal_currency ?? 'USD';
  const hasDueDate = Boolean(lead.next_follow_up_at);
  const dueLabel = hasDueDate ? safeFormatDateTime(lead.next_follow_up_at) : '—';
  const formattedDealValue = dealValue ? new Intl.NumberFormat('en-US', { style: 'currency', currency: dealCurrency, maximumFractionDigits: 0 }).format(dealValue) : '—';
  const leadContact = lead as LeadRow & { email?: string | null; phone?: string | null; whatsapp_number?: string | null };
  const emailAddress = leadContact.email?.trim() || '';
  const phoneNumber = leadContact.phone?.trim() || '';
  const whatsappSource = leadContact.whatsapp_number?.trim() || phoneNumber;
  const telHref = phoneNumber ? `tel:${phoneNumber.replace(/[^+0-9]/g, '')}` : '';
  const mailHref = emailAddress ? `mailto:${encodeURIComponent(emailAddress)}?subject=${encodeURIComponent(`SETU Flow follow-up: ${lead.company_name}`)}` : '';
  const whatsappHref = whatsappSource ? `https://wa.me/${whatsappSource.replace(/[^0-9]/g, '')}` : '';

  return (
    <article
      role="link"
      tabIndex={0}
      className={[
        'group relative grid cursor-pointer items-center gap-x-4 rounded-2xl border border-slate-200 bg-white px-4 py-[11px] mb-[5px] transition hover:shadow-md hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
        severityBorderClass,
        selected || isSpotlight ? 'bg-blue-50/40' : '',
      ].join(' ')}
      style={{ gridTemplateColumns: '28px minmax(260px,1fr) 110px 130px 110px 88px 110px 100px 146px' }}
      onClick={(event) => { if (shouldIgnoreLeadNavigationTarget(event.target)) return; openLeadCommandCenter(router, commandCenterHref); }}
      onKeyDown={(event) => { if (shouldIgnoreLeadNavigationTarget(event.target)) return; handleLeadCommandCenterKeyDown(event, router, commandCenterHref); }}
    >
      <div className={[
        'absolute left-0 top-2 bottom-2 w-[3px] rounded-r-[2px] transition-opacity',
        followUpState === 'overdue'  ? 'bg-rose-500 opacity-100' :
        followUpState === 'today'    ? 'bg-amber-500 opacity-100' :
        followUpState === 'upcoming' ? 'bg-emerald-500 opacity-60' :
        'opacity-0',
      ].join(' ')} />
      <div className="flex justify-center">
        <input type="checkbox" checked={selected} aria-label={`Select ${lead.company_name}`} onChange={() => toggleSelect(lead.id)} onClick={(event) => event.stopPropagation()} className="h-[18px] w-[18px] cursor-pointer rounded-[4px] border-slate-300" />
      </div>

      <div className="flex items-start gap-2.5 overflow-hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-extrabold text-white" style={{ background: avatarGradient }}>{avatarLabel}</div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold text-slate-900">{lead.company_name}</div>
          <div className="mt-0.5 truncate text-[11px] text-slate-500">{[lead.contact_name, lead.job_title].filter(Boolean).join(' · ') || 'No primary contact'}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <LeadHealthBadge health={leadHealth} />
            {signalPills.map((pill) => <span key={pill.label} className={`inline-flex items-center rounded-full border px-[7px] py-[1px] text-[9px] font-bold tracking-[0.04em] ${pill.className}`}>{pill.label}</span>)}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-center gap-2" aria-label={`Contact ${lead.company_name}`}>
        {emailAddress ? <ContactIconButton href={mailHref} label={`Email ${lead.company_name}`} tone="mail"><MailIcon /></ContactIconButton> : null}
        {whatsappHref ? <ContactIconButton href={whatsappHref} label={`WhatsApp ${lead.company_name}`} tone="whatsapp"><WhatsAppIcon /></ContactIconButton> : null}
        {phoneNumber ? <ContactIconButton href={telHref} label={`Call ${lead.company_name}`} tone="phone"><PhoneIcon /></ContactIconButton> : null}
      </div>

      <div className="hidden lg:block">
        <div className="text-[11px] font-semibold text-slate-700">{stageName}</div>
        <div className="mt-[4px] h-[3px] w-full rounded-full bg-slate-100"><div className={`h-full rounded-full ${progressBarColour}`} style={{ width: `${progress * 100}%` }} /></div>
        <div className={`mt-1 truncate text-[9px] font-semibold ${progressSubColour}`}>{progressSubLabel}</div>
      </div>

      <div className="hidden lg:flex flex-col items-start gap-[2px]">
        {blockerCount > 0 ? <span className="inline-flex items-center gap-1 rounded-[4px] border border-rose-100 bg-rose-50 px-[7px] py-[2px] text-[10px] font-bold text-rose-600">🚫 Blocked</span>
          : followUpState === 'overdue' ? <><span className="inline-flex items-center gap-1 rounded-[4px] border border-rose-100 bg-rose-50 px-[7px] py-[2px] text-[10px] font-bold text-rose-600">⚠ {overdueDays ?? 0} {overdueDays === 1 ? 'day' : 'days'} overdue</span><span className="text-[10px] text-slate-400">{dueLabel}</span></>
            : followUpState === 'today' ? <><span className="inline-flex rounded-[4px] border border-amber-100 bg-amber-50 px-[7px] py-[2px] text-[10px] font-bold text-amber-600">Today</span><span className="text-[10px] text-slate-400">{dueLabel}</span></>
              : hasDueDate ? <span className="text-[10px] font-semibold text-slate-600">{dueLabel}</span>
                : <span className="text-[10px] text-slate-400">No date set</span>}
      </div>

      <div className="hidden lg:flex items-center justify-center">
        <PriorityRing score={priorityScore} />
      </div>

      <div className="hidden lg:flex flex-col items-start">
        <div className="text-[12px] font-bold text-slate-900">{formattedDealValue}</div>
        {dealValue ? <div className="mt-0.5 text-[10px] text-slate-400">{dealCurrency.toUpperCase()}</div> : null}
      </div>

      <div className="hidden lg:flex flex-col items-start">
        <div className="text-[11px] font-semibold text-slate-700">{ownerLabel}</div>
        <div className="mt-0.5 text-[10px] text-slate-400">{lead.source_label ?? lead.source_type ?? '—'}</div>
      </div>

      <div className="relative flex items-center justify-end gap-1.5">
        <div className="flex items-center gap-1.5 group-hover:opacity-0 group-hover:pointer-events-none transition-opacity duration-100">
          <button type="button" onClick={(event) => { event.stopPropagation(); openLeadCommandCenter(router, commandCenterHref); }} className="inline-flex items-center gap-1 rounded-full border border-[#0b2e4a] bg-[#0b2e4a] px-3 py-1.5 text-[10px] font-bold text-white transition hover:opacity-90">Open →</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setActionsOpen((current) => !current); }} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50">More</button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-100">
          {openQuickEdit && <button type="button" onClick={(event) => { event.stopPropagation(); openQuickEdit?.(lead.id); }} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition whitespace-nowrap">📅 Follow up</button>}
          <button type="button" onClick={(event) => { event.stopPropagation(); openLeadCommandCenter(router, commandCenterHref); }} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition whitespace-nowrap">✏ Note</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); openLeadCommandCenter(router, commandCenterHref); }} className="inline-flex items-center gap-1 rounded-full border border-[#0b2e4a] bg-[#0b2e4a] px-3 py-1.5 text-[10px] font-bold text-white transition hover:opacity-90 whitespace-nowrap">Open →</button>
        </div>
        {actionsOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg" onClick={(event) => event.stopPropagation()}>
            <button type="button" disabled={!openQuoteBuilder} onClick={() => { setActionsOpen(false); openQuoteBuilder?.(lead.id); }} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Continue quote</button>
            <button type="button" disabled={!openQuickEdit} onClick={() => { setActionsOpen(false); openQuickEdit?.(lead.id); }} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Edit lead</button>
            <button type="button" disabled={!onDeleteLead} onClick={() => { setActionsOpen(false); onDeleteLead?.(lead.id, lead.company_name); }} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">Delete lead</button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function LeadTableHeader({
  onSelectAll, allSelected, currentSortField, currentSortDir, onColumnSort
}: {
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  currentSortField?: string;
  currentSortDir?: 'asc' | 'desc';
  onColumnSort?: (field: string) => void;
}) {
  function SortableHeader({ field, label, className = '' }: { field: string; label: string; className?: string }) {
    const isActive = currentSortField === field;
    const arrow = isActive ? (currentSortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return (
      <button
        type="button"
        onClick={() => onColumnSort?.(field)}
        className={`hidden lg:flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] transition select-none ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'} ${className}`}
        title={`Sort by ${label}`}
      >
        {label}{arrow}
        {!isActive && <span className="opacity-0 group-hover:opacity-100 text-slate-300">⇅</span>}
      </button>
    );
  }
  return (
    <div className="grid items-center gap-x-4 border-b border-slate-200 bg-white px-4 py-2" style={{ gridTemplateColumns: '28px minmax(260px,1fr) 110px 130px 110px 88px 110px 100px 146px' }}>
      <div className="flex justify-center"><input type="checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} className="h-[18px] w-[18px] rounded-[4px] border-slate-300" /></div>
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Company / Contact</div>
      <div className="hidden lg:block text-center text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Contact</div>
      <SortableHeader field="stage" label="Stage progress" />
      <SortableHeader field="follow_up" label="Follow-up" />
      <SortableHeader field="priority_score" label="Priority" className="justify-center" />
      <SortableHeader field="deal_value" label="Deal value" />
      <SortableHeader field="owner" label="Owner" />
      <div className="hidden lg:block text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Open / More</div>
    </div>
  );
}
