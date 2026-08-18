'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { money, type EventSpend } from '@/lib/trade-events/analytics';
import { saveEventSpend, type EventSpendState } from '@/features/trade-events/server/event-spend-actions';

function SaveButton() {
  const status = useFormStatus();
  return <button type="submit" disabled={status.pending} className="min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50">{status.pending ? 'Saving…' : 'Save spend'}</button>;
}

export function EventRoiPanel({ eventId, spend, spendTotal, pipelineValue, pipelineCurrency, wonRevenue, revenueCurrency, quoteCount, orderCount, roiMultiple }: { eventId: string; spend: EventSpend; spendTotal: number; pipelineValue: number; pipelineCurrency: string | null; wonRevenue: number; revenueCurrency: string | null; quoteCount: number; orderCount: number; roiMultiple: number | null }) {
  const [state, action] = useFormState<EventSpendState | undefined, FormData>(saveEventSpend, undefined);
  return <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Event ROI</p><h3 className="mt-1 text-lg font-black text-slate-950">Outcome vs spend</h3></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">{roiMultiple == null ? 'ROI pending' : `${roiMultiple.toFixed(2)}×`}</span></div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{money(spendTotal, spend.currency)}</p><p className="text-[10px] font-bold text-slate-500">Event spend</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{pipelineCurrency ? money(pipelineValue, pipelineCurrency) : 'Not linked'}</p><p className="text-[10px] font-bold text-slate-500">Pipeline</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{revenueCurrency ? money(wonRevenue, revenueCurrency) : wonRevenue ? 'Mixed currency' : 'No won revenue'}</p><p className="text-[10px] font-bold text-slate-500">Order revenue</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{quoteCount}</p><p className="text-[10px] font-bold text-slate-500">Quotes</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{orderCount}</p><p className="text-[10px] font-bold text-slate-500">Orders</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{roiMultiple == null ? '—' : `${roiMultiple.toFixed(2)}×`}</p><p className="text-[10px] font-bold text-slate-500">Revenue / spend</p></div>
    </div>
    <details className="mt-4 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-black text-blue-700">Edit event spend</summary><form action={action} className="mt-3 grid gap-2 sm:grid-cols-2"><input type="hidden" name="trade_event_id" value={eventId} /><select name="currency" defaultValue={spend.currency} className="min-h-10 rounded-xl border border-slate-200 px-3"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option></select>{[['booth','Booth'],['registration','Registration'],['travel','Travel'],['hotel','Hotel'],['collateral','Collateral'],['misc','Misc.']].map(([key,label]) => <label key={key} className="text-xs font-bold text-slate-500">{label}<input name={key} type="number" min="0" step="0.01" defaultValue={spend[key as keyof EventSpend] as number} className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900" /></label>)}<div className="sm:col-span-2"><SaveButton /></div>{state?.error ? <p className="text-xs font-bold text-rose-700 sm:col-span-2">{state.error}</p> : null}{state?.success ? <p className="text-xs font-bold text-emerald-700 sm:col-span-2">{state.success}</p> : null}</form></details>
    <p className="mt-3 text-[11px] font-semibold text-slate-500">Setu Flow does not combine currencies. ROI is shown only when event spend and won order revenue share one currency.</p>
  </section>;
}
