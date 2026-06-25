import Link from 'next/link';
import type { LeadsWorkspaceProps } from '@/features/leads/types/workspace';

function modeHref(mode: 'all' | 'buyers' | 'suppliers') {
  if (mode === 'buyers') return '/leads?mode=buyers';
  if (mode === 'suppliers') return '/leads?mode=suppliers';
  return '/leads';
}

function stageName(stages: LeadsWorkspaceProps['stages'], stageId?: string | null) {
  return stages.find((stage) => stage.id === stageId)?.name ?? 'New Lead';
}

function ownerName(profiles: LeadsWorkspaceProps['profiles'], ownerId?: string | null) {
  const profile = profiles.find((item) => item.id === ownerId);
  return profile?.full_name ?? profile?.username ?? 'Unassigned';
}

export function LeadsWorkspace(props: LeadsWorkspaceProps) {
  const mode = props.initialLeadType === 'buyer' ? 'buyers' : props.initialLeadType === 'supplier' ? 'suppliers' : 'all';
  const leads = props.leads.filter((lead) => {
    if (props.initialLeadType === 'buyer') return lead.lead_type === 'buyer';
    if (props.initialLeadType === 'supplier') return lead.lead_type === 'supplier';
    return true;
  });

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Trade Command Center</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Lead queue</h2>
          <p className="mt-1 text-sm text-slate-500">Open a lead into the dedicated premium Lead Detail page. Quote work now opens in the dedicated Quote Builder route.</p>
        </div>
        <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-black">
          {(['all', 'buyers', 'suppliers'] as const).map((item) => (
            <Link key={item} href={modeHref(item)} className={`rounded-xl px-4 py-2 ${mode === item ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>{item === 'all' ? 'All' : item === 'buyers' ? 'Buyer' : 'Supplier'}</Link>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {leads.length ? leads.map((lead) => {
          const leadQuotes = props.quotes.filter((quote) => quote.lead_id === lead.id);
          const latestQuote = [...leadQuotes].sort((a, b) => String(b.updated_at ?? b.created_at ?? '').localeCompare(String(a.updated_at ?? a.created_at ?? '')))[0] ?? null;
          const productNames = props.leadProductInterests
            .filter((item) => item.lead_id === lead.id)
            .map((item) => props.products.find((product) => product.id === item.product_id)?.name)
            .filter((name): name is string => Boolean(name));
          const marketNames = props.leadMarkets
            .filter((item) => item.lead_id === lead.id)
            .map((item) => props.markets.find((market) => market.id === item.market_id)?.name)
            .filter((name): name is string => Boolean(name));
          return (
            <article key={lead.id} className="grid gap-4 px-6 py-5 transition hover:bg-slate-50 xl:grid-cols-[1.25fr_0.8fr_0.8fr_auto] xl:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{lead.lead_type}</p>
                <Link href={`/leads/${lead.id}`} className="mt-1 block text-xl font-black text-slate-950 hover:text-blue-700">{lead.company_name}</Link>
                <p className="mt-1 text-sm text-slate-500">Owner: {ownerName(props.profiles, lead.owner_user_id)} · Stage: {stageName(props.stages, lead.stage_id)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Products</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{productNames.length ? productNames.slice(0, 4).join(', ') : lead.products_or_needs || 'Not mapped yet'}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Markets / quote</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{marketNames.length ? marketNames.join(', ') : lead.country || 'Market pending'} · {latestQuote ? latestQuote.status : 'No quote yet'}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Link href={`/leads/${lead.id}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:border-blue-200 hover:text-blue-700">Open lead</Link>
                <Link href={latestQuote ? `/leads/${lead.id}/quote?quoteId=${latestQuote.id}` : `/leads/${lead.id}/quote`} className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">{latestQuote ? 'Open quote' : 'Create quote'}</Link>
              </div>
            </article>
          );
        }) : (
          <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">No leads match this view.</div>
        )}
      </div>
    </section>
  );
}

export { getLeadInitials, getLeadCommandCenterHref } from '@/features/leads/components/workspace/leads-workspace-implementation';
