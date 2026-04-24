import Link from 'next/link'

type ProductOption = {
  id: string
  name: string
  catalogPriceAmount: number | null
  catalogPriceCurrency: string | null
}

type QuoteRecord = {
  id: string
  currency: string | null
}

type ProgressionGuardSummary = {
  blockerCount: number
  blockerReasons: string[]
}

function money(value: number | null | undefined, currency = 'USD') {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export function ReferenceQuoteBuilderFlow({
  leadId,
  quotes,
  products,
  leadCommandHref,
  quoteSendGuard,
  canManageQuotes,
  canSendQuotes,
  readOnlyMessage,
  sendReadOnlyMessage,
}: {
  leadId: string
  quotes: QuoteRecord[]
  products: ProductOption[]
  leadCommandHref: string
  quoteSendGuard?: ProgressionGuardSummary
  canManageQuotes: boolean
  canSendQuotes: boolean
  readOnlyMessage?: string | null
  sendReadOnlyMessage?: string | null
}) {
  const focusQuote = quotes[0] ?? null
  const currency = String(focusQuote?.currency ?? products[0]?.catalogPriceCurrency ?? 'USD').toUpperCase()
  const productA = products[0] ?? null
  const productB = products[1] ?? products[0] ?? null
  const catalogA = productA?.catalogPriceAmount ?? 6400
  const catalogB = productB?.catalogPriceAmount ?? 5200
  const quotedA = Math.round(catalogA * 0.906)
  const quotedB = catalogB
  const totalA = quotedA * 10
  const totalB = quotedB * 14
  const freight = 14500
  const grandTotal = totalA + totalB + freight
  const approvalBlocked = (quoteSendGuard?.blockerCount ?? 1) > 0 || Boolean(readOnlyMessage || sendReadOnlyMessage) || !canSendQuotes
  const steps = [
    ['Product lock', 'Lead, product, market', 'done'],
    ['Pricing', 'Catalog baseline + override', 'current'],
    ['Terms', 'Validity, freight, payment', 'upcoming'],
    ['Review', 'Internal check', 'upcoming'],
    ['Send', 'Approval gate', 'upcoming'],
  ] as const
  const readiness = [
    ['Lead context', 'Locked from Command Center', true],
    ['Catalog baseline', productA ? 'Pricing loaded' : 'Fallback baseline visible', true],
    ['Override reason', 'Required for -9.4% override', false],
    ['Send gate', approvalBlocked ? 'Approval pending' : 'Ready to send', !approvalBlocked],
  ] as const

  return (
    <section className="relative space-y-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4 shadow-sm lg:p-5" data-reference="setuflow-quotes-redesign">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Quote Builder</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Governed quote from lead workflow</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Capture → Lead → <strong className="text-slate-900">Quote</strong> → Order</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={leadCommandHref} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Back to Lead Command Center</Link>
                <button type="button" disabled={!canManageQuotes} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Save draft</button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              {steps.map(([label, detail, state], index) => (
                <div key={label} className={`rounded-[12px] border px-3 py-3 ${state === 'current' ? 'border-amber-200 bg-amber-50' : state === 'done' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Step {index + 1}</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">{label}</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">{detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Step 1</p><h3 className="text-lg font-extrabold text-slate-950">Product lock</h3></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">Lead context locked</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Lead</div><div className="mt-1 text-sm font-bold text-slate-900">{focusQuote ? `Q-${focusQuote.id.slice(0, 8).toUpperCase()}` : `Lead ${leadId.slice(0, 8)}`}</div></div>
              <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">RFQ ref</div><div className="mt-1 text-sm font-bold text-slate-900">None — new quote</div></div>
              <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Quote basis</div><div className="mt-1 text-sm font-bold text-slate-900">FOB · {currency}</div></div>
            </div>
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Step 2</p><h3 className="text-lg font-extrabold text-slate-950">Pricing and line items</h3></div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">Override review required</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-[12px] border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400"><tr><th className="px-3 py-3">Product</th><th className="px-3 py-3 text-right">Catalog</th><th className="px-3 py-3 text-right">Quote price</th><th className="px-3 py-3 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr><td className="px-3 py-3"><div className="font-bold text-slate-900">{productA?.name ?? 'Beetroot Powder'} · 10 MT <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">-9.4% override</span></div><div className="mt-1 text-[11px] text-slate-500">Reason required before approval</div></td><td className="px-3 py-3 text-right font-semibold text-slate-500">{money(catalogA, currency)}/MT</td><td className="px-3 py-3 text-right font-bold text-amber-700">{money(quotedA, currency)}/MT</td><td className="px-3 py-3 text-right font-extrabold text-slate-900">{money(totalA, currency)}</td></tr>
                  <tr><td className="px-3 py-3"><div className="font-bold text-slate-900">{productB?.name ?? 'Mango Powder'} · 14 MT</div><div className="mt-1 text-[11px] text-slate-500">Catalog baseline accepted</div></td><td className="px-3 py-3 text-right font-semibold text-slate-500">{money(catalogB, currency)}/MT</td><td className="px-3 py-3 text-right font-bold text-slate-900">{money(quotedB, currency)}/MT</td><td className="px-3 py-3 text-right font-extrabold text-slate-900">{money(totalB, currency)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-900"><strong>Approval required:</strong> one line is below catalog baseline. Add an override reason and submit approval before send.</div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_240px]">
              <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Override reason</span><textarea className="mt-2 min-h-[88px] w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" defaultValue="Buyer requested introductory pricing against volume commitment. Approval required before send." /></label>
              <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3"><div className="flex justify-between text-xs"><span className="text-slate-500">Lines</span><span className="font-bold text-slate-900">{money(totalA + totalB, currency)}</span></div><div className="mt-2 flex justify-between text-xs"><span className="text-slate-500">Freight / handling</span><span className="font-bold text-slate-900">{money(freight, currency)}</span></div><div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-extrabold"><span>Quote total</span><span className="text-slate-950">{money(grandTotal, currency)}</span></div></div>
            </div>
          </div>

          <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Quote validity</span><select className="mt-2 h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-sm"><option>30 days</option><option>15 days</option><option>45 days</option></select></label>
              <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Payment terms</span><select className="mt-2 h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-sm"><option>30% advance / 70% against BL</option><option>50% advance / 50% dispatch</option></select></label>
              <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Incoterm</span><select className="mt-2 h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-sm"><option>FOB</option><option>CIF</option><option>Ex-Factory</option></select></label>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Readiness gate</p><h3 className="mt-1 text-lg font-extrabold text-slate-950">Quote send checklist</h3><div className="mt-4 space-y-2">{readiness.map(([label, value, ok]) => <div key={label} className="flex gap-3 rounded-[12px] border border-slate-200 bg-slate-50 p-3"><span className={`mt-0.5 h-3 w-3 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} /><div><div className="text-sm font-bold text-slate-900">{label}</div><div className="text-[11px] font-semibold text-slate-500">{value}</div></div></div>)}</div></div>
          <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-4 shadow-sm"><div className="text-sm font-extrabold text-rose-900">Send gate — approval pending</div><p className="mt-2 text-xs font-semibold leading-5 text-rose-800">This quote cannot be sent until override approval and live send blockers are cleared.</p>{quoteSendGuard?.blockerReasons?.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-rose-800">{quoteSendGuard.blockerReasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}</div>
          <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Builder actions</p><div className="mt-3 grid gap-2"><button type="button" disabled={!canManageQuotes} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Save draft</button><button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Submit approval request</button><button type="button" disabled={approvalBlocked || !canSendQuotes} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Send quote to buyer</button></div></div>
        </aside>
      </div>
      <div className="sticky bottom-3 z-20 rounded-full border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur"><div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-600"><span>Quote Builder · Step 2 of 5 · Pricing</span><div className="flex gap-2"><button type="button" className="rounded-full border border-slate-200 px-3 py-1.5">Previous</button><button type="button" className="rounded-full bg-slate-900 px-3 py-1.5 text-white">Next: Terms</button></div></div></div>
    </section>
  )
}
