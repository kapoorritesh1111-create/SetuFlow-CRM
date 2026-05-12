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

export type ProductionOrderDocumentSend8X = {
  id: string;
  channel: string | null;
  recipient: string | null;
  recipientRole?: string | null;
  status: string | null;
  shareUrl?: string | null;
  sentAt?: string | null;
  openedAt?: string | null;
  openCount?: number | null;
};

export type ProductionOrderDocument8W = {
  id: string;
  documentType: string | null;
  status: string | null;
  sentAt?: string | null;
  openedAt?: string | null;
  sends?: ProductionOrderDocumentSend8X[];
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
  documents?: ProductionOrderDocument8W[];
};

type Filter = 'all' | 'regional' | 'export';
type UiStage = 'quote' | 'approval' | 'packing' | 'processing' | 'logistics' | 'invoice' | 'closed';

const UI_STAGES: Array<{ key: UiStage; label: string; regionalDoc: string; exportDoc: string }> = [
  { key: 'quote', label: 'Quote Approved', regionalDoc: 'Actual Lines', exportDoc: 'Proforma Lines' },
  { key: 'approval', label: 'Internal Approval', regionalDoc: 'Order Confirmation', exportDoc: 'Proforma Invoice' },
  { key: 'packing', label: 'Packing / Freight', regionalDoc: 'Packing Sheet / Rates', exportDoc: 'Container Sheet / Freight' },
  { key: 'processing', label: 'Processing', regionalDoc: 'Pick-Pack-QC', exportDoc: 'Packing List' },
  { key: 'logistics', label: 'Logistics', regionalDoc: 'Delivery Note', exportDoc: 'Shipping Docs' },
  { key: 'invoice', label: 'Dispatch / Invoice', regionalDoc: 'Final Invoice', exportDoc: 'Commercial Invoice' },
  { key: 'closed', label: 'Paid & Closed', regionalDoc: 'Receipt', exportDoc: 'Receipt + Archive' },
];

const STAGE_MAP: Record<string, UiStage> = {
  quote_approved: 'quote',
  actual_lines: 'quote',
  order_confirmation: 'approval',
  proforma_invoice: 'approval',
  packing_sheet: 'packing',
  freight_request: 'packing',
  trade_requirements: 'processing',
  shipment_booking: 'logistics',
  dispatch_invoice: 'invoice',
  completed: 'closed',
};

function fmt(value: number | null, currency: string | null) {
  return value == null ? '—' : `${currency ?? 'USD'} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function titleCase(value: string | null | undefined) {
  return String(value ?? '').split(/[\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Review';
}
function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'SF';
}
function docTypeFor(order: ProductionOrder8S) {
  return order.orderType === 'export' ? 'proforma_invoice' : 'order_confirmation';
}
function uiStageIndexFor(order: ProductionOrder8S) {
  const mapped = STAGE_MAP[String(order.currentStage ?? order.executionState ?? '').toLowerCase()] ?? 'quote';
  return Math.max(0, UI_STAGES.findIndex((stage) => stage.key === mapped));
}
function docLabel(documentType: string | null | undefined) {
  const value = String(documentType ?? '').toLowerCase();
  if (value === 'proforma_invoice') return 'Proforma Invoice';
  if (value === 'dispatch_invoice') return 'Dispatch Invoice';
  if (value === 'packing_sheet') return 'Packing Sheet';
  if (value === 'freight_request') return 'Freight Request';
  if (value === 'receipt') return 'Receipt';
  return value ? titleCase(value) : 'Order Confirmation';
}
function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`sf8x-pill ${tone}`}>{children}</span>;
}
function ActionButton({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return <button type="button" className={`sf8x-btn ${tone}`}>{children}</button>;
}
function Gate({ action, quoteId, children, tone = '', extra }: { action: (formData: FormData) => Promise<void>; quoteId: string; children: string; tone?: string; extra?: Record<string, string> }) {
  return <form action={action}><input type="hidden" name="quote_id" value={quoteId} />{extra && Object.entries(extra).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}<button className={`sf8x-btn ${tone}`}>{children}</button></form>;
}
function SendDocumentGate({ order, documentType }: { order: ProductionOrder8S; documentType: string }) {
  return <form action={sendOrderDocumentLinkAction} className="sf8x-send">
    <input type="hidden" name="order_id" value={order.orderId ?? ''} />
    <input type="hidden" name="quote_id" value={order.quoteId} />
    <input type="hidden" name="document_type" value={documentType} />
    <select name="channel" defaultValue="email" aria-label="Send channel"><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select>
    <input name="recipient" placeholder="Recipient email / WhatsApp" />
    <input name="recipient_role" placeholder="Role: buyer, finance, logistics" />
    <input name="note" placeholder="Optional note" />
    <button className="sf8x-btn green">Send tracked</button>
  </form>;
}
function Kpi({ label, value, mini, tone }: { label: string; value: string | number; mini: string; tone: string }) {
  return <div className={`sf8x-kpi ${tone}`}><span>{label}</span><strong>{value}</strong><small>{mini}</small></div>;
}

export function OrdersProductionWorkspace8S({ orders, catalogOptions = [] }: { orders: ProductionOrder8S[]; catalogOptions?: CatalogOrderOption8S[] }) {
  const [selectedId, setSelectedId] = useState(orders[0]?.orderId ?? orders[0]?.quoteId ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const [stageIndex, setStageIndex] = useState<number | null>(null);
  const visible = useMemo(() => filter === 'all' ? orders : orders.filter((order) => order.orderType === filter), [orders, filter]);
  const selected = useMemo(() => visible.find((order) => (order.orderId ?? order.quoteId) === selectedId) ?? visible[0] ?? orders[0] ?? null, [visible, selectedId, orders]);
  const activeStage = selected ? (stageIndex ?? uiStageIndexFor(selected)) : 0;
  const ready = orders.filter((order) => order.blockerCount === 0 && order.lines.length > 0).length;
  const blocked = orders.filter((order) => order.blockerCount > 0).length;
  const activeValue = orders.reduce((sum, order) => sum + Number(order.actualTotal ?? order.quotedTotal ?? 0), 0);
  const sendCount = orders.reduce((sum, order) => sum + (order.documents ?? []).reduce((inner, doc) => inner + (doc.sends?.length ?? 0), 0), 0);

  if (!selected) return <main className="sf8x"><Top filter={filter} setFilter={setFilter} /><div className="sf8x-empty">No accepted execution orders yet.</div><style jsx global>{styles}</style></main>;

  return <main className="sf8x">
    <Top filter={filter} setFilter={(next) => { setFilter(next); setStageIndex(null); const first = (next === 'all' ? orders : orders.filter((order) => order.orderType === next))[0]; if (first) setSelectedId(first.orderId ?? first.quoteId); }} />
    <section className="sf8x-kpis">
      <Kpi tone="blue" label="Ready from quote" value={orders.length} mini="Accepted source versions" />
      <Kpi tone="amber" label="Need action" value={orders.length - ready} mini="Line/gate/doc blockers" />
      <Kpi tone="purple" label="Tracked sends" value={sendCount} mini="Per-recipient history" />
      <Kpi tone="green" label="Healthy" value={ready} mini="No current blocker" />
      <Kpi tone="red" label="Blocked" value={blocked} mini="Needs review" />
      <Kpi tone="slate" label="Active value" value={fmt(activeValue, selected.currency)} mini="Actual or quoted total" />
    </section>
    <section className="sf8x-layout">
      <aside className="sf8x-queue">
        <div className="sf8x-queue-head"><div><span>Order queue</span><p>Click a row. One selected order opens.</p></div><Pill tone="blue">{visible.length} shown</Pill></div>
        <input className="sf8x-search" placeholder="Search buyer, order, product, country, doc" />
        <div className="sf8x-filter"><FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton><FilterButton active={filter === 'regional'} onClick={() => setFilter('regional')}>Regional</FilterButton><FilterButton active={filter === 'export'} onClick={() => setFilter('export')}>Export</FilterButton></div>
        <div className="sf8x-list">{visible.map((order) => {
          const key = order.orderId ?? order.quoteId;
          const rowStage = uiStageIndexFor(order);
          const rowSends = (order.documents ?? []).reduce((sum, doc) => sum + (doc.sends?.length ?? 0), 0);
          return <button key={key} className={`sf8x-row ${key === (selected.orderId ?? selected.quoteId) ? 'selected' : ''}`} onClick={() => { setSelectedId(key); setStageIndex(null); }}>
            <div className="sf8x-row-top"><span className="sf8x-avatar">{initials(order.companyName)}</span><span><strong>{order.companyName}</strong><small>{order.orderType} · {UI_STAGES[rowStage]?.label ?? titleCase(order.currentStage)} · {rowSends} sends</small></span><span className="sf8x-money">{fmt(order.actualTotal ?? order.quotedTotal, order.currency)}<small>{order.approvalState ?? order.status}</small></span></div>
            <div className="sf8x-dots">{UI_STAGES.map((stage, index) => <i key={stage.key} className={index < rowStage ? 'done' : index === rowStage ? 'active' : ''} />)}<small>{order.blockerReasons[0] ?? order.nextAction}</small></div>
            <div className="sf8x-row-actions"><span>Open</span><span>Preview docs</span><span>Send history</span></div>
          </button>;
        })}</div>
      </aside>
      <section className="sf8x-workspace">
        <article className="sf8x-summary"><div><small>Open order · {selected.orderType}</small><h2>{selected.companyName}</h2><p>{selected.nextAction}. Source: {selected.versionLabel ?? selected.sourceQuoteVersionId ?? 'accepted quote version'}.</p></div><div className="sf8x-value"><strong>{fmt(selected.actualTotal ?? selected.quotedTotal, selected.currency)}</strong><span>Draft / actual order total</span></div></article>
        <nav className="sf8x-flow">{UI_STAGES.map((stage, index) => <button type="button" key={stage.key} onClick={() => setStageIndex(index)} className={`${index < activeStage ? 'done' : ''} ${index === activeStage ? 'active' : ''}`}><strong>{stage.label}</strong><span>{selected.orderType === 'export' ? stage.exportDoc : stage.regionalDoc}</span></button>)}</nav>
        <StagePanel order={selected} stage={UI_STAGES[activeStage] ?? UI_STAGES[0]} stageNumber={activeStage + 1} catalogOptions={catalogOptions} />
      </section>
    </section><style jsx global>{styles}</style>
  </main>;
}

function Top({ filter, setFilter }: { filter: Filter; setFilter: (filter: Filter) => void }) {
  return <header className="sf8x-top"><div><small>Sprint 8X document history</small><h1>Orders / Execution Workspace</h1><p>Clean stage workflow with true per-recipient send history and tracked preview links.</p></div><div className="sf8x-actions"><FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton><FilterButton active={filter === 'regional'} onClick={() => setFilter('regional')}>Regional</FilterButton><FilterButton active={filter === 'export'} onClick={() => setFilter('export')}>Export</FilterButton></div></header>;
}
function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`sf8x-btn ${active ? 'primary' : ''}`}>{children}</button>; }
function StagePanel({ order, stage, stageNumber, catalogOptions }: { order: ProductionOrder8S; stage: { key: UiStage; label: string; regionalDoc: string; exportDoc: string }; stageNumber: number; catalogOptions: CatalogOrderOption8S[] }) {
  const currentDoc = order.orderType === 'export' ? stage.exportDoc : stage.regionalDoc;
  return <article className="sf8x-stage"><header><div><small>Stage {stageNumber} · {stage.label}</small><h2>{stageTitle(stage.key, order.orderType)}</h2></div><Pill tone="blue">{currentDoc}</Pill></header><div className="sf8x-stage-body">{stage.key === 'quote' ? <LinesStage order={order} catalogOptions={catalogOptions} /> : stage.key === 'approval' ? <DocumentGateStage order={order} documentType={docTypeFor(order)} /> : stage.key === 'packing' ? <GenericDocStage order={order} highlightType="packing_sheet" title="Packing sheet and freight request" copy="Preview packing sheet and send rate information again to any logistics provider." /> : stage.key === 'processing' ? <GenericDocStage order={order} highlightType="packing_list" title="Pick-pack-QC and packing list" copy="Preview picklist/packing list and share with warehouse users again when needed." /> : stage.key === 'logistics' ? <GenericDocStage order={order} highlightType={order.orderType === 'export' ? 'shipping_documents' : 'delivery_note'} title="Logistics and shipment documents" copy="Preview delivery/shipping documents and resend to carrier, forwarder, buyer, or finance." /> : stage.key === 'invoice' ? <DocumentGateStage order={order} documentType="dispatch_invoice" invoiceMode /> : <CloseStage order={order} />}</div></article>;
}
function stageTitle(stage: UiStage, orderType: 'regional' | 'export') {
  if (stage === 'quote') return orderType === 'export' ? 'Confirm actual Proforma lines' : 'Confirm actual buyer order lines';
  if (stage === 'approval') return orderType === 'export' ? 'Preview and approve Proforma Invoice' : 'Preview and approve Order Confirmation';
  if (stage === 'packing') return orderType === 'export' ? 'Container packing and freight' : 'Packing and delivery rate';
  if (stage === 'processing') return orderType === 'export' ? 'Packing list and packed goods' : 'Pick-pack-QC';
  if (stage === 'logistics') return orderType === 'export' ? 'Shipping docs and booking' : 'Delivery docs and booking';
  if (stage === 'invoice') return orderType === 'export' ? 'Final commercial invoice' : 'Final invoice';
  return 'Collect payment and close order';
}
function LinesStage({ order, catalogOptions }: { order: ProductionOrder8S; catalogOptions: CatalogOrderOption8S[] }) {
  return <div className="sf8x-two"><div><p className="sf8x-copy"><strong>Simple meaning:</strong> quote approval does not mean every quoted item becomes the order. Confirm actual buyer order lines before documents.</p><div className="sf8x-box"><h3>Actual order lines</h3><div className="sf8x-line-table">{order.lines.map((line) => <Line key={line.id} quoteId={order.quoteId} line={line} currency={order.currency} />)}</div><form action={addManualActualOrderLineAction} className="sf8x-add"><input type="hidden" name="quote_id" value={order.quoteId} /><input type="hidden" name="pricing_basis" value={order.pricingBasis ?? 'FOB'} /><select name="catalog_pricing_rule_id"><option value="">Select catalog product</option>{catalogOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><input name="ordered_quantity" placeholder="Qty" /><input name="change_reason" placeholder="Reason" /><button className="sf8x-btn primary">Add line</button></form></div><div className="sf8x-action-bar"><Gate action={prepareActualOrderLinesRobustAction} quoteId={order.quoteId} tone="primary">Prepare actual lines</Gate><Gate action={approveActualOrderLinesGateAction} quoteId={order.quoteId} tone="green">Approve actual lines</Gate></div></div><aside><InfoCard title="Guardrails" items={['Actual lines can differ from quote', 'Changes need reasons', 'Accepted quote history stays immutable']} /></aside></div>;
}
function Line({ quoteId, line, currency }: { quoteId: string; line: OrderLineComparison8S; currency: string | null }) { return <div className="sf8x-line"><span><strong>{line.productName}</strong><small>{line.variantName || line.skuCode || line.hsnCode || 'Line item'}</small></span><span>{line.quotedQuantity ?? '—'}<small>Quoted</small></span><form action={updateActualOrderLineAction} className="sf8x-edit"><input type="hidden" name="quote_id" value={quoteId} /><input type="hidden" name="order_line_id" value={line.id} /><input name="ordered_quantity" defaultValue={line.actualQuantity ?? line.quotedQuantity ?? 0} /><input name="unit_price" defaultValue={line.unitPrice ?? ''} /><input name="change_reason" defaultValue={line.reason ?? ''} placeholder="Reason" /><button className="sf8x-btn blue">Save</button></form><span><Pill tone={line.status === 'unchanged' ? 'green' : 'amber'}>{line.status.replace(/_/g, ' ')}</Pill><small>{fmt(line.lineTotal, currency)}</small></span>{line.isActual ? <form action={removeActualOrderLineAction}><input type="hidden" name="quote_id" value={quoteId} /><input type="hidden" name="order_line_id" value={line.id} /><button className="sf8x-btn">Remove</button></form> : <small>Prepare first</small>}</div>; }
function DocumentGateStage({ order, documentType, invoiceMode = false }: { order: ProductionOrder8S; documentType: string; invoiceMode?: boolean }) { return <div className="sf8x-two"><div><p className="sf8x-copy"><strong>Simple meaning:</strong> preview and approve before external use. Once approved/sent, send again creates a separate history row and preview link.</p><Checklist items={invoiceMode ? ['Actual/shipped quantities reviewed', 'Pricing and terms reviewed', 'Human approval before buyer receives invoice'] : ['Actual lines confirmed', 'Payment terms and incoterm reviewed', 'Human approval required before send']} /><div className="sf8x-action-bar">{!invoiceMode ? <><Gate action={prepareFirstDocumentGateAction} quoteId={order.quoteId} extra={{ document_gate_type: documentType }}>Prepare document</Gate><Gate action={previewFirstDocumentGateAction} quoteId={order.quoteId} tone="blue" extra={{ document_gate_type: documentType }}>Preview</Gate><Gate action={approveFirstDocumentGateAction} quoteId={order.quoteId} tone="green" extra={{ document_gate_type: documentType }}>Approve</Gate></> : <><ActionButton tone="primary">Preview final invoice</ActionButton><ActionButton tone="blue">Approve invoice</ActionButton></>}</div><div className="sf8x-send-box"><strong>Send again with tracking</strong><p>Creates a new send-history row and secure preview/open-tracking link.</p><SendDocumentGate order={order} documentType={documentType} /></div></div><aside><DocumentTray order={order} highlightType={documentType} /></aside></div>; }
function GenericDocStage({ order, highlightType, title, copy }: { order: ProductionOrder8S; highlightType: string; title: string; copy: string }) { return <div className="sf8x-two"><div><p className="sf8x-copy"><strong>{title}:</strong> {copy}</p><Checklist items={['Preview existing document anytime', 'Send again to a different stakeholder', 'Each send has its own open tracking', 'Unsafe edits still require human approval']} /><div className="sf8x-action-bar"><ActionButton tone="primary">Preview</ActionButton><ActionButton tone="blue">Approve</ActionButton><ActionButton>Send again</ActionButton></div></div><aside><DocumentTray order={order} highlightType={highlightType} /></aside></div>; }
function CloseStage({ order }: { order: ProductionOrder8S }) { return <div><p className="sf8x-copy"><strong>Simple meaning:</strong> payment is received, receipt is generated, and the order closes with document history archived.</p><div className="sf8x-grid4"><Metric label="Total billed" value={fmt(order.actualTotal, order.currency)} /><Metric label="Payment" value="Pending / paid" /><Metric label="Documents" value={`${order.documents?.length ?? order.documentCount} docs`} /><Metric label="Source" value={order.versionLabel ?? 'Accepted version'} /></div><div className="sf8x-action-bar"><ActionButton tone="primary">Generate receipt + close</ActionButton><ActionButton tone="blue">Download archive</ActionButton><ActionButton tone="green">Create reorder reminder</ActionButton></div></div>; }
function DocumentTray({ order, highlightType }: { order: ProductionOrder8S; highlightType: string }) {
  const docs = order.documents?.length ? order.documents : [{ id: 'planned', documentType: highlightType, status: 'planned', sends: [] }];
  return <div className="sf8x-doc-tray"><h3>Document tray</h3><p>Preview documents and see every tracked send/open event.</p>{docs.map((doc) => <div key={doc.id} className={`sf8x-doc ${doc.documentType === highlightType ? 'active' : ''}`}><div><strong>{docLabel(doc.documentType)}</strong><small>{titleCase(doc.status)}{doc.sentAt ? ' · Sent' : ''}{doc.openedAt ? ' · Opened' : ''}</small></div><div className="sf8x-doc-actions"><ActionButton tone="blue">Preview</ActionButton><ActionButton>History</ActionButton></div>{doc.sends?.length ? <div className="sf8x-sends">{doc.sends.slice(0, 4).map((send) => <div key={send.id} className="sf8x-send-row"><span>{send.channel ?? 'send'} → {send.recipient || send.recipientRole || 'recipient'}</span><em>{send.openCount ? `${send.openCount} opens` : 'not opened'}</em>{send.shareUrl ? <a href={send.shareUrl} target="_blank" rel="noreferrer">Preview link</a> : null}</div>)}</div> : <div className="sf8x-no-sends">No send history yet. Use Send tracked to create one.</div>}</div>)}</div>;
}
function Checklist({ items }: { items: string[] }) { return <div className="sf8x-box"><h3>Checklist</h3>{items.map((item) => <div className="sf8x-check" key={item}><i>✓</i><span>{item}</span></div>)}</div>; }
function InfoCard({ title, items }: { title: string; items: string[] }) { return <div className="sf8x-info"><strong>{title}</strong><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="sf8x-metric"><span>{label}</span><strong>{value}</strong></div>; }

const styles = `.sf8x{background:#eef4f8;min-height:100vh;padding:22px 26px 80px;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui}.sf8x-top,.sf8x-queue,.sf8x-summary,.sf8x-stage{background:white;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 14px 34px #0f172a12}.sf8x-top{padding:18px 20px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;margin-bottom:14px}.sf8x-top small,.sf8x-summary small,.sf8x-stage small{color:#0c7fff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.sf8x-top h1,.sf8x-summary h2,.sf8x-stage h2{margin:0;color:#082f49;letter-spacing:-.04em}.sf8x-top p,.sf8x-summary p,.sf8x-queue p,.sf8x-copy,.sf8x-doc-tray p,.sf8x-send-box p{color:#64748b;font-size:12px;line-height:1.5;margin:5px 0 0}.sf8x-actions,.sf8x-filter,.sf8x-action-bar,.sf8x-doc-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sf8x-btn{border:1px solid #dbe7f3;background:white;color:#334155;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:850;cursor:pointer}.sf8x-btn.primary{background:#082f49;border-color:#082f49;color:white}.sf8x-btn.blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.sf8x-btn.green{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.sf8x-pill{border:1px solid #dbe7f3;background:#f8fafc;border-radius:999px;padding:5px 9px;color:#475569;font-size:10px;font-weight:900;white-space:nowrap}.sf8x-pill.green{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.sf8x-pill.blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.sf8x-pill.amber{background:#fffbeb;border-color:#fde68a;color:#92400e}.sf8x-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:14px}.sf8x-kpi{background:white;border:1px solid #dbe7f3;border-radius:18px;border-top:4px solid #cbd5e1;padding:12px;min-height:78px}.sf8x-kpi.blue{border-top-color:#0c7fff}.sf8x-kpi.green{border-top-color:#059669}.sf8x-kpi.amber{border-top-color:#d97706}.sf8x-kpi.red{border-top-color:#dc2626}.sf8x-kpi.purple{border-top-color:#7c3aed}.sf8x-kpi span,.sf8x-metric span{font-size:9px;color:#94a3b8;font-weight:900;text-transform:uppercase;letter-spacing:.13em}.sf8x-kpi strong{display:block;font-size:22px;margin-top:7px;color:#082f49}.sf8x-kpi small{display:block;color:#64748b;font-size:10px;margin-top:5px}.sf8x-layout{display:grid;grid-template-columns:390px 1fr;gap:14px;align-items:start}.sf8x-queue{overflow:hidden;position:sticky;top:14px}.sf8x-queue-head{padding:15px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px}.sf8x-queue-head span{font-size:10px;color:#94a3b8;font-weight:900;text-transform:uppercase;letter-spacing:.14em}.sf8x-search{width:calc(100% - 28px);height:38px;border:1px solid #dbe7f3;background:#f8fafc;border-radius:999px;padding:0 14px;margin:12px 14px 8px;font-size:12px}.sf8x-filter{padding:0 14px 12px}.sf8x-list{display:grid;max-height:calc(100vh - 310px);overflow:auto}.sf8x-row{display:grid;gap:8px;border:0;border-bottom:1px solid #edf2f7;background:white;text-align:left;padding:12px 14px;cursor:pointer}.sf8x-row:hover,.sf8x-row.selected{background:#f8fbff}.sf8x-row.selected{box-shadow:inset 3px 0 0 #0c7fff}.sf8x-row-top{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:start}.sf8x-avatar{width:34px;height:34px;border-radius:12px;background:#0c7fff;color:white;display:grid;place-items:center;font-weight:950}.sf8x-row strong{display:block;color:#082f49;font-size:14px}.sf8x-row small,.sf8x-money small{display:block;color:#64748b;font-size:10px;margin-top:3px}.sf8x-money{text-align:right;color:#082f49;font-weight:950;font-size:13px}.sf8x-dots{display:flex;align-items:center;gap:5px}.sf8x-dots i{width:8px;height:8px;border-radius:999px;background:#cbd5e1}.sf8x-dots i.done{background:#059669}.sf8x-dots i.active{background:#0c7fff}.sf8x-dots small{margin-left:4px;color:#64748b}.sf8x-row-actions{display:flex;gap:6px}.sf8x-row-actions span{border:1px solid #dbe7f3;border-radius:999px;padding:5px 8px;color:#1d4ed8;background:#eff6ff;font-size:10px;font-weight:850}.sf8x-workspace{display:grid;gap:14px}.sf8x-summary{padding:16px 18px;display:grid;grid-template-columns:1fr auto;gap:14px}.sf8x-value{text-align:right;color:#082f49}.sf8x-value strong{display:block;font-size:20px}.sf8x-value span{display:block;color:#94a3b8;font-size:10px}.sf8x-flow{background:white;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 14px 34px #0f172a12;padding:12px 18px;display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.sf8x-flow button{border:1px solid #e2e8f0;background:white;border-radius:13px;padding:8px;min-height:62px;cursor:pointer}.sf8x-flow button.done{background:#ecfdf5;border-color:#a7f3d0}.sf8x-flow button.active{background:#eff6ff;border-color:#93c5fd;box-shadow:0 0 0 3px #0c7fff14}.sf8x-flow strong{font-size:10px;color:#082f49;display:block}.sf8x-flow span{font-size:9px;color:#64748b;display:block;margin-top:4px}.sf8x-stage{overflow:hidden}.sf8x-stage header{padding:16px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px}.sf8x-stage-body{padding:18px}.sf8x-two{display:grid;grid-template-columns:1fr 410px;gap:14px;align-items:start}.sf8x-box,.sf8x-doc-tray,.sf8x-info,.sf8x-send-box{border:1px solid #e2e8f0;background:#f8fafc;border-radius:18px;padding:14px}.sf8x-box h3,.sf8x-doc-tray h3{margin:0 0 10px;color:#082f49;font-size:15px}.sf8x-check{display:flex;gap:9px;align-items:flex-start;color:#334155;font-size:13px;margin-top:9px}.sf8x-check i{width:20px;height:20px;border-radius:999px;background:#ecfdf5;color:#047857;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:950;flex:none}.sf8x-line-table{display:grid;gap:8px}.sf8x-line{display:grid;grid-template-columns:1fr .35fr 1.25fr .5fr .35fr;gap:8px;align-items:center;border:1px solid #e2e8f0;background:white;border-radius:14px;padding:10px}.sf8x-line strong{color:#082f49;font-size:12px}.sf8x-line small{display:block;color:#64748b;font-size:10px;margin-top:2px}.sf8x-edit{display:grid;grid-template-columns:65px 80px 1fr auto;gap:6px}.sf8x-edit input,.sf8x-add input,.sf8x-add select,.sf8x-send input,.sf8x-send select{border:1px solid #dbe7f3;border-radius:10px;background:white;font-size:11px;font-weight:750;padding:8px;min-width:0}.sf8x-add{display:grid;grid-template-columns:1fr 70px 1fr auto;gap:8px;margin-top:10px}.sf8x-send{display:grid;grid-template-columns:100px 1fr 1fr 1fr auto;gap:8px;margin-top:10px}.sf8x-doc{border:1px solid #e2e8f0;background:white;border-radius:14px;padding:10px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;margin-top:8px}.sf8x-doc.active{box-shadow:inset 3px 0 0 #0c7fff}.sf8x-doc strong{color:#082f49;font-size:12px}.sf8x-doc small{display:block;color:#64748b;font-size:10px;margin-top:3px}.sf8x-sends{grid-column:1/-1;display:grid;gap:6px;margin-top:6px}.sf8x-send-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:7px;font-size:11px}.sf8x-send-row span{color:#334155;font-weight:800}.sf8x-send-row em{color:#64748b;font-style:normal}.sf8x-send-row a{color:#1d4ed8;font-weight:900;text-decoration:none}.sf8x-no-sends{grid-column:1/-1;margin-top:6px;color:#92400e;background:#fffbeb;border:1px dashed #fde68a;border-radius:10px;padding:8px;font-size:11px;font-weight:800}.sf8x-info{background:#f5f3ff;border-color:#ddd6fe}.sf8x-info strong{color:#5b21b6}.sf8x-info ul{margin:9px 0 0;padding-left:18px;color:#475569;font-size:12px;line-height:1.65}.sf8x-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.sf8x-metric{border:1px solid #e2e8f0;border-radius:16px;padding:12px;background:#f8fafc}.sf8x-metric strong{display:block;margin-top:5px;color:#082f49;font-size:16px}.sf8x-action-bar{margin-top:14px}.sf8x-empty{background:white;border:1px dashed #dbe7f3;border-radius:24px;padding:60px 40px;text-align:center;color:#64748b}@media(max-width:1320px){.sf8x-layout,.sf8x-two{grid-template-columns:1fr}.sf8x-queue{position:static}.sf8x-kpis{grid-template-columns:repeat(3,1fr)}.sf8x-flow{grid-template-columns:repeat(4,1fr)}.sf8x-line,.sf8x-add,.sf8x-send{grid-template-columns:1fr}.sf8x-edit{grid-template-columns:1fr 1fr}.sf8x-edit .sf8x-btn{grid-column:1/3}}@media(max-width:760px){.sf8x{padding:14px}.sf8x-top,.sf8x-summary,.sf8x-kpis,.sf8x-flow,.sf8x-grid4{grid-template-columns:1fr}.sf8x-value,.sf8x-money{text-align:left}.sf8x-row-top{grid-template-columns:34px 1fr}.sf8x-money{grid-column:2}.sf8x-send-row{grid-template-columns:1fr}}`;
