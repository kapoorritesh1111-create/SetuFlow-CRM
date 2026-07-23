import Link from 'next/link';
import type { LeadProfileData } from '@/lib/queries/leads';
import { createLeadQuoteDraftFromLead } from '@/features/quotes/server/lead-draft-actions';
import {
  completeCanonicalLeadFollowUp,
  moveCanonicalLeadStage,
  saveCanonicalLeadDetails,
  saveCanonicalQualificationMapping,
  scheduleCanonicalLeadFollowUp,
} from './actions';
import FollowUpComposer from './FollowUpComposer';

type Props = { data: LeadProfileData; saved?: string | null; stageError?: string | null; backHref?: string };
const TERMINAL = new Set(['accepted', 'rejected', 'expired', 'cancelled', 'declined']);
const BUYER_STAGES = ['New Lead', 'Qualified', 'Contacted', 'Samples Sent', 'Negotiation', 'Won', 'Lost'];
const SUPPLIER_STAGES = ['New Supplier', 'Qualified', 'Contacted', 'Samples Sent', 'Negotiation', 'Won', 'Lost'];

function title(value?: string | null) {
  return String(value || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmtDate(value?: string | null) {
  if (!value) return 'No follow-up';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function money(value?: number | null, currency?: string | null) {
  return typeof value === 'number' && Number.isFinite(value) ? `${currency || 'USD'} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—';
}
function initials(name?: string | null) {
  return String(name || 'Lead').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'LD';
}
function phoneForUrl(value?: string | null) {
  return String(value || '').replace(/[^+\d]/g, '');
}
function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function sortedQuotes(data: LeadProfileData) {
  return [...(data.quotes || [])].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
}
function quoteTotal(quote: any | null) {
  const lines = quote?.lineItems || [];
  return lines.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unit_price || item.catalog_price_amount || 0), 0);
}
function quoteCurrency(data: LeadProfileData, quote: any | null) {
  return quote?.display_currency || quote?.currency || data.lead?.deal_currency || 'USD';
}
function quoteLastSavedStep(quote: any | null) {
  const status = String(quote?.status || '').toLowerCase();
  if (status === 'approval_pending' || status === 'in_review' || status === 'sent') return 5;
  if ((quote?.lineItems || []).length) return 2;
  return 1;
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
function currentStageName(data: LeadProfileData) {
  return data.stages.find((stage) => stage.id === data.lead?.stage_id)?.name || 'New Lead';
}
function ContactChip({ href, children, disabled }: { href: string; children: React.ReactNode; disabled?: boolean }) {
  const cls = 'inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm';
  return disabled ? <span className={`${cls} opacity-45`}>{children}</span> : <a href={href} className={cls}>{children}</a>;
}
function NewQuoteButton({ leadId, quote, label = 'New Quote' }: { leadId: string; quote?: any | null; label?: string }) {
  return (
    <form action={createLeadQuoteDraftFromLead}>
      <input type="hidden" name="lead_id" value={leadId} />
      {quote?.id ? <input type="hidden" name="source_quote_id" value={quote.id} /> : null}
      {quote?.id ? <input type="hidden" name="force_new" value="true" /> : null}
      <button className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700">{label}</button>
    </form>
  );
}
function QuoteActions({ leadId, quote, compact = false }: { leadId: string; quote: any | null; compact?: boolean }) {
  const locked = quote ? TERMINAL.has(String(quote.status || '').toLowerCase()) : false;
  if (!quote) return <NewQuoteButton leadId={leadId} label="Create Quote" />;
  if (locked) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href={`/leads/${leadId}/quote?quoteId=${quote.id}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">View Locked Quote</Link>
        <NewQuoteButton leadId={leadId} quote={quote} label="Create New Quote" />
      </div>
    );
  }
  const step = quoteLastSavedStep(quote);
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'justify-end' : ''}`}>
      <Link href={`/leads/${leadId}/quote?quoteId=${quote.id}&step=${step}`} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Open Current Quote</Link>
      <Link href={`/leads/${leadId}/quote?quoteId=${quote.id}&step=${step}&mode=revise`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Edit / Revise</Link>
      <NewQuoteButton leadId={leadId} quote={quote} label="New Quote" />
    </div>
  );
}
function StageStrip({ data }: { data: LeadProfileData }) {
  const leadType = String(data.lead?.lead_type || '').toLowerCase();
  const labels = leadType === 'supplier' ? SUPPLIER_STAGES : BUYER_STAGES;
  const current = data.stages.find((stage) => stage.id === data.lead?.stage_id) || null;
  const currentIndex = Math.max(0, labels.findIndex((label) => normalize(label) === normalize(current?.name)));
  const pipelineId = current?.pipeline_id || null;
  const stageMap = new Map<string, (typeof data.stages)[number]>();
  data.stages.filter((stage) => !pipelineId || stage.pipeline_id === pipelineId).forEach((stage) => {
    const key = normalize(stage.name);
    if (key && !stageMap.has(key)) stageMap.set(key, stage);
  });
  return (
    <div id="stage-strip" className="border-t border-slate-100 px-5 py-4">
      <div className="grid grid-cols-7 gap-2">
        {labels.map((label, index) => {
          const stage = stageMap.get(normalize(label)) || null;
          const active = index === currentIndex;
          const completed = index < currentIndex;
          const isWon = /won/i.test(label);
          const isLost = /lost/i.test(label);
          const dot = active ? 'bg-blue-600 ring-4 ring-blue-100' : completed ? 'bg-emerald-500' : isWon ? 'bg-emerald-500' : isLost ? 'bg-rose-500' : 'bg-slate-300';
          const line = index === labels.length - 1 ? 'bg-transparent' : completed || active ? 'bg-emerald-400' : 'bg-slate-200';
          const text = active ? 'text-blue-700' : completed ? 'text-emerald-700' : isWon ? 'text-emerald-700' : isLost ? 'text-rose-600' : 'text-slate-500';
          const marker = <span className="mb-2 flex items-center"><span className={`h-3.5 w-3.5 rounded-full ${dot}`} /><span className={`h-1 flex-1 rounded-full ${line}`} /></span>;
          if (!stage) return <div key={label} className="text-center opacity-60">{marker}<span className={`text-[11px] font-semibold ${text}`}>{label}</span></div>;
          return <form key={stage.id} action={moveCanonicalLeadStage} className="text-center"><input type="hidden" name="lead_id" value={data.lead?.id || ''} /><input type="hidden" name="stage_id" value={stage.id} /><button type="submit" className={`w-full rounded-xl p-1 hover:bg-blue-50 ${active ? 'bg-blue-50' : ''}`} title={`Move to ${label}`}>{marker}<span className={`text-[11px] font-semibold ${text}`}>{completed ? '✓ ' : ''}{label}</span></button></form>;
        })}
      </div>
    </div>
  );
}
function Kpi({ label, value, tone = 'blue' }: { label: string; value: string; tone?: 'blue' | 'purple' | 'emerald' | 'amber' }) {
  const bg = tone === 'purple' ? 'bg-purple-500' : tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-400' : 'bg-blue-500';
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`h-9 w-9 rounded-2xl ${bg}`} /><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 text-base font-semibold text-slate-950">{value}</p></div></div>;
}

export default function CanonicalLeadDetailCompactV2({ data, saved, stageError, backHref = '/leads' }: Props) {
  const lead = data.lead!;
  const quotes = sortedQuotes(data);
  const latestQuote = quotes[0] || null;
  const locked = latestQuote ? TERMINAL.has(String(latestQuote.status || '').toLowerCase()) : false;
  const score = readinessScore(data);
  const quoteValue = quoteTotal(latestQuote);
  const dealValue = Number(lead.deal_value || 0) || quoteValue || null;
  const pendingFollowUp = [...data.followUps].filter((item) => String(item.status || '').toLowerCase() !== 'completed').sort((a, b) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime())[0] || null;
  const phone = phoneForUrl(lead.phone);
  const whatsapp = phoneForUrl(lead.whatsapp_number || lead.phone);
  const savedMessage = saved === 'lead' ? 'Lead details saved.' : saved === 'follow-up' ? 'Follow-up updated.' : saved === 'qualification' ? 'Qualification and mapping saved.' : saved === 'stage' ? 'Lead stage updated.' : null;

  return (
    <div className="space-y-4 pb-24">
      {savedMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">✓ {savedMessage}</div> : null}
      {stageError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">Stage could not update because the database rejected the change. Try again or refresh before moving stage.</div> : null}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Trade Command Center</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Lead Detail</h1></div>
        <div className="flex flex-wrap gap-2"><Link href={backHref} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">Back to Leads</Link><a href="#work" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm">Work Lead</a><a href="#edit-lead" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">Edit Lead</a><QuoteActions leadId={lead.id} quote={latestQuote} /></div>
      </header>

      <section className="overflow-hidden rounded-hero border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5 p-5">
          <div className="flex min-w-0 gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-sky-500 text-xl font-bold text-white">{initials(lead.company_name)}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold tracking-tight text-slate-950">{lead.company_name}</h2><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{title(lead.lead_type)}</span></div><p className="mt-2 text-sm font-medium text-slate-600">Owner: Ritesh Kapoor · Source: {lead.source_label || lead.source_type || 'Trade event'} · {lead.country || 'United States'}</p><p className="mt-2 text-sm font-semibold text-slate-700">Next Move: Send introduction · {fmtDate(pendingFollowUp?.scheduled_at || lead.next_follow_up_at)}</p></div></div>
          <div className="flex flex-wrap gap-2"><ContactChip href={`mailto:${lead.email}`} disabled={!lead.email}>{lead.email || 'No email'}</ContactChip><ContactChip href={`tel:${phone}`} disabled={!phone}>{lead.phone || 'No phone'}</ContactChip><ContactChip href={`https://wa.me/${whatsapp.replace('+', '')}`} disabled={!whatsapp}>{lead.whatsapp_number || lead.phone || 'No WhatsApp'}</ContactChip></div>
        </div>
        <StageStrip data={data} />
      </section>

      <section className="grid gap-3 md:grid-cols-5"><Kpi label="Readiness Score" value={`${score} / 100`} /><Kpi label="Current Quote" value={latestQuote ? `${latestQuote.quote_number || 'v1'} · ${title(latestQuote.status)}` : 'No quote'} tone="purple" /><Kpi label="Products Selected" value={`${data.linkedProducts.length} selected`} tone="emerald" /><Kpi label="Quote Status" value={latestQuote ? title(latestQuote.status) : 'Not Started'} tone="amber" /><Kpi label="Next Step" value={latestQuote ? (locked ? 'Create new quote' : 'Review quote') : 'Create quote'} /></section>

      <section id="work" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <div id="follow-up" className="rounded-panel border border-rose-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-500">Follow-up</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{pendingFollowUp ? fmtDate(pendingFollowUp.scheduled_at) : 'Schedule next touchpoint'}</h3></div><span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600">{pendingFollowUp ? 'Active' : 'Needed'}</span></div>
          <FollowUpComposer leadId={lead.id} clientName={lead.company_name} senderName="Ritesh Kapoor" senderCompany="SETU Flow CRM" email={lead.email} whatsapp={lead.whatsapp_number || lead.phone} action={scheduleCanonicalLeadFollowUp} />
          {pendingFollowUp ? <form action={completeCanonicalLeadFollowUp} className="mt-2"><input type="hidden" name="lead_id" value={lead.id} /><input type="hidden" name="follow_up_id" value={pendingFollowUp.id} /><button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Mark Completed</button></form> : null}
        </div>

        <div id="commercial" className="rounded-panel border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Commercial</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{latestQuote ? `${latestQuote.quote_number || 'Quote'} · ${title(latestQuote.status)}` : 'No quote yet'}</h3><p className="mt-1 text-xs font-medium text-slate-500">Open the current quote at its last saved builder state, revise it, or start a new quote.</p></div></div>
          <div className="mt-4"><QuoteActions leadId={lead.id} quote={latestQuote} compact /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Buyer</p><p className="mt-2 text-sm font-medium text-slate-700">Stage: <span className="font-semibold">{currentStageName(data)}</span></p><p className="text-sm font-medium text-slate-700">Deal: <span className="font-semibold">{money(dealValue, lead.deal_currency || quoteCurrency(data, latestQuote))}</span></p><p className="text-sm font-medium text-slate-700">Market: <span className="font-semibold">{data.linkedMarkets.map((m) => m.name).join(', ') || lead.country || '—'}</span></p></div><div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Quotes</p><p className="mt-2 text-sm font-medium text-blue-900">{quotes.length} total</p><p className="text-sm font-medium text-blue-900">{quotes.filter((q) => TERMINAL.has(String(q.status).toLowerCase())).length} locked</p><p className="text-sm font-medium text-blue-900">{quotes.filter((q) => !TERMINAL.has(String(q.status).toLowerCase())).length} open</p></div></div>
          <div className="mt-4 rounded-2xl border border-slate-100 p-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Mapped coverage</p><div className="mt-2 flex flex-wrap gap-2">{data.linkedProducts.slice(0, 5).map((p) => <span key={p.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{p.name}</span>)}</div></div>
        </div>

        <aside className="rounded-panel border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="flex items-center gap-2"><span className="rounded-xl bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">G</span><h3 className="font-semibold text-slate-950">Setu Guru</h3></div><p className="mt-4 text-sm font-semibold text-slate-800">Recommended action</p><p className="mt-1 text-sm leading-6 text-slate-600">{latestQuote ? 'Continue the current quote or complete the approval decision. Use Edit / Revise when you need to move backward and change quote details.' : 'Finish qualification and create a quote from mapped product interests.'}</p><p className="mt-4 text-sm font-semibold text-emerald-700">Premium workflow</p><p className="mt-1 text-sm leading-6 text-slate-600">Follow-up and commercial work sit side by side. Deeper edit panels stay below the fold.</p></aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <details id="qualification" className="rounded-panel border border-slate-200 bg-white p-4 shadow-sm"><summary className="cursor-pointer list-none"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Qualification & Mapping</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{data.linkedProducts.length} products · {data.linkedMarkets.length} markets</h3></summary><form action={saveCanonicalQualificationMapping} className="mt-4 grid gap-4 border-t border-slate-100 pt-4"><input type="hidden" name="lead_id" value={lead.id} /><label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Qualification notes<textarea name="qualification_notes" defaultValue={data.workflow?.qualificationNotes ?? lead.notes ?? ''} className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700" /></label><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Products<select name="product_ids" multiple defaultValue={data.linkedProducts.map((product) => product.id)} className="min-h-28 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700">{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Markets<select name="market_ids" multiple defaultValue={data.linkedMarkets.map((market) => market.id)} className="min-h-28 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700">{data.markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</select></label></div><button className="w-fit rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Save qualification & mapping</button></form></details>
        <details id="edit-lead" className="rounded-panel border border-slate-200 bg-white p-4 shadow-sm"><summary className="cursor-pointer list-none"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Quick Edit</p><h3 className="mt-1 text-lg font-semibold text-slate-950">Lead, contact, address, deal value</h3></summary><form action={saveCanonicalLeadDetails} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2"><input type="hidden" name="lead_id" value={lead.id} />{[['company_name', lead.company_name, 'Company'], ['contact_name', lead.contact_name || '', 'Contact name'], ['email', lead.email || '', 'Email'], ['phone', lead.phone || '', 'Phone'], ['whatsapp_number', lead.whatsapp_number || '', 'WhatsApp'], ['country', lead.country || '', 'Country'], ['deal_value', String(lead.deal_value || ''), 'Deal value'], ['deal_currency', lead.deal_currency || 'USD', 'Currency'], ['website', lead.website || '', 'Website']].map(([name, value, label]) => <label key={name} className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}<input name={name} defaultValue={value} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700" /></label>)}<label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 md:col-span-2">Notes / address<textarea name="notes" defaultValue={lead.notes || ''} className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-700" /></label><button className="w-fit rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Save changes</button></form></details>
      </section>

      <div className="fixed bottom-4 left-[calc(8rem+1rem)] right-4 z-20 hidden rounded-panel border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur md:flex md:items-center md:justify-between"><div className="flex gap-2"><Link href={backHref} className="inline-flex h-12 items-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700">Back to Leads</Link><QuoteActions leadId={lead.id} quote={latestQuote} /><a href="#work" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700">Work Lead</a><a href="#edit-lead" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700">Quick Edit</a></div><span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Command Center · Premium Compact</span></div>
    </div>
  );
}
