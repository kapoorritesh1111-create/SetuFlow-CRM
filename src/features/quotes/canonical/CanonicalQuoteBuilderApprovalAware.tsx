import Link from 'next/link';
import type { LeadProfileData } from '@/lib/queries/leads';
import CanonicalQuoteBuilder from './CanonicalQuoteBuilder';

type Props = {
  data: LeadProfileData;
  quoteId?: string | null;
  step?: string | null;
  quoteDraftError?: string | null;
  quoteActionError?: string | null;
  saved?: string | null;
};

const TERMINAL = new Set(['accepted', 'rejected', 'expired', 'cancelled', 'declined']);

function title(value?: string | null) {
  return String(value || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function money(value?: number | null, currency = 'USD') {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '-';
}

function sortedQuotes(data: LeadProfileData) {
  return [...data.quotes].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
}

function selectedQuote(data: LeadProfileData, quoteId?: string | null) {
  const quotes = sortedQuotes(data);
  return quoteId ? quotes.find((quote) => quote.id === quoteId) || quotes[0] || null : quotes[0] || null;
}

function currentQuoteVersion(data: LeadProfileData, quote: any | null) {
  if (!quote?.id) return null;
  const versions = (data.quoteVersions ?? []).filter((version: any) => version.quote_id === quote.id);
  if (!versions.length) return null;
  if (quote.current_version_id) {
    const current = versions.find((version: any) => version.id === quote.current_version_id);
    if (current) return current;
  }
  return [...versions].sort((left: any, right: any) => {
    const leftNo = Number(left.version_no ?? 0);
    const rightNo = Number(right.version_no ?? 0);
    if (leftNo !== rightNo) return rightNo - leftNo;
    return String(right.created_at ?? '').localeCompare(String(left.created_at ?? ''));
  })[0] ?? null;
}

function pendingApprovalRequest(data: LeadProfileData, quote: any | null, version: any | null) {
  if (!quote?.id) return null;
  return (data.approvalRequests ?? []).find((request: any) => {
    const status = String(request.status ?? '').toLowerCase();
    return status === 'pending' && (request.quote_id === quote.id || (version?.id && request.quote_version_id === version.id));
  }) ?? null;
}

function quoteCurrency(data: LeadProfileData, quote: any | null) {
  return quote?.display_currency || quote?.currency || data.lead?.deal_currency || 'USD';
}

function quoteTotal(quote: any | null, data: LeadProfileData) {
  const lines = quote?.lineItems?.length ? quote.lineItems : [];
  return lines.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.unit_price || item.catalog_price_amount || 0)), 0);
}

function ApprovalPendingSendGate({ props, quote, version, request }: { props: Props; quote: any; version: any; request: any }) {
  const { data, quoteDraftError, quoteActionError, saved } = props;
  const lead = data.lead!;
  const currency = quoteCurrency(data, quote);
  const total = quoteTotal(quote, data);
  const productCount = quote?.lineItems?.length ?? 0;

  return (
    <div className="space-y-4 pb-20">
      {quoteDraftError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Quote action needs attention: {quoteDraftError}</div> : null}
      {quoteActionError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">Action could not finish: {decodeURIComponent(quoteActionError)}</div> : null}
      {saved ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Saved {saved}. Continue from the next step.</div> : null}

      <section className="rounded-[1.4rem] bg-gradient-to-r from-[#061c2e] via-[#0b2e4a] to-blue-700 p-4 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black">{String(lead.company_name || 'L').slice(0, 2).toUpperCase()}</div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">{lead.company_name}</h1>
                <p className="mt-1 text-sm font-semibold text-blue-100">{title(lead.lead_type)} · {data.linkedMarkets.map((market) => market.name).join(', ') || lead.country || 'Market'} · {currency}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{data.linkedProducts.slice(0, 5).map((product) => <span key={product.id} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]">{product.name}</span>)}</div>
          </div>
          <div className="flex flex-col items-end gap-3 text-right">
            <p className="text-2xl font-black">{data.quotes.length || 0}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">Quotes on Lead</p>
            <div className="flex gap-2">
              <Link href={`/leads/${lead.id}`} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black">Lead Detail</Link>
              <Link href={`/orders?quoteId=${quote.id}`} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black">Orders</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-slate-950">Quote Builder</h2>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Approval pending</span>
          </div>
          <p className="text-xs font-semibold text-slate-400">Capture -&gt; Lead -&gt; Quote -&gt; Order</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {['Product', 'Pricing', 'Terms', 'Review', 'Send Gate'].map((label, index) => {
            const step = index + 1;
            const active = step === 5;
            const done = step < 5;
            return (
              <Link key={label} href={`/leads/${lead.id}/quote?quoteId=${quote.id}&step=${step}`} className="text-center">
                <div className="flex items-center gap-2">
                  <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-xs font-black ${done ? 'bg-emerald-600 text-white' : active ? 'bg-slate-950 text-white ring-4 ring-slate-100' : 'border border-slate-200 bg-white text-slate-400'}`}>{done ? '✓' : step}</span>
                  {step < 5 ? <span className={`hidden h-0.5 flex-1 md:block ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} /> : null}
                </div>
                <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.12em] ${done ? 'text-emerald-700' : active ? 'text-slate-950' : 'text-slate-400'}`}>{label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[1.25rem] border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Send Gate</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Approval is pending before this quote can be sent</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">The database shows the current quote version is already in approval review. The quote cannot be sent until the pending approval request is approved.</p>

          <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-100">
            {[
              ['Data completeness', 'All mandatory fields are completed.', 'Complete', false],
              ['Compliance checks', 'Product, pricing, and trade compliance passed.', 'No issues', false],
              ['Approvals', request?.reason || 'Approval request is pending.', 'Pending', true],
              ['Version status', `Version v${version?.version_no ?? 1} is ${title(version?.status || 'approval_pending')}.`, 'Approval pending', true],
              ['Document readiness', 'Quote PDF is ready and will be attached after approval.', 'Ready', false],
              ['Communication channel', lead.email || 'Buyer email missing', lead.email ? 'Email' : 'Fix needed', !lead.email],
            ].map(([label, help, status, attention]) => (
              <div key={String(label)} className="flex items-center justify-between gap-4 p-4">
                <div className="flex gap-3">
                  <span className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-white ${attention ? 'bg-amber-500' : 'bg-emerald-600'}`}>{attention ? '!' : 'OK'}</span>
                  <div>
                    <p className="font-black text-slate-900">{label}</p>
                    <p className="text-sm font-semibold text-slate-500">{help}</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{status}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div>
              <p className="font-black">Waiting on approval</p>
              <p className="text-sm font-semibold">Do not submit again. Approve or reject the existing pending request first.</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/api/quotes/${quote.id}/pdf`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Preview Quote PDF</Link>
              <Link href="/approval-send" className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700">Open Approval Queue</Link>
              <button disabled className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white opacity-45">Send Quote</button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Quote Summary</p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between"><dt className="font-bold text-slate-500">Quote ID</dt><dd className="font-black text-slate-900">{quote.quote_number || `Q-${quote.id.slice(0, 8)}`}</dd></div>
              <div className="flex justify-between"><dt className="font-bold text-slate-500">Status</dt><dd className="font-black text-slate-900">{title(quote.status)}</dd></div>
              <div className="flex justify-between"><dt className="font-bold text-slate-500">Version</dt><dd className="font-black text-amber-700">{title(version?.status || 'approval_pending')}</dd></div>
              <div className="flex justify-between"><dt className="font-bold text-slate-500">Products</dt><dd className="font-black text-slate-900">{productCount}</dd></div>
              <div className="flex justify-between"><dt className="font-bold text-slate-500">Total</dt><dd className="font-black text-slate-900">{total ? money(total, currency) : '-'}</dd></div>
            </dl>
          </div>
          <aside className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-center gap-2"><span className="rounded-xl bg-emerald-600 px-2 py-1 text-xs font-black text-white">G</span><h3 className="font-black text-slate-950">Setu Guru</h3></div>
            <p className="mt-4 text-sm font-black text-slate-800">Approval guidance</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">This quote is already submitted for approval. Sending is intentionally blocked until approval is complete.</p>
            <Link href="/training" className="mt-4 inline-flex text-sm font-black text-blue-600">View playbook</Link>
          </aside>
        </aside>
      </section>
    </div>
  );
}

export default function CanonicalQuoteBuilderApprovalAware(props: Props) {
  const quote = selectedQuote(props.data, props.quoteId);
  const activeStep = Math.min(5, Math.max(1, Number(props.step || '1') || 1));
  const locked = quote ? TERMINAL.has(String(quote.status || '').toLowerCase()) : false;
  const version = currentQuoteVersion(props.data, quote);
  const request = pendingApprovalRequest(props.data, quote, version);
  const versionStatus = String(version?.status ?? '').toLowerCase();

  if (quote && !locked && activeStep === 5 && (versionStatus === 'approval_pending' || request)) {
    return <ApprovalPendingSendGate props={props} quote={quote} version={version} request={request} />;
  }

  return <CanonicalQuoteBuilder {...props} />;
}
