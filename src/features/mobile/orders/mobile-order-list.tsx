import Link from 'next/link';
import { SetuIcon } from '@/components/ui/setu-icon';
import type { MobileOrder } from './mobile-orders-data';

function money(value: number | null, currency: string) {
  if (value == null) return 'Value pending';
  return `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function countReady(orders: MobileOrder[]) {
  return orders.filter((order) => order.blockerReasons.length === 0).length;
}

function countFinanceReady(orders: MobileOrder[]) {
  return orders.filter((order) => String(order.paymentStatus ?? '').toLowerCase().includes('paid')).length;
}

function countFreightReady(orders: MobileOrder[]) {
  return orders.filter((order) => ['dispatch_ready', 'dispatched', 'delivered'].includes(order.stage)).length;
}

function KpiCard({ label, value, helper, icon }: { label: string; value: number; helper: string; icon: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-50 text-blue-700">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-semibold text-slate-600">{helper}</p>
    </div>
  );
}

function OrderCard({ order }: { order: MobileOrder }) {
  const blocked = order.blockerReasons.length > 0;
  return (
    <Link href={`/mobile/orders/${order.id}`} className="block rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-slate-950">{order.companyName}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{order.orderNumber} · {order.status}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${blocked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {blocked ? 'Blocked' : 'Ready'}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Value</p>
          <p className="mt-1 text-xs font-black text-slate-900">{money(order.totalValue, order.currency)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Docs</p>
          <p className="mt-1 text-xs font-black text-slate-900">{order.documents.length}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Lines</p>
          <p className="mt-1 text-xs font-black text-slate-900">{order.lines.length}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">Current stage</p>
          <p className="mt-1 text-sm font-black text-slate-950">{order.stage.replaceAll('_', ' ')}</p>
        </div>
        <SetuIcon name="orders" className="h-5 w-5 text-blue-600" />
      </div>
    </Link>
  );
}

export function MobileOrderList({ orders }: { orders: MobileOrder[] }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-4">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-blue-950 p-5 text-white shadow-xl shadow-blue-950/20">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Orders</p>
        <h1 className="mt-2 text-2xl font-black">Execution queue</h1>
        <p className="mt-2 text-sm font-semibold text-blue-100">Check status, docs, blockers, and the next fulfillment step from mobile.</p>
      </section>
      <section className="mt-4 grid gap-3">
        <KpiCard label="All orders" value={orders.length} helper="Loaded execution orders" icon="📊" />
        <KpiCard label="Ready now" value={countReady(orders)} helper="No current blocker" icon="✅" />
        <KpiCard label="Finance ready" value={countFinanceReady(orders)} helper="Payment captured" icon="💳" />
        <KpiCard label="Freight ready" value={countFreightReady(orders)} helper="Dispatch lane active" icon="🚚" />
      </section>
      <section className="mt-5 space-y-3">
        {orders.length ? orders.map((order) => <OrderCard key={order.id} order={order} />) : (
          <div className="rounded-[1.5rem] bg-white p-6 text-center text-sm font-semibold text-slate-500">No execution orders found.</div>
        )}
      </section>
    </main>
  );
}
