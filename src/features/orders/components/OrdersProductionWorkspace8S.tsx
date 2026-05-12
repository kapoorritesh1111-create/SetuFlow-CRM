'use client';

import { useMemo, useState } from 'react';
import {
  approveActualOrderLinesGateAction,
  approveFirstDocumentGateAction,
  prepareFirstDocumentGateAction,
  previewFirstDocumentGateAction,
} from '@/features/orders/server/execution-order-actions';
import { prepareActualOrderLinesRobustAction } from '@/features/orders/server/actual-order-line-seed-actions';
import { addManualActualOrderLineAction, removeActualOrderLineAction, updateActualOrderLineAction } from '@/features/orders/server/order-line-actions';
import { sendOrderDocumentLinkAction } from '@/features/orders/server/share-actions';

export type CatalogOrderOption8S = {
  id: string;
  label: string;
  productName: string;
  variantName?: string | null;
  skuCode?: string | null;
  hsnCode?: string | null;
  pricingType?: string | null;
  basisLabel: string;
  fobPrice: number | null;
  exFactoryPrice: number | null;
  bulkPrice: number | null;
  currency: string;
};

export type OrderLineComparison8S = {
  id: string;
  productName: string;
  variantName?: string | null;
  skuCode?: string | null;
  hsnCode?: string | null;
  quotedQuantity: number | null;
  actualQuantity: number | null;
  unitOfMeasure: string | null;
  unitPrice: number | null;
  currency: string | null;
  quotedTotal: number | null;
  lineTotal: number | null;
  status: 'unchanged' | 'changed' | 'removed' | 'added' | 'needs_actual_lines';
  reason?: string | null;
  isActual: boolean;
  pricingBasis?: string | null;
};

export type ProductionOrder8S = {
  orderId?: string | null;
  quoteId: string;
  leadId: string;
  contractId: string | null;
  companyName: string;
  country: string | null;
  orgCountry: string | null;
  orderType: 'regional' | 'export';
  currency: string | null;
  quotedTotal: number | null;
  actualTotal: number | null;
  status: string;
  executionState: string;
  currentStage?: string | null;
  approvalState?: string | null;
  sourceQuoteVersionId?: string | null;
  acceptedVersionId?: string | null;
  versionLabel?: string | null;
  documentCount: number;
  gateCount?: number;
  blockerCount: number;
  blockerReasons: string[];
  nextAction: string;
  lines: OrderLineComparison8S[];
  pricingBasis?: string | null;
};

type Filter = 'all' | 'regional' | 'export';

type StageKey =
  | 'quote_approved'
  | 'actual_lines'
  | 'packing_sheet'
  | 'freight_request'
  | 'order_confirmation'
  | 'proforma_invoice'
  | 'trade_requirements'
  | 'shipment_booking'
  | 'dispatch_invoice'
  | 'completed';

const ORDER_STAGES: Array<{ key: StageKey; label: string; sub: string }> = [
  { key: 'quote_approved', label: 'Quote Approved', sub: 'Accepted version' },
  { key: 'actual_lines', label: 'Actual Lines', sub: 'Buyer order lines' },
  { key: 'packing_sheet', label: 'Packing Sheet', sub: 'Pack/freight basis' },
  { key: 'freight_request', label: 'Freight Request', sub: 'Rate request' },
  { key: 'order_confirmation', label: 'Order Confirmation', sub: 'Regional doc' },
  { key: 'proforma_invoice', label: 'Proforma Invoice', sub: 'Export doc' },
  { key: 'trade_requirements', label: 'Trade Requirements', sub: 'Stage blockers' },
  { key: 'shipment_booking', label: 'Shipment Booking', sub: 'Carrier/booking' },
  { key: 'dispatch_invoice', label: 'Dispatch Invoice', sub: 'Final invoice' },
  { key: 'completed', label: 'Completed', sub: 'Receipt/archive' },
];

function fmt(value: number | null, currency: string | null) {
  return value == null ? '—' : `${currency ?? 'USD'} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function titleCase(value: string | null | undefined) {
  return String(value ?? '').split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Review';
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'SF';
}

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`sf8-pill sf8-${tone}`}>{children}</span>;
}

function Kpi({ label, value, mini, tone }: { label: string; value: string | number; mini: string; tone: string }) {
  return <div className={`sf8-kpi sf8-${tone}`}><span>{label}</span><strong>{value}</strong><small>{mini}</small></div>;
}

function Gate({ action, quoteId, children, tone = 'white', extra }: { action: (formData: FormData) => Promise<void>; quoteId: string; children: string; tone?: string; extra?: Record<string, string> }) {
  return <form action={action}><input type="hidden" name="quote_id" value={quoteId} />{extra && Object.entries(extra).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}<button className={`sf8-btn sf8-${tone}`}>{children}</button></form>;
}

function SendDocumentGate({ order, documentType }: { order: ProductionOrder8S; documentType: string }) {
  return <form action={sendOrderDocumentLinkAction} className="sf8-send-gate">
    <input type="hidden" name="order_id" value={order.orderId ?? ''} />
    <input type="hidden" name="quote_id" value={order.quoteId} />
    <input type="hidden" name="document_type" value={documentType} />
    <select name="channel" defaultValue="email" aria-label="Send channel">
      <option value="email">Email</option>
      <option value="whatsapp">WhatsApp</option>
    </select>
    <input name="recipient" placeholder="Recipient email / WhatsApp" />
    <input name="note" placeholder="Optional note" />
    <button className="sf8-btn sf8-green">Send tracked</button>
  </form>;
}

function totalDiff(order: ProductionOrder8S) {
  if (order.quotedTotal == null || order.actualTotal == null) return 'Difference pending';
  const diff = order.actualTotal - order.quotedTotal;
  return `${diff >= 0 ? '+' : ''}${fmt(diff, order.currency)}`;
}

function stageIndexFor(order: ProductionOrder8S) {
  const key = String(order.currentStage ?? order.executionState ?? '').trim().toLowerCase();
  const found = ORDER_STAGES.findIndex((stage) => stage.key === key);
  if (found >= 0) return found;
  if (order.lines.some((line) => line.status === 'needs_actual_lines')) return 0;
  if (!String(order.executionState).includes('approved')) return 1;
  return order.blockerCount ? 2 : 1;
}

function healthTone(order: ProductionOrder8S) {
  if (order.blockerCount > 0) return 'red';
  if (order.lines.some((line) => line.status === 'needs_actual_lines')) return 'amber';
  return 'green';
}

export function OrdersProductionWorkspace8S({ orders, catalogOptions = [] }: { orders: ProductionOrder8S[]; catalogOptions?: CatalogOrderOption8S[] }) {
  const [selectedId, setSelectedId] = useState(orders[0]?.orderId ?? orders[0]?.quoteId ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(() => filter === 'all' ? orders : orders.filter((order) => order.orderType === filter), [orders, filter]);
  const selected = useMemo(() => visible.find((order) => (order.orderId ?? order.quoteId) === selectedId) ?? visible[0] ?? orders[0] ?? null, [visible, selectedId, orders]);
  const stage = selected ? stageIndexFor(selected) : 0;
  const ready = orders.filter((order) => order.blockerCount === 0 && order.lines.length > 0 && !order.lines.some((line) => line.status === 'needs_actual_lines')).length;
  const blockedOrders = orders.filter((order) => order.blockerCount > 0);
  const activeTotal = orders.reduce((sum, order) => sum + Number(order.actualTotal ?? order.quotedTotal ?? 0), 0);

  if (!selected) {
    return <main className="sf8"><Top filter={filter} setFilter={setFilter} /><div className="sf8-empty">No accepted execution orders yet.</div><style jsx global>{styles}</style></main>;
  }

  return <main className="sf8">
    <Top filter={filter} setFilter={(nextFilter) => { setFilter(nextFilter); const next = (nextFilter === 'all' ? orders : orders.filter((order) => order.orderType === nextFilter))[0]; if (next) setSelectedId(next.orderId ?? next.quoteId); }} />
    <section className="sf8-kpis">
      <Kpi tone="blue" label="Orders loaded" value={orders.length} mini="From structured orders table" />
      <Kpi tone="amber" label="Needs action" value={orders.length - ready} mini="Before next gate" />
      <Kpi tone="red" label="Blocked" value={blockedOrders.length} mini={blockedOrders[0]?.blockerReasons[0] ?? 'No blockers'} />
      <Kpi tone="green" label="Healthy" value={ready} mini="Lines + source version OK" />
      <Kpi tone="purple" label="Stages covered" value={new Set(orders.map((order) => order.currentStage ?? order.executionState)).size} mini="Seeded stage coverage" />
      <Kpi tone="slate" label="Active value" value={fmt(activeTotal, selected.currency)} mini="Actual or quoted total" />
    </section>

    <section className="sf8-layout">
      <aside className="sf8-queue">
        <div className="sf8-queue-head"><div><b>Order queue</b><p>Auto-classified regional/export. Click a row to open.</p></div><Pill tone="blue">{visible.length} shown</Pill></div>
        <input className="sf8-search" placeholder="Search buyer, product, country, blocker" />
        <div className="sf8-filter"><FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton><FilterButton active={filter === 'regional'} onClick={() => setFilter('regional')}>Regional</FilterButton><FilterButton active={filter === 'export'} onClick={() => setFilter('export')}>Export</FilterButton></div>
        <div className="sf8-list">{visible.map((order) => {
          const key = order.orderId ?? order.quoteId;
          return <button key={key} className={`sf8-row ${key === (selected.orderId ?? selected.quoteId) ? 'selected' : ''}`} onClick={() => setSelectedId(key)}><span className="sf8-avatar">{initials(order.companyName)}</span><span><strong>{order.companyName}</strong><small>{order.orderType} · {titleCase(order.currentStage ?? order.executionState)} · {order.versionLabel ?? 'accepted version'}</small><em>{order.blockerReasons[0] ?? order.nextAction}</em></span><span className="sf8-money">{fmt(order.actualTotal ?? order.quotedTotal, order.currency)}<small>{order.approvalState ?? order.status}</small></span></button>;
        })}</div>
      </aside>

      <section className="sf8-work">
        <article className="sf8-summary">
          <div><small>Open order · {selected.orderType}</small><h2>{selected.companyName}</h2><p>{selected.nextAction}. Pricing basis: {selected.pricingBasis ?? 'review required'}. Source: {selected.versionLabel ?? selected.sourceQuoteVersionId ?? 'accepted quote version'}.</p></div>
          <div className="sf8-total"><strong>{fmt(selected.actualTotal, selected.currency)}</strong><small>Actual order total</small><span>Quoted: {fmt(selected.quotedTotal, selected.currency)}</span><span>Difference: {totalDiff(selected)}</span></div>
        </article>

        <article className="sf8-source-card">
          <div><small>Accepted quote lineage</small><h3>{selected.versionLabel ?? 'Accepted version linked'}</h3><p>Order source version: <code>{selected.sourceQuoteVersionId ?? 'missing'}</code></p></div>
          <div className="sf8-source-badges"><Pill tone={selected.sourceQuoteVersionId && selected.sourceQuoteVersionId === selected.acceptedVersionId ? 'green' : 'red'}>{selected.sourceQuoteVersionId === selected.acceptedVersionId ? 'Order source verified' : 'Version mismatch'}</Pill><Pill tone="blue">{selected.lines.length} order lines</Pill><Pill tone={healthTone(selected)}>{selected.blockerCount ? `${selected.blockerCount} blockers` : 'Healthy'}</Pill></div>
        </article>

        <article className="sf8-blockers"><div><small>Next required action</small><h3>{selected.nextAction}</h3></div><ul>{selected.blockerReasons.length ? selected.blockerReasons.map((reason) => <li key={reason}>{reason}</li>) : <li>No active blocker found for this order.</li>}</ul></article>

        <LineWorkspace order={selected} catalogOptions={catalogOptions} />
        <nav className="sf8-flow">{ORDER_STAGES.map((step, index) => <button key={step.key} className={`${index < stage ? 'done' : ''} ${index === stage ? 'active' : ''}`}><strong>{step.label}</strong><span>{step.sub}</span></button>)}</nav>
        <StagePanel order={selected} stage={stage} />
        <div className="sf8-deprecated">Legacy quote/contract-only workflow is deprecated for new execution. Use structured orders, accepted quote-version lineage, order lines, gates, and order-stage requirements.</div>
      </section>
    </section>
    <style jsx global>{styles}</style>
  </main>;
}

function Top({ filter, setFilter }: { filter: Filter; setFilter: (filter: Filter) => void }) {
  return <header className="sf8-top"><div><small>Sprint 8S document gates</small><h1>Orders / Execution Workspace</h1><p>Prepare, preview, approve, and send tracked order documents from structured order records without mutating quote history.</p></div><div className="sf8-actions"><FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton><FilterButton active={filter === 'regional'} onClick={() => setFilter('regional')}>Regional</FilterButton><FilterButton active={filter === 'export'} onClick={() => setFilter('export')}>Export</FilterButton></div></header>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`sf8-btn ${active ? 'sf8-navy' : 'sf8-white'}`}>{children}</button>;
}

function LineWorkspace({ order, catalogOptions }: { order: ProductionOrder8S; catalogOptions: CatalogOrderOption8S[] }) {
  const confirmed = order.lines.filter((line) => line.status !== 'needs_actual_lines').length;
  const changed = order.lines.filter((line) => ['changed', 'removed', 'added'].includes(line.status)).length;
  return <section className="sf8-lines"><header><div><small>Buyer commitment</small><h2>Quote → Actual order lines</h2><p>Confirm what the buyer is really ordering before internal approval.</p></div><div className="sf8-line-stats"><Pill tone={confirmed === order.lines.length ? 'green' : 'amber'}>{confirmed}/{order.lines.length} confirmed</Pill><Pill tone={changed ? 'amber' : 'blue'}>{changed} changed</Pill><Pill tone="blue">Basis {order.pricingBasis ?? 'review'}</Pill><Pill tone="blue">Actual {fmt(order.actualTotal, order.currency)}</Pill></div></header><div className="sf8-table"><div className="sf8-head"><span>Product</span><span>Quoted</span><span>Actual order</span><span>Status</span><span>Action</span></div>{order.lines.map((line) => <Line key={line.id} quoteId={order.quoteId} line={line} currency={order.currency} />)}</div><form action={addManualActualOrderLineAction} className="sf8-add"><input type="hidden" name="quote_id" value={order.quoteId} /><input type="hidden" name="pricing_basis" value={order.pricingBasis ?? 'FOB'} /><select name="catalog_pricing_rule_id" aria-label="Catalog product"><option value="">Select catalog product / pricing rule</option>{catalogOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><input name="ordered_quantity" placeholder="Qty" /><input name="unit_of_measure" placeholder="UOM" defaultValue="units" /><input name="unit_price" placeholder="Override price" /><input name="currency" placeholder={order.currency ?? 'USD'} /><input name="change_reason" placeholder="Reason required" /><button className="sf8-btn sf8-navy">Add actual line</button></form><p className="sf8-add-help">Catalog selection saves product, variant, SKU/HSN, pricing rule snapshot, and pricing basis. Manual name fallback is intentionally not shown here to avoid commercial drift.</p></section>;
}

function Line({ quoteId, line, currency }: { quoteId: string; line: OrderLineComparison8S; currency: string | null }) {
  const tone = line.status === 'unchanged' ? 'green' : line.status === 'added' ? 'blue' : line.status === 'needs_actual_lines' ? 'amber' : 'amber';
  return <div className="sf8-line"><span><strong>{line.productName}</strong><small>{line.variantName || line.skuCode || line.hsnCode || 'Line item'} · basis {line.pricingBasis ?? 'review'}{line.reason ? ` · ${line.reason}` : ''}</small></span><span><b>{line.quotedQuantity ?? '—'}</b><small>{line.unitOfMeasure ?? 'units'} · {fmt(line.quotedTotal, currency)}</small></span><form action={updateActualOrderLineAction} className="sf8-edit"><input type="hidden" name="quote_id" value={quoteId} /><input type="hidden" name="order_line_id" value={line.id} /><input name="ordered_quantity" defaultValue={line.actualQuantity ?? line.quotedQuantity ?? 0} /><input name="unit_price" defaultValue={line.unitPrice ?? ''} /><input name="change_reason" placeholder="Reason" defaultValue={line.reason ?? ''} /><button className="sf8-btn sf8-blue">Save</button></form><span><Pill tone={tone}>{line.status.replace(/_/g, ' ')}</Pill><small>{fmt(line.lineTotal, currency)}</small></span>{line.isActual ? <form action={removeActualOrderLineAction}><input type="hidden" name="quote_id" value={quoteId} /><input type="hidden" name="order_line_id" value={line.id} /><input type="hidden" name="unit_price" value={line.unitPrice ?? ''} /><button className="sf8-btn">Remove</button></form> : <span className="sf8-preview-note">Prepare actual lines first</span>}</div>;
}

function StagePanel({ order, stage }: { order: ProductionOrder8S; stage: number }) {
  const firstDocument = order.orderType === 'export' ? 'proforma_invoice' : 'order_confirmation';
  const current = ORDER_STAGES[stage] ?? ORDER_STAGES[0];
  return <article className="sf8-stage"><header><div><small>Stage {stage + 1}</small><h2>{current.label}</h2><p>{current.sub}</p></div><Pill tone="blue">{order.nextAction}</Pill></header><div className="sf8-stage-body">{stage === 0 ? <><p>Seed actual execution lines from the accepted quote version, then confirm each line before internal approval.</p><div className="sf8-actions"><Gate action={prepareActualOrderLinesRobustAction} quoteId={order.quoteId} tone="navy">Prepare actual lines</Gate></div></> : <><p>Complete the next approval gate. Sprint 8S persists the document send state in order_documents and writes send events to order_stage_events.</p><div className="sf8-actions"><Gate action={approveActualOrderLinesGateAction} quoteId={order.quoteId} tone="green">Approve actual lines</Gate><Gate action={prepareFirstDocumentGateAction} quoteId={order.quoteId} extra={{ document_gate_type: firstDocument }}>Prepare document</Gate><Gate action={previewFirstDocumentGateAction} quoteId={order.quoteId} tone="blue" extra={{ document_gate_type: firstDocument }}>Previewed</Gate><Gate action={approveFirstDocumentGateAction} quoteId={order.quoteId} tone="green" extra={{ document_gate_type: firstDocument }}>Approve</Gate></div><div className="sf8-send-box"><strong>Send / track document</strong><p>Use this after human approval. The send is recorded against the structured order document and does not change quote history.</p><SendDocumentGate order={order} documentType={firstDocument} /></div></>}</div></article>;
}

const styles = `.sf8{background:#eef4f8;min-height:100vh;padding:22px 26px 80px;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui}.sf8-top,.sf8-summary,.sf8-queue,.sf8-lines,.sf8-flow,.sf8-stage,.sf8-blockers,.sf8-source-card{background:white;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 14px 34px #0f172a12}.sf8-top{padding:18px 20px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;margin-bottom:14px}.sf8-top small,.sf8-summary small,.sf8-lines small,.sf8-blockers small,.sf8-stage small,.sf8-source-card small{color:#0c7fff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.sf8-top h1,.sf8-summary h2,.sf8-lines h2{margin:0;color:#082f49}.sf8-top p,.sf8-summary p,.sf8-queue p,.sf8-lines p,.sf8-stage p,.sf8-source-card p,.sf8-send-box p{color:#64748b;font-size:12px;margin:5px 0 0}.sf8-source-card code{font-size:10px;background:#f1f5f9;border:1px solid #dbe7f3;border-radius:7px;padding:2px 6px}.sf8-actions,.sf8-filter,.sf8-line-stats,.sf8-source-badges{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sf8-btn{border:1px solid #dbe7f3;background:white;color:#334155;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:850;cursor:pointer}.sf8-navy{background:#082f49!important;border-color:#082f49!important;color:white!important}.sf8-blue{background:#eff6ff!important;border-color:#bfdbfe!important;color:#1d4ed8!important}.sf8-green{background:#ecfdf5!important;border-color:#a7f3d0!important;color:#047857!important}.sf8-pill{border:1px solid #dbe7f3;background:#f8fafc;border-radius:999px;padding:5px 9px;color:#475569;font-size:10px;font-weight:900}.sf8-pill.sf8-green{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.sf8-pill.sf8-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.sf8-pill.sf8-amber{background:#fffbeb;border-color:#fde68a;color:#92400e}.sf8-pill.sf8-red{background:#fff1f2;border-color:#fecaca;color:#be123c}.sf8-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:14px}.sf8-kpi{background:white;border:1px solid #dbe7f3;border-radius:18px;border-top:4px solid #cbd5e1;padding:12px;min-height:78px}.sf8-kpi.sf8-blue{border-top-color:#0c7fff}.sf8-kpi.sf8-green{border-top-color:#059669}.sf8-kpi.sf8-amber{border-top-color:#d97706}.sf8-kpi.sf8-red{border-top-color:#dc2626}.sf8-kpi.sf8-purple{border-top-color:#7c3aed}.sf8-kpi span{font-size:9px;color:#94a3b8;font-weight:900;text-transform:uppercase;letter-spacing:.13em}.sf8-kpi strong{display:block;font-size:22px;margin-top:7px;color:#082f49}.sf8-kpi small{display:block;font-size:10px;color:#64748b;margin-top:5px}.sf8-layout{display:grid;grid-template-columns:390px 1fr;gap:14px}.sf8-queue{overflow:hidden;position:sticky;top:14px}.sf8-queue-head{padding:15px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between}.sf8-search{width:calc(100% - 28px);height:38px;border:1px solid #dbe7f3;background:#f8fafc;border-radius:999px;padding:0 14px;margin:12px 14px 8px;font-size:12px}.sf8-filter{padding:0 14px 12px}.sf8-list{display:grid;max-height:calc(100vh - 310px);overflow:auto}.sf8-row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:start;border:0;border-bottom:1px solid #edf2f7;background:white;text-align:left;padding:12px 14px;cursor:pointer}.sf8-row.selected{background:#f8fbff;box-shadow:inset 3px 0 0 #0c7fff}.sf8-avatar{width:34px;height:34px;border-radius:12px;background:#0c7fff;color:white;display:grid;place-items:center;font-weight:950}.sf8-row strong{display:block;color:#082f49;font-size:14px}.sf8-row small,.sf8-money small{display:block;color:#64748b;font-size:10.5px;margin-top:3px}.sf8-row em{display:block;color:#b45309;font-size:10px;font-style:normal;margin-top:4px}.sf8-money{text-align:right;color:#082f49;font-weight:950;font-size:13px}.sf8-work{display:grid;gap:14px}.sf8-summary,.sf8-source-card{padding:16px 18px;display:grid;grid-template-columns:1fr auto;gap:14px}.sf8-total{text-align:right;color:#082f49}.sf8-total strong{display:block;font-size:24px}.sf8-total small,.sf8-total span{display:block;color:#64748b;font-size:11px;margin-top:4px}.sf8-blockers{padding:14px 18px;display:grid;grid-template-columns:260px 1fr;gap:12px;border-left:4px solid #f59e0b}.sf8-blockers h3,.sf8-source-card h3{margin:3px 0 0;color:#082f49}.sf8-blockers ul{margin:0;padding-left:18px;color:#92400e;font-size:12px;line-height:1.6}.sf8-lines header{padding:16px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px}.sf8-table{padding:12px 14px}.sf8-head,.sf8-line{display:grid;grid-template-columns:1.25fr .55fr 1.35fr .6fr .45fr;gap:10px;align-items:center}.sf8-head{font-size:9px;color:#94a3b8;font-weight:900;text-transform:uppercase;letter-spacing:.12em;padding:0 6px 8px}.sf8-line{border:1px solid #e2e8f0;background:#f8fafc;border-radius:15px;padding:10px;margin-bottom:8px}.sf8-line strong{color:#082f49;font-size:12px}.sf8-line small{display:block;color:#64748b;font-size:10px;margin-top:3px}.sf8-edit{display:grid;grid-template-columns:70px 82px 1fr auto;gap:6px}.sf8-edit input,.sf8-add input,.sf8-add select,.sf8-send-gate input,.sf8-send-gate select{border:1px solid #dbe7f3;border-radius:10px;background:white;font-size:11px;font-weight:750;padding:8px}.sf8-add{display:grid;grid-template-columns:1.5fr 70px 70px 100px 75px 1fr auto;gap:8px;padding:0 14px 8px}.sf8-add-help{padding:0 16px 14px!important;margin:0!important;color:#64748b!important;font-size:11px!important}.sf8-preview-note{font-size:10px;color:#92400e;font-weight:850}.sf8-flow{padding:12px 18px;display:grid;grid-template-columns:repeat(10,1fr);gap:8px}.sf8-flow button{border:1px solid #e2e8f0;background:white;border-radius:13px;padding:8px;min-height:66px}.sf8-flow button.done{background:#ecfdf5;border-color:#a7f3d0}.sf8-flow button.active{background:#eff6ff;border-color:#93c5fd}.sf8-flow strong{font-size:10px;color:#082f49;display:block}.sf8-flow span{font-size:9px;color:#64748b;display:block;margin-top:4px}.sf8-stage header{padding:16px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between}.sf8-stage h2{margin:3px 0 0;color:#082f49}.sf8-stage-body{padding:18px;color:#334155}.sf8-send-box{margin-top:14px;border:1px solid #dbe7f3;background:#f8fafc;border-radius:18px;padding:14px}.sf8-send-box strong{color:#082f49}.sf8-send-gate{display:grid;grid-template-columns:120px 1fr 1fr auto;gap:8px;margin-top:10px}.sf8-deprecated{border:1px dashed #f59e0b;background:#fffbeb;color:#92400e;border-radius:16px;padding:12px;font-size:12px;font-weight:800}.sf8-empty{background:white;border:1px dashed #dbe7f3;border-radius:24px;padding:60px 40px;text-align:center;color:#64748b}@media(max-width:1320px){.sf8-layout{grid-template-columns:1fr}.sf8-queue{position:static}.sf8-kpis{grid-template-columns:repeat(3,1fr)}.sf8-flow{grid-template-columns:repeat(5,1fr)}.sf8-head{display:none}.sf8-line,.sf8-add,.sf8-blockers,.sf8-send-gate{grid-template-columns:1fr}.sf8-edit{grid-template-columns:1fr 1fr}.sf8-edit .sf8-btn{grid-column:1/3}}@media(max-width:760px){.sf8{padding:14px}.sf8-top,.sf8-summary,.sf8-source-card,.sf8-kpis,.sf8-flow{grid-template-columns:1fr}.sf8-total,.sf8-money{text-align:left}.sf8-row{grid-template-columns:34px 1fr}.sf8-money{grid-column:2}}`;
