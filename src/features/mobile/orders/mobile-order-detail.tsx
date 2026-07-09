import Link from 'next/link';
import { SetuIcon } from '@/components/ui/setu-icon';
import { advanceOrderStageAction, uploadOrderDocumentAction } from '@/features/orders/server';
import type { MobileOrder } from './mobile-orders-data';

const stages = [
  { key: 'order_created', label: 'Confirmed' },
  { key: 'payment_requested', label: 'Payment' },
  { key: 'production_ready', label: 'Docs Ready' },
  { key: 'dispatch_ready', label: 'Dispatch' },
  { key: 'delivered', label: 'Delivered' },
] as const;

function money(value: number | null, currency: string) {
  if (value == null) return 'Value pending';
  return `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function normalizeStage(value: string) {
  const current = value.toLowerCase();
  if (['completed', 'paid_closed'].includes(current)) return 'delivered';
  if (['dispatched'].includes(current)) return 'dispatch_ready';
  if (['production_in_progress', 'actual_lines', 'buyer_doc', 'packing'].includes(current)) return 'production_ready';
  if (current.includes('payment')) return 'payment_requested';
  return current;
}

function nextStage(order: MobileOrder) {
  const current = normalizeStage(order.stage);
  if (order.blockerReasons.length > 0) return null;
  if (current === 'order_created') return 'payment_requested';
  if (current === 'payment_requested' || current === 'payment_partial') return 'production_ready';
  if (current === 'production_ready') return 'dispatch_ready';
  if (current === 'dispatch_ready') return 'dispatched';
  if (current === 'dispatched') return 'delivered';
  return null;
}

function Timeline({ order }: { order: MobileOrder }) {
  const activeIndex = Math.max(0, stages.findIndex((stage) => stage.key === normalizeStage(order.stage)));
  return (
    <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Execution timeline</p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {stages.map((stage, index) => {
          const active = index <= activeIndex;
          return (
            <div key={stage.key} className="text-center">
              <div className={`mx-auto h-2 rounded-full ${active ? 'bg-blue-600' : 'bg-slate-200'}`} />
              <p className={`mt-2 text-[10px] font-black uppercase leading-tight ${active ? 'text-blue-700' : 'text-slate-400'}`}>{stage.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value ?? '—'}</p>
    </div>
  );
}

export function MobileOrderDetail({ order }: { order: MobileOrder }) {
  const targetStage = nextStage(order);
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-4">
      <Link href="/mobile/orders" className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
        ← Orders
      </Link>
      <section className="rounded-hero bg-gradient-to-br from-slate-950 to-blue-950 p-5 text-white shadow-xl shadow-blue-950/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Order detail</p>
            <h1 className="mt-2 text-2xl font-black">{order.companyName}</h1>
            <p className="mt-1 text-sm font-semibold text-blue-100">{order.orderNumber} · {order.status}</p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white">{order.stage.replaceAll('_', ' ')}</span>
        </div>
      </section>

      <section className="mt-4 space-y-3">
        <Timeline order={order} />
        <div className="grid grid-cols-2 gap-3 rounded-panel border border-slate-200 bg-white p-4 shadow-sm">
          <Kv label="Value" value={money(order.totalValue, order.currency)} />
          <Kv label="Incoterm" value={order.incoterm} />
          <Kv label="Payment" value={order.paymentStatus ?? order.paymentTerms} />
          <Kv label="Dispatch" value={order.dispatchStatus ?? order.fulfillmentStatus} />
        </div>

        {order.blockerReasons.length ? (
          <div className="rounded-panel border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]">Active blockers</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
              {order.blockerReasons.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          </div>
        ) : (
          <div className="rounded-panel border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800">No active blockers found.</div>
        )}

        <section className="rounded-panel border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Documents</p>
          <div className="mt-3 space-y-2">
            {order.documents.length ? order.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{doc.type}</p>
                  <p className="text-xs font-semibold text-slate-500">{doc.status}</p>
                </div>
                <SetuIcon name="file" className="h-5 w-5 text-blue-600" />
              </div>
            )) : <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No order documents captured yet.</p>}
          </div>
          {order.contractId ? (
            <form action={uploadOrderDocumentAction} className="mt-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-3">
              <input type="hidden" name="contract_id" value={order.contractId} />
              <input type="hidden" name="doc_type" value="order_mobile_upload" />
              <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-blue-700" htmlFor={`order-doc-${order.id}`}>Upload missing document</label>
              <input id={`order-doc-${order.id}`} name="file" type="file" className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-blue-100" />
              <button type="submit" className="mt-3 min-h-10 w-full rounded-xl bg-blue-600 px-3 text-xs font-black text-white">Upload document</button>
            </form>
          ) : (
            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">Upload is available after the order is linked to a contract.</p>
          )}
        </section>

        <section className="rounded-panel border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Lines</p>
          <div className="mt-3 space-y-2">
            {order.lines.slice(0, 8).map((line) => (
              <div key={line.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-sm font-black text-slate-950">{line.productName}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Ordered {line.quantity ?? 0} · Packed {line.packedQuantity ?? 0} · Dispatched {line.dispatchedQuantity ?? 0}</p>
              </div>
            ))}
            {!order.lines.length ? <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No lines loaded.</p> : null}
          </div>
        </section>
      </section>

      <div className="fixed inset-x-0 bottom-[calc(86px+env(safe-area-inset-bottom))] z-[250] mx-auto max-w-[430px] px-4">
        {targetStage ? (
          <form action={advanceOrderStageAction}>
            <input type="hidden" name="order_id" value={order.id} />
            <input type="hidden" name="target_stage" value={targetStage} />
            <button type="submit" className="min-h-12 w-full rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-200">Advance to {targetStage.replaceAll('_', ' ')}</button>
          </form>
        ) : (
          <button type="button" disabled className="min-h-12 w-full rounded-2xl bg-slate-300 px-4 text-sm font-black text-slate-600">Review blockers before next action</button>
        )}
      </div>
    </main>
  );
}
