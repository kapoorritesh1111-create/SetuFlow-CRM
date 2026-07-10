'use client';

import { type KeyboardEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LeadCommercialReadiness } from '@/lib/catalog-pricing-model';
import { computeLeadHealth } from '@/lib/lead-health';
import { LeadHealthBadge } from '@/components/ui/lead-health-badge';
import { CountryFlagPill } from '@/components/ui/country-flag-pill';
import { FaIcon } from '@/components/ui/fa-icon';
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
  for (let i = 0; i < companyName.length; i += 1) hash = (hash * 31 + companyName.charCodeAt(i)) & 0xffff;
  return gradients[hash % gradients.length];
}

function getFollowUpState(scheduledAt?: string | null, nowIso?: string | null) {
  if (!scheduledAt || !nowIso) return scheduledAt ? 'upcoming' : 'unscheduled';
  const target = new Date(scheduledAt);
  const now = new Date(nowIso);
  if (Number.isNaN(target.getTime()) || Number.isNaN(now.getTime())) return 'unscheduled';
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (targetDay < today) return 'overdue';
  if (targetDay === today) return 'today';
  return 'upcoming';
}

function ContactIconButton({ href, label, tone }: { href: string; label: string; tone: 'mail' | 'whatsapp' | 'phone' }) {
  const toneClass = tone === 'whatsapp'
    ? 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50'
    : tone === 'phone'
      ? 'border-brand-800/15 bg-white text-content-primary hover:border-brand-800/30 hover:bg-slate-50'
      : 'border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50';
  const icon = tone === 'whatsapp' ? 'whatsapp' : tone === 'phone' ? 'phone' : 'envelope';
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
      <FaIcon icon={icon} fixedWidth />
    </a>
  );
}

export function LeadTableRow({
  lead,
  selected,
  isSpotlight,
  toggleSelect,
  setSpotlightLead,
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
}: LeadTableRowProps) {
  const [hydratedNowIso, setHydratedNowIso] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => setHydratedNowIso(new Date().toISOString()), []);

  const stageName = stageMap.get(lead.stage_id ?? '') ?? 'Unstaged';
  const nextStepName = nextStepMap.get(lead.next_step_id ?? '') ?? 'Review next step';
  const ownerLabel = ownerMap.get(lead.owner_user_id ?? '') ?? 'Unassigned';
  const readiness = readinessMap.get(lead.id);
  const blockerCount = readiness?.blockerCount ?? 0;
  const followUpState = getFollowUpState(lead.next_follow_up_at, hydratedNowIso);
  const commandCenterHref = getLeadCommandCenterHref(lead.id);
  const health = computeLeadHealth({
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
  const leadContact = lead as LeadRow & { email?: string | null; phone?: string | null; whatsapp_number?: string | null };
  const emailAddress = leadContact.email?.trim() || '';
  const phoneNumber = leadContact.phone?.trim() || '';
  const whatsappSource = leadContact.whatsapp_number?.trim() || phoneNumber;
  const telHref = phoneNumber ? `tel:${phoneNumber.replace(/[^+0-9]/g, '')}` : '';
  const mailHref = emailAddress ? `mailto:${encodeURIComponent(emailAddress)}?subject=${encodeURIComponent(`SETU Flow follow-up: ${lead.company_name}`)}` : '';
  const whatsappHref = whatsappSource ? `https://wa.me/${whatsappSource.replace(/[^0-9]/g, '')}` : '';
  const avatarLabel = getLeadInitials(lead.company_name) || 'L';
  const dealValue = typeof lead.deal_value === 'number' && lead.deal_value > 0 ? lead.deal_value : null;
  const formattedDealValue = dealValue ? new Intl.NumberFormat('en-US', { style: 'currency', currency: lead.deal_currency ?? 'USD', maximumFractionDigits: 0 }).format(dealValue) : '—';

  return (
    <article
      role="link"
      tabIndex={0}
      data-tour="lead-row"
      className={[
        'group relative grid cursor-pointer items-center gap-x-4 rounded-2xl border border-slate-200 bg-white px-4 py-[11px] mb-[5px] transition hover:shadow-md hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
        blockerCount > 0 || followUpState === 'overdue' ? 'border-l-[3px] border-rose-500' : followUpState === 'today' ? 'border-l-[3px] border-amber-500' : 'border-l-[3px] border-emerald-500',
        selected || isSpotlight ? 'bg-blue-50/40' : '',
      ].join(' ')}
      style={{ gridTemplateColumns: '28px minmax(260px,1fr) 110px 130px 110px 88px 110px 100px 170px' }}
      onMouseEnter={() => setSpotlightLead(lead.id)}
      onClick={(event) => { if (shouldIgnoreLeadNavigationTarget(event.target)) return; openLeadCommandCenter(router, commandCenterHref); }}
      onKeyDown={(event) => { if (shouldIgnoreLeadNavigationTarget(event.target)) return; handleLeadCommandCenterKeyDown(event, router, commandCenterHref); }}
    >
      <div className="flex justify-center">
        <input type="checkbox" checked={selected} aria-label={`Select ${lead.company_name}`} onChange={() => toggleSelect(lead.id)} onClick={(event) => event.stopPropagation()} className="h-[18px] w-[18px] cursor-pointer rounded border-slate-300" />
      </div>

      <div className="flex items-start gap-2.5 overflow-hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold text-white" style={{ background: getAvatarGradient(lead.company_name) }}>{avatarLabel}</div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold text-slate-900">{lead.company_name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="truncate">{[lead.contact_name, lead.job_title].filter(Boolean).join(' · ') || 'No primary contact'}</span>
            <CountryFlagPill countryName={lead.country} countryId={lead.country_id} className="bg-slate-50 px-2 py-0.5 text-[10px]" />
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <LeadHealthBadge health={health} />
            <span className={`inline-flex items-center rounded-full border px-[7px] py-[1px] text-[9px] font-bold tracking-[0.04em] ${lead.lead_type === 'supplier' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>{lead.lead_type}</span>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-center gap-2" aria-label={`Contact ${lead.company_name}`}>
        {emailAddress ? <ContactIconButton href={mailHref} label={`Email ${lead.company_name}`} tone="mail" /> : null}
        {whatsappHref ? <ContactIconButton href={whatsappHref} label={`WhatsApp ${lead.company_name}`} tone="whatsapp" /> : null}
        {phoneNumber ? <ContactIconButton href={telHref} label={`Call ${lead.company_name}`} tone="phone" /> : null}
      </div>

      <div className="hidden lg:block">
        <div className="text-[11px] font-semibold text-slate-700">{stageName}</div>
        <div className="mt-1 truncate text-[9px] font-semibold text-slate-500">{nextStepName}</div>
      </div>

      <div className="hidden lg:flex flex-col items-start gap-[2px]">
        {lead.next_follow_up_at ? <span className="text-[10px] font-semibold text-slate-600">{safeFormatDateTime(lead.next_follow_up_at)}</span> : <span className="text-[10px] text-slate-400">No date set</span>}
      </div>

      <div className="hidden lg:flex items-center justify-center">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700">{blockerCount > 0 ? `${blockerCount} blockers` : followUpState}</span>
      </div>

      <div className="hidden lg:flex flex-col items-start">
        <div className="text-[12px] font-bold text-slate-900">{formattedDealValue}</div>
        {dealValue ? <div className="mt-0.5 text-[10px] text-slate-400">{(lead.deal_currency ?? 'USD').toUpperCase()}</div> : null}
      </div>

      <div className="hidden lg:flex flex-col items-start">
        <div className="text-[11px] font-semibold text-slate-700">{ownerLabel}</div>
        <div className="mt-0.5 text-[10px] text-slate-400">{lead.source_label ?? lead.source_type ?? '—'}</div>
      </div>

      <div className="relative flex items-center justify-end gap-1.5">
        <button type="button" onClick={(event) => { event.stopPropagation(); openLeadCommandCenter(router, commandCenterHref); }} className="inline-flex items-center gap-1 rounded-full border border-brand-800 bg-brand-700 px-3 py-1.5 text-[10px] font-bold text-white transition hover:opacity-90">Open →</button>
        {onDeleteLead ? <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteLead(lead.id, lead.company_name); }} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50">Remove</button> : null}
        <button type="button" onClick={(event) => { event.stopPropagation(); setActionsOpen((current) => !current); }} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50">More</button>
        {actionsOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg" onClick={(event) => event.stopPropagation()}>
            <button type="button" disabled={!openQuoteBuilder} onClick={() => { setActionsOpen(false); openQuoteBuilder?.(lead.id); }} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Continue quote</button>
            <button type="button" disabled={!openQuickEdit} onClick={() => { setActionsOpen(false); openQuickEdit?.(lead.id); }} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Edit lead</button>
            <button type="button" disabled={!onDeleteLead} onClick={() => { setActionsOpen(false); onDeleteLead?.(lead.id, lead.company_name); }} className="block w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">Remove from queue</button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function LeadTableHeader({
  onSelectAll, allSelected, currentSortField, currentSortDir, onColumnSort, valueLabel = 'Deal value'
}: {
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  currentSortField?: string;
  currentSortDir?: 'asc' | 'desc';
  onColumnSort?: (field: string) => void;
  valueLabel?: string;
}) {
  function SortableHeader({ field, label, className = '' }: { field: string; label: string; className?: string }) {
    const isActive = currentSortField === field;
    const arrow = isActive ? (currentSortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return <button type="button" onClick={() => onColumnSort?.(field)} className={`hidden lg:flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] transition select-none ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'} ${className}`}>{label}{arrow}</button>;
  }
  return (
    <div className="grid items-center gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2" style={{ gridTemplateColumns: '28px minmax(260px,1fr) 110px 130px 110px 88px 110px 100px 170px' }}>
      <input type="checkbox" checked={allSelected} onChange={(event) => onSelectAll(event.target.checked)} aria-label="Select all visible leads" className="h-[18px] w-[18px] rounded border-slate-300" />
      <SortableHeader field="company_name" label="Lead" />
      <div className="hidden lg:block text-center text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Contact</div>
      <SortableHeader field="stage" label="Stage" />
      <SortableHeader field="follow_up" label="Follow up" />
      <SortableHeader field="priority_score" label="Score" />
      <SortableHeader field="deal_value" label={valueLabel} />
      <SortableHeader field="owner" label="Owner" />
      <div className="hidden lg:block text-right text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Actions</div>
    </div>
  );
}
