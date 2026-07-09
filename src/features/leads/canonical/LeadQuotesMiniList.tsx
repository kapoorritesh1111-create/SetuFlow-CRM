import Link from 'next/link';
import type { LeadProfileData } from '@/lib/queries/leads';
import { createLeadQuoteDraftFromLead } from '@/features/quotes/server/lead-draft-actions';

const LOCKED = new Set(['accepted', 'rejected', 'expired', 'cancelled', 'declined']);
const LIFECYCLE = new Set(['sent', 'accepted', 'rejected', 'expired', 'cancelled', 'declined']);

function title(value?: string | null) {
  return String(value || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
function sortedQuotes(data: LeadProfileData) {
  return [...(data.quotes || [])].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
}
function total(quote: any) {
  return (quote?.lineItems || []).reduce((sum: number, line: any) => sum + Number(line.quantity || 0) * Number(line.unit_price || line.catalog_price_amount || 0), 0);
}
function currency(data: LeadProfileData, quote: any) {
  return quote?.display_currency || quote?.currency || data.lead?.deal_currency || 'USD';
}
function quoteHref(data: LeadProfileData, quote: any) {
  const status = String(quote?.status || '').toLowerCase();
  if (LIFECYCLE.has(status)) return `/quotes?status=${encodeURIComponent(status)}&mode=buyers&quoteId=${quote.id}`;
  return `/leads/${data.lead!.id}/quote?quoteId=${quote.id}&step=1`;
}

export default function LeadQuotesMiniList({ data }: { data: LeadProfileData }) {
  const quotes = sortedQuotes(data);
  if (!quotes.length) return null;
  return (
    <section className="mx-auto mt-4 max-w-[1600px] rounded-panel border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Quotes on this Lead</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{quotes.length} commercial record{quotes.length === 1 ? '' : 's'}</h2>
        </div>
        <form action={createLeadQuoteDraftFromLead}>
          <input type="hidden" name="lead_id" value={data.lead!.id} />
          <input type="hidden" name="force_new" value="true" />
          <button className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Create New Quote</button>
        </form>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {quotes.map((quote: any) => {
          const status = String(quote.status || '').toLowerCase();
          const amount = total(quote);
          const lifecycle = LIFECYCLE.has(status);
          return (
            <article key={quote.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-950">{title(quote.status)}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-600">{(quote.lineItems || []).length} products · {amount ? `${currency(data, quote)} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'No value'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${LOCKED.has(status) ? 'bg-emerald-100 text-emerald-700' : lifecycle ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{lifecycle ? 'Lifecycle' : LOCKED.has(status) ? 'Locked' : 'Builder'}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={quoteHref(data, quote)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white">{lifecycle ? 'Open Lifecycle' : 'Open Builder'}</Link>
                <Link href={`/api/quotes/${quote.id}/pdf`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Customer PDF</Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
