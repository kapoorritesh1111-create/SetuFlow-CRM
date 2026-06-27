import Link from 'next/link';
import type { LeadProfileData } from '@/lib/queries/leads';
import { createLeadQuoteDraftFromLead } from '@/features/quotes/server/lead-draft-actions';
import {
  moveCanonicalLeadStage,
  reassignCanonicalLeadOwner,
  saveCanonicalLeadDetails,
  saveCanonicalQualificationMapping,
  scheduleCanonicalLeadFollowUp,
} from './actions';
import FollowUpComposer from './FollowUpComposer';

type TeamMember = { id: string; name: string; email?: string | null };
type Props = { data: LeadProfileData; canReassignOwner?: boolean; teamMembers?: TeamMember[]; backHref?: string };
type IconName = 'mail' | 'phone' | 'message' | 'target' | 'file' | 'package' | 'calendar' | 'chart' | 'clock' | 'bot' | 'chevron' | 'plus' | 'edit' | 'arrowLeft' | 'check' | 'circle' | 'trend' | 'x' | 'pdf';

const LIFECYCLE = new Set(['sent', 'accepted', 'rejected', 'expired', 'cancelled', 'declined']);
const LOCKED = new Set(['accepted', 'rejected', 'expired', 'cancelled', 'declined']);
const BUILDER = new Set(['draft', 'in_review', 'approval_pending', 'approved']);
const BUYER_STAGES = ['New Lead', 'Qualified', 'Contacted', 'Samples Sent', 'Negotiation', 'Won', 'Lost'];
const SUPPLIER_STAGES = ['New Supplier', 'Qualified', 'Contacted', 'Samples Sent', 'Negotiation', 'Won', 'Lost'];

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...common}>
      {name === 'mail' ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> : null}
      {name === 'phone' ? <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.5a2 2 0 0 1-.6 1.8L7.6 9.3a16 16 0 0 0 7.1 7.1l1.3-1.3a2 2 0 0 1 1.8-.6l2.5.4A2 2 0 0 1 22 16.9Z" /> : null}
      {name === 'message' ? <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.7 8.7 0 0 1-3-.7L3 21l1.8-5.5a8.3 8.3 0 1 1 16.2-4Z" /><path d="M8.5 9.5h7" /><path d="M8.5 13h4.5" /></> : null}
      {name === 'target' ? <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></> : null}
      {name === 'file' ? <><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" /><path d="M14 2v5h5" /><path d="M9 13h6" /><path d="M9 17h4" /></> : null}
      {name === 'package' ? <><path d="m12 2 8 4.5v9L12 20l-8-4.5v-9Z" /><path d="m4 6.5 8 4.5 8-4.5" /><path d="M12 11v9" /></> : null}
      {name === 'calendar' ? <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="m9 16 2 2 4-5" /></> : null}
      {name === 'chart' ? <><path d="M3 20h18" /><path d="M7 16v-5" /><path d="M12 16V8" /><path d="M17 16v-9" /><path d="m7 11 5-3 5-1" /></> : null}
      {name === 'clock' ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> : null}
      {name === 'bot' ? <><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 5V3" /><path d="M9 13h.01" /><path d="M15 13h.01" /><path d="M9 17h6" /></> : null}
      {name === 'chevron' ? <path d="m9 18 6-6-6-6" /> : null}
      {name === 'plus' ? <><path d="M12 5v14" /><path d="M5 12h14" /></> : null}
      {name === 'edit' ? <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></> : null}
      {name === 'arrowLeft' ? <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></> : null}
      {name === 'check' ? <path d="m5 12 4 4L19 6" /> : null}
      {name === 'circle' ? <circle cx="12" cy="12" r="5" /> : null}
      {name === 'trend' ? <><path d="M3 17 9 11l4 4 8-8" /><path d="M14 7h7v7" /></> : null}
      {name === 'x' ? <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></> : null}
      {name === 'pdf' ? <><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" /><path d="M14 2v5h5" /><path d="M8 15h8" /><path d="M8 18h5" /></> : null}
    </svg>
  );
}

function title(value?: string | null) {
  return String(value || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function initials(name?: string | null) {
  return String(name || 'Lead').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'LD';
}
function phoneForUrl(value?: string | null) {
  return String(value || '').replace(/[^+\d]/g, '');
}
function sortedQuotes(data: LeadProfileData) {
  return [...(data.quotes || [])].sort((a: any, b: any) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
}
function quoteValue(quote: any) {
  return (quote?.lineItems || []).reduce((sum: number, line: any) => sum + Number(line.quantity || 0) * Number(line.unit_price || line.catalog_price_amount || 0), 0);
}
function currency(data: LeadProfileData, quote?: any | null) {
  return quote?.display_currency || quote?.currency || data.lead?.deal_currency || 'USD';
}
function money(value?: number | null, cur = 'USD') {
  return typeof value === 'number' && Number.isFinite(value) ? `${cur} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—';
}
function quoteHref(data: LeadProfileData, quote: any) {
  const status = normalize(quote?.status);
  return LIFECYCLE.has(status) ? `/quotes?status=${encodeURIComponent(status)}&mode=buyers&quoteId=${quote.id}` : `/leads/${data.lead!.id}/quote?quoteId=${quote.id}&step=1`;
}
function primaryQuoteAction(data: LeadProfileData, quote: any | null) {
  if (!quote) return { label: 'Create Quote', href: '' };
  const status = normalize(quote.status);
  if (status === 'accepted') return { label: 'View Locked Quote', href: quoteHref(data, quote) };
  if (LIFECYCLE.has(status)) return { label: 'Open Lifecycle', href: quoteHref(data, quote) };
  if (status === 'approval_pending') return { label: 'Review Approval', href: `/approval-queue?quoteId=${quote.id}` };
  return { label: 'Open Builder', href: `/leads/${data.lead!.id}/quote?quoteId=${quote.id}&step=1` };
}
function nextActionLabel(quote: any | null) {
  const status = normalize(quote?.status);
  if (!quote) return 'Create quote';
  if (status === 'sent') return 'Track buyer response';
  if (status === 'accepted') return 'Create order / handoff';
  if (status === 'approval_pending') return 'Review approval';
  if (BUILDER.has(status)) return 'Continue builder';
  return 'Review quote';
}
function readinessScore(data: LeadProfileData) {
  let score = 25;
  if (data.lead?.email || data.lead?.phone) score += 15;
  if (data.linkedProducts.length) score += 20;
  if (data.linkedMarkets.length) score += 15;
  if (data.quotes.length) score += 15;
  if (data.followUps.length) score += 10;
  return Math.min(100, score);
}
function activeStageName(data: LeadProfileData) {
  return data.stages.find((s) => s.id === data.lead?.stage_id)?.name || 'New Lead';
}
function ownerName(data: LeadProfileData, members: TeamMember[]) {
  const ownerId = data.lead?.owner_user_id;
  return members.find((m) => m.id === ownerId)?.name || data.profiles.find((p: any) => p.id === ownerId)?.full_name || 'Unassigned';
}

function NewQuoteButton({ leadId, sourceQuoteId, label = 'Create New Quote', compact = false }: { leadId: string; sourceQuoteId?: string | null; label?: string; compact?: boolean }) {
  return (
    <form action={createLeadQuoteDraftFromLead}>
      <input type="hidden" name="lead_id" value={leadId} />
      {sourceQuoteId ? <input type="hidden" name="source_quote_id" value={sourceQuoteId} /> : null}
      <input type="hidden" name="force_new" value="true" />
      <button className={compact ? 'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700' : 'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700'}>
        <Icon name="plus" className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {label}
      </button>
    </form>
  );
}

function OwnerControl({ data, members, canReassign }: { data: LeadProfileData; members: TeamMember[]; canReassign?: boolean }) {
  const lead = data.lead!;
  const currentOwner = ownerName(data, members);
  if (!canReassign) return <span id="lead-owner">Owner: <span className="font-semibold text-slate-700">{currentOwner}</span></span>;
  return (
    <form id="lead-owner" action={reassignCanonicalLeadOwner} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1">
      <input type="hidden" name="lead_id" value={lead.id} />
      <span className="text-slate-500">Owner:</span>
      <select name="owner_user_id" defaultValue={lead.owner_user_id || ''} className="h-7 max-w-[150px] rounded-full border-0 bg-transparent px-1 text-xs font-semibold text-slate-700 outline-none">
        <option value="">Unassigned</option>
        {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
      </select>
      <button className="h-7 rounded-full bg-white px-2.5 text-[11px] font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-200">Save</button>
    </form>
  );
}

function StageStrip({ data }: { data: LeadProfileData }) {
  const labels = normalize(data.lead?.lead_type) === 'supplier' ? SUPPLIER_STAGES : BUYER_STAGES;
  const current = data.stages.find((stage) => stage.id === data.lead?.stage_id) || null;
  const currentIndex = Math.max(0, labels.findIndex((label) => normalize(label) === normalize(current?.name)));
  const pipelineId = current?.pipeline_id || null;
  const stageMap = new Map<string, (typeof data.stages)[number]>();
  data.stages.filter((stage) => !pipelineId || stage.pipeline_id === pipelineId).forEach((stage) => {
    const key = normalize(stage.name);
    if (key && !stageMap.has(key)) stageMap.set(key, stage);
  });
  return (
    <div id="stage-strip" className="w-full overflow-x-auto pb-1">
      <div className="grid min-w-[520px] grid-cols-7 items-start gap-1">
        {labels.map((label, index) => {
          const stage = stageMap.get(normalize(label));
          const active = index === currentIndex;
          const completed = index < currentIndex;
          const isWon = /won/i.test(label);
          const isLost = /lost/i.test(label);
          const dot = active
            ? 'border-4 border-emerald-100 bg-emerald-600 text-white ring-2 ring-emerald-500/20'
            : completed
              ? 'bg-emerald-600 text-white'
              : isWon
                ? 'border border-emerald-200 bg-white text-emerald-600'
                : isLost
                  ? 'border border-rose-200 bg-white text-rose-500'
                  : 'border border-slate-200 bg-white text-slate-400';
          const line = index === labels.length - 1 ? 'bg-transparent' : completed || active ? 'bg-emerald-500' : 'border-t border-dashed border-slate-300 bg-transparent';
          const text = active ? 'text-emerald-700' : completed ? 'text-emerald-700' : isWon ? 'text-emerald-700' : isLost ? 'text-rose-600' : 'text-slate-500';
          const iconName: IconName = completed ? 'check' : active ? 'target' : isWon ? 'trend' : isLost ? 'x' : 'circle';
          const content = (
            <>
              <span className="flex items-center">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${dot}`}><Icon name={iconName} className="h-3.5 w-3.5" /></span>
                <span className={`ml-2 h-0.5 flex-1 ${line}`} />
              </span>
              <span className={`mt-2 block text-center text-[11px] font-semibold leading-tight ${text}`}>{label}</span>
            </>
          );
          if (!stage) return <div key={label} className="opacity-80">{content}</div>;
          return (
            <form key={stage.id} action={moveCanonicalLeadStage}>
              <input type="hidden" name="lead_id" value={data.lead!.id} />
              <input type="hidden" name="stage_id" value={stage.id} />
              <button type="submit" className={`w-full rounded-2xl p-1 text-left transition hover:bg-blue-50 ${active ? 'bg-blue-50/80' : ''}`}>{content}</button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, helper, href, accent = 'blue', icon }: { label: string; value: string; helper: string; href?: string; accent?: 'blue' | 'purple' | 'emerald' | 'amber'; icon: IconName }) {
  const tone = accent === 'purple' ? 'bg-purple-500' : accent === 'emerald' ? 'bg-emerald-500' : accent === 'amber' ? 'bg-amber-400' : 'bg-blue-600';
  return (
    <div className="flex min-h-[92px] items-center gap-3.5 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${tone}`}><Icon name={icon} className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 truncate text-lg font-bold text-slate-950">{value}</p>
        {href ? <Link href={href} className="mt-1 inline-flex text-xs font-semibold text-blue-600">{helper} <span className="ml-1">→</span></Link> : <p className="mt-1 text-xs font-semibold text-blue-600">{helper}</p>}
      </div>
    </div>
  );
}

function QuoteBadge({ status }: { status: string }) {
  const s = normalize(status);
  const cls = LOCKED.has(s) ? 'bg-emerald-100 text-emerald-700' : LIFECYCLE.has(s) ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
  return <span className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${cls}`}>{LOCKED.has(s) ? 'Locked' : LIFECYCLE.has(s) ? 'Lifecycle' : 'Builder'}</span>;
}

function QuotesList({ data, quotes }: { data: LeadProfileData; quotes: any[] }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon name="file" /></span>
          <h2 className="text-lg font-bold text-slate-950">Quotes on this Lead</h2>
        </div>
        <NewQuoteButton leadId={data.lead!.id} sourceQuoteId={quotes[0]?.id} label="Create New Quote" compact />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {quotes.map((quote: any) => {
          const amount = quoteValue(quote);
          return (
            <Link key={quote.id} href={quoteHref(data, quote)} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-bold text-slate-950">{quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}</p>
                  <span className="text-slate-300">·</span>
                  <p className="text-base font-semibold text-slate-700">{title(quote.status)}</p>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-600">{(quote.lineItems || []).length} products · {amount ? money(amount, currency(data, quote)) : 'No value'}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <QuoteBadge status={quote.status} />
                <span className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600"><Icon name="chevron" className="h-5 w-5" /></span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function GuruCard({ activeQuote }: { activeQuote: any | null }) {
  const sent = normalize(activeQuote?.status) === 'sent';
  return (
    <aside className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white"><Icon name="bot" className="h-4 w-4" /></span>
        <h3 className="font-bold text-slate-950">Setu Guru</h3>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-800">Recommended action</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{sent ? 'Follow-up and commercial work sit side by side. Track buyer response from lifecycle, then schedule a short pricing/MOQ follow-up if needed.' : 'Keep qualification, quote builder, and follow-up in one path. Create a fresh quote only when scope or terms change.'}</p>
      <Link href="/training" className="mt-4 inline-flex text-sm font-semibold text-emerald-700">Learn more <span className="ml-1">→</span></Link>
    </aside>
  );
}

function SecondaryPanels({ data }: { data: LeadProfileData }) {
  const lead = data.lead!;
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <details id="qualification" className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer list-none">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Qualification & Mapping</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{data.linkedProducts.length} products · {data.linkedMarkets.length} markets</h3>
        </summary>
        <form action={saveCanonicalQualificationMapping} className="mt-4 grid gap-4 border-t border-slate-100 pt-4">
          <input type="hidden" name="lead_id" value={lead.id} />
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Qualification notes<textarea name="qualification_notes" defaultValue={data.workflow?.qualificationNotes ?? lead.notes ?? ''} className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700" /></label>
          <button className="w-fit rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Save qualification</button>
        </form>
      </details>
      <details id="edit-lead" className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer list-none">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Quick Edit</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">Lead, contact, address, deal value</h3>
        </summary>
        <form action={saveCanonicalLeadDetails} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
          <input type="hidden" name="lead_id" value={lead.id} />
          {[
            ['company_name', lead.company_name, 'Company'],
            ['contact_name', lead.contact_name || '', 'Contact name'],
            ['email', lead.email || '', 'Email'],
            ['phone', lead.phone || '', 'Phone'],
            ['whatsapp_number', lead.whatsapp_number || '', 'WhatsApp'],
            ['country', lead.country || '', 'Country'],
            ['deal_value', String(lead.deal_value || ''), 'Deal value'],
            ['deal_currency', lead.deal_currency || 'USD', 'Currency'],
          ].map(([name, value, label]) => <label key={name} className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}<input name={name} defaultValue={value} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700" /></label>)}
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 md:col-span-2">Notes / address<textarea name="notes" defaultValue={lead.notes || ''} className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700" /></label>
          <button className="w-fit rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Save changes</button>
        </form>
      </details>
    </section>
  );
}

export default function LeadCommandCenterPremium({ data, canReassignOwner = false, teamMembers = [], backHref = '/leads' }: Props) {
  const lead = data.lead!;
  const quotes = sortedQuotes(data);
  const activeQuote = quotes[0] || null;
  const activeValue = Number(lead.deal_value || 0) || quoteValue(activeQuote) || null;
  const primary = primaryQuoteAction(data, activeQuote);
  const members = teamMembers.length ? teamMembers : data.profiles.map((p: any) => ({ id: p.id, name: p.full_name || p.username || 'Team member' }));
  const activeStatus = normalize(activeQuote?.status);
  const builderHref = activeQuote ? `/leads/${lead.id}/quote?quoteId=${activeQuote.id}&mode=revise` : `/leads/${lead.id}/quote`;
  const showEditRevise = activeStatus !== 'sent' && !LOCKED.has(activeStatus);
  const whatsAppValue = lead.whatsapp_number || lead.phone;

  return (
    <div className="mx-auto max-w-[1560px] space-y-4 pb-48">
      <section className="rounded-[1.65rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] xl:items-center">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl font-bold text-slate-800">{initials(lead.company_name)}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">{lead.company_name}</h2>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{title(lead.lead_type)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-600">
                <OwnerControl data={data} members={members} canReassign={canReassignOwner} />
                <span className="text-slate-300">|</span>
                <span>Source: {lead.source_label || lead.source_type || 'Manual'}</span>
                <span className="text-slate-300">|</span>
                <span>Market: {data.linkedMarkets.map((m) => m.name).join(', ') || lead.country || '—'}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <a href={`mailto:${lead.email || ''}`} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"><Icon name="mail" className="h-4 w-4 text-blue-600" />{lead.email || 'No email'}</a>
                <a href={`tel:${phoneForUrl(lead.phone)}`} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"><Icon name="phone" className="h-4 w-4 text-slate-500" />{lead.phone || 'No phone'}</a>
                <a href={`https://wa.me/${phoneForUrl(whatsAppValue).replace('+', '')}`} className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-700 shadow-sm"><Icon name="message" className="h-4 w-4" />{whatsAppValue || 'Chat on WhatsApp'}</a>
              </div>
            </div>
          </div>
          <StageStrip data={data} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Readiness Score" value={`${readinessScore(data)} / 100`} helper="Excellent" icon="target" />
        <SummaryCard label="Active Quote" value={activeQuote ? `${activeQuote.quote_number || 'Quote'} · ${title(activeQuote.status)}` : 'No quote'} helper="View Quote" href={activeQuote ? quoteHref(data, activeQuote) : undefined} accent="purple" icon="file" />
        <SummaryCard label="Products Selected" value={`${data.linkedProducts.length} selected`} helper="Manage Products" href="#qualification" accent="emerald" icon="package" />
        <SummaryCard label="Next Action" value={nextActionLabel(activeQuote)} helper="View Tasks" href="/tasks" accent="amber" icon="calendar" />
      </section>

      <section id="work" className="grid gap-4 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div id="follow-up" className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon name="clock" /></span>
            <h2 className="text-lg font-bold text-slate-950">Next Touchpoint</h2>
          </div>
          <FollowUpComposer leadId={lead.id} clientName={lead.company_name} senderName="Ritesh Kapoor" senderCompany="SETU Flow CRM" email={lead.email} whatsapp={lead.whatsapp_number || lead.phone} action={scheduleCanonicalLeadFollowUp} />
        </div>

        <div id="commercial" className="relative rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start gap-3 xl:min-h-[76px] xl:pr-[365px]">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon name="chart" className="h-3.5 w-3.5" /></span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-bold leading-6 text-slate-950">Commercial</h2>
                <p className="mt-1 text-[15px] font-bold leading-5 text-slate-950">{activeQuote ? `${activeQuote.quote_number || 'Quote'} · ${title(activeQuote.status)}` : 'No quote yet'}</p>
                <p className="mt-1 text-[13px] font-medium leading-5 text-slate-500">Open lifecycle, export PDF, or create a fresh quote from this commercial context.</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 xl:absolute xl:right-4 xl:top-4 xl:flex-nowrap">
              {primary.href ? <Link href={primary.href} className="inline-flex h-9 items-center whitespace-nowrap rounded-2xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700">{primary.label}</Link> : null}
              {activeQuote ? <Link href={`/api/quotes/${activeQuote.id}/pdf`} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm"><Icon name="pdf" className="h-3.5 w-3.5" />Customer PDF</Link> : null}
              <NewQuoteButton leadId={lead.id} sourceQuoteId={activeQuote?.id} label="New Quote" compact />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Buyer</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="grid grid-cols-[90px_1fr]"><dt className="text-slate-500">Stage</dt><dd className="font-semibold text-slate-700">{activeStageName(data)}</dd></div>
                <div className="grid grid-cols-[90px_1fr]"><dt className="text-slate-500">Deal Value</dt><dd className="font-semibold text-slate-700">{money(activeValue, currency(data, activeQuote))}</dd></div>
                <div className="grid grid-cols-[90px_1fr]"><dt className="text-slate-500">Market</dt><dd className="font-semibold text-slate-700">{data.linkedMarkets.map((m) => m.name).join(', ') || lead.country || '—'}</dd></div>
              </dl>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Quotes</p>
              <div className="mt-3 grid gap-1 text-sm font-semibold text-blue-900">
                <p>{quotes.length} total</p>
                <p>{quotes.filter((q: any) => LOCKED.has(normalize(q.status))).length} locked</p>
                <p>{quotes.filter((q: any) => !LOCKED.has(normalize(q.status))).length} open</p>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold text-slate-700">Mapped Coverage</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.linkedProducts.slice(0, 6).map((p) => <span key={p.id} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">{p.name}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <QuotesList data={data} quotes={quotes} />
        <GuruCard activeQuote={activeQuote} />
      </section>

      <SecondaryPanels data={data} />

      <div className="fixed bottom-3 left-[calc(8rem+1rem)] right-4 z-30 hidden rounded-[1.35rem] border border-slate-200 bg-white/95 p-2.5 shadow-2xl backdrop-blur md:flex md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2.5">
          <Link href={backHref} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"><Icon name="arrowLeft" />Back to Leads</Link>
          {primary.href ? <Link href={primary.href} className="inline-flex h-10 items-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white">{primary.label}</Link> : <NewQuoteButton leadId={lead.id} />}
          {showEditRevise ? <Link href={builderHref} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"><Icon name="edit" />Edit / Revise</Link> : null}
          <NewQuoteButton leadId={lead.id} sourceQuoteId={activeQuote?.id} label="New Quote" compact />
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Command Center · Premium <span className="text-emerald-500">●</span></span>
      </div>
    </div>
  );
}
