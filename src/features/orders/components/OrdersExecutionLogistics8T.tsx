'use client';

type LogisticsStatus = 'missing' | 'draft' | 'prepared' | 'approved' | 'sent' | 'selected' | 'planned' | 'dispatched' | 'delivered' | 'synced' | 'error' | 'complete';

export type OrderLogistics8T = {
  orderId: string;
  companyName: string;
  currentStage?: string | null;
  packingPlan?: {
    id: string;
    status: string | null;
    planType: string | null;
    templateKey: string | null;
    pallets: number | null;
    cases: number | null;
    units: number | null;
    netWeightKg: number | null;
    grossWeightKg: number | null;
    cbm: number | null;
  } | null;
  freightRequest?: {
    id: string;
    status: string | null;
    shipmentMode: string | null;
    requestMethod: string | null;
    originPort: string | null;
    destinationPort: string | null;
    sentAt: string | null;
    selectedQuoteId: string | null;
  } | null;
  freightQuote?: {
    id: string;
    providerName: string | null;
    quotedAmount: number | null;
    currency: string | null;
    transitDays: number | null;
    status: string | null;
  } | null;
  shipment?: {
    id: string;
    status: string | null;
    shipmentMode: string | null;
    carrierName: string | null;
    forwarderName: string | null;
    bookingReference: string | null;
    bolAwbNumber: string | null;
    trackingNumber: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
  } | null;
  dispatchDocument?: {
    id: string;
    status: string | null;
    documentType: string | null;
    sentAt: string | null;
    openedAt: string | null;
  } | null;
  financeSync?: {
    id: string;
    status: string | null;
    externalSystem: string | null;
    externalId: string | null;
    syncedAt: string | null;
    errorMessage: string | null;
  } | null;
};

function fmtNum(value: number | null | undefined, suffix = '') {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

function fmtMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${currency ?? 'USD'} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function titleCase(value: string | null | undefined) {
  return String(value ?? '').split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Missing';
}

function toneFor(status: LogisticsStatus | string | null | undefined) {
  const value = String(status ?? '').toLowerCase();
  if (['approved', 'selected', 'planned', 'dispatched', 'delivered', 'synced', 'complete'].includes(value)) return 'green';
  if (['prepared', 'sent', 'draft'].includes(value)) return 'amber';
  if (['error', 'failed', 'missing'].includes(value)) return 'red';
  return 'slate';
}

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`sf8t-pill sf8t-${tone}`}>{children}</span>;
}

function Lane({ title, status, body, meta }: { title: string; status: string | null | undefined; body: React.ReactNode; meta?: string }) {
  return <article className={`sf8t-lane sf8t-lane-${toneFor(status)}`}>
    <header><div><small>{title}</small><h3>{titleCase(status)}</h3></div><Pill tone={toneFor(status)}>{status ? titleCase(status) : 'Missing'}</Pill></header>
    <div className="sf8t-body">{body}</div>
    {meta ? <footer>{meta}</footer> : null}
  </article>;
}

function readiness(order: OrderLogistics8T) {
  const blockers: string[] = [];
  if (!order.packingPlan) blockers.push('Packing plan missing');
  if (order.packingPlan && !['approved'].includes(String(order.packingPlan.status ?? '').toLowerCase())) blockers.push('Packing plan not approved');
  if (!order.freightRequest) blockers.push('Freight request missing');
  if (order.freightRequest && !order.freightRequest.selectedQuoteId) blockers.push('Freight quote not selected');
  if (['shipment_booking', 'dispatch_invoice', 'completed'].includes(String(order.currentStage ?? '')) && !order.shipment) blockers.push('Shipment booking missing');
  if (['dispatch_invoice', 'completed'].includes(String(order.currentStage ?? '')) && !order.dispatchDocument) blockers.push('Dispatch invoice document missing');
  if (String(order.currentStage ?? '') === 'completed' && !order.financeSync) blockers.push('Finance sync/receipt closeout missing');
  return blockers;
}

export function OrdersExecutionLogistics8T({ orders }: { orders: OrderLogistics8T[] }) {
  const packingReady = orders.filter((order) => order.packingPlan?.status === 'approved').length;
  const freightReady = orders.filter((order) => order.freightRequest?.selectedQuoteId).length;
  const shipped = orders.filter((order) => ['dispatched', 'delivered'].includes(String(order.shipment?.status ?? ''))).length;
  const complete = orders.filter((order) => order.financeSync?.status === 'synced' || order.shipment?.status === 'delivered').length;

  return <section className="sf8t-wrap">
    <header className="sf8t-top"><div><small>Sprint 8T execution lanes</small><h2>Packing, freight, dispatch & closeout readiness</h2><p>These cards read structured execution records. They do not mutate quote history or replace approval gates.</p></div><div className="sf8t-kpis"><Kpi label="Packing approved" value={`${packingReady}/${orders.length}`} /><Kpi label="Freight selected" value={`${freightReady}/${orders.length}`} /><Kpi label="Shipped" value={`${shipped}/${orders.length}`} /><Kpi label="Closeout" value={`${complete}/${orders.length}`} /></div></header>
    <div className="sf8t-grid">{orders.map((order) => {
      const blockers = readiness(order);
      return <article key={order.orderId} className="sf8t-order"><header className="sf8t-order-head"><div><small>{titleCase(order.currentStage)}</small><h3>{order.companyName}</h3></div><Pill tone={blockers.length ? 'amber' : 'green'}>{blockers.length ? `${blockers.length} open` : 'Ready'}</Pill></header>
        <div className="sf8t-lanes">
          <Lane title="Packing" status={order.packingPlan?.status ?? 'missing'} meta={`${fmtNum(order.packingPlan?.pallets)} pallets · ${fmtNum(order.packingPlan?.cbm)} CBM`} body={<><b>{titleCase(order.packingPlan?.planType)}</b><span>{order.packingPlan?.templateKey ?? 'No template'} · {fmtNum(order.packingPlan?.grossWeightKg, ' kg gross')}</span><span>{fmtNum(order.packingPlan?.cases)} cases · {fmtNum(order.packingPlan?.units)} units</span></>} />
          <Lane title="Freight" status={order.freightRequest?.selectedQuoteId ? 'selected' : order.freightRequest?.status ?? 'missing'} meta={`${titleCase(order.freightRequest?.shipmentMode)} · ${order.freightRequest?.requestMethod ?? 'method pending'}`} body={<><b>{order.freightQuote?.providerName ?? 'No provider selected'}</b><span>{fmtMoney(order.freightQuote?.quotedAmount, order.freightQuote?.currency)} · {order.freightQuote?.transitDays ?? '—'} days</span><span>{order.freightRequest?.originPort ?? 'Origin pending'} → {order.freightRequest?.destinationPort ?? 'Destination pending'}</span></>} />
          <Lane title="Shipment" status={order.shipment?.status ?? 'missing'} meta={`Dispatch ${fmtDate(order.shipment?.dispatchedAt)} · Delivery ${fmtDate(order.shipment?.deliveredAt)}`} body={<><b>{order.shipment?.carrierName ?? order.shipment?.forwarderName ?? 'No carrier booked'}</b><span>{order.shipment?.bookingReference ?? 'Booking pending'} · {order.shipment?.trackingNumber ?? 'Tracking pending'}</span><span>{order.shipment?.bolAwbNumber ?? 'BOL/AWB pending'}</span></>} />
          <Lane title="Dispatch invoice" status={order.dispatchDocument?.status ?? 'missing'} meta={`Sent ${fmtDate(order.dispatchDocument?.sentAt)} · Opened ${fmtDate(order.dispatchDocument?.openedAt)}`} body={<><b>{titleCase(order.dispatchDocument?.documentType)}</b><span>{order.dispatchDocument?.id ? 'Document tracked in order_documents' : 'No dispatch invoice evidence'}</span></>} />
          <Lane title="Finance closeout" status={order.financeSync?.status ?? 'missing'} meta={`Queue/manual reference ${fmtDate(order.financeSync?.syncedAt)}`} body={<><b>{order.financeSync?.externalSystem ?? 'Pending adapter only'}</b><span>{order.financeSync?.externalId ?? order.financeSync?.errorMessage ?? 'Receipt/payment closeout pending'}</span></>} />
        </div>
        <ul className="sf8t-blockers">{blockers.length ? blockers.map((blocker) => <li key={blocker}>{blocker}</li>) : <li>No logistics blockers found for this seeded stage.</li>}</ul>
      </article>;
    })}</div>
    <style jsx global>{styles}</style>
  </section>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="sf8t-kpi"><span>{label}</span><strong>{value}</strong></div>;
}

const styles = `.sf8t-wrap{background:#eef4f8;padding:0 26px 26px;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui}.sf8t-top,.sf8t-order{background:white;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 14px 34px #0f172a12}.sf8t-top{padding:18px 20px;margin-bottom:14px;display:grid;grid-template-columns:1fr auto;gap:16px}.sf8t-top small,.sf8t-order small,.sf8t-lane small{color:#0c7fff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.sf8t-top h2,.sf8t-order h3,.sf8t-lane h3{margin:2px 0 0;color:#082f49}.sf8t-top p{color:#64748b;font-size:12px;margin:5px 0 0}.sf8t-kpis{display:grid;grid-template-columns:repeat(4,110px);gap:8px}.sf8t-kpi{border:1px solid #dbe7f3;border-radius:16px;background:#f8fafc;padding:10px}.sf8t-kpi span{display:block;font-size:9px;color:#64748b;font-weight:900;text-transform:uppercase}.sf8t-kpi strong{display:block;margin-top:5px;color:#082f49;font-size:18px}.sf8t-grid{display:grid;gap:14px}.sf8t-order{padding:16px}.sf8t-order-head{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:12px}.sf8t-lanes{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.sf8t-lane{border:1px solid #e2e8f0;background:#f8fafc;border-radius:18px;padding:12px;border-top:4px solid #cbd5e1;min-height:150px}.sf8t-lane-green{border-top-color:#059669}.sf8t-lane-amber{border-top-color:#d97706}.sf8t-lane-red{border-top-color:#dc2626}.sf8t-lane header{display:flex;justify-content:space-between;gap:8px}.sf8t-body{display:grid;gap:5px;margin-top:12px;color:#334155;font-size:12px}.sf8t-body b{color:#082f49}.sf8t-body span{color:#64748b}.sf8t-lane footer{margin-top:12px;color:#475569;font-size:11px;font-weight:800}.sf8t-pill{border:1px solid #dbe7f3;background:#f8fafc;border-radius:999px;padding:5px 9px;color:#475569;font-size:10px;font-weight:900;white-space:nowrap}.sf8t-pill.sf8t-green{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.sf8t-pill.sf8t-amber{background:#fffbeb;border-color:#fde68a;color:#92400e}.sf8t-pill.sf8t-red{background:#fff1f2;border-color:#fecaca;color:#be123c}.sf8t-blockers{margin:12px 0 0;padding-left:18px;color:#92400e;font-size:12px;line-height:1.5}.sf8t-blockers li:first-child:last-child{color:#047857}@media(max-width:1380px){.sf8t-lanes{grid-template-columns:repeat(2,minmax(0,1fr))}.sf8t-kpis{grid-template-columns:repeat(2,110px)}}@media(max-width:760px){.sf8t-wrap{padding:0 14px 20px}.sf8t-top{grid-template-columns:1fr}.sf8t-kpis,.sf8t-lanes{grid-template-columns:1fr}}`;
