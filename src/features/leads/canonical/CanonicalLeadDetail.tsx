import Link from 'next/link';
import type { LeadProfileData } from '@/lib/queries/leads';
import { createLeadQuoteDraftFromLead } from '@/features/quotes/server/lead-draft-actions';
import { completeCanonicalLeadFollowUp, moveCanonicalLeadStage, saveCanonicalLeadDetails, saveCanonicalQualificationMapping, scheduleCanonicalLeadFollowUp } from './actions';

type Props = { data: LeadProfileData; saved?: string | null; backHref?: string };

const TERMINAL = new Set(['accepted', 'rejected', 'expired', 'cancelled', 'declined']);
const BUYER_STAGES = ['New Lead', 'Qualified', 'Contacted', 'Samples Sent', 'Negotiation', 'Won', 'Lost'];
const SUPPLIER_STAGES = ['New Supplier', 'Qualified', 'Contacted', 'Samples Sent', 'Negotiation', 'Won', 'Lost'];

function fmtDate(value?: string | null) {
  if (!value) return 'No follow-up';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function money(value?: number | null, currency?: string | null) {
  if (typeof value !== 'number') return '—';
  return `${currency || 'USD'} ${value.toLocaleString()}`;
}

function initials(name?: string | null) {
  return String(name || 'Lead').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'LD';
}

function title(value?: string | null) {
  return String(value || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function phoneForUrl(value?: string | null) {
  return String(value || '').replace(/[^+\d]/g, '');
}

function sortedQuotes(data: LeadProfileData) {
  return [...(data.quotes || [])].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
}

function readinessScore(data: LeadProfileData) {
  let score = 25;
  if (data.lead?.email || data.lead?.phone) score += 15;
  if (data.followUps.length) score += 10;
  if (data.linkedProducts.length) score += 20;
  if (data.linkedMarkets.length) score += 15;
  if (data.quotes.length) score += 10;
  if (!data.complianceItems.some((item) => !['approved', 'waived', 'complete', 'completed'].includes(String(item.status || '').toLowerCase()))) score += 5;
  return Math.min(100, score);
}

function currentStageName(data: LeadProfileData) {
  return data.stages.find((stage) => stage.id === data.lead?.stage_id)?.name || 'New Lead';
}

function normalizeStageName(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function ContactChip({ href, icon, children, disabled }: { href: string; icon: string; children: React.ReactNode; disabled?: boolean }) {
  const cls = 'inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700';
  return disabled ? <span className={`${cls} opacity-45`}>{icon} {children}</span> : <a href={href} className={cls}>{icon} {children}</a>;
}

function QuotePrimaryActions({ leadId, quote }: { leadId: string; quote: any | null }) {
  const status = String(quote?.status || '').toLowerCase();
  const locked = quote ? TERMINAL.has(status) : false;
  if (!quote) {
    return (
      <form action={createLeadQuoteDraftFromLead}>
        <input type="hidden" name="lead_id" value={leadId} />
        <button className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm">Create Quote</button>
      </form>
    );
  }
  if (locked) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href={`/leads/${leadId}/quote?quoteId=${quote.id}`} className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700">View Locked Quote</Link>
        <form action={createLeadQuoteDraftFromLead}>
          <input type="hidden" name="lead_id" value={leadId} />
          <input type="hidden" name="source_quote_id" value={quote.id} />
          <input type="hidden" name="force_new" value="true" />
          <button className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm">Create New Quote</button>
        </form>
      </div>
    );
  }
  return <Link href={`/leads/${leadId}/quote?quoteId=${quote.id}&step=1`} className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm">Open Current Quote</Link>;
}

function StageStrip({ data }: { data: LeadProfileData }) {
  const leadType = String(data.lead?.lead_type || '').toLowerCase();
  const wantedLabels = leadType === 'supplier' ? SUPPLIER_STAGES : BUYER_STAGES;
  const currentStage = data.stages.find((stage) => stage.id === data.lead?.stage_id) || null;
  const pipelineId = currentStage?.pipeline_id || null;
  const stageMap = new Map<string, (typeof data.stages)[number]>();
  data.stages
    .filter((stage) => !pipelineId || stage.pipeline_id === pipelineId)
    .forEach((stage) => {
      const key = normalizeStageName(stage.name);
      if (key && !stageMap.has(key)) stageMap.set(key, stage);
    });
  const stages = wantedLabels.map((label) => ({ label, stage: stageMap.get(normalizeStageName(label)) || null }));
  const currentId = data.lead?.stage_id;
  return (
    <div className="border-t border-slate-100 px-6 py-5">
      <div className="grid grid-cols-7 gap-3">
        {stages.map(({ label, stage }, index) => {
          const active = stage?.id === currentId || (!stage && normalizeStageName(currentStage?.name) === normalizeStageName(label));
          const isWon = /won/i.test(label);
          const isLost = /lost/i.test(label);
          const marker = <><span className={`h-3 w-3 rounded-full ${active ? 'bg-blue-600 ring-4 ring-blue-100' : isWon ? 'bg-emerald-500' : isLost ? 'bg-rose-500' : 'bg-slate-300'}`} /><span className={`h-0.5 flex-1 ${index === stages.length - 1 ? 'bg-transparent' : active ? 'bg-blue-500' : 'bg-slate-200'}`} /></>;
          if (!stage) {
            return (
              <div key={label} className="text-center opacity-70">
                <span className="mb-2 flex items-center">{marker}</span>
                <span className={`text-xs font-black ${active ? 'text-blue-700' : isWon ? 'text-emerald-700' : isLost ? 'text-rose-600' : 'text-slate-500'}`}>{label}</span>
              </div>
            );
          }
          return (
            <form key={stage.id} action={moveCanonicalLeadStage} className="text-center">
              <input type="hidden" name="lead_id" value={data.lead?.id || ''} />
              <input type="hidden" name="stage_id" value={stage.id} />
              <button type="submit" title={`Move to ${label}`} className="group w-full">
                <span className="mb-2 flex items-center">{marker}</span>
                <span className={`text-xs font-black ${active ? 'text-blue-700' : isWon ? 'text-emerald-700' : isLost ? 'text-rose-600' : 'text-slate-500'}`}>{label}</span>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, helper }: { icon: string; label: string; value: string; helper?: string }) {
  return <div className="flex items-center gap-4 border-r border-slate-100 px-5 last:border-r-0"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm">{icon}</div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value}</p>{helper ? <p className="text-xs font-semibold text-slate-400">{helper}</p> : null}</div></div>;
}

export default function CanonicalLeadDetail({ data, saved, backHref = '/leads' }: Props) {
  const lead = data.lead!;
  const quotes = sortedQuotes(data);
  const latestQuote = quotes[0] || null;
  const quoteStatus = String(latestQuote?.status || '').toLowerCase();
  const locked = latestQuote ? TERMINAL.has(quoteStatus) : false;
  const score = readinessScore(data);
  const pendingFollowUp = [...data.followUps].filter((item) => String(item.status || '').toLowerCase() !== 'completed').sort((a, b) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime())[0] || null;
  const phone = phoneForUrl(lead.phone);
  const whatsapp = phoneForUrl(lead.whatsapp_number || lead.phone);

  const savedMessage = saved === 'lead' ? 'Lead details saved.' : saved === 'follow-up' ? 'Follow-up updated.' : saved === 'qualification' ? 'Qualification and mapping saved.' : null;

  return (
    <div className="space-y-5 pb-24">
      {savedMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-800">✓ {savedMessage}</div> : null}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Trade Command Center</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Lead Detail</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={backHref} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">Back to Leads</Link>
          <a href="#edit-lead" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">✎ Edit Lead</a>
          <a href="#follow-up" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">▣ Schedule Follow-up</a>
          <a href="#qualification" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm">Qualify Lead</a>
          <a href="#mapping" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">Map Products</a>
          <Link href={`/leads/${lead.id}/share-price-list`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">Share Price List</Link>
          <QuotePrimaryActions leadId={lead.id} quote={latestQuote} />
        </div>
      </header>

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5 p-6">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-sky-500 text-xl font-black text-white">{initials(lead.company_name)}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-3xl font-black tracking-tight text-slate-950">{lead.company_name}</h2><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">{title(lead.lead_type)}</span></div>
              <p className="mt-2 text-sm font-semibold text-slate-600">Owner: Ritesh Kapoor · Source: {lead.source_label || lead.source_type || 'Trade event'} · {lead.country || 'United States'}</p>
              <p className="mt-3 text-sm font-bold text-slate-700">Next Move: Send introduction · {fmtDate(pendingFollowUp?.scheduled_at || lead.next_follow_up_at)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ContactChip href={`mailto:${lead.email}`} icon="✉" disabled={!lead.email}>{lead.email || 'No email'}</ContactChip>
            <ContactChip href={`tel:${phone}`} icon="☎" disabled={!phone}>{lead.phone || 'No phone'}</ContactChip>
            <ContactChip href={`https://wa.me/${whatsapp.replace('+', '')}`} icon="🟢" disabled={!whatsapp}>{lead.whatsapp_number || lead.phone || 'No WhatsApp'}</ContactChip>
          </div>
        </div>
        <StageStrip data={data} />
      </section>

      <section className="grid rounded-[1.5rem] border border-slate-200 bg-white py-4 shadow-sm md:grid-cols-5">
        <Kpi icon="↗" label="Readiness Score" value={`${score} / 100`} />
        <Kpi icon="▣" label="Current Quote" value={latestQuote ? `${latestQuote.quote_number || 'v1'} · ${title(latestQuote.status)}` : 'No quote'} />
        <Kpi icon="▰" label="Products Selected" value={`${data.linkedProducts.length} selected`} />
        <Kpi icon="◷" label="Quote Status (Parent)" value={latestQuote ? title(latestQuote.status) : 'Not Started'} />
        <Kpi icon="→" label="Next Step" value={latestQuote ? (locked ? 'Create new quote' : 'Review compliance') : 'Create quote'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
        <div id="follow-up" className="rounded-[1.5rem] border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">1. Follow-up</p><span className="rounded-full bg-rose-500 px-3 py-1 text-[10px] font-black text-white">{pendingFollowUp ? 'ACTIVE' : 'NEEDED'}</span></div>
          <h3 className="mt-4 text-xl font-black text-slate-950">{pendingFollowUp ? fmtDate(pendingFollowUp.scheduled_at) : 'Schedule the next touchpoint'}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">Keep the commercial thread moving with a clear agenda and owner.</p>
          <form action={scheduleCanonicalLeadFollowUp} className="mt-5 grid gap-3">
            <input type="hidden" name="lead_id" value={lead.id} />
            <input name="scheduled_at" type="datetime-local" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700" />
            <textarea name="notes" placeholder="Agenda: pricing, MOQs, delivery timelines..." className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700" />
            <div className="flex flex-wrap gap-2"><button className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-black text-white">Schedule Follow-up</button></div>
          </form>
          {pendingFollowUp ? <form action={completeCanonicalLeadFollowUp} className="mt-3"><input type="hidden" name="lead_id" value={lead.id} /><input type="hidden" name="follow_up_id" value={pendingFollowUp.id} /><button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">✓ Mark Completed</button></form> : null}
        </div>

        <form id="qualification" action={saveCanonicalQualificationMapping} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <input type="hidden" name="lead_id" value={lead.id} />
          {data.linkedProducts.map((product) => <input key={product.id} type="hidden" name="product_ids" value={product.id} />)}
          {data.linkedMarkets.map((market) => <input key={market.id} type="hidden" name="market_ids" value={market.id} />)}
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">2. Qualification</p>
          <h3 className="mt-4 text-xl font-black text-slate-950">{data.workflow?.qualificationStatus === 'qualified' ? 'Qualified' : 'Qualification in progress'}</h3>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-700">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Readiness<select name="readiness" defaultValue="high" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
            <textarea name="qualification_notes" defaultValue={data.workflow?.qualificationNotes ?? lead.notes ?? ''} className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" />
            {['Buyer type confirmed', 'Source validated', 'Budget indicated', 'Authority confirmed', 'Timeline confirmed'].map((item) => <div key={item} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span>{item}</span><span className="text-emerald-600">✓</span></div>)}
          </div>
          <button className="mt-4 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white">Save qualification</button>
        </form>

        <aside className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center gap-2"><span className="rounded-xl bg-emerald-600 px-2 py-1 text-xs font-black text-white">G</span><h3 className="font-black text-slate-950">Setu Guru</h3></div>
          <p className="mt-4 text-sm font-bold text-slate-800">Recommended action</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{latestQuote ? 'Review compliance before sending the current draft.' : 'Finish qualification and create a quote from mapped product interests.'}</p>
          <p className="mt-4 text-sm font-bold text-emerald-700">Version rule</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Edits stay on the current draft until the quote is sent. Locked quotes are preserved.</p>
        </aside>
      </section>

      <form action={saveCanonicalQualificationMapping} className="rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-sm">
        <input type="hidden" name="lead_id" value={lead.id} />
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Map Products & Markets</p><h3 className="mt-1 text-xl font-black text-slate-950">Coverage for quote creation</h3></div><button className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">Save mapping</button></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Products<select name="product_ids" multiple defaultValue={data.linkedProducts.map((product) => product.id)} className="min-h-36 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700">{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Markets<select name="market_ids" multiple defaultValue={data.linkedMarkets.map((market) => market.id)} className="min-h-36 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700">{data.markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</select></label>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-500">Hold Ctrl/Cmd to select multiple values. Saved mappings seed new quote drafts and readiness scoring.</p>
      </form>

      <section id="mapping" className="grid gap-4 xl:grid-cols-[1fr_1.25fr_1fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-950">About Buyer</h3>
          <dl className="mt-4 grid gap-3 text-sm"><div className="flex justify-between"><dt className="font-bold text-slate-400">Account</dt><dd className="font-black text-slate-900">{title(lead.lead_type)}</dd></div><div className="flex justify-between"><dt className="font-bold text-slate-400">Market</dt><dd className="font-black text-slate-900">{data.linkedMarkets.map((m) => m.name).join(', ') || lead.country || '—'}</dd></div><div className="flex justify-between"><dt className="font-bold text-slate-400">Deal Value</dt><dd className="font-black text-slate-900">{money(lead.deal_value, lead.deal_currency)}</dd></div><div className="flex justify-between"><dt className="font-bold text-slate-400">Stage</dt><dd className="font-black text-slate-900">{currentStageName(data)}</dd></div></dl>
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">{lead.notes || 'No notes yet.'}</p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h3 className="font-black text-slate-950">Quotes on this Lead</h3><Link href={latestQuote ? `/leads/${lead.id}/quote?quoteId=${latestQuote.id}` : `/leads/${lead.id}/quote`} className="text-sm font-black text-blue-600">Open Quote Builder →</Link></div>
          <div className="mt-4 grid gap-3">{quotes.length ? quotes.map((quote) => <div key={quote.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}</p><p className="mt-1 font-black text-slate-950">{title(quote.status)} {TERMINAL.has(String(quote.status).toLowerCase()) ? '· Locked' : '· Current'}</p></div><Link href={`/leads/${lead.id}/quote?quoteId=${quote.id}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700">Open</Link></div></div>) : <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-bold text-slate-500">No quotes yet.</p>}</div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500"><span>{quotes.filter((q) => !TERMINAL.has(String(q.status).toLowerCase())).length} open quote</span><span>{quotes.filter((q) => TERMINAL.has(String(q.status).toLowerCase())).length} locked</span></div>
        </div>

        <div id="edit-lead" className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-950">Quick Edit</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Lead, contact, deal value, country, and notes.</p>
          <form action={saveCanonicalLeadDetails} className="mt-4 grid gap-2">
            <input type="hidden" name="lead_id" value={lead.id} />
            {[['company_name', lead.company_name, 'Company'], ['contact_name', lead.contact_name || '', 'Contact name'], ['email', lead.email || '', 'Email'], ['phone', lead.phone || '', 'Phone'], ['whatsapp_number', lead.whatsapp_number || '', 'WhatsApp'], ['country', lead.country || '', 'Country'], ['deal_value', String(lead.deal_value || ''), 'Deal value'], ['deal_currency', lead.deal_currency || 'USD', 'Currency']].map(([name, value, label]) => <label key={name} className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}<input name={name} defaultValue={value} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700" /></label>)}
            <textarea name="notes" defaultValue={lead.notes || ''} className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" />
            <button className="mt-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Save changes</button>
          </form>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-black text-slate-950">Recent Activities</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{data.activities.slice(0, 4).map((activity) => <div key={activity.id} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-black text-slate-800">{activity.message || title(activity.kind)}</p><p className="mt-2 text-xs font-semibold text-slate-400">{fmtDate(activity.occurred_at || activity.created_at)}</p></div>)}</div>
      </section>

      <div className="fixed bottom-4 left-[calc(8rem+1rem)] right-4 z-20 hidden rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur md:flex md:items-center md:justify-between">
        <div className="flex gap-2"><Link href={backHref} className="inline-flex h-12 items-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700">Back to Leads</Link><QuotePrimaryActions leadId={lead.id} quote={latestQuote} /><a href="#follow-up" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700">Schedule Follow-up</a><a href="#edit-lead" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700">Quick Edit</a></div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">Command Center · One Page Workspace</span>
      </div>
    </div>
  );
}
